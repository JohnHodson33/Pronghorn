// Pronghorn pipeline — Supabase edition. Scrapes enabled sources, filters by
// the DEFAULT SCREEN PROFILE FROM THE DATABASE (not config.json), upserts into
// Supabase with change events, and screens new relevant listings via Claude.
//
// Flags:
//   --source <name>[,..]   Subset of sources (default: all enabled in config)
//   --pages <n>            Override max_pages on every source (small test runs)
//   --no-screen            Skip the Claude tier screener
//
// config.json still supplies: sources registry, screener model/batching,
// chrome_path. Investment criteria come from screen_profiles (is_default=true).

require('dotenv').config();

const { runSources } = require('./core/orchestrator');
const { applyRelevanceFilters } = require('./core/filters');
const { screenListings } = require('./screener/claude_screener');
const {
  loadRelevanceFromDb, loadSourceToggles, syncListings, applyScreeningResults,
  applyDuplicateLinks, applyMirrorDuplicates, syncBrokers, touchSource,
} = require('./core/db_output');
const log = require('./utils/logger');
const baseConfig = require('./config.json');

function parseArgs(argv) {
  const args = { only: null, pages: null, screen: true };
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === '--source' && argv[i + 1]) args.only = argv[++i].split(',').map((s) => s.trim()).filter(Boolean);
    else if (argv[i] === '--pages' && argv[i + 1]) args.pages = parseInt(argv[++i], 10);
    else if (argv[i] === '--no-screen') args.screen = false;
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv);
  const runStart = Date.now();
  log.info('=== Pronghorn Pipeline (Supabase) START ===');

  // Criteria live in the DB — the UI edits them, the pipeline obeys them.
  const { profileName, relevance, maxMultipleFlag } = await loadRelevanceFromDb();
  log.info(`Screen profile: "${profileName}" (from screen_profiles)`);

  const config = JSON.parse(JSON.stringify(baseConfig));
  config.relevance = relevance;

  // UI toggles (Sources page) override config.json enabled flags
  const toggles = await loadSourceToggles();
  for (const [name, sc] of Object.entries(config.sources)) {
    if (toggles.has(name) && toggles.get(name) === false) {
      sc.enabled = false;
      log.info(`Source "${name}" disabled via UI toggle — skipping`);
    }
  }
  if (maxMultipleFlag != null) config.filters = { ...config.filters, max_multiple_flag: maxMultipleFlag };
  if (args.pages) {
    for (const s of Object.values(config.sources)) {
      s.max_pages = args.pages;
      s.max_pages_per_path = Math.min(args.pages, s.max_pages_per_path ?? args.pages);
    }
    log.info(`Page override: max ${args.pages} page(s) per source (test mode)`);
  }

  // --- Scrape ---
  const { listings, sourceStats } = await runSources(config, { only: args.only });
  if (listings.length === 0) {
    log.error('Zero listings from all sources — treating run as failed');
    for (const name of Object.keys(sourceStats)) await touchSource(name, 'failed: zero listings');
    process.exit(1);
  }

  // --- Filter (annotates l.relevant / l.priority_state, never deletes) ---
  applyRelevanceFilters(listings, config.relevance);

  // --- Sync to Supabase (insert new, refresh seen, emit events) ---
  const { idMap, insertedIds, untieredIds, stats } = await syncListings(listings);

  // --- Mirror dedup (deterministic, same-external-id feeds like BizQuest) ---
  const mirrorDupes = new Set(); // global ids of listings that duplicate a primary row
  for (const [name, sc] of Object.entries(config.sources)) {
    if (sc.enabled && sc.mirror_of) {
      const dupeExternalIds = await applyMirrorDuplicates(name, sc.mirror_of);
      for (const l of listings) {
        if (l.source === name && dupeExternalIds.has(l.source_listing_id)) mirrorDupes.add(l.id);
      }
    }
  }

  // --- Screen: relevant, not a duplicate, and either newly inserted or an
  // existing row that was never screened (self-heals gaps from earlier runs).
  const toScreen = listings.filter(
    (l) =>
      l.relevant && !l.duplicate_of && !mirrorDupes.has(l.id) &&
      (insertedIds.has(l.id) || untieredIds.has(l.id))
  );
  log.info(`Funnel: ${listings.length} scraped → ${listings.filter((l) => l.relevant).length} relevant → ${stats.inserted} new in DB → ${toScreen.length} to screen`);

  if (args.screen && toScreen.length > 0) {
    const screened = await screenListings(toScreen, config);
    await applyScreeningResults(screened, idMap);
    const t1 = screened.filter((l) => l.tier === 1).length;
    const t2 = screened.filter((l) => l.tier === 2).length;
    log.info(`Tiers this run: ${t1} Tier 1, ${t2} Tier 2`);
  } else if (!args.screen) {
    log.info('Screening skipped (--no-screen)');
  }

  await applyDuplicateLinks(listings, idMap);
  await syncBrokers(listings, idMap);

  for (const [name, s] of Object.entries(sourceStats)) {
    await touchSource(name, s.error ? `failed: ${s.error}` : `ok: ${s.listings} listings`);
  }

  const elapsed = ((Date.now() - runStart) / 1000).toFixed(1);
  log.info(`=== Run COMPLETE — ${stats.inserted} new, ${stats.updated} refreshed, ${elapsed}s ===`);
}

if (require.main === module) {
  main().catch((err) => {
    log.error(`Unhandled error: ${err.message}`);
    process.exit(1);
  });
}
