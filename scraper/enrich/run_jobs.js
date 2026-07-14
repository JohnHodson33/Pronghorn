// Enrichment-job runner — drains the enrichment_jobs queue so the UI button
// works without a CLI. THE CASCADE CONTRACT (John 7/12): a job over leads that
// are already tier-1 enriched must NEVER no-op — it cascades to tier 2
// (Hunter email + Exa LinkedIn, early exit when complete). Progress fields
// update live so the UI can show "Enriching 34/80 — 12 owners, 7 emails…".
//
// Usage: node enrich/run_jobs.js [--max-jobs 3]
// Schedule: every worker loop iteration + the 15-min GH workflow.

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { execFileSync } = require('child_process');
const path = require('path');
const { supabase } = require('../core/db');
const log = require('../utils/logger');
const { runTier2 } = require('./tier2');

// Per-runner-pass budgets. Hunter Starter is approved (John 7/12) — 500
// searches/mo lifts the old free-tier guard; env override lets John tune it
// without a redeploy. Exa is generous/cheap.
const TIER2_BUDGET = {
  hunter: Number(process.env.HUNTER_RUN_BUDGET) || 60,
  exa: Number(process.env.EXA_RUN_BUDGET) || 60,
};

async function jobLeads(job, statusFilter) {
  let q = supabase.from('leads')
    .select('id, name, website, city, state, owner_name, owner_email, owner_phone, owner_linkedin, enrichment, status, lead_list_id');
  if (job.lead_ids?.length) q = q.in('id', job.lead_ids);
  else if (job.lead_list_id) q = q.eq('lead_list_id', job.lead_list_id);
  if (statusFilter) q = q.eq('status', statusFilter);
  const { data, error } = await q.limit(500);
  if (error) throw new Error(error.message);
  return data;
}

async function setProgress(jobId, patch) {
  await supabase.from('enrichment_jobs').update(patch).eq('id', jobId);
}

async function main() {
  const maxIdx = process.argv.indexOf('--max-jobs');
  const maxJobs = maxIdx > -1 ? Number(process.argv[maxIdx + 1]) : 3;

  const { data: jobs, error } = await supabase.from('enrichment_jobs')
    .select('*').eq('status', 'queued').order('created_at', { ascending: true }).limit(maxJobs);
  if (error) { console.error(`${error.message} — apply migration 0008`); process.exit(1); }
  if (!jobs.length) { log.info('No queued enrichment jobs.'); return; }

  for (const job of jobs) {
    log.info(`Job ${job.id}: ${job.lead_ids?.length || 'whole-list'} selection${job.lead_list_id ? ` (list ${job.lead_list_id})` : ''}`);
    const fresh = await jobLeads(job, 'new');
    const enrichedSet = (await jobLeads(job, 'enriched')).filter((l) => !(l.owner_name && l.owner_email && (l.owner_phone || l.owner_linkedin)));
    const total = fresh.length + enrichedSet.length;
    await setProgress(job.id, { status: 'running', started_at: new Date().toISOString(), counts: { total, processed: 0, found_owner: 0, found_email: 0, tier1: fresh.length, tier2: enrichedSet.length } });

    try {
      let processed = 0;
      // TIER 1: untouched leads → full enrichment worker (updates its own progress via --job)
      if (fresh.length) {
        const args = [path.resolve(__dirname, 'run_enrichment.js'), '--limit', '200', '--job', job.id];
        if (job.lead_list_id) args.push('--list', job.lead_list_id);
        if (job.lead_ids?.length) args.push('--ids', job.lead_ids.join(','));
        execFileSync('node', args, { stdio: 'inherit' });
        processed += fresh.length;
      }
      // TIER 2 CASCADE: enriched-but-incomplete → channel hunt (never a no-op).
      // A digest-queued job carries its own Hunter/Exa caps (job.counts set at
      // queue time, before the running-status overwrite) — honor them so the
      // nightly budget John set actually binds; fall back to the env default.
      const budget = {
        hunter: job.counts?.hunter_budget ?? TIER2_BUDGET.hunter,
        exa: job.counts?.exa_budget ?? TIER2_BUDGET.exa,
      };
      let t2 = { processed: 0, emails: 0, linkedins: 0 };
      if (enrichedSet.length) {
        log.info(`  cascading tier 2 over ${enrichedSet.length} incomplete leads (hunter cap ${budget.hunter}, exa cap ${budget.exa})`);
        t2 = await runTier2(enrichedSet, { ...budget }, log, async (i) => {
          if (i % 5 === 0) {
            const { data: j } = await supabase.from('enrichment_jobs').select('counts').eq('id', job.id).single();
            await setProgress(job.id, { counts: { ...(j?.counts || {}), processed: processed + i, found_email: (j?.counts?.found_email || 0) } });
          }
        });
        processed += t2.processed;
      }

      // final counts from DB truth
      const after = await jobLeads(job);
      const owners = after.filter((l) => l.owner_name).length;
      const emailsNow = after.filter((l) => l.owner_email).length;
      await setProgress(job.id, {
        status: 'complete', finished_at: new Date().toISOString(),
        counts: { total, processed, found_owner: owners, found_email: emailsNow, tier1: fresh.length, tier2: t2.processed, tier2_emails: t2.emails, tier2_linkedins: t2.linkedins },
        // Hunter is a flat sub ($0 marginal); tier-2 marginal = Exa LinkedIn only
        cost_actual: Number((fresh.length * 0.01 + t2.processed * 0.006).toFixed(2)),
      });
      log.info(`  job done: ${processed} processed (${fresh.length} tier1, ${t2.processed} tier2 → +${t2.emails} emails, +${t2.linkedins} linkedins)`);
    } catch (e) {
      log.error(`  job ${job.id} failed: ${e.message}`);
      await setProgress(job.id, { status: 'failed', finished_at: new Date().toISOString() });
    }
  }
}

main().catch((e) => { console.error(e.message); process.exit(1); });
