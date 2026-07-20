// Inquiry draft CLI — JOHN'S VERBATIM MESSAGE IS THE CONTRACT (7/13 eve;
// customize ONLY {broker first name} + {industry}). Deterministic, $0, no LLM:
// John gave an exact message and does not want the model improvising it.
// This is a CommonJS MIRROR of web/lib/inquiry.ts buildBrokerInquiry() — kept
// deliberately in sync (Vercel/scraper can't share a module across the
// boundary); if you change the copy in one, change the other.
// Identity: inquiry_profiles 774f21ce — John Hodson · jhodson@pronghornequity.com
// · (503) 899-0058 — NEVER the gmail.
//
// Usage:
//   node draft_inquiry.js --listing <uuid> [--queue]
//   node draft_inquiry.js --demo            # draft against a live Tier-1 listing, print only

require('dotenv').config({ path: require('path').resolve(__dirname, './.env') });
const { supabase } = require('./core/db');
const log = require('./utils/logger');

// natural phrasing for the {industry} slot (John's example: "landscaping /
// lawn care") — mirror of web/lib/inquiry.ts INDUSTRY_PHRASE.
const INDUSTRY_PHRASE = {
  'Lawn Care': 'landscaping / lawn care', 'Landscaping': 'landscaping / lawn care',
  'Tree Care': 'tree care', 'Pest Control': 'pest control', 'Pool Services': 'pool services',
  'Lake/Pond Management': 'lake and pond management', 'HVAC': 'HVAC services',
  'Plumbing': 'plumbing services', 'Electrical': 'electrical services', 'Roofing': 'roofing',
  'Fencing': 'fencing', 'Irrigation': 'irrigation services', 'Cleaning/Janitorial': 'commercial cleaning',
  'Restoration': 'restoration services', 'Property Maintenance': 'property maintenance',
};
const industryPhrase = (i) => (!i ? 'business services' : (INDUSTRY_PHRASE[i] ?? String(i).toLowerCase()));

/** First name from a broker's full name — no guessing beyond the first token. */
function brokerFirstName(fullName) {
  const first = String(fullName ?? '').trim().split(/\s+/)[0] ?? '';
  return /^[A-Za-z][A-Za-z'.-]*$/.test(first) ? first : null;
}

/** John's verbatim broker-inquiry message. */
function buildBrokerInquiry(listing, brokerName) {
  const first = brokerFirstName(brokerName);
  const greeting = first ? `Hi ${first},` : 'Hello,';
  const industry = industryPhrase(listing.industry);
  const body = [
    greeting, '',
    `My name is John Hodson, and I am a Managing Director at Pronghorn Equity Partners. We are a lower middle market private equity fund that focuses on business services assets across the US. We are spending a lot of time in the ${industry} space and would love to get some additional information on the below listing.`,
    '',
    'Are you able to share the NDA and any initial materials? It would also be helpful to hop on an introductory call to learn more and introduce myself.',
    '', 'Looking forward to it.', '', 'Best,', 'John Hodson',
  ].join('\n');
  const ref = listing.name ?? listing.source_id ?? 'your listing';
  return { subject: `Inquiry: ${ref}`, body };
}

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
    .select('id, name, industry, city, state, source_id, brokers(name, email, brokerage)')
    .eq('id', listingId).single();
  if (error) throw new Error(error.message);
  const broker = Array.isArray(l.brokers) ? l.brokers[0] : l.brokers;

  const draft = buildBrokerInquiry(l, broker?.name);

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
