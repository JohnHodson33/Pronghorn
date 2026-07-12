// Free-pass enrichment (ENRICHMENT-UX rule: "if it doesn't burn paid credits,
// it runs without asking") — chained automatically onto every list build:
//   1. city/state from stored address strings (parser also runs at ingest)
//   2. TX license-board cross-reference: TDLR owner names for matching leads
// No Claude, no Exa, no Hunter — zero cost.
const { supabase } = require('../core/db');
const { parseCityState } = require('./sources/serper');
const { fetchTdlrLeads } = require('./sources/tdlr');

const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

async function freePass(listId, industry, log) {
  const { data: leads } = await supabase.from('leads')
    .select('id, name, address, city, state, owner_name, license_ids, source_tags')
    .eq('lead_list_id', listId);
  if (!leads?.length) return;

  let locFixed = 0, licMatched = 0;
  for (const l of leads) {
    if (l.address && !l.city) {
      const { city, state } = parseCityState(l.address);
      if (city) { await supabase.from('leads').update({ city, state: l.state || state }).eq('id', l.id); locFixed++; }
    }
  }

  // TX license cross-ref (free Socrata) for leads in TX missing owner names
  const txLeads = leads.filter((l) => (l.state === 'TX' || /\btx\b/i.test(l.address || '')) && !l.owner_name);
  if (txLeads.length) {
    try {
      const registry = await fetchTdlrLeads(industry, {});
      const byName = new Map(registry.map((r) => [norm(r.name), r]));
      for (const l of txLeads) {
        const hit = byName.get(norm(l.name));
        if (!hit) continue;
        await supabase.from('leads').update({
          owner_name: hit.owner_name,
          license_ids: [...new Set([...(l.license_ids || []), ...(hit.license_ids || [])])],
          source_tags: [...new Set([...(l.source_tags || []), 'state_license'])],
        }).eq('id', l.id);
        licMatched++;
      }
    } catch (e) { log?.warn(`  free-pass license x-ref: ${e.message}`); }
  }
  log?.info(`  free pass: ${locFixed} locations filled, ${licMatched} license matches (owner names)`);
}

module.exports = { freePass };
