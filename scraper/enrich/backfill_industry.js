// Industry-verification backfill (ENRICHMENT-UX §4e) — classifies leads that
// were enriched BEFORE industry_verified existed, using their stored
// name + overview + website domain (no re-scrape; ~200 tokens/lead, near-free).
// Writes leads.industry_verified/off_target when 0008 is applied, and always
// mirrors into enrichment jsonb so the UI can read either way.
//
// Usage: node enrich/backfill_industry.js [--limit 100]

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const Anthropic = require('@anthropic-ai/sdk');
const { supabase } = require('../core/db');
const log = require('../utils/logger');

const INDUSTRIES = 'Pest Control | Pool Services | Lawn Care | Lake/Pond Management | Tree Care | Landscaping | HVAC | Plumbing | Electrical | Roofing | Windows & Doors | Cleaning/Janitorial | Restoration | Property Maintenance | Irrigation | Other Essential Services | Other';

const SYSTEM = `Classify what each company ACTUALLY does into exactly one of:
${INDUSTRIES}
Watch for list mismatches (a marketing agency with "Tree" in its name is NOT Tree Care). Compare with target_industry.
Output JSON only: {"industry_verified": "...", "industry_confidence": "high|medium|low", "on_target": true/false}`;

async function main() {
  const limitIdx = process.argv.indexOf('--limit');
  const limit = limitIdx > -1 ? Number(process.argv[limitIdx + 1]) : 100;

  const { data: leads, error } = await supabase.from('leads')
    .select('id, name, website, enrichment, lead_list_id')
    .eq('status', 'enriched').limit(500);
  if (error) throw new Error(error.message);
  const todo = leads.filter((l) => l.enrichment && !l.enrichment.industry_verified && !l.enrichment.skipped).slice(0, limit);
  if (!todo.length) { log.info('No leads need industry backfill.'); return; }

  const { data: lists } = await supabase.from('lead_lists').select('id, query_industry');
  const listIndustry = new Map((lists || []).map((l) => [l.id, l.query_industry]));
  const { error: probe } = await supabase.from('leads').select('industry_verified').limit(1);
  const hasCols = !probe;
  if (!hasCols) log.warn('Migration 0008 not applied — classification stays in enrichment jsonb only');

  const anthropic = new Anthropic();
  let done = 0, offTarget = 0, tokIn = 0, tokOut = 0;
  for (const l of todo) {
    try {
      const msg = await anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001', max_tokens: 120, system: SYSTEM,
        messages: [{
          role: 'user',
          content: JSON.stringify({
            company: l.name, website: l.website,
            target_industry: listIndustry.get(l.lead_list_id) || null,
            overview: l.enrichment.overview || null,
            signals: l.enrichment.signals || [],
          }),
        }],
      });
      tokIn += msg.usage.input_tokens; tokOut += msg.usage.output_tokens;
      const jsonMatch = msg.content[0].text.match(/\{[\s\S]*?\}/); // first JSON object; model may append prose
      if (!jsonMatch) throw new Error('no JSON in response');
      const out = JSON.parse(jsonMatch[0]);
      const patch = { enrichment: { ...l.enrichment, ...out } };
      if (hasCols) { patch.industry_verified = out.industry_verified; patch.off_target = out.on_target === false; }
      await supabase.from('leads').update(patch).eq('id', l.id);
      done++;
      if (out.on_target === false) { offTarget++; log.info(`  OFF-TARGET: ${l.name} → ${out.industry_verified}`); }
    } catch (e) { log.error(`  ${l.name}: ${e.message}`); }
  }
  const cost = tokIn * 0.8e-6 + tokOut * 4e-6;
  log.info(`Industry backfill: ${done} classified, ${offTarget} off-target flagged. Cost ≈ $${cost.toFixed(3)}`);
  const { recordUsage } = require('../core/usage');
  if (tokIn) await recordUsage('claude', 'classification', tokIn + tokOut, cost, { leads: done });
}

main().catch((e) => { console.error(e.message); process.exit(1); });
