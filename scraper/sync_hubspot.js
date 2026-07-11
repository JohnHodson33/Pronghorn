// HubSpot → Supabase one-way deal/company refresh (docs/HUBSPOT-SYNC-DESIGN.md).
// Keeps the imported deals current: stage moves, amounts, closed-lost reasons.
// READ-ONLY on HubSpot. The reverse direction (platform → HubSpot push) is
// designed in the doc but DISABLED here on purpose — John has not approved
// enabling the write-back loop. Do not "fix" that without his say-so.
//
// Usage:
//   node sync_hubspot.js --file <deals.json>   # refresh from an MCP/REST dump
//   node sync_hubspot.js                       # fetch live via HUBSPOT_TOKEN
//   node sync_hubspot.js --push                # refuses (guardrail)
//
// HUBSPOT_TOKEN (scraper/.env) is a HubSpot Private App token — still awaited
// from John. Until then the --file path keeps the data current from MCP dumps.

const fs = require('fs');
const { supabase } = require('./core/db');
const log = require('./utils/logger');

// CAUTION (known HubSpot quirk in this portal): stage LABELS are mislabeled vs
// internal IDs — e.g. internal id `closedlost` carries the label "Closed - Won".
// Always map from INTERNAL IDs. Verified against the portal 2026-07-10:
//   appointmentscheduled="Sourced", qualifiedtobuy="Broker / Owner Contacted",
//   presentationscheduled="Info Requested", decisionmakerboughtin="Under Screening",
//   contractsent="Active Diligence", closedwon="LOI", closedlost="Closed - Won",
//   3939497680="Closed - Lost", 3939497681="Not Ready - Recontact"
const STAGE_MAP = {
  appointmentscheduled: { stage: 'Sourced' },
  qualifiedtobuy: { stage: 'Info Requested' }, // platform has no "Contacted" column
  presentationscheduled: { stage: 'Info Requested' },
  decisionmakerboughtin: { stage: 'Under Screening' },
  contractsent: { stage: 'Diligence' },
  closedwon: { stage: 'LOI' },
  closedlost: { stage: 'Closed', won: true },
  '3939497680': { stage: 'Closed', lost: true },
  '3939497681': { stage: 'Sourced', note: 'HubSpot: Not Ready - Recontact' },
};

async function fetchViaRest(token) {
  const axios = require('axios');
  const out = [];
  let after;
  do {
    const { data } = await axios.get('https://api.hubapi.com/crm/v3/objects/deals', {
      headers: { Authorization: `Bearer ${token}` },
      params: {
        limit: 100, after,
        properties: 'dealname,dealstage,pipeline,amount,closed_lost_reason,hs_lastmodifieddate',
      },
      timeout: 30000,
    });
    out.push(...data.results);
    after = data.paging?.next?.after;
  } while (after);
  return out;
}

async function main() {
  if (process.argv.includes('--push')) {
    console.error('Platform → HubSpot push is DISABLED (guardrail: import-only until John approves two-way).');
    process.exit(1);
  }
  const fileIdx = process.argv.indexOf('--file');
  let dump;
  if (fileIdx > -1) {
    dump = JSON.parse(fs.readFileSync(process.argv[fileIdx + 1], 'utf8')).results;
  } else if (process.env.HUBSPOT_TOKEN) {
    dump = await fetchViaRest(process.env.HUBSPOT_TOKEN);
  } else {
    console.error('No HUBSPOT_TOKEN in scraper/.env and no --file given. Nothing to sync.');
    process.exit(1);
  }
  log.info(`Refreshing from ${dump.length} HubSpot deals`);

  // Companies carry the hubspot_id breadcrumb (deal id) from the initial import.
  const { data: companies, error } = await supabase
    .from('companies').select('id, name, hubspot_id').not('hubspot_id', 'is', null);
  if (error) throw new Error(error.message);
  const byHsId = new Map(companies.map((c) => [String(c.hubspot_id), c]));

  let updated = 0; const netNew = [];
  for (const d of dump) {
    const p = d.properties;
    const hsId = String(d.id);
    const company = byHsId.get(hsId);
    if (!company) {
      netNew.push(p.dealname);
      continue;
    }
    const m = STAGE_MAP[p.dealstage];
    if (!m) { log.warn(`${p.dealname}: unknown HubSpot stage id "${p.dealstage}" — skipped`); continue; }

    const { data: deal } = await supabase
      .from('deals').select('id, stage, asking_price, closed_lost_reason')
      .eq('company_id', company.id).maybeSingle();
    if (!deal) { log.warn(`${p.dealname}: company has no deal row — skipped`); continue; }

    const patch = {};
    if (deal.stage !== m.stage) patch.stage = m.stage;
    const amount = p.amount ? Number(p.amount) : null;
    if (amount && Number(deal.asking_price) !== amount) patch.asking_price = amount;
    if (m.lost && p.closed_lost_reason && deal.closed_lost_reason !== p.closed_lost_reason) {
      patch.closed_lost_reason = p.closed_lost_reason;
    }
    if (!Object.keys(patch).length) continue;

    const { error: upErr } = await supabase.from('deals').update(patch).eq('id', deal.id);
    if (upErr) { log.error(`${p.dealname}: ${upErr.message}`); continue; }
    log.info(`  ${p.dealname}: ${Object.keys(patch).join(', ')} refreshed${patch.stage ? ` (→ ${patch.stage})` : ''}`);
    updated++;
  }

  if (netNew.length) {
    log.warn(`Net-new HubSpot deals not in platform (need company/financial data to import — review): ${netNew.join('; ')}`);
  }
  log.info(`Refresh done: ${updated} deals updated, ${netNew.length} net-new flagged`);
}

main().catch((e) => { console.error(e.message); process.exit(1); });
