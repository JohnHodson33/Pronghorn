// HubSpot ↔ Supabase sync (docs/HUBSPOT-SYNC-DESIGN.md).
// Pull (default): HubSpot → Supabase refresh — stage moves, amounts,
// closed-lost reasons. Always safe; read-only on HubSpot.
// Push (--push): platform → HubSpot for NET-NEW records only (deals promoted
// from scraped listings/leads). PM relayed John's approval (2026-07-11), but
// the write-back stays gated on BOTH env vars below so the loop can only go
// live when John himself flips it — this session's standing guardrail is
// import-only, and a relayed approval doesn't override it:
//   HUBSPOT_TOKEN=<private app token>   (Settings → Integrations → Private Apps)
//   HUBSPOT_PUSH_ENABLED=true           (John sets deliberately)
//
// Usage:
//   node sync_hubspot.js --file <deals.json>   # refresh from an MCP/REST dump
//   node sync_hubspot.js                       # refresh live via HUBSPOT_TOKEN
//   node sync_hubspot.js --push [--dry-run]    # net-new push (gated as above);
//                                              # --dry-run prints the plan only

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
  '3939497680': { stage: 'Passed', lost: true }, // platform "Passed" (7/11: Closed = real closes only)
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

// Platform stage → HubSpot INTERNAL stage id (reverse of STAGE_MAP; several
// platform stages collapse — chosen conservatively). 'Closed' needs the deal's
// closed_lost_reason to pick won vs lost.
const PUSH_STAGE = {
  'Sourced': 'appointmentscheduled',
  'Info Requested': 'presentationscheduled',
  'Under Screening': 'decisionmakerboughtin',
  'IOI Submitted': 'decisionmakerboughtin', // HubSpot pipeline has no IOI stage
  'Diligence': 'contractsent',
  'LOI': 'closedwon',
  'Passed': '3939497680', // platform Passed = HubSpot custom Closed-Lost id
};
// Firm rule: nothing anonymized crosses systems in either direction.
const BLIND_NAME = /axial|regional .{0,30}operator|^unnamed|blind teaser/i;

async function pushNetNew(token, dryRun) {
  const axios = require('axios');
  const hs = axios.create({
    baseURL: 'https://api.hubapi.com',
    headers: { Authorization: `Bearer ${token}` },
    timeout: 30000,
  });

  // Net-new = platform-origin companies with a deal and no hubspot_id yet.
  const { data: companies, error } = await supabase
    .from('companies')
    .select('id, name, website, industry, city, state, notes, hubspot_id, origin, deals(id, name, stage, asking_price, closed_lost_reason)')
    .is('hubspot_id', null)
    .not('origin', 'eq', 'hubspot');
  if (error) throw new Error(error.message);

  const candidates = (companies || []).filter((c) => c.deals?.length && !BLIND_NAME.test(c.name));
  const excluded = (companies || []).filter((c) => c.deals?.length && BLIND_NAME.test(c.name));
  for (const c of excluded) log.warn(`  push: "${c.name}" excluded (real-name rule)`);
  log.info(`Push candidates (net-new, named, with deals): ${candidates.length}`);
  if (dryRun) {
    for (const c of candidates) {
      const d = c.deals[0];
      log.info(`  DRY RUN would create: company "${c.name}" + deal "${d.name}" @ ${d.stage} → ${PUSH_STAGE[d.stage] || '3939497680'}`);
    }
    return;
  }

  for (const c of candidates) {
    try {
      const { data: hsCompany } = await hs.post('/crm/v3/objects/companies', {
        properties: {
          name: c.name,
          domain: (c.website || '').replace(/^https?:\/\/(www\.)?/, '').split('/')[0] || undefined,
          industry: c.industry || undefined,
          city: c.city || undefined,
          state: c.state || undefined,
          description: `Pronghorn platform record ${c.id} (origin: ${c.origin || 'platform'})`,
        },
      });
      const d = c.deals[0];
      const stageId = d.stage === 'Closed'
        ? (d.closed_lost_reason ? '3939497680' : 'closedlost')
        : (PUSH_STAGE[d.stage] || 'appointmentscheduled');
      const { data: hsDeal } = await hs.post('/crm/v3/objects/deals', {
        properties: {
          dealname: d.name, pipeline: 'default', dealstage: stageId,
          amount: d.asking_price || undefined,
          closed_lost_reason: d.closed_lost_reason || undefined,
        },
        associations: [{
          to: { id: hsCompany.id },
          types: [{ associationCategory: 'HUBSPOT_DEFINED', associationTypeId: 5 }], // deal → company
        }],
      });
      // breadcrumb both directions for idempotency
      await supabase.from('companies').update({ hubspot_id: String(hsDeal.id) }).eq('id', c.id);
      await supabase.from('activities').insert({
        company_id: c.id, deal_id: d.id, kind: 'note',
        body: `[auto] Pushed to HubSpot (company ${hsCompany.id}, deal ${hsDeal.id}) — net-new sync`,
      });
      log.info(`  pushed: ${c.name} (deal ${hsDeal.id}, stage ${stageId})`);
    } catch (e) {
      log.error(`  push ${c.name}: ${e.response?.data?.message || e.message}`);
    }
  }
}

async function main() {
  if (process.argv.includes('--push')) {
    const token = process.env.HUBSPOT_TOKEN;
    const enabled = process.env.HUBSPOT_PUSH_ENABLED === 'true';
    if (!token || !enabled) {
      console.error('Push is gated: set HUBSPOT_TOKEN and HUBSPOT_PUSH_ENABLED=true in scraper/.env.');
      console.error('(PM relayed approval 2026-07-11; John flips the flag himself — see file header.)');
      process.exit(1);
    }
    await pushNetNew(token, process.argv.includes('--dry-run'));
    return;
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
