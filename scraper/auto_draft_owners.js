// Auto-draft owner outreach on CONTACTABLE (John's 7/12 autonomy order:
// "auto-draft on CONTACTABLE" — remove the per-lead draft click). For each
// proprietary company whose owner is reachable (name + email) and that has no
// queued/sent outreach yet, Claude drafts a short personalized cold email TO
// THE OWNER and queues it in outbox_emails for John to review + send.
//
// HARD GUARDRAIL: this only QUEUES drafts (status='queued'). It NEVER sends —
// sending is John's action (outbox 'draft'→Outlook, or his click). Bounded per
// run so an unattended pass can't flood the queue.
//
// Usage: node auto_draft_owners.js [--limit 25] [--dry-run]

require('dotenv').config({ path: require('path').resolve(__dirname, './.env') });
const Anthropic = require('@anthropic-ai/sdk');
const { supabase } = require('./core/db');
const log = require('./utils/logger');
const { recordUsage } = require('./core/usage');

const GENERIC = /^(info|office|contact|sales|service|services|support|admin|hello|customerservice|team)@/i;

const SYSTEM = `You draft short, warm cold emails from Pronghorn Equity Partners to the OWNER of a small services business Pronghorn may want to acquire. Voice: a real person who researched them, not a mass mailer. Pronghorn buys and grows essential home/property-services companies; the owner is not necessarily selling — this is a relationship opener.

Rules:
- 70-110 words. First name only in the greeting.
- ONE specific, genuine reference to their business (industry + city, or a signal from the overview) so it's clearly not a blast.
- Position Pronghorn as a long-term buyer/partner in their exact space; soft ask for a short intro call — no pressure, no "are you selling".
- No fake flattery, no buzzwords, no P.S., no attachments.
- Sign as John Hodson, Pronghorn Equity Partners.
- Output JSON only: {"subject": "...", "body": "..."} (body uses \\n line breaks).`;

async function main() {
  const arg = (f) => { const i = process.argv.indexOf(f); return i > -1 ? Number(process.argv[i + 1]) : null; };
  const limit = arg('--limit') || 25;
  const dryRun = process.argv.includes('--dry-run');

  // CONTACTABLE proprietary companies: origin lead, an owner contact with a
  // non-generic email, and no outbox row yet.
  const { data: companies, error } = await supabase
    .from('companies')
    .select('id, name, industry, city, state, notes, origin, contacts(name, role, email), outbox_emails(id)')
    .eq('origin', 'lead')
    .limit(400);
  if (error) throw new Error(error.message);

  const targets = [];
  for (const c of companies || []) {
    if ((c.outbox_emails || []).length) continue; // already has a draft
    const owner = (c.contacts || []).find((ct) => ct.role === 'owner' && ct.email && !GENERIC.test(ct.email));
    if (!owner) continue;
    targets.push({ company: c, owner });
    if (targets.length >= limit) break;
  }
  if (!targets.length) { log.info('No CONTACTABLE owners need a draft.'); return; }
  log.info(`Auto-drafting owner outreach for ${targets.length} companies${dryRun ? ' (dry run)' : ''}`);

  const anthropic = new Anthropic();
  let tokIn = 0, tokOut = 0, queued = 0;
  for (const { company, owner } of targets) {
    try {
      const msg = await anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001', max_tokens: 350, system: SYSTEM,
        messages: [{ role: 'user', content: JSON.stringify({
          owner_name: owner.name, company: company.name,
          industry: company.industry, location: [company.city, company.state].filter(Boolean).join(', '),
          overview: (company.notes || '').slice(0, 400),
        }) }],
      });
      tokIn += msg.usage.input_tokens; tokOut += msg.usage.output_tokens;
      const m = msg.content[0].text.match(/\{[\s\S]*\}/);
      const draft = JSON.parse(m[0]);
      if (dryRun) { log.info(`  ${company.name} → ${owner.name} <${owner.email}>: "${draft.subject}"`); queued++; continue; }
      const { error: qErr } = await supabase.from('outbox_emails').insert({
        company_id: company.id, to_email: owner.email, to_name: owner.name,
        subject: draft.subject, body: draft.body, status: 'queued',
      });
      if (qErr) { log.error(`  ${company.name}: ${qErr.message}`); continue; }
      queued++;
      log.info(`  queued: ${company.name} → ${owner.name} (${owner.email})`);
    } catch (e) { log.error(`  ${company.name}: ${e.message}`); }
  }
  const cost = tokIn * 0.8e-6 + tokOut * 4e-6;
  if (!dryRun && tokIn) await recordUsage('claude', 'drafting', tokIn + tokOut, cost, { auto_owner_drafts: queued });
  log.info(`Auto-draft: ${queued} owner-outreach drafts queued for review (John sends). Cost ≈ $${cost.toFixed(3)}.`);
}

main().catch((e) => { console.error(e.message); process.exit(1); });
