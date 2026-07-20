// Non-PPP ensemble size estimator (John 7/20: "size estimation for as many
// companies as possible… start thinking of ways to do this outside the PPP
// database"). For proprietary leads that PPP can't cover and that lack a
// strong structured signal (stated employees / LinkedIn band / crew / fleet),
// Claude reads EVERY captured signal — overview, acquisition-relevant signals,
// years in business, Google review count + rating, service-area breadth,
// locations — and returns a REVENUE RANGE + CONFIDENCE + one-line basis.
//
// Stored as size_signals.ai_estimate {revenue:[lo,hi], confidence, basis}. The
// size lib (web/lib/size.ts) falls through to it ONLY when no structured path
// fires, so every company gets a size + confidence, never blank — and it's
// always flagged lower-confidence than PPP (capped at 'medium', never 'high').
//
// Cost ≈ $0.001/lead (one Haiku call). One attempt per lead ever
// (ai_estimate.at marks it). Guardrail: never writes revenue as fact — it's an
// explicit estimate the UI labels.
//
// Usage: node enrich/size_estimate.js [--limit 60] [--dry-run] [--industry TREE_CARE]

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const Anthropic = require('@anthropic-ai/sdk');
const { supabase } = require('../core/db');
const log = require('../utils/logger');
const { recordUsage } = require('../core/usage');

const SYSTEM = `You estimate ANNUAL REVENUE for a small US home/property-services business from indirect public signals, for an acquisition-sourcing tool. You never see financials — this is an explicit ESTIMATE the UI labels as lower-confidence, so a sensible range beats false precision.

Reason from what's given: Google review count (a rough demand/scale proxy — a handful of reviews ≈ a small local operator; 100+ ≈ established; 500+ ≈ multi-crew regional), rating, years in business, stated service area / number of locations / multi-metro breadth, and any crew/fleet/team hints in the overview or signals. Industry sets the revenue-per-headcount scale (a tree-care crew bills more than a lawn-mowing route).

Output JSON only:
{"revenue_low": <int USD/yr>, "revenue_high": <int USD/yr>,
 "confidence": "low" | "medium",   // medium only when 2+ signals corroborate; never claim high
 "basis": "one line naming the signals you used, e.g. '149 reviews + FL lawn platform → mid-six-figure to low-seven'"}

Ranges should be wide enough to be honest (often 2-4x low to high for thin signals). Floor at $50k; a solo operator with a few reviews is ~$100-300k. Never return revenue_high below revenue_low.`;

function hasStructuredSignal(ss) {
  return !!(ss && (ss.ppp || ss.employees_stated || ss.linkedin_employee_band || ss.crew_count || ss.fleet_size));
}

async function main() {
  const arg = (f, d) => { const i = process.argv.indexOf(f); return i > -1 ? process.argv[i + 1] : d; };
  const limit = Number(arg('--limit', 60));
  const industry = arg('--industry', null);
  const dryRun = process.argv.includes('--dry-run');

  let q = supabase.from('leads')
    .select('id,name,industry_verified,review_count,rating,website,city,state,enrichment,company_id,off_target')
    .eq('status', 'enriched');
  if (industry) q = q.eq('industry_verified', industry);
  const { data: leads } = await q;

  const targets = (leads || []).filter((l) => {
    if (l.off_target === true) return false;
    const ss = l.enrichment?.size_signals || {};
    if (hasStructuredSignal(ss)) return false;      // structured path already sizes it
    if (ss.ai_estimate?.at) return false;           // one attempt per lead ever
    return true;
  }).slice(0, limit);

  log.info(`size-estimate: ${targets.length} unsized proprietary leads (no structured signal, no prior AI estimate)${dryRun ? ' [dry]' : ''}`);
  if (!targets.length) return;

  const anthropic = new Anthropic();
  const totals = { in: 0, out: 0 };
  let done = 0;
  for (const l of targets) {
    try {
      const e = l.enrichment || {};
      const msg = await anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001', max_tokens: 300, system: SYSTEM,
        messages: [{ role: 'user', content: JSON.stringify({
          name: l.name, industry: l.industry_verified, city: l.city, state: l.state,
          google_reviews: l.review_count ?? null, rating: l.rating ?? null,
          years_in_business: e.years_in_business ?? null,
          locations: e.size_signals?.locations ?? null,
          overview: (e.overview || '').slice(0, 500),
          signals: (e.signals || []).slice(0, 6),
        }) }],
      });
      totals.in += msg.usage.input_tokens; totals.out += msg.usage.output_tokens;
      const v = JSON.parse(msg.content[0].text.match(/\{[\s\S]*\}/)[0]);
      let lo = Math.max(50000, Math.round(Number(v.revenue_low) || 0));
      let hi = Math.max(lo, Math.round(Number(v.revenue_high) || lo));
      const conf = v.confidence === 'medium' ? 'medium' : 'low';
      const est = { revenue: [lo, hi], confidence: conf, basis: v.basis || 'estimated from available signals', at: new Date().toISOString() };

      if (dryRun) { log.info(`  [dry] ${l.name} (${l.industry_verified}): $${Math.round(lo / 1000)}k–$${Math.round(hi / 1000)}k ${conf} | ${est.basis}`); done++; continue; }
      const enrich = { ...e, size_signals: { ...(e.size_signals || {}), ai_estimate: est } };
      const { error } = await supabase.from('leads').update({ enrichment: enrich }).eq('id', l.id);
      if (error) { log.error(`  ${l.name}: ${error.message}`); continue; }
      done++;
      log.info(`  ✓ ${l.name}: $${Math.round(lo / 1000)}k–$${Math.round(hi / 1000)}k (${conf}) — ${est.basis.slice(0, 70)}`);
    } catch (err) { log.warn(`  ${l.name}: ${err.message}`); }
  }
  const cost = totals.in * 0.8e-6 + totals.out * 4e-6;
  if (!dryRun && totals.in) await recordUsage('claude', 'classification', totals.in + totals.out, cost, { size_estimate: done });
  log.info(`size-estimate done: ${done} of ${targets.length} estimated. Cost ≈ $${cost.toFixed(3)}. (AI estimates are lower-confidence than PPP; the UI labels them.)`);
}

main().catch((e) => { console.error(e.message); process.exit(1); });
