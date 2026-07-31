// River-guide PHONE TIER — Tracerfy batch person-mode over the former-company
// street addresses that enrich_addresses.js corroborated (John 7/31: the
// $0.02/hit unlock for the NEEDS_PAID queue + beyond). Same machinery and
// same hard rules as the proven leads tier (enrich/skiptrace.js):
//
//   ⚠️ LANDLORD TRAP: person-mode ONLY (trace_type 'normal' with the guide's
//   name). Never property-mode on a business address.
//   ⚠️ COMPANY-LINE GUARD: a traced number matching the former company's main
//   line (captured by the address lookup) never becomes the guide's phone.
//   One attempt per guide, ever (contact.skiptrace is the marker) — a miss
//   stays in NEEDS_PAID for the VA path, it does not retry into spend.
//
// Provenance: contact.skiptrace = {queue_id, at, source:'tracerfy', hit,
// phones[], emails[]}. Hits fill contact.phone/email (blanks only), flow onto
// the linked CRM contact, and promote enrichment_status → ENRICHED.
//
// Usage:
//   node riverguides/skiptrace_guides.js [--limit 40] [--dry-run]
//   node riverguides/skiptrace_guides.js --import <queue_id>   # finish a pending queue

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { supabase } = require('../core/db');
const log = require('../utils/logger');
const { recordUsage } = require('../core/usage');
const {
  submitAndAwait, fetchQueueRows, getQueue, splitOwnerName, rowKey, COST_PER_HIT,
} = require('../enrich/skiptrace');

const digits = (p) => String(p || '').replace(/[^0-9]/g, '').replace(/^1(?=\d{10}$)/, '');

// Guide names are "First Last" prose, not the leads' "LAST, FIRST" registry
// format — a comma here means a LIST of people ("Blake Crawford, Keith Mahan")
// and splitOwnerName's comma logic would fabricate a person from two of them
// (caught on the 7/31 dry run: → "Keith Crawford"). Clean guide-style first:
// drop parentheticals, take the first listed person, reject non-person rows
// ("Swinski family") — a $0.02 trace on a fabricated name is worse than none.
function guideName(fullName) {
  let n = String(fullName || '').replace(/\s*\([^)]*\)/g, '').trim();
  n = n.split(',')[0].trim();
  if (/\b(family|families|brothers|bros)\b/i.test(n)) return null;
  return splitOwnerName(n); // handles "&"-compounds, suffixes, org-word reject
}

/** One attempt ever; needs a splittable person name + a corroborated street. */
function eligible(g) {
  const addr = g.contact?.company_address;
  if (g.contact?.phone) return false;
  if (g.contact?.skiptrace) return false;
  if (addr?.status !== 'FOUND' || !/\d/.test(String(addr.street || ''))) return false;
  return !!guideName(g.full_name);
}

/** The leads-proven submission shape: full address string + city/state cols. */
function toRow(g) {
  const a = g.contact.company_address;
  const nm = guideName(g.full_name);
  return {
    first_name: nm.first, last_name: nm.last,
    address: [a.street, a.city, `${a.state}${a.zip ? ' ' + a.zip : ''}`].filter(Boolean).join(', '),
    city: a.city, state: a.state,
  };
}

async function writeResults(queueId, rows, guides) {
  const byKey = new Map();
  for (const g of guides) {
    const nm = guideName(g.full_name);
    if (nm) byKey.set(rowKey(g.contact.company_address.street, nm.first, nm.last), g);
  }
  const col = (r, name) => r[name] ?? r[name.toLowerCase()] ?? r[name.replace('-', '_').toLowerCase()] ?? '';
  let hits = 0, phones = 0, emails = 0;

  for (const r of rows) {
    const g = byKey.get(rowKey(String(r.address).split(',')[0], r.first_name, r.last_name));
    if (!g) continue;

    const phoneFields = ['primary_phone', 'Mobile-1', 'Mobile-2', 'Mobile-3', 'Landline-1', 'Landline-2'];
    const traced = phoneFields.map((f) => digits(col(r, f))).filter((p) => p.length === 10);
    const tracedEmails = ['Email-1', 'Email-2', 'Email-3'].map((f) => col(r, f)).filter((e) => e && e.includes('@'));
    const hit = traced.length > 0 || tracedEmails.length > 0;

    const contact = { ...(g.contact || {}) };
    contact.skiptrace = {
      queue_id: queueId, at: new Date().toISOString(), source: 'tracerfy', hit,
      phones: [...new Set(traced)].map((n, i) => ({
        number: n,
        type: n === digits(col(r, 'primary_phone')) ? (col(r, 'primary_phone_type') || null)
          : ['Mobile-1', 'Mobile-2', 'Mobile-3'].some((f) => digits(col(r, f)) === n) ? 'Mobile' : 'Landline',
        dnc: null, litigator: null, // batch CSV carries no flags; informational-only anyway (John's rule)
        rank: i + 1,
      })),
      emails: tracedEmails,
    };
    const patch = { contact, updated_at: new Date().toISOString() };

    if (hit) {
      hits++;
      // best MOBILE first; the former company's main line is never the person
      const companyLine = digits(g.contact?.company_address?.company_phone);
      const mobiles = [
        col(r, 'primary_phone_type') === 'Mobile' ? digits(col(r, 'primary_phone')) : '',
        digits(col(r, 'Mobile-1')), digits(col(r, 'Mobile-2')),
      ].filter((p) => p.length === 10);
      const best = [...mobiles, ...traced].find((p) => p && p !== companyLine);
      if (best && !contact.phone) { contact.phone = best; phones++; }
      const email = tracedEmails.find((e) => !/^(info|office|contact|sales|admin)@/i.test(e));
      if (email && !contact.email) { contact.email = email; emails++; }
      if (contact.phone || contact.email) patch.enrichment_status = 'ENRICHED';
    }

    const { error } = await supabase.from('river_guides').update(patch).eq('deal_id', g.deal_id);
    if (error) { log.error(`  ${g.deal_id}: ${error.message}`); continue; }

    // CRM contact stays in step (fill blanks only)
    if (g.contact_id && hit) {
      const { data: c } = await supabase.from('contacts').select('email,phone').eq('id', g.contact_id).maybeSingle();
      const cPatch = {};
      if (contact.phone && !c?.phone) cPatch.phone = contact.phone;
      if (contact.email && !c?.email) cPatch.email = contact.email;
      if (Object.keys(cPatch).length) await supabase.from('contacts').update(cPatch).eq('id', g.contact_id);
    }
    if (hit) log.info(`  ✓ ${g.full_name}: ${contact.phone ? 'phone ' + contact.phone : ''}${contact.email ? ' email ' + contact.email : ''}`.trimEnd());
  }

  const costUsd = hits * COST_PER_HIT;
  if (hits) await recordUsage('tracerfy', 'skip_trace', hits, costUsd, { channel: 'river_guides', queue_id: queueId, hits, phones, emails });
  log.info(`guide phone tier: ${hits} hits of ${rows.length} rows → +${phones} phones, +${emails} emails ($${costUsd.toFixed(2)})`);
  return { hits, phones, emails, costUsd };
}

async function loadEligible() {
  const { data, error } = await supabase.from('river_guides').select('*').eq('name_status', 'RESOLVED');
  if (error) throw new Error(`${error.message} — apply migration 0016 first`);
  const RANK = { NEEDS_PAID: 0, T1_DONE: 1, PENDING_T1: 2 };
  return (data || []).filter(eligible)
    .sort((a, b) => (RANK[a.enrichment_status] ?? 3) - (RANK[b.enrichment_status] ?? 3)
      || (b.screen_score ?? 0) - (a.screen_score ?? 0));
}

async function main() {
  const arg = (f) => { const i = process.argv.indexOf(f); return i > -1 ? process.argv[i + 1] : null; };
  if (!(process.env.TRACERFY_API_KEY || '').trim()) { console.error('TRACERFY_API_KEY not set'); process.exit(1); }

  if (process.argv.includes('--import')) {
    const queue = await getQueue(arg('--import'));
    if (!queue || queue.pending) { console.error(`queue ${arg('--import')} missing or still pending`); process.exit(1); }
    // one-attempt marker isn't set for a pending-queue import — match on all traced guides
    const { data } = await supabase.from('river_guides').select('*').eq('name_status', 'RESOLVED');
    const pool = (data || []).filter((g) => g.contact?.company_address?.status === 'FOUND' && guideName(g.full_name));
    return writeResults(Number(arg('--import')), await fetchQueueRows(queue), pool);
  }

  const limit = Number(arg('--limit')) || 40;
  const dryRun = process.argv.includes('--dry-run');
  const targets = (await loadEligible()).slice(0, limit);
  if (!targets.length) { log.info('No guides eligible (need a corroborated address, a person name, no phone, no prior attempt).'); return; }
  log.info(`guide phone tier: ${targets.length} guides (person-mode batch, ~$${(targets.length * COST_PER_HIT).toFixed(2)} worst case)${dryRun ? ' [dry]' : ''}`);
  if (dryRun) {
    for (const g of targets) { const r = toRow(g); log.info(`  [dry] ${g.deal_id} ${g.full_name} → ${r.first_name} ${r.last_name} @ ${r.address}`); }
    return;
  }

  const { queueId, queue } = await submitAndAwait(targets.map(toRow), log);
  if (!queue) { log.warn(`queue ${queueId} still pending — finish later with --import ${queueId}`); return; }
  await writeResults(queueId, await fetchQueueRows(queue), targets);
}

main().catch((e) => { console.error(e.message); process.exit(1); });
