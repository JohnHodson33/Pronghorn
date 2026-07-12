// Pursuit auto-detect — Outlook → listing_reviews (LISTING-PURSUIT-FLOW.md §2).
// Reads pursuit-signal emails (NDA confirmations, DocuSign completions, CIM /
// data-room deliveries), matches them to broker LISTINGS, and advances the
// listing's pursuit status. DETECTION ONLY: never sends, signs, or submits
// anything — that is John's explicit per-action click, always.
//
// Status ladder (forward-only; promoted/passed never touched):
//   new → interested → info_requested → nda_signed → cim_received
// Signals:
//   "NDA is in process" (buyer signed, broker countersign pending)
//        → info_requested + note   (nda_signed lands when the executed copy arrives)
//   "signed NDA" / "executed" / DocuSign completed → nda_signed
//   CIM / offering memorandum / data room access → cim_received (+ doc link)
//
// Matching: sender domain narrows to that broker's source(s); then the listing
// name must appear in the email text (brokers quote exact listing titles).
// Ambiguous/unmatched emails are logged for review, never guessed.
//
// Usage: node ingest_pursuit.js <dump.json>
//   [{ subject, sender, receivedDateTime, summary, webLink, internetMessageId }]
//   (Outlook MCP dump now; Graph fetch once Mail.Read re-auth lands.)

const fs = require('fs');
const { supabase } = require('./core/db');
const log = require('./utils/logger');

const STAGE_ORDER = ['new', 'interested', 'info_requested', 'nda_signed', 'cim_received'];
const TERMINAL = new Set(['promoted', 'passed', 'pushed_to_crm']);

// sender domain → scrape_sources ids (narrows the listing search space)
const DOMAIN_SOURCES = {
  'fcbb.com': ['fcbb'],
  'tworld.com': ['transworld'], 'nda.tworld.com': ['transworld'],
  'sunbeltnetwork.com': ['sunbelt'],
  'vrbizworld.com': ['vr'], 'vrbusinessbrokers.com': ['vr'],
  'murphybusiness.com': ['murphy'],
  'linkbusiness.com': ['linkbusiness'],
};

const SIGNALS = [
  { re: /nda is in process/i, status: 'info_requested', note: 'NDA signed by us; broker countersign pending' },
  { re: /(copy of (the|your) signed nda|nda (fully )?(executed|complete[d]?)|completed:.*nda|nda.*has been (signed|executed) by all|thank you for your nda)/i, status: 'nda_signed' },
  // "Confidential Business Profile" is FCBB's post-NDA info package — treat as CIM
  { re: /(confidential (information memorandum|business profile)|offering memorandum|\bcim\b.*(attached|available|access|enclosed)|(attached|access to).*\bcim\b|data ?room (access|invite|invitation)|access to the (listing information|data ?room))/i, status: 'cim_received' },
];

/** A message can match several signals (e.g. "thank you for your NDA … download
 * the Confidential Business Profile") — the HIGHEST stage wins, EXCEPT:
 * "NDA is in process" is exclusive. Those emails describe a PENDING state and
 * their boilerplate promises future delivery ("you WILL receive … access to
 * the listing information") — which must never read as cim_received.
 * (Bug caught live 7/12: an FCBB reminder advanced a pursuit to cim_received
 * off exactly that future-tense sentence.) */
function bestSignal(text) {
  const hits = SIGNALS.filter((s) => s.re.test(text));
  if (!hits.length) return null;
  const pending = hits.find((s) => s.status === 'info_requested');
  if (pending) return pending;
  return hits.reduce((a, b) => (STAGE_ORDER.indexOf(b.status) > STAGE_ORDER.indexOf(a.status) ? b : a));
}

const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

async function loadListings(sourceIds) {
  let q = supabase.from('listings').select('id, name, source_id');
  if (sourceIds?.length) q = q.in('source_id', sourceIds);
  const out = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await q.range(from, from + 999);
    if (error) throw new Error(error.message);
    out.push(...data);
    if (data.length < 1000) break;
  }
  return out;
}

/** Listing whose (normalized) name appears in the email text. Longest match wins. */
function matchListing(listings, text) {
  const t = ` ${norm(text)} `;
  let best = null;
  for (const l of listings) {
    const n = norm(l.name);
    if (n.length < 12) { // short names ("Tree Service") need a ref-style anchor to be safe
      if (!new RegExp(`\\d{2,3} \\d{4,5} ${n} `).test(t) && !t.includes(` for ${n} `) && !t.includes(` ${n} once `)) continue;
      if (!t.includes(` ${n} `)) continue;
    } else if (!t.includes(` ${n} `)) continue;
    if (!best || n.length > norm(best.name).length) best = l;
  }
  return best;
}

async function advance(listing, signal, m) {
  const { data: review } = await supabase.from('listing_reviews').select('*').eq('listing_id', listing.id).maybeSingle();
  const cur = review?.status || 'new';
  if (TERMINAL.has(cur)) return { skipped: `terminal status ${cur}` };
  if (STAGE_ORDER.indexOf(signal.status) <= STAGE_ORDER.indexOf(cur)) return { skipped: `already ${cur}` };

  const when = m.receivedDateTime || new Date().toISOString();
  const payload = { status: signal.status };
  // timestamp columns are migration 0005 — probe once per run (cached on fn)
  if (advance.hasCols === undefined) {
    const { error } = await supabase.from('listing_reviews').select('nda_signed_at').limit(1);
    advance.hasCols = !error;
    if (!advance.hasCols) log.warn('Migration 0005 not applied — timestamps/doc_url go into notes');
  }
  const noteBits = [`[pursuit ${when.slice(0, 10)}] ${signal.status} ← "${m.subject}"`];
  if (signal.note) noteBits.push(signal.note);
  if (advance.hasCols) {
    if (signal.status === 'info_requested') payload.requested_at = when;
    if (signal.status === 'nda_signed') payload.nda_signed_at = when;
    if (signal.status === 'cim_received') { payload.cim_received_at = when; payload.doc_url = m.webLink || null; }
  } else if (m.webLink) noteBits.push(m.webLink);
  payload.notes = [review?.notes, noteBits.join(' · ')].filter(Boolean).join('\n');
  payload.reviewed_at = when;

  const { error } = review
    ? await supabase.from('listing_reviews').update(payload).eq('listing_id', listing.id)
    : await supabase.from('listing_reviews').insert({ listing_id: listing.id, ...payload });
  if (error) return { error: error.message };

  await supabase.from('listing_events').insert({
    listing_id: listing.id, event_type: signal.status,
    detail: { subject: m.subject, sender: m.sender, at: when, msg: m.internetMessageId, link: m.webLink || null },
  });
  return { advanced: `${cur} → ${signal.status}` };
}

async function main() {
  const file = process.argv[2];
  if (!file || !fs.existsSync(file)) { console.error('Usage: node ingest_pursuit.js <dump.json>'); process.exit(1); }
  const messages = JSON.parse(fs.readFileSync(file, 'utf8'));

  let advanced = 0, unmatched = 0, skipped = 0;
  const cache = {};
  for (const m of messages) {
    // idempotency: one event per message id
    const { data: seen } = await supabase.from('listing_events')
      .select('id').contains('detail', { msg: m.internetMessageId }).limit(1);
    if (seen?.length) { skipped++; continue; }

    const text = `${m.subject || ''} ${m.summary || ''}`;
    const signal = bestSignal(text);
    if (!signal) continue;

    const domain = (m.sender || '').split('@')[1]?.toLowerCase() || '';
    const sourceIds = Object.entries(DOMAIN_SOURCES).find(([d]) => domain.endsWith(d))?.[1] || null;
    const key = sourceIds ? sourceIds.join(',') : '*';
    cache[key] = cache[key] || await loadListings(sourceIds);

    const listing = matchListing(cache[key], text);
    if (!listing) { unmatched++; log.warn(`  UNMATCHED ${signal.status}: "${m.subject}" from ${m.sender} — review manually`); continue; }

    const res = await advance(listing, signal, m);
    if (res.advanced) { advanced++; log.info(`  ${listing.name} [${listing.source_id}]: ${res.advanced}`); }
    else if (res.skipped) { skipped++; }
    else log.error(`  ${listing.name}: ${res.error}`);
  }
  log.info(`Pursuit detect: ${advanced} advanced, ${unmatched} unmatched (review), ${skipped} already processed/no-op`);
}

main().catch((e) => { console.error(e.message); process.exit(1); });
