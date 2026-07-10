// Runs every enabled source from config.sources, merges results into one
// deduped listing set, and computes derived fields. One source failing is
// logged into its stats and does not kill the run.

const path = require('path');
const log = require('../utils/logger');
const { enrich, validate } = require('./listing');

function loadScrapers(config, only) {
  const entries = Object.entries(config.sources || {})
    .filter(([, sc]) => sc.enabled)
    .filter(([name]) => !only || only.includes(name));

  return entries.map(([name, sc]) => {
    const ScraperClass = require(path.resolve(__dirname, '..', sc.module));
    return new ScraperClass(name, sc, config);
  });
}

// --- Cross-source fuzzy dedup -----------------------------------------------
// Same business listed on two sites won't share an id. Candidate key: identical
// (state, asking_price, cash_flow); confirm with name-token overlap. Conservative:
// flag via duplicate_of, never drop — downstream decides what to suppress.

function nameTokens(name) {
  return new Set(
    String(name || '')
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((t) => t.length > 2)
  );
}

function nameSimilarity(a, b) {
  const ta = nameTokens(a);
  const tb = nameTokens(b);
  if (!ta.size || !tb.size) return 0;
  let inter = 0;
  ta.forEach((t) => { if (tb.has(t)) inter++; });
  return inter / Math.min(ta.size, tb.size);
}

function flagCrossSourceDuplicates(listings) {
  const groups = new Map();
  for (const l of listings) {
    if (!l.location.state || !l.asking_price || !l.cash_flow) continue;
    const key = `${l.location.state}|${l.asking_price}|${l.cash_flow}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(l);
  }

  let flagged = 0;
  for (const group of groups.values()) {
    if (group.length < 2) continue;
    for (let i = 1; i < group.length; i++) {
      const original = group[0];
      const candidate = group[i];
      if (candidate.source === original.source) continue; // same-source ids already deduped exactly
      if (nameSimilarity(original.name, candidate.name) >= 0.5) {
        candidate.duplicate_of = original.id;
        flagged++;
        log.info(`  Duplicate flagged: ${candidate.id} ("${candidate.name}") ~ ${original.id} ("${original.name}")`);
      }
    }
  }
  return flagged;
}

// --- Main entry ---------------------------------------------------------------

/**
 * @param {Object} config  Parsed config.json
 * @param {{only?: string[]}} opts  Restrict to a subset of source names
 * @returns {Promise<{listings: import('./listing').Listing[], sourceStats: Object}>}
 */
async function runSources(config, opts = {}) {
  const scrapers = loadScrapers(config, opts.only);
  if (scrapers.length === 0) {
    throw new Error(
      opts.only
        ? `No enabled source matches --source ${opts.only.join(',')}`
        : 'No sources enabled in config.json'
    );
  }

  log.info(`Orchestrator: running ${scrapers.length} source(s) sequentially: ${scrapers.map((s) => s.name).join(', ')}`);

  const all = [];
  const seen = new Set();
  const sourceStats = {};

  for (const scraper of scrapers) {
    try {
      const { listings, stats } = await scraper.scrape();
      let added = 0;
      let exactDupes = 0;

      for (const l of listings) {
        for (const w of validate(l)) log.warn(`[${scraper.name}] ${l.id}: ${w}`);
        if (seen.has(l.id)) { exactDupes++; continue; }
        seen.add(l.id);
        all.push(enrich(l, config.filters || {}));
        added++;
      }

      sourceStats[scraper.name] = { ...stats, listings: added, exact_dupes: exactDupes, error: null };
    } catch (err) {
      log.error(`[${scraper.name}] Source failed: ${err.message}`);
      sourceStats[scraper.name] = { listings: 0, error: err.message };
    }
  }

  const flagged = flagCrossSourceDuplicates(all);
  if (flagged > 0) log.info(`Cross-source dedup: ${flagged} listing(s) flagged as duplicates`);

  log.info(`Orchestrator complete — ${all.length} unique listings across ${Object.keys(sourceStats).length} source(s)`);
  return { listings: all, sourceStats };
}

module.exports = { runSources };
