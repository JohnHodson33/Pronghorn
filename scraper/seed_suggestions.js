// Seed the Improvement Suggestions "brain" (John 7/12) with PM-generated
// ideas. Idempotent-ish: skips if any agent suggestions already exist.
// Agents add their own each cycle per the SELF-ITERATE QUOTA (suggestions
// are the durable, John-approvable form of the nightly quota).
// Usage: node seed_suggestions.js
const { supabase } = require('./core/db');
const log = require('./utils/logger');

const SUGGESTIONS = [
  ['Agent — PM', 'Dashboard', 'Weekly digest email: every Monday, auto-draft a "week in sourcing" summary to John+Tom — new Tier 1 listings, enrichment coverage delta, pursuits that moved, spend. The dashboard for people who did not open the dashboard.'],
  ['Agent — PM', 'Pipeline', 'Stale-pursuit auto-nudge: when a pursuit has no activity for 7+ days, auto-draft the polite broker follow-up email into the Outbox so momentum never dies of forgetfulness.'],
  ['Agent — PM', 'Companies', 'Company dedupe review queue: proprietary promotion + broker promote will eventually create near-duplicates ("ABC Tree Care LLC" vs "ABC Tree Care"). Weekly fuzzy-match pass surfaces suspected pairs for one-click merge.'],
  ['Agent — PM', 'Broker Listings', 'Listing change alerts: we already detect price changes for Market Multiples — surface "price dropped on a Tier 1 you viewed" as a Key Action. Price cuts signal motivated sellers.'],
  ['Agent — PM', 'Enrichment', 'Enrichment quality sampling: every 50 auto-enriched owners, flag 5 random ones for John/Tom spot-check ("is this really the owner?"). Catches drift before it burns an outreach.'],
  ['Agent — PM', 'Cold Calling', 'Call-prep one-pager: for any CONTACTABLE company, one click generates the call script from enrichment data — owner name, tenure signals, review themes, comparable multiples from our own listings DB. The Jake feedback loop, weaponized.'],
  ['Agent — PM', 'Deals', 'Thesis-fit re-score on new comps: as Market Multiples accumulates, periodically re-score active deals against fresh comps and flag "this asking price is now 0.8x below segment median" moments.'],
  ['Agent — PM', 'Other', 'Owner-language mirroring: enrichment captures how each company describes itself; outreach drafts should reuse THEIR vocabulary ("plant health care" vs "tree spraying") — measurable reply-rate lever, zero cost.'],
];

async function main() {
  const { data: existing, error: exErr } = await supabase.from('feedback')
    .select('id').eq('type', 'suggestion').limit(1);
  if (exErr) throw new Error(`${exErr.message} — apply migration 0010 first`);
  if (existing?.length) { log.info('Suggestions already seeded — skipping.'); return; }
  const rows = SUGGESTIONS.map(([author, page, body]) => ({ author, type: 'suggestion', page, body, status: 'suggested' }));
  const { error } = await supabase.from('feedback').insert(rows);
  if (error) throw new Error(error.message);
  log.info(`Seeded ${rows.length} PM improvement suggestions.`);
}

main().catch((e) => { console.error(e.message); process.exit(1); });
