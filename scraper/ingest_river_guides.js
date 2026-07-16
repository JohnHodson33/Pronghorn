// Ingest the river-guides seed CSV into the river_guides table (migration 0016).
// Idempotent: upserts on deal_id — safe to re-run after CSV regeneration.
// Usage: node ingest_river_guides.js [path-to-csv]
// Default CSV path is John's LOCAL research folder — the data never enters the repo.
//
// CRM linking (contacts tag river_guide + companies w/ pe_owned) is Lane C's
// follow-up unit; this script gets the channel live for search/filter/select.
const { supabase } = require('./core/db');
const fs = require('fs');

const CSV_PATH = process.argv[2] || 'C:\\Users\\johnd\\CRM Set up\\river-guides\\river-guides-seed-all.csv';

// Minimal RFC-4180 parser (quoted fields, embedded commas/quotes/newlines).
function parseCsv(text) {
  const rows = [];
  let row = [], field = '', inQuotes = false;
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1); // BOM
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field); field = '';
      if (row.length > 1 || row[0] !== '') rows.push(row);
      row = [];
    } else field += c;
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row); }
  return rows;
}

const INDUSTRY_MAP = {
  lawn: 'LAWN_CARE', 'lawn care': 'LAWN_CARE',
  tree: 'TREE_CARE', 'tree care': 'TREE_CARE',
  landscape: 'LANDSCAPE', landscaping: 'LANDSCAPE',
  'residential landscape': 'LANDSCAPE', 'res landscape': 'LANDSCAPE',
  pool: 'POOL_SERVICES', 'pool services': 'POOL_SERVICES',
  fencing: 'FENCING', fence: 'FENCING',
  kitchen: 'COMMERCIAL_KITCHEN_SERVICE', 'kitchen service': 'COMMERCIAL_KITCHEN_SERVICE',
  'commercial kitchen': 'COMMERCIAL_KITCHEN_SERVICE',
  pest: 'PEST',
  both: 'LANDSCAPE', // cross-listed green rows default to LANDSCAPE; vertical_raw keeps the truth
};
const industryEnum = (v) => INDUSTRY_MAP[(v || '').trim().toLowerCase()] || 'OTHER';
const norm = (v) => { const s = (v || '').trim(); return s === '' ? null : s; };
const normStatus = (v) => {
  const s = (norm(v) || '').toUpperCase().replace(/[\s-]+/g, '_');
  return ['LIVE', 'REDIRECTS', 'DEFUNCT', 'NOT_FOUND'].includes(s) ? s : null;
};
const confEnum = (v) => {
  const s = (norm(v) || '').toUpperCase();
  return ['HIGH', 'MEDIUM', 'LOW'].includes(s) ? s : null;
};

async function main() {
  const text = fs.readFileSync(CSV_PATH, 'utf8');
  const rows = parseCsv(text);
  const header = rows.shift().map((h) => h.trim());
  const idx = Object.fromEntries(header.map((h, i) => [h, i]));
  const need = ['deal_id', 'Company', 'Vertical'];
  for (const n of need) if (!(n in idx)) throw new Error(`CSV missing column ${n}`);

  const records = [];
  const seen = new Set();
  for (const r of rows) {
    const get = (k) => norm(r[idx[k]]);
    const dealId = get('deal_id');
    if (!dealId || seen.has(dealId)) { if (dealId) console.log(`  skip dup deal_id ${dealId}`); continue; }
    seen.add(dealId);
    const owner = get('Owner');
    const isTbd = !owner || /^tbd$/i.test(owner);
    records.push({
      deal_id: dealId,
      full_name: isTbd ? null : owner,
      name_status: (get('name_status') || (isTbd ? 'TBD' : 'RESOLVED')).toUpperCase() === 'RESOLVED' && !isTbd ? 'RESOLVED' : 'TBD',
      archetype: 'A_EXITED_OPERATOR', // the consolidator sweep only produces sellers
      industry: industryEnum(get('Vertical')),
      industry_group: get('industry_group'),
      vertical_raw: get('Vertical'),
      their_company: get('Company'),
      acquirer: get('Acquirer'),
      acquirer_pe_sponsor: get('Sponsor'),
      acquirer_website: get('acquirer_website'),
      deal_year: get('Year') && /^\d{4}$/.test(get('Year')) ? parseInt(get('Year'), 10) : null,
      location_city: get('city'),
      location_state: get('state'),
      company_website: get('company_website'),
      company_website_status: normStatus(get('company_website_status')),
      exit_status: ['EXITED', 'EMPLOYED'].includes((get('exit_status') || '').toUpperCase()) ? get('exit_status').toUpperCase() : 'UNKNOWN',
      source: get('Source'),
      source_confidence: confEnum(get('Confidence')),
      screen_score: get('screen_score') && /^\d+$/.test(get('screen_score')) ? parseInt(get('screen_score'), 10) : null,
      priority_band: ['CALL_NOW', 'ENRICH_THEN_ASSESS', 'NURTURE', 'RESOLVE_NAME_FIRST'].includes((get('priority_band') || '').toUpperCase()) ? get('priority_band').toUpperCase() : null,
      enrichment_status: ['NEEDS_NAME', 'PENDING_T1', 'T1_DONE', 'NEEDS_PAID', 'ENRICHED', 'VERIFIED'].includes((get('enrichment_status') || '').toUpperCase()) ? get('enrichment_status').toUpperCase() : (isTbd ? 'NEEDS_NAME' : 'PENDING_T1'),
      updated_at: new Date().toISOString(),
    });
  }

  console.log(`Parsed ${records.length} candidates from ${CSV_PATH}`);
  let ok = 0, failed = 0;
  for (let i = 0; i < records.length; i += 100) {
    const chunk = records.slice(i, i + 100);
    const { error } = await supabase.from('river_guides').upsert(chunk, { onConflict: 'deal_id' });
    if (error) {
      // chunk failure → row-by-row so one bad row can't sink the batch
      for (const rec of chunk) {
        const { error: e2 } = await supabase.from('river_guides').upsert(rec, { onConflict: 'deal_id' });
        if (e2) { failed++; console.log(`  ✗ ${rec.deal_id}: ${e2.message}`); }
        else ok++;
      }
    } else ok += chunk.length;
  }
  console.log(`Upserted ${ok} rows${failed ? `, ${failed} FAILED` : ''}.`);

  const { count } = await supabase.from('river_guides').select('*', { count: 'exact', head: true });
  const { data: bands } = await supabase.from('river_guides').select('priority_band');
  const bandCounts = {};
  for (const b of bands || []) bandCounts[b.priority_band || 'none'] = (bandCounts[b.priority_band || 'none'] || 0) + 1;
  console.log(`Table total: ${count}. Bands:`, JSON.stringify(bandCounts));
}

main().catch((e) => { console.error('INGEST FAILED:', e.message); process.exit(1); });
