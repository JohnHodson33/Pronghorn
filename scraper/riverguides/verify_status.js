// River-guide STATUS VERIFICATION — the highest-leverage worker (handoff §4.1):
// exit_status in the seed is point-in-time AT DEAL CLOSE. Earnouts expire and
// people quietly leave — an "EMPLOYED" seller from a 2021 deal may be free
// today. This worker re-checks each RESOLVED person via public web/LinkedIn
// snippets and sets current_status_verified; it can flip EMPLOYED → EXITED
// (unlocking pipeline) and recomputes score/band on every change.
//
// NOBODY IS CONTACTED off this list until current_status_verified is true.
//
// Usage: node riverguides/verify_status.js [--limit 30] [--band CALL_NOW] [--dry-run]
// Cost ≈ $0.004/person (1-2 Serper + 1 Haiku).

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const axios = require('axios');
const Anthropic = require('@anthropic-ai/sdk');
const { supabase } = require('../core/db');
const log = require('../utils/logger');
const { recordUsage } = require('../core/usage');
const { rescore } = require('./score');

async function serper(q) {
  const { data } = await axios.post('https://google.serper.dev/search', { q, num: 8 },
    { headers: { 'X-API-KEY': process.env.SERPER_API_KEY, 'Content-Type': 'application/json' }, timeout: 20000 });
  return (data.organic || []).map((r) => ({ url: r.link, title: r.title || '', snippet: r.snippet || '' }));
}

const SYSTEM = `You verify the CURRENT status of a person who sold their company to a consolidator. You get: who they are, what they sold, who bought it, the deal year, and fresh web/LinkedIn search results.

Determine TODAY's status:
- EXITED: evidence they have left the acquirer (new venture, "former", retired, advisor/board roles, unrelated current title)
- EMPLOYED: evidence they still work at/under the acquirer (current title at acquirer or at their old company operating under the acquirer)
- UNKNOWN: results are thin, ambiguous, or about a different same-named person — say so; never guess.

Also capture their linkedin profile URL ONLY if a result clearly shows it's this person (company/deal/geo corroboration in the snippet).

Output JSON only:
{"current_status": "EXITED|EMPLOYED|UNKNOWN", "confidence": "high|medium|low",
 "evidence": "one line citing which result and what it shows",
 "linkedin_url": "url or null", "second_venture": "name of any new company they now run, or null"}`;

async function main() {
  const arg = (f, d) => { const i = process.argv.indexOf(f); return i > -1 ? process.argv[i + 1] : d; };
  const limit = Number(arg('--limit', 30));
  const band = arg('--band', null);
  const dryRun = process.argv.includes('--dry-run');

  let q = supabase.from('river_guides').select('*')
    .eq('name_status', 'RESOLVED').eq('current_status_verified', false)
    .order('screen_score', { ascending: false }).limit(limit);
  if (band) q = q.eq('priority_band', band);
  const { data: guides, error } = await q;
  if (error) { console.error(`${error.message} — apply migration 0016 first`); process.exit(1); }
  if (!guides?.length) { log.info('No unverified resolved river guides.'); return; }
  log.info(`status verification: ${guides.length} guides (highest score first)${dryRun ? ' [dry]' : ''}`);

  const anthropic = new Anthropic();
  const totals = { in: 0, out: 0, serper: 0 };
  let verified = 0, flipped = 0;

  for (const g of guides) {
    try {
      const results = [
        ...await serper(`"${g.full_name}" "${g.their_company}"`),
        ...await serper(`site:linkedin.com/in "${g.full_name}" ${g.location_state || ''} ${g.acquirer || ''}`),
      ];
      totals.serper += 2;
      if (!results.length) { log.info(`  ? ${g.full_name}: no results — stays unverified`); continue; }

      const msg = await anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001', max_tokens: 400, system: SYSTEM,
        messages: [{ role: 'user', content: JSON.stringify({
          person: g.full_name, sold_company: g.their_company, acquirer: g.acquirer,
          deal_year: g.deal_year, state: g.location_state,
          status_at_close: g.exit_status, results: results.slice(0, 10),
        }) }],
      });
      totals.in += msg.usage.input_tokens; totals.out += msg.usage.output_tokens;
      const v = JSON.parse(msg.content[0].text.match(/\{[\s\S]*\}/)[0]);

      if (v.current_status === 'UNKNOWN' || v.confidence === 'low') {
        log.info(`  ? ${g.full_name}: inconclusive (${v.evidence?.slice(0, 90)})`);
        continue; // stays unverified — never guess
      }

      const patch = {
        exit_status: v.current_status,
        current_status_verified: true,
        notes: [g.notes, `status-verify ${new Date().toISOString().slice(0, 10)}: ${v.evidence}${v.second_venture ? ` · second venture: ${v.second_venture}` : ''}`].filter(Boolean).join('\n'),
      };
      if (v.second_venture) patch.archetype_subtype = 'SECOND_TIME_SELLER';
      if (v.linkedin_url && !g.contact?.linkedin_url) patch.contact = { ...(g.contact || {}), linkedin_url: v.linkedin_url };
      Object.assign(patch, rescore({ ...g, ...patch }));

      const wasEmployed = g.exit_status === 'EMPLOYED';
      if (dryRun) { log.info(`  [dry] ${g.full_name}: ${g.exit_status}→${v.current_status} (${v.confidence}) ${v.evidence?.slice(0, 80)}`); continue; }
      const { error: uErr } = await supabase.from('river_guides').update(patch).eq('deal_id', g.deal_id);
      if (uErr) { log.error(`  ${g.full_name}: ${uErr.message}`); continue; }
      verified++;
      if (wasEmployed && v.current_status === 'EXITED') { flipped++; log.info(`  🔓 ${g.full_name}: EMPLOYED→EXITED (${v.evidence?.slice(0, 80)})`); }
      else log.info(`  ✓ ${g.full_name}: ${v.current_status} (${v.confidence})${patch.contact?.linkedin_url ? ' +linkedin' : ''}`);
    } catch (e) { log.error(`  ${g.full_name}: ${e.message}`); }
  }

  const cost = totals.in * 0.8e-6 + totals.out * 4e-6 + totals.serper * 0.001;
  if (!dryRun && totals.serper) await recordUsage('serper', 'classification', totals.serper, cost, { river_guide_verify: verified, flipped });
  log.info(`status verification done: ${verified} verified (${flipped} EMPLOYED→EXITED unlocks) of ${guides.length}. Cost ≈ $${cost.toFixed(2)}.`);
}

main().catch((e) => { console.error(e.message); process.exit(1); });
