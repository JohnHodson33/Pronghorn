// One-time backfill: PE-ownership + US-presence + conglomerate (too-big)
// flags over EXISTING enriched leads (John 7/15 — new enrichments detect these
// at tier-1 now; this catches the ~300 already-enriched rows).
//
// Method per the queue spec: Claude over the STORED enrichment jsonb
// (overview/signals text) for everyone; plus one Exa web check for
// Platform-tier leads — PE ownership hides exactly in the big ones
// (exemplar: All Turf ↔ Turf Masters Brands roll-up).
//
// Writes into enrichment jsonb: pe_owned, pe_owner, hq_us, too_big_signals[],
// too_big; hq_us=false also sets off_target + reason. Idempotent: skips leads
// already carrying a flags_backfill marker.
//
// Usage: node enrich/flags_backfill.js [--limit 400] [--dry-run]

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const axios = require('axios');
const Anthropic = require('@anthropic-ai/sdk');
const { supabase } = require('../core/db');
const log = require('../utils/logger');
const { recordUsage } = require('../core/usage');

const SYSTEM = `You screen acquisition targets for three disqualifiers, using ONLY the evidence provided (a stored company overview, signal notes, and optionally web snippets). Never guess — absence of evidence = null/false/uncertain.

1. PE ownership: phrases like "a portfolio company of X", "backed by X", "acquired by X", "an X company", roll-up brand affiliations. pe_owner = the firm/platform name VERBATIM.
2. US presence: is the company's HQ / primary operation in the US? Non-US address formats, foreign city HQs, ".co.uk"-style domains, "serving <foreign country>" → false. US city/state evidence → true. Thin evidence → "uncertain".
3. Conglomerate scale: multi-continent presence, "group of companies", N subsidiaries, franchise networks, "offices in" many cities.

Output JSON only:
{"pe_owned": true/false/null, "pe_owner": "verbatim or null",
 "hq_us": true/false/"uncertain",
 "too_big_signals": ["verbatim markers, empty if none"]}`;

async function exaSnippets(name, state) {
  try {
    const { data } = await axios.post('https://api.exa.ai/search', {
      query: `"${name}" ${state || ''} acquired OR "portfolio company" OR "backed by" private equity`,
      numResults: 4, contents: { text: { maxCharacters: 400 } },
    }, { headers: { 'x-api-key': process.env.EXA_API_KEY, 'content-type': 'application/json' }, timeout: 25000 });
    return (data.results || []).map((r) => ({ title: r.title, url: r.url, text: (r.text || '').slice(0, 300) }));
  } catch { return []; }
}

// platform-tier mirror (same heuristic the digest uses)
const BENCH = require('../../web/lib/size-benchmarks.json');
function isPlatformTier(l) {
  const s = (l.enrichment || {}).size_signals || {};
  let hi = null;
  if (s.employees_stated && s.employees_stated <= 500) hi = s.employees_stated * 1.2;
  else if (s.ppp?.jobs && s.ppp.jobs <= 500) hi = s.ppp.jobs * 1.1;
  else if (s.linkedin_employee_band) { const m = String(s.linkedin_employee_band).match(/^(\d+)(?:-(\d+))?/); if (m) hi = Number(m[2] || m[1]) || null; }
  if (!hi) return false;
  const b = BENCH[l.industry_verified] || BENCH.default;
  return hi * b.revenue_per_employee * b.ebitda_margin[1] >= 1_000_000;
}

async function main() {
  const arg = (f, d) => { const i = process.argv.indexOf(f); return i > -1 ? Number(process.argv[i + 1]) : d; };
  const limit = arg('--limit', 400);
  const dryRun = process.argv.includes('--dry-run');

  const { data: leads } = await supabase.from('leads')
    .select('id,name,website,city,state,industry_verified,off_target,enrichment')
    .eq('status', 'enriched');
  const targets = (leads || [])
    .filter((l) => l.enrichment && !l.enrichment.flags_backfill && !l.enrichment.skipped)
    .slice(0, limit);
  log.info(`flags backfill: ${targets.length} enriched leads to screen`);

  const anthropic = new Anthropic();
  const totals = { in: 0, out: 0, exa: 0 };
  let pe = 0, nonUs = 0, tooBig = 0;

  for (const l of targets) {
    try {
      const e = l.enrichment || {};
      const platform = isPlatformTier(l);
      const snippets = platform ? await exaSnippets(l.name, l.state) : [];
      if (platform) totals.exa++;

      const msg = await anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001', max_tokens: 350, system: SYSTEM,
        messages: [{ role: 'user', content: JSON.stringify({
          name: l.name, website: l.website, city: l.city, state: l.state,
          industry: l.industry_verified,
          overview: e.overview || null, signals: e.signals || [],
          web_snippets: snippets,
        }) }],
      });
      totals.in += msg.usage.input_tokens; totals.out += msg.usage.output_tokens;
      const m = msg.content[0].text.match(/\{[\s\S]*\}/);
      const v = JSON.parse(m[0]);

      const enrich = { ...e, flags_backfill: { at: new Date().toISOString(), exa_checked: platform } };
      const patch = { enrichment: enrich };
      if (v.pe_owned === true && v.pe_owner) { enrich.pe_owned = true; enrich.pe_owner = v.pe_owner; pe++; }
      if (v.hq_us === false) {
        enrich.hq_us = false;
        enrich.off_target_reason = 'non-US headquarters';
        patch.off_target = true; nonUs++;
      } else if (v.hq_us === true) enrich.hq_us = true;
      if (Array.isArray(v.too_big_signals) && v.too_big_signals.length) {
        enrich.too_big = true; enrich.too_big_signals = v.too_big_signals; tooBig++;
      }

      if (dryRun) {
        if (enrich.pe_owned || enrich.hq_us === false || enrich.too_big)
          log.info(`  [dry] ${l.name}: ${enrich.pe_owned ? `PE(${enrich.pe_owner}) ` : ''}${enrich.hq_us === false ? 'NON-US ' : ''}${enrich.too_big ? 'TOO-BIG' : ''}`);
        continue;
      }
      const { error } = await supabase.from('leads').update(patch).eq('id', l.id);
      if (error) log.error(`  ${l.name}: ${error.message}`);
      else if (enrich.pe_owned || enrich.hq_us === false || enrich.too_big)
        log.info(`  ⚑ ${l.name}: ${enrich.pe_owned ? `PE-owned (${enrich.pe_owner}) ` : ''}${enrich.hq_us === false ? 'non-US→off_target ' : ''}${enrich.too_big ? `too-big [${(enrich.too_big_signals || []).join('; ').slice(0, 80)}]` : ''}`);
    } catch (err) { log.error(`  ${l.name}: ${err.message}`); }
  }

  const cost = totals.in * 0.8e-6 + totals.out * 4e-6 + totals.exa * 0.006;
  if (!dryRun && totals.in) await recordUsage('claude', 'classification', totals.in + totals.out, cost, { flags_backfill: targets.length, pe, nonUs, tooBig });
  log.info(`flags backfill done: ${pe} PE-owned, ${nonUs} non-US (off-targeted), ${tooBig} too-big of ${targets.length}. Cost ≈ $${cost.toFixed(2)}.`);
}

main().catch((e) => { console.error(e.message); process.exit(1); });
