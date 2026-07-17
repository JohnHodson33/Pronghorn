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
//   3. Claude (Haiku) READS the fetched text and reports the target; it is told
//      never to use outside knowledge. It supplies only the linguistic
//      judgement regex could not: "Thornton's Tree Service" is a real name
//      while "Fairport's Precision Pool" is a geo possessive — indistinguishable
//      by pattern. Everything it returns then goes through verifyExtraction.
//   4. Every row carries provenance (source_url + source_confidence). No
//      sourceless rows (spec §6.3).
//   5. Owner names are NEVER guessed: every new row is TBD / NEEDS_NAME
//      (spec §6.1). We file the DEAL; resolving the human is a separate job.
//   6. Only HIGH-confidence rows auto-file (see the tiering note in main()).
// PRIVACY: writes to Supabase only. Nothing about real people is ever written
// to this repo (the repo is public; see the privacy rule in the integration doc).
//
// ⚠️ WRITES REQUIRE --confirm (report-only default), so a scheduled or
// accidental run can never file rows unattended into a table John reads.
//
// WHY CLAUDE, NOT REGEX (measured 7/16): four rounds of regex tightening kept
// trading one defect for another — person names as the company ("Mike Bartlett
// and Scott Thompson"), fragments ("Florida to the family"), near-dupes, and a
// possessive-strip that mangled the real "Thornton's Tree Service" into "Tree
// Service". Claude + the verbatim guard fixed all of them on the same inputs.
// The guard is what keeps this honest: the model can say anything, but a name
// that is not literally in the fetched text cannot be filed.
//
// Usage: node river_guides_sweep.js [--confirm] [--limit N] [--acquirer "Name"]

require('dotenv').config();
const crypto = require('crypto');
const Anthropic = require('@anthropic-ai/sdk');
const { supabase } = require('./core/db');
const { recordUsage } = require('./core/usage');
const log = require('./utils/logger');

const MODEL = 'claude-haiku-4-5-20251001';
const HAIKU_COST = 0.0004; // ≈ per extraction call, same order as classify_industries

// The model reads the fetched text and reports what it says — it never supplies
// knowledge. Everything it returns is re-checked verbatim against the source
// (verifyExtraction), so a fabricated name cannot survive.
const EXTRACT_SYSTEM = `You extract acquisition facts from a search result about a business consolidator.

Given the consolidator name and the result text, identify the company the consolidator ACQUIRED (the "add-on"/target).

STRICT RULES:
- Report ONLY what the text literally states. Never use outside knowledge.
- The target must be a COMPANY name, never a person's name, never a place, never a descriptor ("Houston-based"), never a sentence fragment.
- Return the company's full name EXACTLY as written in the text (character-for-character, including any possessive like "Thornton's Tree Service").
- If the text is about the consolidator being acquired/owned, a different company's deal, a non-acquisition, or you are unsure → target must be null.
- If the acquirer in the text is a DIFFERENT company that merely shares a word with the consolidator (e.g. a software "Juniper Group" vs a landscaping "Juniper"), target must be null.
- deal_year: 4-digit year ONLY if the text states it, else null.

Respond ONLY with JSON: {"target": "<exact company name>" | null, "deal_year": <year> | null}`;

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
// Spec §7 excludes these arms — not owner-operator sellers, so not river guides:
// utility line-clearance, distribution/supply, and engineering/consulting units
// (Davey RESOURCE GROUP's power-transmission deals surfaced in the live sweep).
const OFF_THESIS = /\b(line[- ]clearance|utility vegetation|resource group|distribution|distributor|supply group|wholesale|manufactur\w+|engineering solutions|power transmission)\b/i;

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
 * THE GUARD. Accept a model-proposed target only if the source text supports it.
 * Pure + synchronous so it is unit-testable against the known-bad cases, and so
 * every write path is forced through the same check.
 */
function verifyExtraction(target, text, acquirer, industry, consolidators) {
  if (!target || typeof target !== 'string') return null;
  const full = text.replace(/\s+/g, ' ');
  const t = target.trim().replace(/[.,;\s]+$/, '');

  // 1. VERBATIM: the name must appear literally in the fetched text. This is
  //    what makes fabrication impossible regardless of what the model says.
  if (!full.toLowerCase().includes(t.toLowerCase())) return null;
  // 2. The acquirer must literally appear too (word-bounded) — else it's someone
  //    else's deal being restated.
  const acqEsc = acquirer.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  if (!new RegExp(`\\b${acqEsc}\\b`, 'i').test(full)) return null;
  // 3. Mis-attribution guard: a short single-word consolidator ("Juniper")
  //    collides with unrelated firms — demand industry context in the text.
  const generic = !/\s/.test(acquirer) && acquirer.length <= 10;
  if (generic) {
    const VERT = /\b(landscap\w*|lawn|turf|tree|arbor\w*|pool|spa|fence|fencing|irrigation|kitchen|foodservice|grounds|pest)\b/i;
    if (!VERT.test(full) && !(industry && new RegExp(`\\b${industry.split(/[^a-z]/i)[0]}`, 'i').test(full))) return null;
  }
  // 4. Shape: not the acquirer restated, not a descriptor, not junk.
  if (t.length < 3 || t.length > 70) return null;
  if (STOP_TARGET.test(t) || BAD_TARGET.test(t)) return null;
  if (/^[A-Za-z]+[- ]based$/i.test(t)) return null;
  if (norm(t) === norm(acquirer) || norm(t).includes(norm(acquirer))) return null;
  if (!norm(t)) return null;
  // 5. People are not companies. The prompt forbids it, but the guard must not
  //    depend on the model obeying — a verbatim check alone can't catch this,
  //    since "Mike Bartlett and Scott Thompson" really is in the source text.
  if (/^[A-Z][a-z]+\s+[A-Z][a-z]+(?:\s+and\s+[A-Z][a-z]+\s+[A-Z][a-z]+)+$/.test(t)) return null;
  // 6. A CONSOLIDATOR is not an add-on. Pages that list many firms (broker
  //    "sell your business" pages, aggregator profiles) invite pairing two
  //    platforms together — a live run proposed "Yummy Pools → Pool Troopers",
  //    both of which are consolidators we already track.
  if (consolidators && consolidators.some((c) => norm(c) === norm(t))) return null;
  return t;
}

/**
 * Ask Claude what the text says was acquired, then verify it verbatim.
 * The model supplies linguistic judgement (regex could not tell "Thornton's
 * Tree Service" — a real name — from "Fairport's Precision Pool" — a geo
 * possessive); the guard supplies the integrity.
 */
async function extractWithClaude(client, text, acquirer, industry, consolidators) {
  const res = await client.messages.create({
    model: MODEL,
    max_tokens: 80,
    system: EXTRACT_SYSTEM,
    messages: [{ role: 'user', content: JSON.stringify({ consolidator: acquirer, industry: industry || null, text: text.slice(0, 900) }) }],
  });
  const raw = (res.content[0]?.text ?? '').replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
  let parsed;
  try { parsed = JSON.parse(raw); } catch { return null; }
  const target = verifyExtraction(parsed.target, text, acquirer, industry, consolidators);
  if (!target) return null;
  const year = Number.isInteger(parsed.deal_year) && parsed.deal_year >= 2000 && parsed.deal_year <= 2030 ? parsed.deal_year : null;
  return { target, deal_year: year };
}

/**
 * LEGACY regex extractor — retained only for the unit suite / comparison.
 * Superseded by extractWithClaude: it could not name reliably (see header).
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
  const acquirersAll = [...meta.keys()].filter(Boolean); // full list = the "is a consolidator" check
  let acquirers = acquirersAll;
  if (ONLY_ACQ) acquirers = acquirers.filter((a) => a.toLowerCase() === ONLY_ACQ.toLowerCase());
  log.info(`Sweep: ${acquirers.length} consolidator(s) from DB, ${known.size} known (acquirer,company) pairs`);

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const found = [];
  let queries = 0;
  let extractions = 0;
  for (const acq of acquirers) {
    try {
      const j = await serper(`"${acq}" acquires OR acquired`);
      queries++;
      for (const r of (j.organic || [])) {
        const text = [r.title, r.snippet].filter(Boolean).join('. ');
        // Spec §7 excludes utility line-clearance / distribution / engineering
        // arms — they aren't owner-operator sellers (e.g. Davey RESOURCE GROUP).
        if (OFF_THESIS.test(text)) continue;
        // Cheap prefilter: only spend a model call when the text plausibly
        // describes an acquisition involving this consolidator.
        if (!new RegExp(`\\b${acq.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(text)) continue;
        if (!/\b(acquir\w+|acquisition|merge[sd]?|joins|joined|now part of)\b/i.test(text)) continue;

        let hit;
        try {
          hit = await extractWithClaude(client, text, acq, (meta.get(acq) || {}).industry, acquirersAll);
          extractions++;
        } catch (e) { continue; }
        if (!hit) continue;                       // model unsure, or guard rejected

        const key = `${norm(acq)}|${norm(hit.target)}`;
        if (known.has(key)) continue;             // already have this deal
        if (found.some((f) => f.key === key)) continue;
        known.add(key);
        const m = meta.get(acq) || {};
        found.push({
          key,
          acquirer: acq,
          their_company: hit.target,
          deal_year: hit.deal_year,
          industry: m.industry || null,
          acquirer_pe_sponsor: m.sponsor || null,
          source_url: r.link || null,
          // Snippet-sourced → MEDIUM at best; the acquirer's own domain → HIGH.
          source_confidence: r.link && new RegExp(norm(acq).slice(0, 8), 'i').test(norm(r.link)) ? 'HIGH' : 'MEDIUM',
          evidence: text.slice(0, 240),
        });
      }
      await new Promise((r) => setTimeout(r, 400));
    } catch (err) {
      log.warn(`${acq}: ${err.message}`);
    }
  }
  if (queries) await recordUsage('serper', 'river_guides_sweep', queries, queries * SERPER_COST, { kind: 'consolidator_sweep' });
  if (extractions) await recordUsage('anthropic', 'river_guides_sweep', extractions, extractions * HAIKU_COST, { kind: 'target_extraction', model: MODEL });

  // CONFIDENCE TIERING (measured 7/16): every HIGH row came from a real
  // announcement (prnewswire, the acquirer's own site, trade press) and was
  // correct; every observed defect came from a MEDIUM source (aggregator
  // profiles, a Facebook post, an irrigation-district board PDF that isn't an
  // acquisition at all). So HIGH auto-files; MEDIUM is reported for a human,
  // never written. Cheap rule, and it maps exactly onto the observed split.
  // Two sources phrase one deal differently ("Precision Pool & Spa" vs
  // "…of Fairport"). Collapse same-acquirer names where one contains the other,
  // keeping the shorter — Claude returns full names, so the longer variant is a
  // geo/qualifier suffix rather than a truncation.
  const collapsed = found.filter((f) => !found.some((g) => g !== f
    && norm(g.acquirer) === norm(f.acquirer)
    && norm(f.their_company).includes(norm(g.their_company))
    && norm(g.their_company).length < norm(f.their_company).length));

  const high = collapsed.filter((f) => f.source_confidence === 'HIGH');
  const medium = collapsed.filter((f) => f.source_confidence !== 'HIGH');
  const batch = high.slice(0, LIMIT);
  const cost = queries * SERPER_COST + extractions * HAIKU_COST;
  log.info(`Sweep: ${collapsed.length} candidate(s) not already in river_guides — ${high.length} HIGH (auto-file), ${medium.length} MEDIUM (review only). ${queries} queries + ${extractions} extractions ≈ $${cost.toFixed(3)}`);
  for (const f of batch) log.info(`  ${DRY ? '[dry-run] ' : ''}FILE  ${f.acquirer} → ${f.their_company} [HIGH] ${f.source_url || ''}`);
  for (const f of medium) log.info(`        review ${f.acquirer} → ${f.their_company} [MEDIUM] ${f.source_url || ''}`);
  if (DRY || batch.length === 0) { log.info(`Sweep complete — ${DRY ? 'REPORT-ONLY (pass --confirm to file the HIGH rows)' : 'nothing new to file'}`); return; }

  // 2. File as Archetype A, name TBD. We file the DEAL; naming the human who
  //    sold is the identity-resolution worker's job (never guessed here).
  const payload = batch.map((f) => ({
    // Deterministic id → a re-run proposes the same key, so an accidental
    // double-run can't fan out duplicates (and it marks sweep provenance).
    // Hash suffix because truncating the name collided distinct deals
    // ("Seacoast Tree Care and Turf" vs "…and Seacoast Turf Care").
    deal_id: `RG-SWEEP-${norm(f.their_company).slice(0, 18)}-${crypto.createHash('md5').update(f.key).digest('hex').slice(0, 6)}`,
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
    // exit_status is point-in-time and we have NOT verified it (spec §6.2), so
    // it is UNKNOWN — the value the seed already uses for exactly this case.
    // Never inferred from the announcement.
    exit_status: 'UNKNOWN',
    current_status_verified: false,
    enrichment_status: 'NEEDS_NAME',
    priority_band: 'RESOLVE_NAME_FIRST',  // matches how the seed bands NEEDS_NAME rows
    deal_year: f.deal_year,               // only when the source stated it
    notes: `Auto-swept ${new Date().toISOString().slice(0, 10)}. Evidence: "${f.evidence}"`,
  }));
  // Upsert w/ ignoreDuplicates: deterministic ids make a re-run a harmless no-op
  // instead of a fatal batch abort (one collision previously killed all 22 rows).
  const { data: ins, error: insErr } = await supabase.from('river_guides')
    .upsert(payload, { onConflict: 'deal_id', ignoreDuplicates: true }).select('deal_id');
  if (insErr) { log.error(`insert failed: ${insErr.message}`); process.exit(1); }
  log.info(`Sweep complete — ${ins.length} new add-on(s) filed as TBD/NEEDS_NAME`);
}

// Exported for tests: extractTargets is the hallucination guard, so it should
// be exercisable in isolation (incl. the mis-attribution cases).
// verifyExtraction is THE guard — exported so it can be unit-tested against
// hallucinated/known-bad model answers independently of any live model call.
module.exports = { verifyExtraction, extractTargets, norm };

if (require.main === module) {
  main().catch((err) => { log.error(err.message); process.exit(1); });
}
