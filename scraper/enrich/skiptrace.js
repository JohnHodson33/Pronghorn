// Tracerfy skip-trace — the cascade's phone tier (John greenlit 7/15 eve;
// PM validated on 136 leads: ~29% hit rate, billed PER HIT at 1 credit ≈
// $0.02). Runs AFTER free sources + Hunter, only for leads that still lack
// owner_phone but have an owner NAME and street ADDRESS.
//
// ⚠️ LANDLORD TRAP (hard rule): ALWAYS batch person-mode — trace_type
// 'normal' with the owner's name supplied. NEVER trace_type 'advanced' /
// find_owner:true on a business address: that returns the PROPERTY owner,
// which for a rented shop is the landlord, not the business owner.
//
// COMPLIANCE POSTURE (John 7/15 late): pull + store ALL traced contact info;
// owner_phone fills regardless of flags; DNC/litigator flags are
// INFORMATIONAL badges only — never a block, never an eligibility filter.
// DNC scrubbing is OUT of the standard cascade (5× the trace cost); the
// on-demand `--scrub <queue_id>` helper exists if John ever wants a batch
// checked. No automated calling exists or will — humans hand-pick calls.
//
// Provenance: enrichment.skiptrace = {queue_id, at, hit, phones[], emails[],
// source:'tracerfy'}. Company-line guard: a traced number matching the
// company main line never becomes an owner channel.
//
// Usage:
//   node enrich/skiptrace.js [--limit 40] [--dry-run]   # standalone backfill pass
//   node enrich/skiptrace.js --scrub <queue_id>          # on-demand DNC scrub (manual only)
//   const { runSkiptrace, skiptraceEligible } = require('./skiptrace')  # cascade tier

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { supabase } = require('../core/db');
const { recordUsage } = require('../core/usage');

const BASE = 'https://tracerfy.com/v1/api';
const COST_PER_HIT = 0.02; // 1 credit, billed per hit on normal batch trace
const token = () => (process.env.TRACERFY_API_KEY || '').trim();

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const digits = (p) => String(p || '').replace(/[^0-9]/g, '').replace(/^1(?=\d{10}$)/, '');

/** "OPPELT, EDDY RAY" → {first:'Eddy', last:'Oppelt'}; compound "A and B" → first person. */
function splitOwnerName(name) {
  let n = String(name || '').trim();
  if (!n) return null;
  n = n.split(/\s+(?:and|&)\s+/i)[0].trim();          // compound names: first person only
  if (n.includes(',')) {
    const [last, first] = n.split(',').map((s) => s.trim());
    n = `${(first || '').split(/\s+/)[0]} ${last}`;
  }
  n = n.replace(/\b(jr|sr|ii|iii|iv)\.?$/i, '').trim();
  const parts = n.split(/\s+/).filter(Boolean);
  if (parts.length < 2) return null;                   // person-mode needs first+last
  if (/\b(llc|inc|corp|company|holdings|trust|enterprises|group|services)\b/i.test(n)) return null;
  return { first: parts[0], last: parts[parts.length - 1] };
}

/** Cascade eligibility: missing owner phone, has a person name + street address. */
function skiptraceEligible(l) {
  if (l.owner_phone) return false;
  if (l.enrichment?.skiptrace) return false;           // one attempt per lead, ever
  if (l.off_target === true) return false;
  if (!l.address || !l.city || !l.state) return false;
  if (!/\d/.test(String(l.address))) return false;     // street addresses have a number
  return !!splitOwnerName(l.owner_name);
}

async function tfy(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { Authorization: `Bearer ${token()}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json; try { json = JSON.parse(text); } catch { json = { raw: text.slice(0, 300) }; }
  if (!res.ok) throw new Error(`tracerfy ${path}: ${res.status} ${JSON.stringify(json).slice(0, 200)}`);
  return json;
}

// minimal CSV parser (quoted fields) for the results download
function parseCsv(text) {
  const rows = [];
  let cur = '', inQ = false, row = [];
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQ) {
      if (ch === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else inQ = false; }
      else cur += ch;
    } else if (ch === '"') inQ = true;
    else if (ch === ',') { row.push(cur); cur = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (cur !== '' || row.length) { row.push(cur); rows.push(row); row = []; cur = ''; }
      if (ch === '\r' && text[i + 1] === '\n') i++;
    } else cur += ch;
  }
  if (cur !== '' || row.length) { row.push(cur); rows.push(row); }
  const header = rows.shift() || [];
  return rows.map((r) => Object.fromEntries(header.map((h, i) => [h, r[i] ?? ''])));
}

/**
 * Trace a batch of eligible leads through Tracerfy (person-mode) and write
 * results back. Budget = max leads submitted this run (cost realizes per hit).
 * @returns { submitted, hits, phones, emails, costUsd, queueId }
 */
async function runSkiptrace(leads, budget, log, { dryRun = false } = {}) {
  if (!token()) { log?.warn('  skiptrace: no TRACERFY_API_KEY'); return { submitted: 0, hits: 0, phones: 0, emails: 0, costUsd: 0 }; }
  const targets = [];
  for (const l of leads) {
    if (targets.length >= budget) break;
    if (!skiptraceEligible(l)) continue;
    const nm = splitOwnerName(l.owner_name);
    // Send the FULL stored address string (street, city, state, zip embedded) —
    // the shape the PM's validated 29%-hit runs used. A separate numeric zip
    // column gets float-coerced by their cleaner ("85301.0") and kills matching.
    targets.push({ lead: l, row: {
      first_name: nm.first, last_name: nm.last,
      address: String(l.address).trim(), city: l.city, state: l.state,
    } });
  }
  if (!targets.length) { log?.info('  skiptrace: no eligible leads'); return { submitted: 0, hits: 0, phones: 0, emails: 0, costUsd: 0 }; }
  log?.info(`  skiptrace: submitting ${targets.length} leads (person-mode batch, ~$${(targets.length * COST_PER_HIT).toFixed(2)} worst case)`);
  if (dryRun) {
    for (const t of targets) log?.info(`    [dry] ${t.lead.name} → ${t.row.first_name} ${t.row.last_name} @ ${t.row.address}, ${t.row.city} ${t.row.state}`);
    return { submitted: targets.length, hits: 0, phones: 0, emails: 0, costUsd: 0 };
  }

  // multipart CSV upload (the endpoint 415s raw JSON despite the docs).
  // NOTE: the results CSV has a FIXED schema — custom passthrough columns are
  // dropped — so results re-match to leads by street+name, not by id.
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const cols = ['first_name', 'last_name', 'address', 'city', 'state'];
  const csv = [cols.join(','), ...targets.map((t) => cols.map((c) => esc(t.row[c])).join(','))].join('\n');
  const fd = new FormData();
  fd.append('csv_file', new Blob([csv], { type: 'text/csv' }), 'pronghorn-skiptrace.csv');
  // mail_* mappings point at the SAME address/city/state columns — the PM's
  // proven configuration; empty mail columns correlated with the 0-hit runs
  for (const [k, v] of Object.entries({
    address_column: 'address', city_column: 'city', state_column: 'state',
    first_name_column: 'first_name', last_name_column: 'last_name',
    mail_address_column: 'address', mail_city_column: 'city', mail_state_column: 'state',
    trace_type: 'normal',
  })) fd.append(k, v);
  const qRes = await fetch(`${BASE}/trace/`, { method: 'POST', headers: { Authorization: `Bearer ${token()}` }, body: fd });
  const q = await qRes.json();
  if (!qRes.ok) throw new Error(`tracerfy /trace/: ${qRes.status} ${JSON.stringify(q).slice(0, 200)}`);
  const queueId = q.queue_id;
  log?.info(`  skiptrace: queue ${queueId} accepted (${q.rows_uploaded} rows, est ${q.estimated_wait_seconds}s)`);

  // poll — respect the 20s cadence; cap ~8 min
  let queue = null;
  await sleep(Math.min((q.estimated_wait_seconds || 30) * 1000, 60000));
  for (let i = 0; i < 22; i++) {
    const all = await tfy('GET', '/queues/');
    queue = (all || []).find((x) => x.id === queueId);
    if (queue && !queue.pending) break;
    await sleep(21000);
  }
  if (!queue || queue.pending) { log?.warn(`  skiptrace: queue ${queueId} still pending — results import on a later pass via --import ${queueId}`); return { submitted: targets.length, hits: 0, phones: 0, emails: 0, costUsd: 0, queueId }; }

  return importQueueResults(queueId, queue, targets.map((t) => t.lead), log);
}

const normKey = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const rowKey = (street, first, last) => `${normKey(street)}|${normKey(first)}|${normKey(last)}`;

/** Download the results CSV and write hits back to leads.
 *  The results schema is FIXED (passthrough columns are dropped), so rows
 *  re-match to leads by street + first + last name. Result columns:
 *  primary_phone, primary_phone_type, Email-1..5, Mobile-1..5, Landline-1..3. */
async function importQueueResults(queueId, queue, leadsCtx, log) {
  const csvRes = await fetch(queue.download_url);
  const rows = parseCsv(await csvRes.text());

  // build the street|first|last → lead index (from run context, else from DB)
  let pool = leadsCtx;
  if (!pool?.length) {
    const { data } = await supabase.from('leads')
      .select('id,name,phone,address,owner_name,owner_phone,owner_email,enrichment')
      .eq('status', 'enriched').not('owner_name', 'is', null).not('address', 'is', null);
    pool = data || [];
  }
  const byKey = new Map();
  for (const l of pool) {
    const nm = splitOwnerName(l.owner_name);
    if (!nm || !l.address) continue;
    byKey.set(rowKey(String(l.address).split(',')[0], nm.first, nm.last), l);
  }

  const col = (r, name) => r[name] ?? r[name.toLowerCase()] ?? r[name.replace('-', '_').toLowerCase()] ?? '';
  let hits = 0, phones = 0, emails = 0;
  for (const r of rows) {
    // result address echoes the full submitted string — key on its street line
    const lead = byKey.get(rowKey(String(r.address).split(',')[0], r.first_name, r.last_name));
    if (!lead) continue;

    const phoneFields = ['primary_phone', 'Mobile-1', 'Mobile-2', 'Mobile-3', 'Landline-1', 'Landline-2'];
    const traced = phoneFields.map((f) => digits(col(r, f))).filter((p) => p.length === 10);
    const tracedEmails = ['Email-1', 'Email-2', 'Email-3'].map((f) => col(r, f)).filter((e) => e && e.includes('@'));
    const hit = traced.length > 0 || tracedEmails.length > 0;

    const enrich = { ...(lead.enrichment || {}) };
    enrich.skiptrace = {
      queue_id: queueId, at: new Date().toISOString(), source: 'tracerfy', hit,
      phones: [...new Set(traced)].map((n, i) => ({
        number: n,
        type: n === digits(col(r, 'primary_phone')) ? (col(r, 'primary_phone_type') || null)
          : ['Mobile-1', 'Mobile-2', 'Mobile-3'].some((f) => digits(col(r, f)) === n) ? 'Mobile' : 'Landline',
        dnc: null, litigator: null, // batch CSV carries no flags; --scrub adds them on demand
        rank: i + 1,
      })),
      emails: tracedEmails,
    };
    const patch = { enrichment: enrich };

    if (hit) {
      hits++;
      // owner_phone: best MOBILE first — company-line guard applies
      const companyLine = digits(lead.phone);
      const mobiles = [
        col(r, 'primary_phone_type') === 'Mobile' ? digits(col(r, 'primary_phone')) : '',
        digits(col(r, 'Mobile-1')), digits(col(r, 'Mobile-2')),
      ].filter((p) => p.length === 10);
      const best = [...mobiles, ...traced].find((p) => p && p !== companyLine);
      if (best && !lead.owner_phone) { patch.owner_phone = best; phones++; }
      const email = tracedEmails.find((e) => !/^(info|office|contact|sales|admin)@/i.test(e));
      if (email && !lead.owner_email) { patch.owner_email = email; emails++; }
    }

    const { error } = await supabase.from('leads').update(patch).eq('id', lead.id);
    if (error) log?.error(`    ${lead.name}: ${error.message}`);
    else if (hit) log?.info(`    ✓ ${lead.name}: ${patch.owner_phone ? 'phone ' + patch.owner_phone : ''}${patch.owner_email ? ' email ' + patch.owner_email : ''}`.trimEnd());
  }

  const costUsd = hits * COST_PER_HIT;
  if (hits) await recordUsage('tracerfy', 'skip_trace', hits, costUsd, { queue_id: queueId, hits, phones, emails });
  log?.info(`  skiptrace: ${hits} hits of ${rows.length} rows → +${phones} owner phones, +${emails} emails ($${costUsd.toFixed(2)})`);
  return { submitted: rows.length, hits, phones, emails, costUsd, queueId };
}

// --- on-demand DNC scrub (manual tool ONLY — never wired into the cascade) --
async function scrubQueue(queueId) {
  const res = await tfy('POST', '/dnc/scrub-from-queue/', { queue_id: Number(queueId), phone_columns: ['primary_phone', 'mobile_1', 'mobile_2'] });
  console.log(`DNC scrub started: dnc_queue ${res.dnc_queue_id}, ${res.phones_to_check} phones (1 credit each). Flags land as informational badges only — John's rule: never a block.`);
}

// --- CLI -------------------------------------------------------------------
async function main() {
  const log = require('../utils/logger');
  const arg = (f) => { const i = process.argv.indexOf(f); return i > -1 ? process.argv[i + 1] : null; };
  if (process.argv.includes('--scrub')) return scrubQueue(arg('--scrub'));
  if (process.argv.includes('--import')) {
    const qid = Number(arg('--import'));
    const all = await tfy('GET', '/queues/');
    const queue = all.find((x) => x.id === qid);
    if (!queue || queue.pending) { console.error(`queue ${qid} missing or still pending`); process.exit(1); }
    return importQueueResults(qid, queue, [], log);
  }
  const limit = Number(arg('--limit')) || 40;
  const dryRun = process.argv.includes('--dry-run');

  const { data: leads } = await supabase.from('leads')
    .select('id,name,phone,address,city,state,owner_name,owner_email,owner_phone,owner_linkedin,industry_verified,off_target,status,enrichment')
    .eq('status', 'enriched');
  const eligible = (leads || []).filter(skiptraceEligible);
  log.info(`skiptrace backfill: ${eligible.length} eligible (missing phone, named owner, street address)`);
  await runSkiptrace(eligible, limit, log, { dryRun });
}

if (require.main === module) main().catch((e) => { console.error(e.message); process.exit(1); });
module.exports = { runSkiptrace, skiptraceEligible, importQueueResults };
