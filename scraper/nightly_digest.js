// Nightly owner-contact digest + rules-gated auto-enrich (John APPROVED the
// rules-based revision of card 9bb9d925 on 7/13).
//
// The contract, verbatim from the approved revision:
//   - Nothing auto-enriches unless it matches an AUTO-ENRICH RULE John created
//     (industry + min size tier + caps). ZERO RULES = ZERO AUTO-SPEND — and the
//     same pre-0014 (missing table reads as zero rules).
//   - Building a list never activates spending: leads matching no rule show in
//     the digest as HELD, with what a rule would unlock.
//   - The digest is receipt + preview: what last night did, what tonight will
//     do (which rules, how many leads, est cost) — with one-tap PAUSE before
//     it runs (status on the nightly_digests row; the runner honors it).
//
// Usage:
//   node nightly_digest.js            # write/refresh tonight's digest row (plan+receipt) — no spend
//   node nightly_digest.js --run      # execute tonight's plan (skips itself if status='paused'
//                                     #   or no rules); queues an enrichment_jobs row so the
//                                     #   PROVEN tier1→tier2 cascade runner does the work
//
// Thesis gates stay on top of rules: in-taxonomy industry, not off_target.

require('dotenv').config({ path: require('path').resolve(__dirname, './.env') });
const { supabase } = require('./core/db');
const log = require('./utils/logger');

const TIER1_EST = 0.01, TIER2_EST = 0.012; // $/lead, from measured runs

async function loadRules() {
  const { data, error } = await supabase.from('auto_enrich_rules').select('*').eq('enabled', true);
  if (error) return { rules: [], note: 'auto_enrich_rules table not present (apply 0014) — zero rules, zero auto-spend' };
  return { rules: data || [], note: data?.length ? null : 'no rules created yet — digest is receipt-only' };
}

// size tier mirror of web/lib/size.ts (employee estimate → EBITDA hi → tier)
const BENCH = require('../web/lib/size-benchmarks.json');
function sizeTier(lead) {
  const s = { ...((lead.enrichment || {}).size_signals || {}) };
  if ((s.employees_stated ?? 0) > 500) s.employees_stated = null;
  if ((s.crew_count ?? 0) > 50) s.crew_count = null;
  if ((s.fleet_size ?? 0) > 200) s.fleet_size = null;
  let range = null;
  if (s.employees_stated) range = [s.employees_stated * 0.8, s.employees_stated * 1.2];
  else if (s.ppp?.jobs && s.ppp.jobs <= 500) range = [s.ppp.jobs * 0.7, s.ppp.jobs * 1.1];
  else if (s.linkedin_employee_band) {
    const m = String(s.linkedin_employee_band).match(/^(\d+)(?:-(\d+))?/);
    if (m) range = [Number(m[1]) || 1, m[2] ? Number(m[2]) : (Number(m[1]) || 1) * 2];
  } else if (s.crew_count) range = [s.crew_count * 2.5, s.crew_count * 4.5];
  else if (s.fleet_size) range = [s.fleet_size * 0.8, s.fleet_size * 1.6];
  else if ((lead.review_count ?? 0) >= 100) range = [5, 25];
  // AMENDMENT 4 mirror of web/lib/size.ts: PPP loan ×4.8 ×CPI ÷ payroll% is
  // the anchor; employee paths bridge via burdened wage; flat 20% margin.
  if ((lead.enrichment || {}).too_big === true) return 'too_big';
  const b = BENCH[lead.industry_verified] || BENCH.default;
  const pct = b.payroll_pct || 0.33, wage = b.burdened_wage || 58000, MARGIN = 0.20;
  let revHi;
  const loan = s.ppp?.loan && s.ppp.loan > 0 && s.ppp.loan < 10_000_000 ? s.ppp.loan : null;
  if (loan) {
    const year = Number(String(s.ppp?.date || '').match(/(20\d\d)/)?.[1]) || null;
    const cpi = year === 2020 ? 1.25 : year === 2021 ? 1.20 : 1.0;
    revHi = (loan * 4.8 * cpi / pct) * 1.15;
  } else if (range) {
    revHi = range[1] * wage / pct;
  } else return 'unsized';
  const ebitdaHi = revHi * MARGIN;
  if (ebitdaHi * 0.74 >= 10_000_000) return 'too_big';
  return ebitdaHi >= 1_000_000 ? 'platform' : ebitdaHi < 200_000 ? 'toosmall' : 'tuckin';
}

const TIER_ORDER = { platform: 0, tuckin: 1, unsized: 2, toosmall: 3, too_big: 4 };
function ruleMatches(rule, lead) {
  // hard exclusions (John 7/15): PE-owned, conglomerate/too-big, non-US —
  // never auto-enriched regardless of what a rule says
  const e = lead.enrichment || {};
  if (e.pe_owned === true || e.too_big === true || e.hq_us === false) return false;
  const inds = (rule.industries || []).map((i) => i.toLowerCase());
  if (!inds.length || !inds.includes(String(lead.industry_verified || '').toLowerCase())) return false;
  if (rule.min_size_tier) {
    const t = sizeTier(lead);
    if (TIER_ORDER[t] > TIER_ORDER[rule.min_size_tier]) return false; // must be at least as big
  }
  return true;
}

async function coverageSnapshot() {
  const { data: leads } = await supabase.from('leads').select('owner_name,owner_email,owner_phone,owner_linkedin');
  let full = 0, contactable = 0;
  for (const l of leads || []) {
    if (l.owner_name && l.owner_email && (l.owner_phone || l.owner_linkedin)) full++;
    else if (l.owner_name && (l.owner_email || l.owner_phone || l.owner_linkedin)) contactable++;
  }
  return { full, contactable, total: (leads || []).length };
}

async function buildReceipt() {
  const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  const { data: events } = await supabase.from('usage_events')
    .select('service,activity,units,cost_usd,at').gte('at', since);
  const byProvider = {};
  let spend = 0, hunterSearches = 0;
  for (const e of events || []) {
    byProvider[e.service] = Number(((byProvider[e.service] || 0) + Number(e.cost_usd || 0)).toFixed(3));
    spend += Number(e.cost_usd || 0);
    if (e.service === 'hunter') hunterSearches += Number(e.units || 0);
  }
  const coverage = await coverageSnapshot();
  return { window_hours: 24, spend_usd: Number(spend.toFixed(3)), by_provider: byProvider, hunter_searches: hunterSearches, coverage };
}

async function buildPlan(rules) {
  const { data: leads } = await supabase.from('leads')
    .select('id,name,status,industry_verified,off_target,owner_name,owner_email,owner_phone,owner_linkedin,enrichment,review_count,lead_list_id')
    .in('status', ['new', 'enriched']);
  const eligible = (leads || []).filter((l) => l.off_target !== true);

  const perRule = [];
  const chosen = new Set();
  for (const r of rules) {
    const matches = eligible.filter((l) => !chosen.has(l.id) && ruleMatches(r, l) && (
      l.status === 'new' || !(l.owner_name && l.owner_email && (l.owner_phone || l.owner_linkedin))
    ));
    // A-first ordering inside the rule, then cap
    matches.sort((a, b) => (TIER_ORDER[sizeTier(a)] ?? 2) - (TIER_ORDER[sizeTier(b)] ?? 2));
    const byDollar = Math.floor(Number(r.nightly_dollar_cap ?? 1) / TIER2_EST);
    const take = matches.slice(0, Math.min(r.max_leads_per_night ?? 20, byDollar));
    take.forEach((l) => chosen.add(l.id));
    perRule.push({
      rule_id: r.id, rule: r.name, leads: take.length,
      est_usd: Number((take.length * ((take[0]?.status === 'new') ? TIER1_EST + TIER2_EST : TIER2_EST)).toFixed(2)),
      hunter_cap: r.nightly_hunter_cap ?? 10,
      lead_ids: take.map((l) => l.id),
    });
  }

  // HELD: enrichable leads covered by no rule, grouped for John's one-tap rule creation
  const held = {};
  for (const l of eligible) {
    if (chosen.has(l.id)) continue;
    if (l.status === 'enriched' && l.owner_name && l.owner_email && (l.owner_phone || l.owner_linkedin)) continue;
    const k = l.industry_verified || 'Unclassified';
    held[k] = (held[k] || 0) + 1;
  }

  return {
    rules_fired: perRule.map(({ lead_ids, ...rest }) => rest),
    lead_ids: perRule.flatMap((p) => p.lead_ids),
    hunter_cap_total: perRule.reduce((s, p) => s + p.hunter_cap, 0),
    est_usd_total: Number(perRule.reduce((s, p) => s + p.est_usd, 0).toFixed(2)),
    held_by_industry: held,
  };
}

async function upsertDigest(patch) {
  const today = new Date().toISOString().slice(0, 10);
  const { data: existing, error: selErr } = await supabase.from('nightly_digests')
    .select('id,status').eq('digest_date', today).maybeSingle();
  if (selErr) return { missing: true }; // pre-0014
  if (existing) {
    await supabase.from('nightly_digests').update({ ...patch, updated_at: new Date().toISOString() }).eq('id', existing.id);
    return { id: existing.id, status: existing.status };
  }
  const { data: created } = await supabase.from('nightly_digests')
    .insert({ digest_date: today, status: 'planned', ...patch }).select('id,status').single();
  return { id: created?.id, status: 'planned' };
}

async function main() {
  const run = process.argv.includes('--run');
  const { rules, note } = await loadRules();
  const receipt = await buildReceipt();
  const plan = rules.length ? await buildPlan(rules) : { rules_fired: [], lead_ids: [], est_usd_total: 0, held_by_industry: {}, note };

  const { missing, status } = await upsertDigest({ receipt, plan: { ...plan, lead_ids: undefined } });
  if (missing) log.warn('nightly_digests table not present (apply 0014) — digest logged only:');
  log.info(`RECEIPT: $${receipt.spend_usd} last 24h ${JSON.stringify(receipt.by_provider)} | Hunter ${receipt.hunter_searches} | coverage FULL ${receipt.coverage.full} / CONTACTABLE ${receipt.coverage.contactable}`);
  log.info(`PLAN: ${rules.length} rule(s), ${plan.lead_ids?.length ?? 0} leads, est $${plan.est_usd_total}${note ? ` — ${note}` : ''}; held: ${JSON.stringify(plan.held_by_industry)}`);

  if (!run) return;
  if (status === 'paused') { log.info('Tonight is PAUSED by John — not queueing anything.'); return; }
  if (!rules.length || !plan.lead_ids.length) { log.info('Zero rules / zero matching leads — nothing queued (by design).'); return; }

  // queue the proven cascade (enrichment_jobs runner picks it up within 15 min).
  // Carry the digest's Hunter/Exa caps on the job so the runner honors THIS
  // night's budget instead of its own env default — the cap is why John
  // approved the digest, so it must actually bind end-to-end.
  const { error } = await supabase.from('enrichment_jobs').insert({
    lead_ids: plan.lead_ids, status: 'queued', cost_estimate: plan.est_usd_total,
    counts: {
      source: 'nightly_digest', rules: plan.rules_fired.map((r) => r.rule),
      hunter_budget: plan.hunter_cap_total, exa_budget: plan.lead_ids.length,
    },
  });
  if (error) { log.error(`job queue failed: ${error.message}`); return; }
  await upsertDigest({ status: 'ran' });
  log.info(`Queued ${plan.lead_ids.length} leads for the cascade under ${rules.length} rule(s). Caps: $${plan.est_usd_total} est, Hunter ${plan.hunter_cap_total}.`);
}

main().catch((e) => { console.error(e.message); process.exit(1); });
