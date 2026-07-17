// RIVER-GUIDES CONSOLIDATOR-SWEEP REFRESH (TASK-QUEUE Lane A, step 9 of
// docs/RIVER-GUIDES-INTEGRATION.md; spec §5 sourcing method + §7 maps).
//
// Batch re-run of the acquisition-log query per known consolidator: Serper
// press queries → Claude extraction → corroboration guard → file new add-ons
// we don't already have as river_guides rows. The periodic top-up for a seed
// list swept once by hand (only ~9 of 434 seed rows are 2026 deals).
//
// EXTRACTION + HALLUCINATION GUARD live in the SHARED module
// scraper/riverguides/extract.js — the SAME implementation Lane C's on-demand
// /discover endpoint uses (unified per PM 7/17: one guard, one place to fix).
// Its corroboration rule (the queried consolidator must literally appear in the
// cited source next to a real acquirer-quote; a seller name is stored only when
// a source literally names them, else TBD) makes a fabricated/mis-attributed
// deal impossible to file. The PM live-probed it with a fake consolidator.
//
// THIS FILE adds the batch-only concerns: pulling the consolidator list from
// the DB (never invented), dedupe vs known deals, the spec-§7 off-thesis filter,
// a "consolidator is never an add-on" guard, HIGH/MEDIUM confidence tiering
// (HIGH auto-files, MEDIUM is reported for a human), and idempotent upsert.
//
// ⚠️ WRITES REQUIRE --confirm (report-only default) — a scheduled or accidental
// run can never file rows unattended into a table John reads.
// PRIVACY: Supabase only. Never commit names/extracts to this public repo.
//
// Usage: node river_guides_sweep.js [--confirm] [--limit N] [--acquirer "Name"]

require('dotenv').config();
const crypto = require('crypto');
const { supabase } = require('./core/db');
const { recordUsage } = require('./core/usage');
const { extractAcquisitions } = require('./riverguides/extract');
const log = require('./utils/logger');

const SERPER_COST = 0.001;
const HAIKU_COST = 0.0004; // ≈ per extraction call (one per consolidator)

// SAFETY DEFAULT: report-only unless --confirm is passed explicitly.
const DRY = !process.argv.includes('--confirm');
const limIdx = process.argv.indexOf('--limit');
const LIMIT = limIdx > -1 ? Number(process.argv[limIdx + 1]) || 50 : 50;
const acqIdx = process.argv.indexOf('--acquirer');
const ONLY_ACQ = acqIdx > -1 ? process.argv[acqIdx + 1] : null;

// Spec §7 excludes these arms — not owner-operator sellers, so not river guides:
// utility line-clearance, distribution/supply, engineering/consulting units
// (Davey RESOURCE GROUP's power-transmission deals surfaced in a live sweep).
const OFF_THESIS = /\b(line[- ]clearance|utility vegetation|resource group|distribution|distributor|supply group|wholesale|manufactur\w+|engineering solutions|power transmission)\b/i;

// Aggressive normaliser for dedupe/identity — strips corporate suffixes so
// "Total Lawn Care, Inc" and "Total Lawn Care" are the same deal.
function norm(s) {
  return String(s || '').toLowerCase().replace(/\b(inc|llc|ltd|co|corp|company|group|holdings|the)\b/g, '').replace(/[^a-z0-9]/g, '');
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// DB industry enum → a search word (e.g. TREE_CARE → "tree care").
function industryWord(ind) {
  return ind ? ind.toLowerCase().replace(/_/g, ' ').replace(/\bservices?\b/, 'service').trim() : '';
}

// HIGH = a real announcement: a newswire, or the acquirer's own token in the
// URL (the acquirer's site, or a trade-press article whose slug names them —
// every HIGH row in the 7/16 live run was correct). Else MEDIUM (aggregator
// profiles / social / board PDFs — where every observed defect came from).
function isStrongSource(url, acquirer) {
  if (!url) return false;
  const u = norm(url);
  if (/prnewswire|businesswire|globenewswire/.test(u)) return true;
  const tokens = String(acquirer).toLowerCase().split(/[^a-z]+/).filter((t) => t.length > 3);
  return tokens.some((t) => u.includes(t));
}

async function serper(q) {
  const res = await fetch('https://google.serper.dev/search', {
    method: 'POST',
    headers: { 'X-API-KEY': process.env.SERPER_API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ q, num: 10, tbs: 'qdr:y' }), // past year — we want NEW tuck-ins
  });
  if (!res.ok) throw new Error(`serper HTTP ${res.status}`);
  const j = await res.json();
  return (j.organic || []).map((r) => ({ url: r.link, title: r.title || '', snippet: r.snippet || '' }));
}

async function main() {
  if (!process.env.SERPER_API_KEY) { log.error('SERPER_API_KEY missing — cannot sweep'); process.exit(1); }
  if (!process.env.ANTHROPIC_API_KEY) { log.error('ANTHROPIC_API_KEY missing — cannot extract'); process.exit(1); }
  const apiKey = process.env.ANTHROPIC_API_KEY;

  // 1. Consolidators + existing deals straight from the DB (never invented).
  const { data: rows, error } = await supabase.from('river_guides').select('acquirer, their_company, industry, acquirer_pe_sponsor');
  if (error) throw new Error(error.message);
  const known = new Set(rows.map((r) => `${norm(r.acquirer)}|${norm(r.their_company)}`));
  const meta = new Map(); // acquirer -> {industry, sponsor}
  for (const r of rows) if (r.acquirer && !meta.has(r.acquirer)) meta.set(r.acquirer, { industry: r.industry, sponsor: r.acquirer_pe_sponsor });
  const acquirersAll = [...meta.keys()].filter(Boolean); // full list = the "is a consolidator" check
  let acquirers = acquirersAll;
  if (ONLY_ACQ) acquirers = acquirers.filter((a) => a.toLowerCase() === ONLY_ACQ.toLowerCase());
  log.info(`Sweep: ${acquirers.length} consolidator(s) from DB, ${known.size} known (acquirer,company) pairs`);

  const found = [];
  let queries = 0;
  let extractions = 0;
  for (const acq of acquirers) {
    try {
      const m = meta.get(acq) || {};
      const iw = industryWord(m.industry);
      // Two query shapes (Lane C's discovery recipe): the announcement, plus one
      // that also surfaces the seller's name.
      const results = [
        ...await serper(`"${acq}" acquires OR acquired ${iw} announcement`),
        ...await serper(`"${acq}" acquisition "founder" OR "owner" ${iw}`),
      ].filter((r) => !OFF_THESIS.test(`${r.title} ${r.snippet}`)).slice(0, 18);
      queries += 2;
      if (!results.length) { await sleep(400); continue; }

      // ONE extraction call per consolidator over all results (shared guard).
      const acqs = await extractAcquisitions({ results, consolidator: acq, industry: m.industry, apiKey });
      extractions++;
      for (const a of acqs) {
        // A consolidator is never an add-on (a live run proposed
        // "Yummy Pools → Pool Troopers", both platforms we track).
        if (acquirersAll.some((c) => norm(c) === norm(a.company))) continue;
        const key = `${norm(acq)}|${norm(a.company)}`;
        if (known.has(key) || found.some((f) => f.key === key)) continue;
        known.add(key);
        found.push({
          key,
          acquirer: acq,
          their_company: a.company,
          deal_year: a.deal_year,
          seller_name: a.seller_name,
          resolved: a.resolved,
          city: a.city,
          state: a.state,
          industry: m.industry || null,
          acquirer_pe_sponsor: m.sponsor || null,
          source_url: a.source_url,
          source_confidence: isStrongSource(a.source_url, acq) ? 'HIGH' : 'MEDIUM',
        });
      }
      await sleep(400);
    } catch (err) {
      log.warn(`${acq}: ${err.message}`);
    }
  }
  if (queries) await recordUsage('serper', 'river_guides_sweep', queries, queries * SERPER_COST, { kind: 'consolidator_sweep' });
  if (extractions) await recordUsage('anthropic', 'river_guides_sweep', extractions, extractions * HAIKU_COST, { kind: 'target_extraction' });

  // Two sources phrase one deal differently ("Precision Pool & Spa" vs
  // "…of Fairport"). Collapse same-acquirer names where one contains the other,
  // keeping the shorter (the longer is a geo/qualifier suffix).
  const collapsed = found.filter((f) => !found.some((g) => g !== f
    && norm(g.acquirer) === norm(f.acquirer)
    && norm(f.their_company).includes(norm(g.their_company))
    && norm(g.their_company).length < norm(f.their_company).length));

  // CONFIDENCE TIERING: HIGH (real announcements) auto-files; MEDIUM
  // (aggregators / social / board PDFs — where every observed defect came from)
  // is reported for a human, never written.
  const high = collapsed.filter((f) => f.source_confidence === 'HIGH');
  const medium = collapsed.filter((f) => f.source_confidence !== 'HIGH');
  const batch = high.slice(0, LIMIT);
  const cost = queries * SERPER_COST + extractions * HAIKU_COST;
  log.info(`Sweep: ${collapsed.length} candidate(s) not already in river_guides — ${high.length} HIGH (auto-file), ${medium.length} MEDIUM (review only). ${queries} queries + ${extractions} extractions ≈ $${cost.toFixed(3)}`);
  for (const f of batch) log.info(`  ${DRY ? '[dry-run] ' : ''}FILE  ${f.acquirer} → ${f.their_company}${f.resolved ? ` (seller: ${f.seller_name})` : ''} [HIGH] ${f.source_url || ''}`);
  for (const f of medium) log.info(`        review ${f.acquirer} → ${f.their_company} [MEDIUM] ${f.source_url || ''}`);
  if (DRY || batch.length === 0) { log.info(`Sweep complete — ${DRY ? 'REPORT-ONLY (pass --confirm to file the HIGH rows)' : 'nothing new to file'}`); return; }

  // File. We file the DEAL; a seller name is carried ONLY when the shared guard
  // confirmed a source literally named them (resolved) — never guessed.
  const payload = batch.map((f) => ({
    // Deterministic, hash-suffixed id → a re-run proposes the same key, so an
    // accidental double-run can't fan out duplicates.
    deal_id: `RG-SWEEP-${norm(f.their_company).slice(0, 18)}-${crypto.createHash('md5').update(f.key).digest('hex').slice(0, 6)}`,
    full_name: f.resolved ? f.seller_name : null,
    name_status: f.resolved ? 'RESOLVED' : 'TBD',
    archetype: 'A_EXITED_OPERATOR',
    industry: f.industry,
    their_company: f.their_company,
    acquirer: f.acquirer,
    acquirer_pe_sponsor: f.acquirer_pe_sponsor,
    location_city: f.city,
    location_state: f.state,
    source: 'consolidator-sweep',
    source_url: f.source_url,
    source_confidence: f.source_confidence,
    // exit_status is point-in-time and unverified (spec §6.2) → UNKNOWN (the
    // seed's value for this case). Never inferred from the announcement.
    exit_status: 'UNKNOWN',
    current_status_verified: false,
    enrichment_status: f.resolved ? 'PENDING_T1' : 'NEEDS_NAME',
    priority_band: f.resolved ? 'ENRICH_THEN_ASSESS' : 'RESOLVE_NAME_FIRST',
    deal_year: f.deal_year,
    notes: `Auto-swept ${new Date().toISOString().slice(0, 10)} (shared extractor + corroboration guard).`,
  }));
  // Upsert w/ ignoreDuplicates: deterministic ids make a re-run a harmless
  // no-op instead of a fatal batch abort.
  const { data: ins, error: insErr } = await supabase.from('river_guides')
    .upsert(payload, { onConflict: 'deal_id', ignoreDuplicates: true }).select('deal_id');
  if (insErr) { log.error(`insert failed: ${insErr.message}`); process.exit(1); }
  log.info(`Sweep complete — ${ins.length} new add-on(s) filed (${batch.filter((f) => f.resolved).length} with a source-named seller, rest TBD/NEEDS_NAME)`);
}

main().catch((err) => { log.error(err.message); process.exit(1); });
