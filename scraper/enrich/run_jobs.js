// Enrichment-job runner — drains the enrichment_jobs queue (ENRICHMENT-UX §3)
// so the UI button works without a CLI. One pass per invocation (cron/loop/
// workflow friendly): picks queued jobs oldest-first, runs the enrichment
// worker scoped to the job's selection, records counts + actual cost.
//
// Usage: node enrich/run_jobs.js [--max-jobs 3]

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { execFileSync } = require('child_process');
const path = require('path');
const { supabase } = require('../core/db');
const log = require('../utils/logger');

async function main() {
  const maxIdx = process.argv.indexOf('--max-jobs');
  const maxJobs = maxIdx > -1 ? Number(process.argv[maxIdx + 1]) : 3;

  const { data: jobs, error } = await supabase.from('enrichment_jobs')
    .select('*').eq('status', 'queued').order('created_at', { ascending: true }).limit(maxJobs);
  if (error) { console.error(`${error.message} — apply migration 0008`); process.exit(1); }
  if (!jobs.length) { log.info('No queued enrichment jobs.'); return; }

  for (const job of jobs) {
    log.info(`Job ${job.id}: ${job.lead_ids?.length || 'whole-list'} selection${job.lead_list_id ? ` (list ${job.lead_list_id})` : ''}`);
    await supabase.from('enrichment_jobs').update({ status: 'running', started_at: new Date().toISOString() }).eq('id', job.id);
    try {
      // mark explicit selections so the worker scopes to them
      const before = await countEnriched(job);
      const args = [path.resolve(__dirname, 'run_enrichment.js'), '--limit', '200'];
      if (job.lead_list_id) args.push('--list', job.lead_list_id);
      if (job.lead_ids?.length) args.push('--ids', job.lead_ids.join(','));
      execFileSync('node', args, { stdio: 'inherit' });
      const after = await countEnriched(job);
      await supabase.from('enrichment_jobs').update({
        status: 'complete', finished_at: new Date().toISOString(),
        counts: { enriched: after - before },
        cost_actual: Number(((after - before) * 0.01).toFixed(2)),
      }).eq('id', job.id);
    } catch (e) {
      log.error(`  job ${job.id} failed: ${e.message}`);
      await supabase.from('enrichment_jobs').update({ status: 'failed', finished_at: new Date().toISOString() }).eq('id', job.id);
    }
  }
}

async function countEnriched(job) {
  let q = supabase.from('leads').select('id', { count: 'exact', head: true }).eq('status', 'enriched');
  if (job.lead_ids?.length) q = q.in('id', job.lead_ids);
  else if (job.lead_list_id) q = q.eq('lead_list_id', job.lead_list_id);
  const { count } = await q;
  return count ?? 0;
}

main().catch((e) => { console.error(e.message); process.exit(1); });
