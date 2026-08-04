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

// SERPER FOCUS GATE (John 8/4, TASK-QUEUE item c): Serper credits are spent
// in-focus by default — TREE_CARE primary + LANDSCAPE / IRRIGATION /
// LAWN_CARE / PEST ancillary. Out-of-focus consolidators (pool, kitchen,
// fencing, other) are swept only on an explicit --industries ask:
//   --industries all                     sweep everything (old behavior)
//   --industries POOL_SERVICES,FENCING   sweep exactly these
// The allowlist is read from app_config key `focus_industries` when Lane C
// lands it; this hardcoded default applies until then. --acquirer bypasses
// the gate (naming one consolidator IS the explicit ask).
const FOCUS_DEFAULT = ['TREE_CARE', 'LANDSCAPE', 'IRRIGATION', 'LAWN_CARE', 'PEST'];
const indIdx = process.argv.indexOf('--industries');
const INDUSTRIES = indIdx > -1 ? (process.argv[indIdx + 1] || '').toUpperCase() : null;

// Spec §7 excludes these arms — not owner-operator sellers, so not river guides:
// utility line-clearance, distribution/supply, engineering/consulting units
// (Davey RESOURCE GROUP's power-transmission deals surfaced in a live sweep).
const OFF_THESIS = /\b(line[- ]clearance|utility vegetation|resource group|distribution|distributor|supply group|wholesale|manufactur\w+|engineering solutions|power transmission|software|saa?s\b|platform software|app\b|tech(nology)? (company|startup|platform)|fintech|payments?)\b/i;

// Company-name sanity (Lane A 7/20: two HIGH rows were 2-6-char FRAGMENTS from
// a mis-parsed release). A real business name has a real word in it — reject
// fragments before they can file. This is a floor, not a matcher: legit short
// brands ("TruGreen") pass; "of", "LLC", "Fair" don't.
// A press release often DESCRIBES the target instead of naming it ("its Long
// Island tree care business", "South Carolina and Louisiana tree care
// companies"). Those aren't company names: they file as phantom rows that then
// look like duplicate twins of the real one (found 8/4 during the dedupe pass).
const DESCRIPTIVE = new RegExp([
  '\\b(companies|businesses|business|operations|assets|locations|branches|division|divisions)\\s*$',
  '^(certain|select|various|multiple|several|two|three|four|its|their)\\b',
].join('|'), 'i');

function plausibleCompanyName(name) {
  const n = String(name || '').trim();
  if (norm(n).length < 5) return false;
  if (DESCRIPTIVE.test(n)) return false;
  const words = n.split(/\s+/).filter((w) => /[a-z]/i.test(w));
  if (!words.length) return false;
  // at least one word ≥4 chars containing a vowel (a real word, not an acronym fragment)
  return words.some((w) => w.length >= 4 && /[aeiouy]/i.test(w));
}

// Aggressive normaliser for dedupe/identity — strips corporate suffixes so
// "Total Lawn Care, Inc" and "Total Lawn Care" are the same deal.
function norm(s) {
  return String(s || '').toLowerCase().replace(/&/g, ' and ')
    .replace(/\b(inc|llc|ltd|co|corp|company|group|holdings|the)\b/g, '').replace(/[^a-z0-9]/g, '');
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
// Aggregator/profile/social hosts are MEDIUM regardless of URL tokens — the
// 8/4 live run rated owler/linkedin/mergr HIGH because the acquirer's name is
// in their PROFILE urls; Lane A's 7/20 finding: every observed defect came
// from exactly this source class.
const AGGREGATOR_HOST = /\b(owler|mergr|linkedin|crunchbase|zoominfo|pitchbook|facebook|x\.com|twitter|instagram|indeed|glassdoor|bloomberg|dnb)\b/i;
function isStrongSource(url, acquirer) {
  if (!url) return false;
  if (AGGREGATOR_HOST.test(String(url))) return false;
  const u = norm(url);
  if (/prnewswire|businesswire|globenewswire/.test(u)) return true;
  const tokens = String(acquirer).toLowerCase().split(/[^a-z]+/).filter((t) => t.length > 3);
  return tokens.some((t) => u.includes(t));
}

async function serper(q, { recent = true } = {}) {
  const res = await fetch('https://google.serper.dev/search', {
    method: 'POST',
    headers: { 'X-API-KEY': process.env.SERPER_API_KEY, 'Content-Type': 'application/json' },
    // num<=10 = 1 credit (John's 8/4 cost rule); default past-year for the
    // top-up pass, no date filter in --deep (we want the FULL historical log)
    body: JSON.stringify({ q, num: 10, ...(recent ? { tbs: 'qdr:y' } : {}) }),
  });
  if (!res.ok) throw new Error(`serper HTTP ${res.status}`);
  const j = await res.json();
  return (j.organic || []).map((r) => ({ url: r.link, title: r.title || '', snippet: r.snippet || '' }));
}

// --deep (John 7/31: "systematically enumerate the FULL acquisition log per
// consolidator — paginate/iterate until dry, not a single query pass"):
// ROUNDS of query variants per consolidator; a round that yields no NEW
// candidate ends that consolidator's iteration early (dry).
function deepQueryRounds(acq, iw) {
  const year = new Date().getFullYear();
  return [
    [`"${acq}" acquires OR acquired ${iw} announcement`,
     `"${acq}" acquisition "founder" OR "owner" ${iw}`],
    [`"${acq}" acquisitions ${iw}`,
     `site:prnewswire.com OR site:businesswire.com "${acq}" ${iw}`],
    [`"${acq}" acquires ${year - 1} OR ${year - 2}`,
     `"${acq}" "joins" OR "has joined" ${iw} family OR brand`],
    [`"${acq}" partners with OR welcomes ${iw} company`,
     `"${acq}" tuck-in OR add-on acquisition`],
  ];
}

// NEW-CONSOLIDATOR DISCOVERY: an acquirer named in results that isn't in our
// set gets queued for John's one-click confirm (never auto-swept into spend —
// a confirmed one enters river_guides normally and future sweeps cover it).
const ACQ_PATTERN = /([A-Z][A-Za-z&'.-]+(?: [A-Z][A-Za-z&'.-]+){0,3}) (?:acquires|has acquired|announces (?:the )?acquisition)/g;
// bare generic words the pattern loves to capture ("…Family of Companies acquires…")
const GENERIC_SOLO = /^(companies|company|services|brands|family|group|partners|holdings|solutions|enterprises|the)$/i;
function discoverNewConsolidators(results, knownAcquirers) {
  const knownNorm = knownAcquirers.map(norm).filter(Boolean);
  const out = new Map();
  for (const r of results) {
    for (const m of `${r.title} ${r.snippet}`.matchAll(ACQ_PATTERN)) {
      const name = m[1].trim();
      if (!plausibleCompanyName(name) || GENERIC_SOLO.test(name)) continue;
      const n = norm(name);
      // ALIAS guard: "Senske Services" / "GTCR-backed Senske Services" are the
      // consolidator we already track, not a new one — reject containment
      // either way against every known acquirer
      if (knownNorm.some((k) => n.includes(k) || k.includes(n))) continue;
      if (!out.has(n)) out.set(n, { name, source_url: r.url });
    }
  }
  return [...out.values()];
}

// A seller worth filing as full_name must be a PERSON — corporate divestitures
// ("Senske acquires select Rentokil operations, seller: Rentokil") must file
// as NEEDS_NAME, not as a fake resolved person.
function personShaped(name) {
  const n = String(name || '').trim();
  if (!n || n.split(/\s+/).length < 2) return false;
  // collective sellers ("Swinski family", "the Ash brothers") are not a person:
  // filing one as a RESOLVED name sends every downstream worker hunting for a
  // human who doesn't exist (caught by the guard unit tests, 8/4)
  if (/\b(family|families|brothers|bros|sisters|estate|trust|heirs|partners)\b/i.test(n)) return false;
  return !/\b(llc|inc|corp|company|companies|holdings|group|brands|services|pest|lawn|tree|pool|rentokil|terminix|capital|equity)\b/i.test(n);
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

  // Focus gate — skip out-of-focus consolidators unless explicitly asked.
  if (!ONLY_ACQ && INDUSTRIES !== 'ALL') {
    let allow;
    if (INDUSTRIES) {
      allow = new Set(INDUSTRIES.split(',').map((s) => s.trim()).filter(Boolean));
    } else {
      const cfg = await supabase.from('app_config').select('value').eq('key', 'focus_industries').maybeSingle();
      // app_config.value is a JSON-STRING ('["TREE_CARE",…]') — parse before the
      // Array check, or a John config edit silently falls back to the hardcode
      let fromCfg = cfg.data && cfg.data.value;
      if (typeof fromCfg === 'string') { try { fromCfg = JSON.parse(fromCfg); } catch { fromCfg = null; } }
      allow = new Set(Array.isArray(fromCfg) && fromCfg.length ? fromCfg.map((x) => String(x).toUpperCase()) : FOCUS_DEFAULT);
    }
    const skipped = {};
    acquirers = acquirers.filter((a) => {
      const ind = (meta.get(a) || {}).industry || 'UNKNOWN';
      if (allow.has(ind)) return true;
      skipped[ind] = (skipped[ind] || 0) + 1;
      return false;
    });
    const skTotal = Object.values(skipped).reduce((x, y) => x + y, 0);
    if (skTotal) {
      log.info(`Focus gate: ${acquirers.length} consolidator(s) in scope [${[...allow].join(', ')}]; ` +
        `skipped ${skTotal} out-of-focus (${Object.entries(skipped).map(([k, v]) => `${k}:${v}`).join(', ')}) — pass --industries all to override`);
    }
  }
  log.info(`Sweep: ${acquirers.length} consolidator(s) from DB, ${known.size} known (acquirer,company) pairs`);

  const DEEP = process.argv.includes('--deep');
  const found = [];
  const newConsolidators = new Map(); // norm(name) → {name, source_url}
  let queries = 0;
  let extractions = 0;
  for (const acq of acquirers) {
    try {
      const m = meta.get(acq) || {};
      const iw = industryWord(m.industry);
      const rounds = DEEP ? deepQueryRounds(acq, iw)
        // top-up default: the original two-query pass, past-year only
        : [[`"${acq}" acquires OR acquired ${iw} announcement`,
            `"${acq}" acquisition "founder" OR "owner" ${iw}`]];

      for (const round of rounds) {
        const results = (await Promise.all(round.map((q) => serper(q, { recent: !DEEP }))))
          .flat().filter((r) => !OFF_THESIS.test(`${r.title} ${r.snippet}`)).slice(0, 18);
        queries += round.length;
        if (!results.length) break; // dry — later variants only get more obscure

        // auto-discover acquirers we don't track yet (queued for John, never swept)
        for (const c of discoverNewConsolidators(results, acquirersAll)) {
          if (!newConsolidators.has(norm(c.name))) newConsolidators.set(norm(c.name), c);
        }

        // ONE extraction call per round over its results (shared guard).
        const acqs = await extractAcquisitions({ results, consolidator: acq, industry: m.industry, apiKey });
        extractions++;
        let fresh = 0;
        for (const a of acqs) {
          // A consolidator is never an add-on (a live run proposed
          // "Yummy Pools → Pool Troopers", both platforms we track).
          if (acquirersAll.some((c) => norm(c) === norm(a.company))) continue;
          // fragment guard (Lane A 7/20: 2-6-char junk names reached HIGH)
          if (!plausibleCompanyName(a.company)) continue;
          const key = `${norm(acq)}|${norm(a.company)}`;
          if (known.has(key) || found.some((f) => f.key === key)) continue;
          known.add(key);
          fresh++;
          // a corporate "seller" (divestiture) is not a river guide person
          const sellerIsPerson = a.resolved && personShaped(a.seller_name);
          found.push({
            key,
            acquirer: acq,
            their_company: a.company,
            deal_year: a.deal_year,
            seller_name: sellerIsPerson ? a.seller_name : null,
            resolved: sellerIsPerson,
            city: a.city,
            state: a.state,
            industry: m.industry || null,
            acquirer_pe_sponsor: m.sponsor || null,
            source_url: a.source_url,
            source_confidence: isStrongSource(a.source_url, acq) ? 'HIGH' : 'MEDIUM',
          });
        }
        await sleep(400);
        if (DEEP && fresh === 0) break; // this consolidator ran dry — stop iterating
      }
    } catch (err) {
      log.warn(`${acq}: ${err.message}`);
    }
  }
  if (queries) {
    // burn-by-industry (8/4 focus gate, item d): which industries the queried
    // consolidators belong to — /costs + PM-STATUS read this
    const byInd = {};
    for (const a of acquirers) { const k = String(meta.get(a)?.industry || 'UNKNOWN').toUpperCase(); byInd[k] = (byInd[k] || 0) + 1; }
    await recordUsage('serper', 'river_guides_sweep', queries, queries * SERPER_COST, { kind: 'consolidator_sweep', industries: byInd });
  }
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
  log.info(`Sweep${DEEP ? ' [deep]' : ''}: ${collapsed.length} candidate(s) not already in river_guides — ${high.length} HIGH (auto-file), ${medium.length} MEDIUM (→ review pen), ${newConsolidators.size} possible NEW consolidator(s). ${queries} queries + ${extractions} extractions ≈ $${cost.toFixed(3)}`);
  for (const f of batch) log.info(`  ${DRY ? '[dry-run] ' : ''}FILE  ${f.acquirer} → ${f.their_company}${f.resolved ? ` (seller: ${f.seller_name})` : ''} [HIGH] ${f.source_url || ''}`);
  for (const f of medium) log.info(`        review ${f.acquirer} → ${f.their_company} [MEDIUM] ${f.source_url || ''}`);
  for (const c of newConsolidators.values()) log.info(`        new consolidator? ${c.name} ${c.source_url || ''}`);
  if (DRY) { log.info('Sweep complete — REPORT-ONLY (pass --confirm to file HIGH + pen MEDIUM/new-consolidators for review)'); return; }

  // REVIEW PEN (0023): MEDIUM deals + possible new consolidators wait for
  // John's one-click keep/reject on /river-guides — never silently filed,
  // never silently dropped. Upsert on (acquirer, company): re-sweeps refresh.
  const penRows = [
    ...medium.map((f) => ({
      kind: 'deal', acquirer: f.acquirer, company: f.their_company,
      seller_name: f.resolved ? f.seller_name : null, deal_year: f.deal_year,
      city: f.city, state: f.state, industry: f.industry,
      acquirer_pe_sponsor: f.acquirer_pe_sponsor,
      source_url: f.source_url, confidence: 'MEDIUM',
    })),
    ...[...newConsolidators.values()].map((c) => ({
      kind: 'consolidator', acquirer: c.name, company: '',
      source_url: c.source_url, confidence: 'MEDIUM',
    })),
  ];
  if (penRows.length) {
    const { error: penErr } = await supabase.from('discovery_candidates')
      .upsert(penRows, { onConflict: 'acquirer,company', ignoreDuplicates: true });
    if (penErr) {
      if (/discovery_candidates/.test(penErr.message)) log.warn('review pen not stored — apply migration 0023');
      else log.warn(`review pen: ${penErr.message}`);
    } else log.info(`review pen: ${penRows.length} candidate(s) queued for John (MEDIUM deals + possible new consolidators)`);
  }
  if (batch.length === 0) { log.info('Sweep complete — nothing HIGH to file'); return; }

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

// the name guards are pure — exported so they can be unit-tested without
// running a sweep (and so `require` of this file never fires a live run)
module.exports = { plausibleCompanyName, personShaped, isStrongSource, sameAcquirerHost: AGGREGATOR_HOST };

if (require.main === module) main().catch((err) => { log.error(err.message); process.exit(1); });
