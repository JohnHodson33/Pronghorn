// VA shortlist re-import — reads the CSV a VA filled (from va_export.js) and
// writes owner contact fields back to leads. FILL-BLANKS-ONLY by default so a
// VA typo can never clobber data we already trust; pass --overwrite to let the
// VA's values win (e.g. after John spot-checks a batch).
//
// Usage: node va_import.js <filled.csv> [--overwrite]

const fs = require('fs');
const { csv2json } = require('json-2-csv');
const { supabase } = require('./core/db');
const log = require('./utils/logger');

const FIELDS = ['owner_name', 'owner_email', 'owner_phone', 'owner_linkedin'];

async function main() {
  const file = process.argv[2];
  const overwrite = process.argv.includes('--overwrite');
  if (!file || !fs.existsSync(file)) { console.error('Usage: node va_import.js <filled.csv> [--overwrite]'); process.exit(1); }

  const rows = csv2json(fs.readFileSync(file, 'utf8').replace(/^﻿/, ''));
  log.info(`VA import: ${rows.length} rows from ${file}${overwrite ? ' (overwrite mode)' : ''}`);

  let updated = 0, unchanged = 0, missing = 0;
  for (const r of rows) {
    if (!r.lead_id) continue;
    const { data: lead } = await supabase.from('leads')
      .select('id, owner_name, owner_email, owner_phone, owner_linkedin, enrichment')
      .eq('id', String(r.lead_id).trim()).maybeSingle();
    if (!lead) { missing++; log.warn(`  no lead ${r.lead_id} (${r.company})`); continue; }

    const patch = {};
    for (const f of FIELDS) {
      const v = String(r[f] ?? '').trim();
      if (!v) continue;
      if (overwrite ? lead[f] !== v : !lead[f]) patch[f] = v;
    }
    const vaNotes = String(r.va_notes ?? '').trim();
    if (Object.keys(patch).length || vaNotes) {
      patch.enrichment = {
        ...(lead.enrichment || {}),
        va: { filled: Object.keys(patch).filter((k) => k !== 'enrichment'), notes: vaNotes || undefined, at: new Date().toISOString() },
      };
      patch.status = 'enriched';
      const { error } = await supabase.from('leads').update(patch).eq('id', lead.id);
      if (error) { log.error(`  ${r.company}: ${error.message}`); continue; }
      updated++;
    } else unchanged++;
  }
  log.info(`VA import done: ${updated} leads updated, ${unchanged} unchanged, ${missing} unknown ids`);
}

main().catch((e) => { console.error(e.message); process.exit(1); });
