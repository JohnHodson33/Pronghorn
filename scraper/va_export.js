// VA shortlist export — ENRICHMENT-STRATEGY step 4 (the human last-mile).
// Exports leads that still lack owner contact fields after automated
// enrichment, as a CSV a VA fills in (owner cell, verified email, LinkedIn).
// Re-import the filled file with va_import.js.
//
// Usage:
//   node va_export.js [--list <uuid>] [--limit 200] [--out shortlist.csv]
//
// Shortlist definition: enriched or skipped-by-enrichment leads missing at
// least one of owner_email / owner_phone / owner_linkedin. Skipped leads
// (no website/search context) rank first — those are exactly the ones
// automation can't reach and a human researcher can.

const fs = require('fs');
const path = require('path');
const { json2csv } = require('json-2-csv');
const { supabase } = require('./core/db');
const log = require('./utils/logger');

const COLUMNS = [
  'lead_id', 'company', 'website', 'phone', 'city', 'state',
  'owner_name', 'owner_title', 'owner_email', 'owner_phone', 'owner_linkedin',
  'va_notes',
];

async function main() {
  const arg = (f) => { const i = process.argv.indexOf(f); return i > -1 ? process.argv[i + 1] : null; };
  const listId = arg('--list');
  const limit = Number(arg('--limit')) || 200;
  const out = arg('--out') || path.resolve(__dirname, 'output', `va_shortlist_${new Date().toISOString().slice(0, 10)}.csv`);

  let q = supabase.from('leads')
    .select('id, name, website, phone, city, state, owner_name, owner_email, owner_phone, owner_linkedin, enrichment, status')
    .or('owner_email.is.null,owner_phone.is.null,owner_linkedin.is.null')
    .in('status', ['new', 'enriched'])
    .limit(limit);
  if (listId) q = q.eq('lead_list_id', listId);
  const { data: leads, error } = await q;
  if (error) throw new Error(error.message);
  if (!leads.length) { log.info('Shortlist is empty — nothing to export.'); return; }

  // hardest-for-automation first: enrichment-skipped, then fewest known fields
  const known = (l) => ['owner_email', 'owner_phone', 'owner_linkedin', 'owner_name'].filter((k) => l[k]).length;
  leads.sort((a, b) => ((a.enrichment?.skipped ? 0 : 1) - (b.enrichment?.skipped ? 0 : 1)) || known(a) - known(b));

  const rows = leads.map((l) => ({
    lead_id: l.id, company: l.name, website: l.website || '', phone: l.phone || '',
    city: l.city || '', state: l.state || '',
    owner_name: l.owner_name || '', owner_title: l.enrichment?.owner_title || '',
    owner_email: l.owner_email || '', owner_phone: l.owner_phone || '',
    owner_linkedin: l.owner_linkedin || '', va_notes: '',
  }));

  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, json2csv(rows, { keys: COLUMNS, emptyFieldValue: '' }));
  log.info(`VA shortlist: ${rows.length} leads → ${out}`);
  log.info('Instructions for the VA: fill blanks in owner_name/owner_email/owner_phone/owner_linkedin; use va_notes for anything odd. Do not edit lead_id.');
}

main().catch((e) => { console.error(e.message); process.exit(1); });
