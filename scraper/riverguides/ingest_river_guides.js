// River-guides seed ingestion — river-guides-seed-all.csv → river_guides table
// (spec §4) + CRM integration per John 7/16:
//   - every RESOLVED person becomes a CONTACT (role 'river_guide') linked to
//     a COMPANY record for the business they used to run (origin
//     'river_guide', website = the acquired company's own domain)
//   - those companies are KNOWN consolidator acquisitions → their notes carry
//     "acquired by <acquirer> (<sponsor>), <year>" — direct input to the
//     PE-ownership tagging work
//   - TBD rows ingest as the identity-resolution queue (NEVER guessed)
//
// Idempotent on deal_id (upsert); safe to re-run after CSV updates.
// Usage: node riverguides/ingest_river_guides.js <path-to-csv> [--dry-run]

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const fs = require('fs');
const { supabase } = require('../core/db');
const log = require('../utils/logger');
const { rescore } = require('./score');

// CSV parser (quoted fields, BOM-tolerant)
function parseCsv(text) {
  text = text.replace(/^﻿/, '');
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
  const header = rows.shift().map((h) => h.trim());
  return rows.filter((r) => r.length > 1).map((r) => Object.fromEntries(header.map((h, i) => [h, (r[i] ?? '').trim()])));
}

// research vertical → spec industry enum
function industryOf(r) {
  const v = (r.Vertical || '').toLowerCase();
  const g = (r.industry_group || '').toUpperCase();
  if (/tree/.test(v) && /lawn|landscape/.test(v)) return 'LANDSCAPE'; // 'Both' → cross-vertical green
  if (/tree/.test(v)) return 'TREE_CARE';
  if (/lawn/.test(v)) return 'LAWN_CARE';
  if (/landscape|resi/.test(v)) return 'LANDSCAPE';
  if (/pool/.test(v) || g === 'POOL') return 'POOL_SERVICES';
  if (/fenc/.test(v) || g === 'FENCING') return 'FENCING';
  if (/kitchen/.test(v) || g === 'KITCHEN') return 'COMMERCIAL_KITCHEN_SERVICE';
  if (/pest/.test(v)) return 'PEST';
  return g === 'GREEN' ? 'LANDSCAPE' : 'OTHER';
}

const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

/** Create/link the former company + the river-guide contact for a RESOLVED row. */
async function mintCrmRecords(g, dryRun) {
  // company: match existing by normalized name+state, else create
  let companyId = null;
  const { data: candidates } = await supabase.from('companies')
    .select('id,name,state').ilike('name', `%${g.their_company.slice(0, 24)}%`).limit(5);
  const hit = (candidates || []).find((c) => norm(c.name) === norm(g.their_company));
  if (hit) companyId = hit.id;
  else if (!dryRun) {
    const { data: created, error } = await supabase.from('companies').insert({
      name: g.their_company, website: g.company_website || null,
      city: g.location_city || null, state: g.location_state || null,
      origin: 'river_guide',
      industry: { LANDSCAPE: 'Landscaping', LAWN_CARE: 'Lawn Care', TREE_CARE: 'Tree Care', POOL_SERVICES: 'Pool Services', FENCING: 'Fencing', COMMERCIAL_KITCHEN_SERVICE: 'Other', PEST: 'Pest Control' }[g.industry] || 'Other',
      notes: `River-guide seed: acquired by ${g.acquirer}${g.acquirer_pe_sponsor ? ` (${g.acquirer_pe_sponsor})` : ''}${g.deal_year ? `, ${g.deal_year}` : ''} — institutionally owned. Former owner: ${g.full_name}. [${g.deal_id}]`,
    }).select('id').single();
    if (error) log.warn(`  company ${g.their_company}: ${error.message}`);
    else companyId = created.id;
  }

  // contact: dedupe by (person, company) per spec §6.4
  let contactId = null;
  const { data: existing } = await supabase.from('contacts')
    .select('id,name,firm,role').ilike('name', `%${g.full_name}%`).limit(5);
  const cHit = (existing || []).find((c) => norm(c.name) === norm(g.full_name) &&
    (norm(c.firm || '') === norm(g.their_company) || !c.firm));
  if (cHit) contactId = cHit.id;
  else if (!dryRun) {
    const { data: created, error } = await supabase.from('contacts').insert({
      name: g.full_name, role: 'river_guide',
      firm: g.their_company, title: g.role || 'Former Owner',
      company_id: companyId,
      notes: `River guide (${g.priority_band}): sold ${g.their_company} to ${g.acquirer}${g.deal_year ? ` in ${g.deal_year}` : ''}; exit status at close: ${g.exit_status} (⚠ verify current before outreach). Source: ${g.source_url || g.source_confidence}. [${g.deal_id}]`,
    }).select('id').single();
    if (error) log.warn(`  contact ${g.full_name}: ${error.message}`);
    else contactId = created.id;
  }
  return { companyId, contactId };
}

async function main() {
  const file = process.argv[2];
  const dryRun = process.argv.includes('--dry-run');
  if (!file || !fs.existsSync(file)) { console.error('Usage: node riverguides/ingest_river_guides.js <csv> [--dry-run]'); process.exit(1); }
  const rows = parseCsv(fs.readFileSync(file, 'utf8'));
  log.info(`river-guides ingest: ${rows.length} rows${dryRun ? ' (dry run)' : ''}`);

  const stats = { upserted: 0, resolved: 0, tbd: 0, contacts: 0, companies: 0, bands: {}, states: {}, errors: 0 };
  for (const r of rows) {
    const resolvedName = r.name_status === 'RESOLVED' && r.Owner && !/^tbd$/i.test(r.Owner);
    const g = {
      deal_id: r.deal_id,
      full_name: resolvedName ? r.Owner : null,
      name_status: resolvedName ? 'RESOLVED' : 'TBD',
      archetype: 'A_EXITED_OPERATOR',
      archetype_subtype: r.exit_status === 'EXITED' ? 'FULLY_EXITED' : r.exit_status === 'EMPLOYED' ? 'ROLLED_EQUITY_EMPLOYED' : null,
      industry: industryOf(r),
      vertical: r.Vertical || null,
      their_company: r.Company,
      role: null,
      acquirer: r.Acquirer || null,
      acquirer_pe_sponsor: r.Sponsor || null,
      acquirer_website: r.acquirer_website || null,
      deal_year: Number(r.Year) || null,
      location_city: r.city || null,
      location_state: r.state || null,
      company_website: r.company_website || null,
      company_website_status: (r.company_website_status || 'NOT_FOUND').replace('-', '_'),
      exit_status: r.exit_status || 'UNKNOWN',
      source_url: /^https?:/i.test(r.Source || '') ? r.Source : null,
      source_confidence: (r.Confidence || 'MEDIUM').toUpperCase(),
      notes: !/^https?:/i.test(r.Source || '') && r.Source ? `source: ${r.Source}` : null,
      enrichment_status: r.enrichment_status || (resolvedName ? 'PENDING_T1' : 'NEEDS_NAME'),
    };
    Object.assign(g, rescore(g)); // recompute score/band on ingest (spec §9)
    stats.bands[g.priority_band] = (stats.bands[g.priority_band] || 0) + 1;
    if (g.location_state) stats.states[g.location_state] = (stats.states[g.location_state] || 0) + 1;
    if (resolvedName) stats.resolved++; else stats.tbd++;

    if (!dryRun) {
      let crm = { companyId: null, contactId: null };
      if (resolvedName) {
        crm = await mintCrmRecords(g, dryRun);
        if (crm.contactId) stats.contacts++;
        if (crm.companyId) stats.companies++;
      }
      const { error } = await supabase.from('river_guides').upsert({
        ...g, contact_id: crm.contactId, company_id: crm.companyId,
      }, { onConflict: 'deal_id' });
      if (error) { stats.errors++; log.error(`  ${g.deal_id} ${g.their_company}: ${error.message}`); }
      else stats.upserted++;
    }
  }

  log.info(`river-guides ingest done: ${stats.upserted} upserted (${stats.resolved} resolved / ${stats.tbd} TBD), ${stats.contacts} contacts + ${stats.companies} companies linked, ${stats.errors} errors`);
  log.info(`  bands: ${JSON.stringify(stats.bands)}`);
  log.info(`  top states: ${JSON.stringify(Object.fromEntries(Object.entries(stats.states).sort((a, b) => b[1] - a[1]).slice(0, 10)))}`);
}

if (require.main === module) main().catch((e) => { console.error(e.message); process.exit(1); });
module.exports = { mintCrmRecords, parseCsv };
