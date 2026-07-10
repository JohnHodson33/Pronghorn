// Supabase persistence for the scraper pipeline — replaces CSV/email as the
// system of record. Upserts listings keyed on (source_id, external_id),
// maintains first/last-seen, emits listing_events, applies screener results,
// and loads relevance criteria FROM the screen_profiles table so the UI (not
// config.json) owns the investment criteria.

const { supabase } = require('./db');
const log = require('../utils/logger');

const CHUNK = 100;

function chunks(arr, n) {
  const out = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
}

/**
 * Load the default screen profile and shape it like config.json's "relevance"
 * block, so core/filters.js works unchanged.
 */
async function loadRelevanceFromDb() {
  const { data, error } = await supabase
    .from('screen_profiles')
    .select('*')
    .eq('is_default', true)
    .limit(1)
    .single();
  if (error) throw new Error(`Could not load default screen profile: ${error.message}`);

  return {
    profileName: data.name,
    relevance: {
      industry_keywords_include: data.industry_keywords_include || [],
      industry_keywords_exclude: data.industry_keywords_exclude || [],
      geography: {
        include_states:  data.include_states || [],
        exclude_states:  data.exclude_states || [],
        priority_states: data.priority_states || [],
      },
      size: {
        min_asking_price: data.min_asking_price,
        max_asking_price: data.max_asking_price,
        min_cash_flow:    data.min_cash_flow,
        max_cash_flow:    data.max_cash_flow,
        unknown_cash_flow_min_asking_price: data.unknown_cash_flow_min_asking_price,
      },
      keep_when_unknown: data.keep_when_unknown !== false,
    },
    maxMultipleFlag: data.max_multiple_flag,
  };
}

function toRow(l) {
  return {
    source_id:        l.source,
    external_id:      l.source_listing_id,
    url:              l.url,
    name:             l.name,
    description:      l.description,
    industry_raw:     l.industry,
    city:             l.location?.city ?? null,
    state:            l.location?.state ?? null,
    asking_price:     l.asking_price,
    gross_revenue:    l.gross_revenue,
    cash_flow:        l.cash_flow,
    cash_flow_type:   l.cash_flow_type,
    implied_multiple: l.implied_multiple,
    multiple_flag:    !!l.multiple_flag,
    priority_state:   !!l.priority_state,
    raw: {
      ...l.raw,
      relevant:      l.relevant ?? null,
      filter_reason: l.filter_reason ?? null,
      date_listed:   l.date_listed ?? null,
    },
  };
}

/**
 * Sync scraped listings into the DB.
 * Returns { idMap (globalId → uuid), insertedIds (Set of globalId), stats }.
 */
async function syncListings(listings) {
  const idMap = new Map();
  const insertedIds = new Set();
  const events = [];
  const stats = { inserted: 0, updated: 0, price_changes: 0, relisted: 0 };
  const now = new Date().toISOString();

  const bySource = new Map();
  for (const l of listings) {
    if (!bySource.has(l.source)) bySource.set(l.source, []);
    bySource.get(l.source).push(l);
  }

  for (const [source, group] of bySource) {
    // Find which of this run's external_ids already exist
    const existing = new Map(); // external_id → row
    for (const c of chunks(group.map((l) => l.source_listing_id), CHUNK)) {
      const { data, error } = await supabase
        .from('listings')
        .select('id, external_id, asking_price, cash_flow, delisted_at')
        .eq('source_id', source)
        .in('external_id', c);
      if (error) throw new Error(`Lookup failed for ${source}: ${error.message}`);
      for (const row of data) existing.set(row.external_id, row);
    }

    const toInsert = group.filter((l) => !existing.has(l.source_listing_id));
    const toUpdate = group.filter((l) => existing.has(l.source_listing_id));

    // --- Inserts (bulk, chunked) ---
    for (const c of chunks(toInsert, CHUNK)) {
      const { data, error } = await supabase
        .from('listings')
        .insert(c.map(toRow))
        .select('id, external_id');
      if (error) throw new Error(`Insert failed for ${source}: ${error.message}`);
      for (const row of data) {
        const l = c.find((x) => x.source_listing_id === row.external_id);
        if (l) {
          idMap.set(l.id, row.id);
          insertedIds.add(l.id);
          events.push({ listing_id: row.id, event_type: 'new', detail: { asking_price: l.asking_price, cash_flow: l.cash_flow } });
        }
      }
      stats.inserted += data.length;
    }

    // --- Updates: refresh volatile fields + last_seen; detect changes ---
    for (const c of chunks(toUpdate, 20)) {
      await Promise.all(c.map(async (l) => {
        const prev = existing.get(l.source_listing_id);
        idMap.set(l.id, prev.id);

        const patch = {
          last_seen_at:     now,
          // volatile financials
          asking_price:     l.asking_price,
          cash_flow:        l.cash_flow,
          cash_flow_type:   l.cash_flow_type,
          implied_multiple: l.implied_multiple,
          multiple_flag:    !!l.multiple_flag,
          // titles/locations get repaired when an adapter's parsing improves
          name:             l.name,
          city:             l.location?.city ?? null,
          state:            l.location?.state ?? null,
          // re-annotate against the CURRENT screen profile (criteria may have
          // changed in the UI since this row was first seen)
          priority_state:   !!l.priority_state,
          raw: {
            ...l.raw,
            relevant:      l.relevant ?? null,
            filter_reason: l.filter_reason ?? null,
            date_listed:   l.date_listed ?? null,
          },
        };

        if (prev.delisted_at) {
          patch.delisted_at = null;
          events.push({ listing_id: prev.id, event_type: 'relisted', detail: {} });
          stats.relisted++;
        }
        if (prev.asking_price !== null && l.asking_price !== null && Number(prev.asking_price) !== l.asking_price) {
          events.push({
            listing_id: prev.id,
            event_type: 'price_change',
            detail: { from: Number(prev.asking_price), to: l.asking_price },
          });
          stats.price_changes++;
        }

        const { error } = await supabase.from('listings').update(patch).eq('id', prev.id);
        if (error) log.error(`Update failed for ${l.id}: ${error.message}`);
        else stats.updated++;
      }));
    }
  }

  // --- Events (bulk) ---
  for (const c of chunks(events, CHUNK)) {
    const { error } = await supabase.from('listing_events').insert(c);
    if (error) log.error(`Event insert failed: ${error.message}`);
  }

  log.info(`DB sync: ${stats.inserted} inserted, ${stats.updated} updated, ${stats.price_changes} price changes, ${stats.relisted} relisted`);
  return { idMap, insertedIds, stats };
}

/** Write screener results (tier, reasoning, normalized industry, extracted revenue) back to rows. */
async function applyScreeningResults(screened, idMap) {
  let ok = 0;
  for (const c of chunks(screened, 20)) {
    await Promise.all(c.map(async (l) => {
      const uuid = idMap.get(l.id);
      if (!uuid) return;
      const { error } = await supabase
        .from('listings')
        .update({
          tier:             l.tier,
          tier_reasoning:   l.reasoning || null,
          industry:         l.industry || null,
          gross_revenue:    l.gross_revenue,
          implied_multiple: l.implied_multiple,
          multiple_flag:    !!l.multiple_flag,
        })
        .eq('id', uuid);
      if (error) log.error(`Screening write failed for ${l.id}: ${error.message}`);
      else ok++;
    }));
  }
  log.info(`Screening results written: ${ok}/${screened.length}`);
  return ok;
}

/** Resolve orchestrator duplicate_of (global ids) to DB uuids. */
async function applyDuplicateLinks(listings, idMap) {
  const dupes = listings.filter((l) => l.duplicate_of && idMap.has(l.id) && idMap.has(l.duplicate_of));
  for (const l of dupes) {
    const { error } = await supabase
      .from('listings')
      .update({ duplicate_of: idMap.get(l.duplicate_of) })
      .eq('id', idMap.get(l.id));
    if (error) log.error(`Duplicate link failed for ${l.id}: ${error.message}`);
  }
  if (dupes.length) log.info(`Duplicate links written: ${dupes.length}`);
}

/**
 * DB enabled-flags for sources — the UI's Sources page toggles these, and the
 * pipeline honors them over config.json's static `enabled`.
 * Returns Map(sourceId → enabled). Sources absent from the DB default to true.
 */
async function loadSourceToggles() {
  const { data, error } = await supabase.from('scrape_sources').select('id, enabled');
  if (error) {
    log.warn(`Could not load source toggles (${error.message}) — falling back to config.json`);
    return new Map();
  }
  return new Map(data.map((r) => [r.id, r.enabled]));
}

/** Stamp the source's last run. */
async function touchSource(sourceId, status) {
  const { error } = await supabase
    .from('scrape_sources')
    .update({ last_run_at: new Date().toISOString(), last_run_status: status })
    .eq('id', sourceId);
  if (error) log.error(`touchSource(${sourceId}) failed: ${error.message}`);
}

module.exports = { loadRelevanceFromDb, loadSourceToggles, syncListings, applyScreeningResults, applyDuplicateLinks, touchSource };
