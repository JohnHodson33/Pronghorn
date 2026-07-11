// One-time / re-runnable import of HubSpot Deal Sourcing deals into the CRM.
// HubSpot → Supabase only (nothing pushed back). Idempotent on companies.hubspot_id.
// Data captured from the HubSpot MCP (deal descriptions carry financials).
// Firm rule: the nameless "Regional Landscape Operator (Axial)" is intentionally
// EXCLUDED (no real company name).

const { supabase } = require('./core/db');
const log = require('./utils/logger');

const DEALS = [
  // --- Active green-industry deals ---
  { hubspot_id: '335079251689', company: 'Landmark Pest Management', industry: 'Pest Control', city: 'Schaumburg', state: 'IL',
    revenue: 11200000, ebitda: 4100000, ebitda_type: 'EBITDA', asking: null, stage: 'Under Screening',
    broker: { name: 'Oliver Bogner', firm: 'The Advisory Investment Bank' },
    note: 'PRE-IOI (IOI 7/10). 8,747 accounts, 73.1% retention, 101.3% NRR, 36.6% margin. Platform 10-12x.' },
  { hubspot_id: '335063621337', company: 'BF Stonework LLC', industry: 'Pool Services', city: 'Atlanta', state: 'GA',
    revenue: 16080000, ebitda: 3090000, ebitda_type: 'EBITDA', asking: null, stage: 'Info Requested',
    broker: { name: 'Ramzi Daklouche', firm: 'VR Business Brokers Atlanta' },
    note: 'Pool finishing/resurfacing/outdoor-living. 19.2% EBITDA margin, 20.2% 3yr rev CAGR. 84/88 workers 1099 (diligence risk). Open to 15-25% rollover.' },
  { hubspot_id: '335077301994', company: 'Gage Tree Care', industry: 'Tree Care', city: 'Anchorage', state: 'AK',
    revenue: 4500000, ebitda: 908000, ebitda_type: 'EBITDA', asking: null, stage: 'Info Requested',
    broker: { name: 'Matt Stemmler', firm: 'Principium | White Oak' },
    note: 'Counter-seasonal (tree + Christmas lights + snow). 2025 low-snow year = earnings upside. Owner retains real estate, leases back. IOI process.' },
  { hubspot_id: '335107058394', company: 'Affordable Windows & Doors of Tampa Bay', industry: 'Windows & Doors', city: 'Tampa', state: 'FL',
    revenue: 3910000, ebitda: 700000, ebitda_type: 'SDE', asking: 1400000, stage: 'Info Requested',
    broker: { name: 'Luis Zavala', firm: 'Murphy Business' },
    note: 'Hurricane-impact replacement windows/doors. SBA pre-qual, ~2x SDE. FLAG: revenue declining, SDE volatile. Owner Darrin Payne.' },
];

// Nail-salon history (Closed-Lost) — imported as passed for the record.
const NAIL = [
  ['335077204668', "Maiya's Nails", 'Scottsdale', 'AZ', 999000],
  ['335033409251', 'Nail 21', 'Mesa', 'AZ', 600000],
  ['334945553136', 'Sugar Nails & Spa', 'Queen Creek', 'AZ', 380000],
  ['335077203703', 'Lush Nails', 'Scottsdale', 'AZ', 520000],
  ['335114946260', 'OMG Nails Tempe', 'Tempe', 'AZ', 1850000],
  ['335061719788', 'Ho Best Nails', 'Phoenix', 'AZ', 475000],
  ['334920238824', 'Luxury Nails', 'Scottsdale', 'AZ', 397000],
  ['334973610729', 'Modern Nails', 'Scottsdale', 'AZ', 449000],
  ['335106398957', 'Classic and Fancy Nails', 'Laveen', 'AZ', 975000],
  ['335113082583', 'Herbal Nail & Spa', 'Maricopa', 'AZ', 895000],
  ['335104476863', 'Apple Nailed It', 'Gilbert', 'AZ', 775000],
  ['334920238823', 'San Tan Nail', 'Gilbert', 'AZ', 1250000],
  ['335114946258', 'The Nail Logic', 'Gilbert', 'AZ', 2250000],
  ['335018334956', 'Amour Nail', 'Henderson', 'NV', 425000],
].map(([hubspot_id, company, city, state, asking]) => ({
  hubspot_id, company, industry: 'Nail Salon', city, state, revenue: null, ebitda: null,
  ebitda_type: 'SDE', asking, stage: 'Closed', passed: true, broker: null, note: 'Nail-salon thesis (wound down Jul 2026). Closed-Lost.',
}));

async function upsertCompany(d) {
  // idempotent on hubspot_id
  const { data: existing } = await supabase.from('companies').select('id').eq('hubspot_id', d.hubspot_id).maybeSingle();
  const payload = {
    name: d.company, industry: d.industry, city: d.city, state: d.state,
    revenue: d.revenue, ebitda: d.ebitda, ebitda_type: d.ebitda_type,
    origin: 'hubspot', hubspot_id: d.hubspot_id, notes: d.note,
  };
  if (existing) {
    await supabase.from('companies').update(payload).eq('id', existing.id);
    return existing.id;
  }
  const { data, error } = await supabase.from('companies').insert(payload).select('id').single();
  if (error) throw new Error(`company ${d.company}: ${error.message}`);
  return data.id;
}

async function main() {
  let deals = 0, contacts = 0;
  for (const d of [...DEALS, ...NAIL]) {
    try {
      const companyId = await upsertCompany(d);

      // one deal per company (idempotent by company_id)
      const { data: existingDeal } = await supabase.from('deals').select('id').eq('company_id', companyId).maybeSingle();
      const dealPayload = { company_id: companyId, name: d.company, stage: d.stage, asking_price: d.asking };
      let dealId;
      if (existingDeal) { await supabase.from('deals').update(dealPayload).eq('id', existingDeal.id); dealId = existingDeal.id; }
      else { const { data } = await supabase.from('deals').insert(dealPayload).select('id').single(); dealId = data?.id; }
      deals++;

      // sell-side broker as a contact (role=broker)
      if (d.broker) {
        const { data: exC } = await supabase.from('contacts').select('id').eq('company_id', companyId).eq('role', 'broker').maybeSingle();
        if (!exC) {
          await supabase.from('contacts').insert({ company_id: companyId, role: 'broker', name: d.broker.name, notes: d.broker.firm });
          contacts++;
        }
      }
      // seed an activity noting the HubSpot import + the deal note
      if (dealId && d.note) {
        const { count } = await supabase.from('activities').select('*', { count: 'exact', head: true }).eq('deal_id', dealId).eq('kind', 'note');
        if (!count) await supabase.from('activities').insert({ company_id: companyId, deal_id: dealId, kind: 'note', body: `[Imported from HubSpot] ${d.note}` });
      }
    } catch (e) {
      log.error(`Import failed for ${d.company}: ${e.message}`);
    }
  }
  log.info(`HubSpot import: ${deals} deals, ${contacts} broker contacts`);
}

main().catch((e) => { console.error(e.message); process.exit(1); });
