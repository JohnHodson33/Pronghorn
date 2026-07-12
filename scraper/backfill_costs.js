// Best-effort July cost backfill (COST-TRACKING.md e) — reconstructs spend
// that predates metering, from data we actually recorded:
//   - lead_lists.cost_actual  → list_building events (real numbers)
//   - enriched-lead count     → enrichment estimate at ~$0.01/lead
//   - classified-lead count   → classification estimate (~$0.001/lead)
// Marked meta.backfill=true so real events are distinguishable.
// RUN ONCE, AFTER migration 0009 (idempotent: skips if any backfill event exists).

const { supabase } = require('./core/db');
const log = require('./utils/logger');

async function main() {
  const { data: existing, error: probe } = await supabase
    .from('usage_events').select('id').contains('meta', { backfill: true }).limit(1);
  if (probe) { console.error(`${probe.message} — apply migration 0009 first`); process.exit(1); }
  if (existing?.length) { log.info('Backfill events already present — nothing to do.'); return; }

  const { data: lists } = await supabase.from('lead_lists')
    .select('id, query_industry, cost_actual, created_at').gt('cost_actual', 0);
  for (const l of lists || []) {
    await supabase.from('usage_events').insert({
      at: l.created_at, service: 'serper', activity: 'list_building',
      units: 1, cost_usd: l.cost_actual, meta: { backfill: true, list: l.id, industry: l.query_industry },
    });
  }

  const { count: enriched } = await supabase.from('leads').select('id', { count: 'exact', head: true }).eq('status', 'enriched');
  if (enriched) {
    await supabase.from('usage_events').insert({
      service: 'claude', activity: 'enrichment', units: enriched,
      cost_usd: Number((enriched * 0.01).toFixed(2)),
      meta: { backfill: true, note: `estimate: ${enriched} enriched leads @ ~$0.01 (incl. Exa)` },
    });
    await supabase.from('usage_events').insert({
      service: 'claude', activity: 'classification', units: enriched,
      cost_usd: Number((enriched * 0.001).toFixed(2)),
      meta: { backfill: true, note: 'industry classification estimate' },
    });
  }
  log.info(`July backfill: ${(lists || []).length} list-building events + enrichment/classification estimates (${enriched} leads)`);
}

main().catch((e) => { console.error(e.message); process.exit(1); });
