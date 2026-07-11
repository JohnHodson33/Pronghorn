// Inquiry draft CLI — same prompt as /api/outbox, runnable with the scraper's
// existing ANTHROPIC_API_KEY so draft QUALITY is verifiable before John arms
// the web route. Drafts only; queues only with --queue (never sends anything).
//
// Usage:
//   node draft_inquiry.js --listing <uuid> [--queue]
//   node draft_inquiry.js --demo            # draft against a live Tier-1 listing, print only

require('dotenv').config({ path: require('path').resolve(__dirname, './.env') });
const Anthropic = require('@anthropic-ai/sdk');
const { supabase } = require('./core/db');
const log = require('./utils/logger');

const SYSTEM = `You draft short broker-inquiry emails for Pronghorn Equity Partners, a committed-capital firm doing roll-ups in essential home/property services. Voice: direct, credible, warm-professional — a real buyer writing quickly, not a template blast.

Rules:
- 120-180 words. No fluff, no "I hope this finds you well".
- Reference 2-3 SPECIFICS from the listing (industry, geography, size, revenue mix) so the broker knows it was read.
- Ask 2-3 smart diligence questions appropriate for a FIRST inquiry (revenue recurrence/mix, owner involvement, reason for sale, customer concentration — pick what the listing leaves open).
- State that Pronghorn is a committed-capital buyer active in this exact vertical; NDA-ready.
- Sign with the sender block provided.
- Output valid JSON only: {"subject": "...", "body": "..."} (body uses \\n for line breaks).`;

const PROFILE = {
  name: 'John D. Hodson — Managing Director, Pronghorn Equity Partners',
  email: 'jhodson@pronghornequity.com',
  phone: '(503) 899-0058',
};

async function main() {
  const arg = (f) => { const i = process.argv.indexOf(f); return i > -1 ? process.argv[i + 1] : null; };
  let listingId = arg('--listing');

  if (process.argv.includes('--demo') && !listingId) {
    const { data } = await supabase.from('listings')
      .select('id, name').eq('tier', 1).not('broker_id', 'is', null).limit(1).single();
    listingId = data.id;
    log.info(`demo listing: ${data.name}`);
  }
  if (!listingId) { console.error('Usage: node draft_inquiry.js --listing <uuid> [--queue] | --demo'); process.exit(1); }

  const { data: l, error } = await supabase.from('listings')
    .select('id, name, industry, city, state, asking_price, cash_flow, cash_flow_type, gross_revenue, description, source_id, brokers(name, email, brokerage)')
    .eq('id', listingId).single();
  if (error) throw new Error(error.message);
  const broker = Array.isArray(l.brokers) ? l.brokers[0] : l.brokers;

  const anthropic = new Anthropic();
  const msg = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001', max_tokens: 600, system: SYSTEM,
    messages: [{
      role: 'user',
      content: JSON.stringify({
        listing: {
          title: l.name, industry: l.industry, location: [l.city, l.state].filter(Boolean).join(', '),
          asking_price: l.asking_price, cash_flow: l.cash_flow ? `${l.cash_flow} (${l.cash_flow_type ?? 'SDE'})` : null,
          revenue: l.gross_revenue ?? null, description: (l.description || '').slice(0, 1500), source: l.source_id,
        },
        sender: PROFILE,
      }),
    }],
  });
  const raw = msg.content[0].text.trim().replace(/^```json?\s*|\s*```$/g, '');
  const draft = JSON.parse(raw);

  console.log(`\nTO: ${broker?.email || '(no broker email — co-pilot path)'}  (${broker?.name || ''} ${broker?.brokerage ? '· ' + broker.brokerage : ''})`);
  console.log(`SUBJECT: ${draft.subject}\n`);
  console.log(draft.body);

  if (process.argv.includes('--queue')) {
    if (!broker?.email) { log.error('No broker email — cannot queue.'); process.exit(1); }
    const { data: q, error: qErr } = await supabase.from('outbox_emails')
      .insert({ listing_id: l.id, to_email: broker.email, to_name: broker.name, subject: draft.subject, body: draft.body })
      .select('id').single();
    if (qErr) { log.error(`${qErr.message} — apply migration 0006 first`); process.exit(1); }
    log.info(`queued: outbox ${q.id} (awaiting John's one-click send in the UI)`);
  }
}

main().catch((e) => { console.error(e.message); process.exit(1); });
