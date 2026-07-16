// River-guide IDENTITY RESOLUTION — the ~197 NEEDS_NAME rows are real, sourced
// deals where the press never named the seller (handoff §4.3: deliberate
// queue, not missing data). This worker searches acquisition announcements,
// company about-pages and state filings for the owner's name.
//
// HARD RULE (handoff §4.4, spec §6.1): NEVER fabricate. The research phase
// repeatedly caught search engines hallucinating names (fake Juniper CEO,
// three unrelated O'Donnells conflated). A name is accepted ONLY when a
// result explicitly ties person ↔ company ↔ sale, with the source URL kept
// as provenance. Anything less stays TBD.
//
// On resolution: name_status=RESOLVED, enrichment_status=PENDING_T1, score
// recomputed (name bonus), CRM contact + company minted (same as ingest).
//
// Usage: node riverguides/resolve_names.js [--limit 25] [--dry-run]
// Cost ≈ $0.004/row attempted.

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

const SYSTEM = `You identify the OWNER WHO SOLD a specific company to a specific acquirer, from web search results. This feeds an outreach list, so a wrong name is far worse than no name.

Accept a name ONLY when a result EXPLICITLY connects that person to THIS company as owner/founder/president AND (ideally) to the sale itself. Typical acceptable evidence: acquisition press release naming the seller, the company's own about page naming the founder, an M&A advisor tombstone.

REJECT (return null) when: results are about a different company with a similar name; the person's tie is generic (an employee, a broker, the acquirer's exec); or the connection is inferred rather than stated. Search engines hallucinate — same-name different-company is the failure mode you exist to prevent.

Output JSON only:
{"owner_name": "First Last or null", "role": "Founder/Owner/President or null",
 "source_url": "the result URL that names them, or null",
 "confidence": "high|medium|low", "why": "one line"}`;

async function main() {
  const arg = (f, d) => { const i = process.argv.indexOf(f); return i > -1 ? process.argv[i + 1] : d; };
  const limit = Number(arg('--limit', 25));
  const dryRun = process.argv.includes('--dry-run');

  const { data: guides, error } = await supabase.from('river_guides').select('*')
    .eq('name_status', 'TBD')
    .order('screen_score', { ascending: false }).limit(limit);
  if (error) { console.error(`${error.message} — apply migration 0016 first`); process.exit(1); }
  if (!guides?.length) { log.info('No NEEDS_NAME river guides.'); return; }
  log.info(`identity resolution: ${guides.length} TBD rows${dryRun ? ' [dry]' : ''}`);

  const anthropic = new Anthropic();
  const totals = { in: 0, out: 0, serper: 0 };
  let resolved = 0;

  for (const g of guides) {
    try {
      const results = [
        ...await serper(`"${g.acquirer}" ${/acqui/i.test(g.acquirer || '') ? '' : 'acquires'} "${g.their_company}" owner OR founder OR president`),
        ...await serper(`"${g.their_company}" ${g.location_state || ''} founder OR owner ${g.deal_year || ''}`),
      ];
      totals.serper += 2;
      if (!results.length) { log.info(`  – ${g.their_company}: no results`); continue; }

      const msg = await anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001', max_tokens: 400, system: SYSTEM,
        messages: [{ role: 'user', content: JSON.stringify({
          company: g.their_company, acquirer: g.acquirer, deal_year: g.deal_year,
          city: g.location_city, state: g.location_state, industry: g.industry,
          results: results.slice(0, 12),
        }) }],
      });
      totals.in += msg.usage.input_tokens; totals.out += msg.usage.output_tokens;
      const v = JSON.parse(msg.content[0].text.match(/\{[\s\S]*\}/)[0]);

      // code-enforced no-guess bar: name + source URL + non-low confidence
      if (!v.owner_name || !v.source_url || v.confidence === 'low' ||
          String(v.owner_name).trim().split(/\s+/).length < 2) {
        log.info(`  – ${g.their_company}: stays TBD (${(v.why || 'no explicit owner evidence').slice(0, 90)})`);
        continue;
      }

      if (dryRun) { log.info(`  [dry] ${g.their_company} → ${v.owner_name} (${v.confidence}) ${v.source_url}`); resolved++; continue; }

      const patch = {
        full_name: v.owner_name, name_status: 'RESOLVED',
        role: v.role || null,
        source_url: v.source_url, source_confidence: v.confidence.toUpperCase(),
        enrichment_status: 'PENDING_T1',
        notes: [g.notes, `name resolved ${new Date().toISOString().slice(0, 10)}: ${v.why}`].filter(Boolean).join('\n'),
      };
      Object.assign(patch, rescore({ ...g, ...patch }));

      // mint CRM records (same path as ingest)
      const { mintCrmRecords } = require('./ingest_river_guides');
      let crm = { companyId: g.company_id, contactId: g.contact_id };
      try { crm = await mintCrmRecords({ ...g, ...patch }, false); } catch (e) { log.warn(`  crm mint: ${e.message}`); }

      const { error: uErr } = await supabase.from('river_guides')
        .update({ ...patch, contact_id: crm.contactId ?? g.contact_id, company_id: crm.companyId ?? g.company_id })
        .eq('deal_id', g.deal_id);
      if (uErr) { log.error(`  ${g.their_company}: ${uErr.message}`); continue; }
      resolved++;
      log.info(`  ✓ ${g.their_company} → ${v.owner_name} (${v.confidence}; ${v.source_url.slice(0, 60)})`);
    } catch (e) { log.error(`  ${g.their_company}: ${e.message}`); }
  }

  const cost = totals.in * 0.8e-6 + totals.out * 4e-6 + totals.serper * 0.001;
  if (!dryRun && totals.serper) await recordUsage('serper', 'classification', totals.serper, cost, { river_guide_resolve: resolved });
  log.info(`identity resolution done: ${resolved} of ${guides.length} resolved (rest stay TBD — never guessed). Cost ≈ $${cost.toFixed(2)}.`);
}

main().catch((e) => { console.error(e.message); process.exit(1); });
