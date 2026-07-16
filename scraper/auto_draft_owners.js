// Auto-draft owner outreach — RULES-GATED + TAILORED (John 7/13 ~11:15: paused
// the broad v1 — "too broad and the content isn't tailored enough. I don't
// trust to click send.").
//
// How it now works:
//   1. RULES ALLOWLIST: a company is drafted ONLY when an enabled outreach_rule
//      matches it (industry allowlist, states, min completeness, per-rule
//      nightly cap). ZERO RULES = ZERO DRAFTS — including pre-0013 where the
//      table doesn't exist yet. Leads outside rules are never drafted, period.
//   2. TAILORING: every draft is anchored on SPECIFIC enrichment facts from the
//      source lead (years in business, stated services/certifications, crew/
//      fleet size, review presence, size band). A company with no facts beyond
//      industry+city is SKIPPED, not blasted.
//   3. PROVENANCE: each outbox row records draft_meta {rule, facts_used} so the
//      UI can show WHY it was drafted (post-0013; skipped gracefully before).
//
// HARD GUARDRAIL unchanged: only QUEUES drafts (status='queued'). NEVER sends.
//
// Usage:
//   node auto_draft_owners.js [--limit 25] [--dry-run]   # rules-gated pass
//   node auto_draft_owners.js --samples 5                # approval-gate mode:
//     generates N TAILORED sample drafts on thesis-core Tree Care CONTACTABLE
//     leads and posts them to /improvements as a suggestion card for John's
//     review. Does NOT queue anything to the outbox. Auto-drafting resumes
//     only after John approves the samples AND creates at least one rule.

require('dotenv').config({ path: require('path').resolve(__dirname, './.env') });
const Anthropic = require('@anthropic-ai/sdk');
const { supabase } = require('./core/db');
const log = require('./utils/logger');
const { recordUsage } = require('./core/usage');

const GENERIC = /^(info|office|contact|sales|service|services|support|admin|hello|customerservice|team)@/i;
const ROLE_MBOX = (e) => {
  const lp = String(e || '').split('@')[0];
  return /(hiring|careers?|recruit)/i.test(lp) ||
    /(^|[._-])(jobs?|hr|billing|estimates?|quotes?|scheduling|reception|frontdesk|resumes?)([._-]|$)/i.test(lp);
};

const SYSTEM = `You draft short, warm cold emails from Pronghorn Equity Partners to the OWNER of a small services business Pronghorn may want to acquire. Voice: a real person who researched THIS company, not a mass mailer. Pronghorn buys and grows essential home/property-services companies; the owner is not necessarily selling — this is a relationship opener.

You are given a FACTS list gathered from the company's own website and public data. Rules:
- 70-110 words. First name only in the greeting. Plain-text style, no links.
- Anchor the email on 1-2 SPECIFIC facts from the FACTS list (their words, their numbers — years in business, a named service line, certifications, crew/fleet scale, strong review presence). Never invent facts. Never use a fact you weren't given.
- The reference must be concrete enough that this email could not be sent to any other company.
- Position Pronghorn as a long-term buyer/partner in their exact space; soft ask for a short intro call — no pressure, never "are you selling".
- No fake flattery, no buzzwords, no P.S., no attachments.
- Sign as John Hodson, Pronghorn Equity Partners.
- Output JSON only: {"subject": "...", "body": "...", "facts_used": ["the 1-2 facts you anchored on"]} (body uses \\n line breaks).`;

// ---------------------------------------------------------------------------

async function loadRules() {
  const { data, error } = await supabase.from('outreach_rules').select('*').eq('enabled', true);
  if (error) return { rules: [], reason: 'outreach_rules table not present (apply 0013)' };
  return { rules: data || [], reason: data?.length ? null : 'no enabled rules' };
}

/** Facts a human would recognize as "they actually looked at us". */
function extractFacts(lead) {
  const e = lead?.enrichment || {};
  const facts = [];
  if (e.years_in_business) facts.push(`${e.years_in_business} years in business`);
  for (const s of (e.signals || []).slice(0, 4)) facts.push(String(s));
  const sz = e.size_signals || {};
  if (sz.crew_count) facts.push(`runs ${sz.crew_count} crews`);
  if (sz.fleet_size) facts.push(`fleet of ${sz.fleet_size} trucks`);
  if (sz.employees_stated) facts.push(`team of ${sz.employees_stated}`);
  if (sz.locations > 1) facts.push(`${sz.locations} locations`);
  if (lead?.review_count >= 50) facts.push(`${lead.review_count} Google reviews at ${lead.rating ?? 'high'} stars`);
  if (e.overview) facts.push(`what they do: ${String(e.overview).slice(0, 220)}`);
  // overview alone is context, not a tailoring fact — require one concrete item
  const concrete = facts.length - (e.overview ? 1 : 0);
  return { facts, concrete };
}

function completeness(owner, lead) {
  // verified-only LinkedIn counting (John 7/15) — outreach eligibility must
  // never rest on an unverified link
  const li = lead?.owner_linkedin && lead?.enrichment?.linkedin_verified === true ? lead.owner_linkedin : null;
  const channels = [owner?.email, lead?.owner_phone, li].filter(Boolean).length;
  if (owner?.email && channels >= 2) return 'full';
  if (owner?.email) return 'contactable';
  return 'identified';
}

function ruleMatches(rule, { industry, state, level }) {
  const inds = (rule.industries || []).map((i) => i.toLowerCase());
  if (!inds.length || !inds.includes(String(industry || '').toLowerCase())) return false;
  const states = rule.states || [];
  if (states.length && !states.map((s) => s.toUpperCase()).includes(String(state || '').toUpperCase())) return false;
  if (rule.min_completeness === 'full' && level !== 'full') return false;
  // min_size_tier enforced once tier math ships (card 37450f11)
  return true;
}

/** CONTACTABLE proprietary companies joined to their source lead's enrichment.
 *  includeDrafted: sample mode ignores existing v1 drafts (they queue nothing
 *  and John said the old drafts get regenerated under new rules anyway). */
async function loadTargets({ includeDrafted = false } = {}) {
  const { data: companies, error } = await supabase
    .from('companies')
    .select('id, name, industry, city, state, notes, origin, contacts(name, role, email), outbox_emails(id)')
    .eq('origin', 'lead')
    .limit(400);
  if (error) throw new Error(error.message);
  const { data: leads, error: lErr } = await supabase
    .from('leads')
    .select('id, company_id, owner_phone, owner_linkedin, rating, review_count, enrichment, industry_verified')
    .not('company_id', 'is', null);
  if (lErr) throw new Error(lErr.message);
  const leadByCompany = new Map(leads.map((l) => [l.company_id, l]));

  const targets = [];
  for (const c of companies || []) {
    if (!includeDrafted && (c.outbox_emails || []).length) continue; // already drafted
    const owner = (c.contacts || []).find((ct) => ct.role === 'owner' && ct.email && !GENERIC.test(ct.email) && !ROLE_MBOX(ct.email));
    if (!owner) continue;
    const lead = leadByCompany.get(c.id) || null;
    targets.push({
      company: c, owner, lead,
      industry: lead?.industry_verified || c.industry,
      level: completeness(owner, lead),
      ...extractFacts(lead),
    });
  }
  return targets;
}

async function draftOne(anthropic, t, totals) {
  const msg = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001', max_tokens: 450, system: SYSTEM,
    messages: [{ role: 'user', content: JSON.stringify({
      owner_name: t.owner.name, company: t.company.name,
      industry: t.industry, location: [t.company.city, t.company.state].filter(Boolean).join(', '),
      FACTS: t.facts,
    }) }],
  });
  totals.in += msg.usage.input_tokens; totals.out += msg.usage.output_tokens;
  const m = msg.content[0].text.match(/\{[\s\S]*\}/);
  return JSON.parse(m[0]);
}

// --- sample mode: the approval gate John reviews on /improvements -----------
async function generateSamples(n) {
  const targets = (await loadTargets({ includeDrafted: true }))
    .filter((t) => /tree care/i.test(t.industry || '') && t.concrete >= 1)
    .sort((a, b) => b.concrete - a.concrete)
    .slice(0, n);
  if (!targets.length) { log.error('No Tree Care CONTACTABLE leads with tailoring facts — cannot generate samples.'); return; }
  log.info(`Generating ${targets.length} SAMPLE drafts (nothing queued, nothing sent)…`);

  const anthropic = new Anthropic();
  const totals = { in: 0, out: 0 };
  const samples = [];
  for (const t of targets) {
    try {
      const d = await draftOne(anthropic, t, totals);
      samples.push({ t, d });
      log.info(`  sample: ${t.company.name} → ${t.owner.name} | anchored on: ${(d.facts_used || []).join(' · ')}`);
    } catch (e) { log.error(`  ${t.company.name}: ${e.message}`); }
  }
  if (!samples.length) return;

  const body = [
    `SAMPLE DRAFTS FOR YOUR APPROVAL (draft-rules gate, per your 7/13 pause). ${samples.length} tailored drafts on thesis-core Tree Care CONTACTABLE owners — each anchored on facts from THEIR OWN site/data, shown under every draft. NOTHING was queued or sent. If these read right: (1) approve this card, (2) I create your first rule (proposal: industries=[Tree Care], min_completeness=contactable, nightly_cap=5 — amend here), and auto-drafting resumes under that rule only. If not, comment what to change and I regenerate.`,
    ...samples.map(({ t, d }, i) => [
      `--- SAMPLE ${i + 1}: ${t.company.name} (${[t.company.city, t.company.state].filter(Boolean).join(', ')}) → ${t.owner.name} <${t.owner.email}>`,
      `Subject: ${d.subject}`, '', d.body, '',
      `[anchored on: ${(d.facts_used || []).join(' · ')}]`,
    ].join('\n')),
  ].join('\n\n');

  const { error } = await supabase.from('feedback').insert({
    author: 'Agent — Lane C', type: 'suggestion', page: '/outbox',
    body, status: 'suggested',
  });
  if (error) log.error(`feedback post failed: ${error.message} — samples above in log`);
  else log.info('Samples posted to /improvements for John\'s review.');
  const cost = totals.in * 0.8e-6 + totals.out * 4e-6;
  await recordUsage('claude', 'drafting', totals.in + totals.out, cost, { sample_drafts: samples.length });
  log.info(`Sample generation done. Cost ≈ $${cost.toFixed(3)}.`);
}

// --- rules-gated pass (the nightly path; inert until rules exist) -----------
async function main() {
  const arg = (f) => { const i = process.argv.indexOf(f); return i > -1 ? Number(process.argv[i + 1]) : null; };
  if (process.argv.includes('--samples')) return generateSamples(arg('--samples') || 5);
  const limit = arg('--limit') || 25;
  const dryRun = process.argv.includes('--dry-run');

  const { rules, reason } = await loadRules();
  if (!rules.length) {
    log.info(`0 drafts: ${reason}. Zero rules = zero auto-drafts (John 7/13). Create a rule in outreach_rules to enable.`);
    return;
  }

  const targets = await loadTargets();
  const anthropic = new Anthropic();
  const totals = { in: 0, out: 0 };
  const capLeft = new Map(rules.map((r) => [r.id, r.nightly_cap ?? 5]));
  let queued = 0, skippedNoFacts = 0;
  let hasDraftMeta = true;

  for (const t of targets) {
    if (queued >= limit) break;
    const rule = rules.find((r) => (capLeft.get(r.id) > 0) && ruleMatches(r, t));
    if (!rule) continue;
    if (t.concrete < 1) { skippedNoFacts++; continue; } // never blast an un-tailorable lead
    try {
      const d = await draftOne(anthropic, t, totals);
      if (dryRun) { log.info(`  [dry] ${t.company.name} (rule: ${rule.name}): "${d.subject}" | facts: ${(d.facts_used || []).join(' · ')}`); queued++; capLeft.set(rule.id, capLeft.get(rule.id) - 1); continue; }
      const row = {
        company_id: t.company.id, to_email: t.owner.email, to_name: t.owner.name,
        subject: d.subject, body: d.body, status: 'queued',
      };
      if (hasDraftMeta) row.draft_meta = { rule_id: rule.id, rule_name: rule.name, facts_used: d.facts_used || [] };
      let { error: qErr } = await supabase.from('outbox_emails').insert(row);
      if (qErr && /draft_meta/.test(qErr.message)) { // pre-0013 column probe
        hasDraftMeta = false; delete row.draft_meta;
        ({ error: qErr } = await supabase.from('outbox_emails').insert(row));
      }
      if (qErr) { log.error(`  ${t.company.name}: ${qErr.message}`); continue; }
      queued++; capLeft.set(rule.id, capLeft.get(rule.id) - 1);
      log.info(`  queued: ${t.company.name} → ${t.owner.name} (rule: ${rule.name}; facts: ${(d.facts_used || []).join(' · ')})`);
    } catch (e) { log.error(`  ${t.company.name}: ${e.message}`); }
  }
  const cost = totals.in * 0.8e-6 + totals.out * 4e-6;
  if (!dryRun && totals.in) await recordUsage('claude', 'drafting', totals.in + totals.out, cost, { auto_owner_drafts: queued });
  log.info(`Auto-draft: ${queued} queued under rules [${rules.map((r) => r.name).join(', ')}]; ${skippedNoFacts} skipped for insufficient tailoring facts. Cost ≈ $${cost.toFixed(3)}. Nothing sends.`);
}

main().catch((e) => { console.error(e.message); process.exit(1); });
