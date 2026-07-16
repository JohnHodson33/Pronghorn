// RIVER-GUIDES CONSOLIDATOR-SWEEP REFRESH (TASK-QUEUE Lane A, step 9 of
// docs/RIVER-GUIDES-INTEGRATION.md; spec §5 sourcing method + §7 maps).
//
// Re-runs the acquisition-log query per known consolidator and files add-ons we
// don't already have as new river_guides rows (Archetype A, name_status TBD →
// the identity-resolution worker names them later). This is the periodic
// top-up for a seed list that was swept once by hand: only 9 of 434 rows are
// 2026 deals, so new tuck-ins are exactly what goes stale.
//
// HALLUCINATION GUARD (spec §6.1 — hard rule, and a real incident: a fabricated
// consolidator once had a real company attributed to it). Defences here:
//   1. Consolidators come from the DB's own acquirer column — never invented,
//      never from a model.
//   2. A candidate is accepted ONLY if the fetched result text literally
//      contains BOTH the consolidator name AND the target name in an
//      acquisition phrase. The target is a verbatim slice of that text — we
//      never generate a name.
//   3. No model is used for extraction. Deterministic regex over fetched text
//      only, so nothing can be imagined.
//   4. Every row carries provenance (source_url + source_confidence). No
//      sourceless rows (spec §6.3).
//   5. Owner names are NEVER guessed: every new row is TBD / NEEDS_NAME
//      (spec §6.1). We file the DEAL; resolving the human is a separate job.
// PRIVACY: writes to Supabase only. Nothing about real people is ever written
// to this repo (the repo is public; see the privacy rule in the integration doc).
//
// ⚠️ STATUS 7/16 — REPORT-ONLY BY DEFAULT (--confirm to write). Measured on a
// live 50-consolidator sweep: FINDING deals works well (every source_url came
// back real + on-thesis: Bartlett→Olympia Tree Care, ExperiGreen→Turf Masters,
// Arbor Alliance→Thornton's Tree Service, LawnPro→Sea of Green…). NAMING them
// from snippets does not, and four rounds of regex tightening kept trading one
// defect for another:
//   · person names captured as the company ("Mike Bartlett and Scott Thompson")
//   · sentence fragments ("Florida to the family")
//   · near-dupes of one deal ("JC Pool Services" / "JC Pools Services")
//   · possessives are ambiguous — "Fairport's Precision Pool" (geo, strip) vs
//     "Thornton's Tree Service" (the actual name, keep). Regex cannot tell.
//   · off-thesis subsidiaries (Davey RESOURCE GROUP utility/engineering deals,
//     which spec §7 excludes).
// NEXT STEP (handoff): keep this Serper discovery layer, but extract the target
// name with Claude (ANTHROPIC_API_KEY is already wired for the screener) and
// keep guard #2 — require the model's answer to appear VERBATIM in the fetched
// text, else drop. That gives the linguistic judgement regex lacks while making
// fabrication structurally impossible. Until then this stays report-only:
// filing half-parsed names into a shared table is worse than filing nothing.
//
// Usage: node river_guides_sweep.js [--confirm] [--limit N] [--acquirer "Name"]

require('dotenv').config();
const { supabase } = require('./core/db');
const { recordUsage } = require('./core/usage');
const log = require('./utils/logger');

const SERPER_COST = 0.001;
// SAFETY DEFAULT: report-only unless --confirm is passed explicitly. Regex
// extraction over search snippets is precise enough to FIND deals but not to
// NAME them unattended (see the header note) — so a scheduled/accidental run
// can never write half-parsed names into a table John reads.
const DRY = !process.argv.includes('--confirm');
const limIdx = process.argv.indexOf('--limit');
const LIMIT = limIdx > -1 ? Number(process.argv[limIdx + 1]) || 50 : 50;
const acqIdx = process.argv.indexOf('--acquirer');
const ONLY_ACQ = acqIdx > -1 ? process.argv[acqIdx + 1] : null;

// Corporate suffixes/noise that must never survive as a company name.
const STOP_TARGET = /^(the|a|an|its|their|our|two|three|several|multiple|another|new|two more|majority|minority|all|both)\b/i;
const BAD_TARGET = /\b(acquisition|acquisitions|company|companies|business|businesses|platform|deal|deals|assets|stake|majority|operations|customers)\b/i;
// The reverse patterns ("<Target> merges with <Acquirer>") capture text BEFORE
// the verb, so they can swallow dates/pronouns/sentence lead-ins that the
// forward pattern never sees. These reject that noise.
const NOISE_TARGET = /\b(19|20)\d{2}\b|\b(we|our|us|they|it|he|she|who|today|inc|transaction)\b|^(january|february|march|april|may|june|july|august|september|october|november|december)\b/i;

function norm(s) {
  return String(s || '').toLowerCase().replace(/\b(inc|llc|ltd|co|corp|company|group|holdings|the)\b/g, '').replace(/[^a-z0-9]/g, '');
}

async function serper(q) {
  const res = await fetch('https://google.serper.dev/search', {
    method: 'POST',
    headers: { 'X-API-KEY': process.env.SERPER_API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ q, num: 10, tbs: 'qdr:y' }), // past year — we want NEW tuck-ins
  });
  if (!res.ok) throw new Error(`serper HTTP ${res.status}`);
  return res.json();
}

/**
 * Extract (acquirer, target) pairs that literally appear in `text`.
 * Returns [] unless the acquisition phrase is present verbatim — the guard.
 */
function extractTargets(text, acquirer, industry) {
  if (!text) return [];
  const acqEsc = acquirer.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const full = text.replace(/\s+/g, ' ');
  // The acquirer must literally appear (word-bounded); else it's someone else's deal.
  if (!new RegExp(`\\b${acqEsc}\\b`, 'i').test(full)) return [];

  // MIS-ATTRIBUTION GUARD. A short single-word consolidator ("Juniper",
  // "Senske") collides with unrelated firms — a live sweep matched
  // Constellation Software's "Juniper Group" against Juniper LANDSCAPING and
  // nearly filed it. For those, demand industry context in the same text.
  const generic = !/\s/.test(acquirer) && acquirer.length <= 10;
  if (generic) {
    const VERT = /\b(landscap\w*|lawn|turf|tree|arbor\w*|pool|spa|fence|fencing|irrigation|kitchen|foodservice|grounds)\b/i;
    if (!VERT.test(full) && !(industry && new RegExp(`\\b${industry.split(/[^a-z]/i)[0]}`, 'i').test(full))) return [];
  }

  const out = [];
  const push = (raw, reverse) => {
    // Cut at the first clause/sentence boundary. NOT on generic prepositions:
    // splitting " of " truncated the real "Sea of Green Lawn Care" to "Sea".
    let target = raw.split(/[.;:|]|\s[–—-]\s|\s\(/)[0];
    // Drop a trailing location/purpose clause ("… in Massachusetts"), but never
    // split on " of " — that truncated the real "Sea of Green Lawn Care".
    target = target.split(/\s+(?:in|to|from|for|as)\s+[A-Z]/)[0];
    target = target.split(',')[0].trim().replace(/[.,\s]+$/, '');
    // Strip a leading "<Place>-based" descriptor so one deal doesn't file twice
    // ("Houston-based Green ER Lawns" vs "Green ER Lawns").
    // NOT possessives: stripping "'s" turned the real "Thornton's Tree Service"
    // into "Tree Service". A possessive is sometimes the geo ("Fairport's
    // Precision Pool") and sometimes the name itself — regex cannot tell them
    // apart, and mangling a real name is worse than a duplicate.
    target = target.replace(/^[A-Z][A-Za-z]+[- ]based\s+/, '').trim();
    // Strip a dangling preposition left by a truncated snippet ("Roots Landscape in").
    target = target.replace(/\s+(?:in|to|from|for|as|of|and|with|the)$/i, '').trim();
    // A bare descriptor is not a company ("Houston-based", "Indiana based").
    if (/^[A-Za-z]+[- ]based$/i.test(target)) return;
    if (target.length < 3 || STOP_TARGET.test(target) || BAD_TARGET.test(target)) return;
    if (reverse && NOISE_TARGET.test(target)) return;
    if (norm(target) === norm(acquirer)) return;
    // The target must not merely CONTAIN the acquirer ("Juniper Group" for
    // acquirer "Juniper") — that's the same deal restated, not an add-on.
    if (norm(target).includes(norm(acquirer))) return;
    // Final guard: the exact target string must exist verbatim in the source.
    if (!full.includes(target)) return;
    out.push(target);
  };

  // Match WITHIN a sentence, never across one: a title+snippet restates the
  // deal ("Landscape East & West. Mariani Premier Group has acquired Lan…"),
  // and spanning the boundary dragged that restatement into the name.
  const verbs = 'acquires|acquired|has acquired|announces the acquisition of|completes the acquisition of|welcomes';
  const revVerbs = 'merges with|merged with|joins forces with|joined forces with|joins|joined|has joined|is now part of|becomes part of|became part of';
  const fwd = new RegExp(`${acqEsc}[^.]{0,40}?\\b(?:${verbs})\\b\\s+([A-Z][A-Za-z0-9&,'’\\- ]{2,60})`, 'g');
  const rev = new RegExp(`([A-Z][A-Za-z0-9&'’\\- ]{2,60}?)\\s+(?:${revVerbs})\\s+${acqEsc}`, 'gi');

  for (const sentence of full.split(/(?<=[.!?])\s+(?=[A-Z])|\s\.{3,}\s|\|/)) {
    let m;
    fwd.lastIndex = 0;
    while ((m = fwd.exec(sentence)) !== null) push(m[1], false);
    rev.lastIndex = 0;
    while ((m = rev.exec(sentence)) !== null) push(m[1], true);
  }

  // A snippet restates the deal, yielding both the full name and a truncated
  // echo ("Landscape East & West" + "Landscape East"). Keep the longest of any
  // prefix family — the fuller name is the real one.
  const uniq = [...new Set(out)];
  return uniq.filter((a) => !uniq.some((b) => b !== a && b.length > a.length && norm(b).startsWith(norm(a))));
}

async function main() {
  if (!process.env.SERPER_API_KEY) { log.error('SERPER_API_KEY missing — cannot sweep'); process.exit(1); }

  // 1. Consolidators + existing deals straight from the DB (never invented).
  const { data: rows, error } = await supabase.from('river_guides').select('acquirer, their_company, industry, acquirer_pe_sponsor');
  if (error) throw new Error(error.message);
  const known = new Set(rows.map((r) => `${norm(r.acquirer)}|${norm(r.their_company)}`));
  const meta = new Map(); // acquirer -> {industry, sponsor}
  for (const r of rows) if (r.acquirer && !meta.has(r.acquirer)) meta.set(r.acquirer, { industry: r.industry, sponsor: r.acquirer_pe_sponsor });
  let acquirers = [...meta.keys()].filter(Boolean);
  if (ONLY_ACQ) acquirers = acquirers.filter((a) => a.toLowerCase() === ONLY_ACQ.toLowerCase());
  log.info(`Sweep: ${acquirers.length} consolidator(s) from DB, ${known.size} known (acquirer,company) pairs`);

  const found = [];
  let queries = 0;
  for (const acq of acquirers) {
    try {
      const j = await serper(`"${acq}" acquires OR acquired`);
      queries++;
      for (const r of (j.organic || [])) {
        const text = [r.title, r.snippet].filter(Boolean).join('. ');
        for (const target of extractTargets(text, acq, (meta.get(acq) || {}).industry)) {
          const key = `${norm(acq)}|${norm(target)}`;
          if (known.has(key)) continue;          // already have this deal
          if (found.some((f) => f.key === key)) continue;
          known.add(key);
          const m = meta.get(acq) || {};
          found.push({
            key,
            acquirer: acq,
            their_company: target,
            industry: m.industry || null,
            acquirer_pe_sponsor: m.sponsor || null,
            source_url: r.link || null,
            // Snippet-sourced → MEDIUM at best; the acquirer's own domain → HIGH.
            source_confidence: r.link && new RegExp(norm(acq).slice(0, 8), 'i').test(norm(r.link)) ? 'HIGH' : 'MEDIUM',
            evidence: text.slice(0, 240),
          });
        }
      }
      await new Promise((r) => setTimeout(r, 400));
    } catch (err) {
      log.warn(`${acq}: ${err.message}`);
    }
  }
  if (queries) await recordUsage('serper', 'river_guides_sweep', queries, queries * SERPER_COST, { kind: 'consolidator_sweep' });

  const batch = found.slice(0, LIMIT);
  log.info(`Sweep found ${found.length} candidate add-on(s) not already in river_guides (filing ${batch.length}, ${queries} queries ≈ $${(queries * SERPER_COST).toFixed(3)})`);
  for (const f of batch) log.info(`  ${DRY ? '[dry-run] ' : ''}${f.acquirer} → ${f.their_company} [${f.source_confidence}] ${f.source_url || ''}`);
  if (DRY || batch.length === 0) { log.info(`Sweep complete — ${DRY ? 'dry run, nothing written' : 'nothing new'}`); return; }

  // 2. File as Archetype A, name TBD. We file the DEAL; naming the human who
  //    sold is the identity-resolution worker's job (never guessed here).
  const payload = batch.map((f) => ({
    deal_id: `sweep-${norm(f.acquirer).slice(0, 12)}-${norm(f.their_company).slice(0, 14)}`,
    full_name: null,
    name_status: 'TBD',
    archetype: 'A_EXITED_OPERATOR',
    industry: f.industry,
    their_company: f.their_company,
    acquirer: f.acquirer,
    acquirer_pe_sponsor: f.acquirer_pe_sponsor,
    source: 'consolidator-sweep',
    source_url: f.source_url,
    source_confidence: f.source_confidence,
    exit_status: null,             // point-in-time; unknown until verified (spec §6.2)
    current_status_verified: false,
    enrichment_status: 'NEEDS_NAME',
    notes: `Auto-swept ${new Date().toISOString().slice(0, 10)}. Evidence: "${f.evidence}"`,
  }));
  const { data: ins, error: insErr } = await supabase.from('river_guides').insert(payload).select('id');
  if (insErr) { log.error(`insert failed: ${insErr.message}`); process.exit(1); }
  log.info(`Sweep complete — ${ins.length} new add-on(s) filed as TBD/NEEDS_NAME`);
}

// Exported for tests: extractTargets is the hallucination guard, so it should
// be exercisable in isolation (incl. the mis-attribution cases).
module.exports = { extractTargets, norm };

if (require.main === module) {
  main().catch((err) => { log.error(err.message); process.exit(1); });
}
