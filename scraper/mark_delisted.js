// Delisting / freshness job. A listing that a FULL-INVENTORY source stops
// returning has almost certainly been taken down. We mark it delisted (keeping
// the row + financials for the Market Multiples history, per John's rule) once
// the source has run successfully but not re-seen it for ~2 daily cadences.
//
//   node mark_delisted.js [--dry-run] [--grace-hours N]
//
// Absence only proves delisting for sources that re-crawl their WHOLE catalog
// each run. Targeted crawls (businessbroker keyword pages) and the bizquest
// mirror can't prove absence, so they're excluded — their stale rows are left
// active until a dedicated URL-checker verifies them directly.

require('dotenv').config();
const { supabase } = require('./core/db.js');
const log = require('./utils/logger');

// Sources whose adapter pulls a partial slice (targeted keywords, filtered
// subset) or mirrors another feed — absence is NOT evidence of delisting.
const PARTIAL_OR_MIRROR = new Set(['businessbroker', 'franchiseresales', 'bizquest']);

function parseArgs(argv) {
  const args = { dryRun: false, graceHours: 42 };
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === '--dry-run') args.dryRun = true;
    else if (argv[i] === '--grace-hours' && argv[i + 1]) args.graceHours = parseInt(argv[++i], 10);
  }
  return args;
}

async function activeStale(sourceId, cutoffIso) {
  const out = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from('listings')
      .select('id, external_id, name, last_seen_at')
      .eq('source_id', sourceId)
      .is('delisted_at', null)
      .lt('last_seen_at', cutoffIso)
      .range(from, from + 999);
    if (error) throw new Error(error.message);
    out.push(...data);
    if (data.length < 1000) break;
  }
  return out;
}

async function main() {
  const args = parseArgs(process.argv);
  const now = new Date();
  log.info(`=== Delisting job START ${args.dryRun ? '(dry run)' : ''} (grace ${args.graceHours}h) ===`);

  const { data: sources, error } = await supabase
    .from('scrape_sources')
    .select('id, last_run_at, last_run_status');
  if (error) throw new Error(error.message);

  let totalDelisted = 0;
  for (const s of sources) {
    if (PARTIAL_OR_MIRROR.has(s.id)) continue;
    if (!s.last_run_at || !/^ok/i.test(s.last_run_status || '')) continue; // only after a clean full run
    const lastRun = new Date(s.last_run_at);
    // Guard: if the source hasn't run recently, don't mass-delist its catalog.
    if (now - lastRun > 3 * 24 * 3600 * 1000) continue;

    // Delist listings last seen > grace before this source's last successful run.
    const cutoff = new Date(lastRun.getTime() - args.graceHours * 3600 * 1000).toISOString();
    const stale = await activeStale(s.id, cutoff);
    if (stale.length === 0) continue;

    log.info(`${s.id}: ${stale.length} stale (last seen before ${cutoff.slice(0, 10)}; run ${s.last_run_at.slice(0, 10)})`);
    if (args.dryRun) { totalDelisted += stale.length; continue; }

    const ids = stale.map((r) => r.id);
    for (let i = 0; i < ids.length; i += 500) {
      const chunk = ids.slice(i, i + 500);
      const { error: upErr } = await supabase
        .from('listings')
        .update({ delisted_at: now.toISOString() })
        .in('id', chunk);
      if (upErr) { log.error(`${s.id} update failed: ${upErr.message}`); continue; }
      const events = chunk.map((id) => ({ listing_id: id, event_type: 'delisted', detail: { reason: 'absent from full crawl', grace_hours: args.graceHours } }));
      const { error: evErr } = await supabase.from('listing_events').insert(events);
      if (evErr) log.error(`${s.id} events failed: ${evErr.message}`);
    }
    totalDelisted += stale.length;
  }

  log.info(`=== Delisting job DONE — ${totalDelisted} listing(s) ${args.dryRun ? 'would be' : ''} marked delisted ===`);
}

main().catch((err) => { log.error(err.message); process.exit(1); });
