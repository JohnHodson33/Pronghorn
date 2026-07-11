// Lead-list worker — processes `lead_lists` rows created by the List Building
// tab, using the FREE source stack (no API keys): OSM Overpass + state license
// boards. Paid sources (Serper/Places/Parallel/Exa) plug in here once John adds
// keys — same orchestration, more fetchers.
//
// Usage:
//   node leadgen/run_leadgen.js                 # process all pending lead lists
//   node leadgen/run_leadgen.js --list <uuid>   # (re)run one list by id
//
// Behavior:
//   pending → running → complete/failed, leads_found updated, cost_actual=0
//   (free sources). Each lead carries source_tags for source-quality analytics.
//   Dedupe: within-run by normalized name, against DB by (name, state).

const { supabase } = require('../core/db');
const log = require('../utils/logger');
const { geocode } = require('./geocode');
const { fetchOsmLeads } = require('./sources/osm');
const { fetchTdlrLeads } = require('./sources/tdlr');

const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

async function loadPending(listId) {
  let q = supabase.from('lead_lists').select('*');
  q = listId ? q.eq('id', listId) : q.eq('status', 'pending');
  const { data, error } = await q;
  if (error) throw new Error(`lead_lists load: ${error.message}`);
  return data;
}

async function existingLeadKeys() {
  const keys = new Set();
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase.from('leads').select('name, state').range(from, from + 999);
    if (error) throw new Error(`leads load: ${error.message}`);
    for (const r of data) keys.add(`${norm(r.name)}|${(r.state || '').toUpperCase()}`);
    if (data.length < 1000) break;
  }
  return keys;
}

async function runList(list, dbKeys) {
  log.info(`Lead list ${list.id}: "${list.query_industry}" @ ${list.query_geography || 'national'} (target ${list.target_count})`);
  await supabase.from('lead_lists').update({ status: 'running' }).eq('id', list.id);

  const enabled = list.sources_enabled || [];
  const useAll = enabled.length === 0; // older rows may have no explicit toggles
  const on = (id) => useAll || enabled.includes(id);

  try {
    const geo = list.query_geography ? await geocode(list.query_geography) : null;
    if (list.query_geography && !geo) log.warn(`Geocode failed for "${list.query_geography}" — OSM will be skipped`);

    const candidates = [];
    if (on('osm')) {
      const osm = await fetchOsmLeads(list.query_industry, geo, list.radius_miles || 70, log);
      log.info(`  osm: ${osm.length} candidates`);
      candidates.push(...osm);
    }
    if (on('state_license')) {
      // TX license boards apply when the search is in/around Texas or national.
      const inTexas = !list.query_geography || /\bTX\b|texas/i.test(list.query_geography);
      if (inTexas) {
        const county = ((geo?.displayName?.match(/([A-Za-z ]+) County/) || [])[1] || '').trim() || undefined;
        const tdlr = await fetchTdlrLeads(list.query_industry, { county });
        log.info(`  tdlr${county ? ` (${county} County)` : ''}: ${tdlr.length} candidates`);
        candidates.push(...tdlr);
      }
    }

    // Dedupe (merge source_tags/fields when two sources found the same company)
    const seen = new Map();
    for (const c of candidates) {
      const key = `${norm(c.name)}|${(c.state || geo?.displayName?.match(/\b([A-Z]{2})\b/)?.[1] || '').toUpperCase()}`;
      const prev = seen.get(key);
      if (prev) {
        prev.source_tags = [...new Set([...prev.source_tags, ...c.source_tags])];
        for (const k of ['phone', 'website', 'address', 'city', 'state', 'owner_name']) prev[k] = prev[k] || c[k];
        if (c.license_ids) prev.license_ids = [...new Set([...(prev.license_ids || []), ...c.license_ids])];
      } else if (!dbKeys.has(key)) {
        seen.set(key, { ...c });
      }
    }

    // Respect the requested target count (multi-source hits rank first — a
    // company found by 2+ sources is more likely real and established).
    const ranked = [...seen.values()].sort((a, b) =>
      (b.source_tags.length - a.source_tags.length) ||
      ((b.phone ? 1 : 0) + (b.website ? 1 : 0)) - ((a.phone ? 1 : 0) + (a.website ? 1 : 0)));
    const chosen = ranked.slice(0, list.target_count || 50);

    let inserted = 0;
    for (let i = 0; i < chosen.length; i += 200) {
      const chunk = chosen.slice(i, i + 200).map((c) => ({
        lead_list_id: list.id,
        name: c.name, phone: c.phone, website: c.website,
        address: c.address, city: c.city, state: c.state,
        owner_name: c.owner_name || null,
        license_ids: c.license_ids || [],
        source_tags: c.source_tags,
        status: 'new',
      }));
      const { error } = await supabase.from('leads').insert(chunk);
      if (error) throw new Error(`leads insert: ${error.message}`);
      inserted += chunk.length;
      for (const c of chunk) dbKeys.add(`${norm(c.name)}|${(c.state || '').toUpperCase()}`);
    }

    await supabase.from('lead_lists').update({
      status: 'complete', leads_found: inserted, cost_actual: 0,
    }).eq('id', list.id);
    log.info(`  → ${inserted} leads inserted (${ranked.length} unique candidates found)`);
    return inserted;
  } catch (e) {
    log.error(`  lead list ${list.id} failed: ${e.message}`);
    await supabase.from('lead_lists').update({ status: 'failed' }).eq('id', list.id);
    return 0;
  }
}

async function main() {
  const listIdx = process.argv.indexOf('--list');
  const listId = listIdx > -1 ? process.argv[listIdx + 1] : null;
  const lists = await loadPending(listId);
  if (!lists.length) { log.info('No pending lead lists.'); return; }
  const dbKeys = await existingLeadKeys();
  let total = 0;
  for (const [i, l] of lists.entries()) {
    if (i > 0) await new Promise((r) => setTimeout(r, 10000)); // Overpass etiquette between lists
    total += await runList(l, dbKeys);
  }
  log.info(`Done: ${total} leads across ${lists.length} list(s)`);
}

main().catch((e) => { console.error(e.message); process.exit(1); });
