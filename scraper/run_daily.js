// Pronghorn Deal Sourcing Pipeline — entry point. Scheduled weekly (Monday 06:00
// Arizona) via Windows Task Scheduler → run_scheduled.bat; cadence lives there,
// not here, so this can also be run manually anytime.
// Flags:
//   --source <name>[,<name>]  Run a subset of registered sources (e.g. while testing a new adapter)
//   --scrape-only             Skip screening and email — scrape + save raw outputs only

require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { runSources } = require('./core/orchestrator');
const { applyRelevanceFilters } = require('./core/filters');
const { loadSeen, annotateNew, recordSeen } = require('./core/seen_store');
const { saveJson, saveCsv, saveScreenedCsv } = require('./core/output');
const { screenListings } = require('./screener/claude_screener');
const { sendDigest } = require('./delivery/outlook');
const log = require('./utils/logger');
const config = require('./config.json');

function parseArgs(argv) {
  const args = { only: null, scrapeOnly: false };
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === '--source' && argv[i + 1]) {
      args.only = argv[++i].split(',').map((s) => s.trim()).filter(Boolean);
    } else if (argv[i] === '--scrape-only') {
      args.scrapeOnly = true;
    }
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv);
  log.info('=== Pronghorn Deal Sourcing Pipeline — Daily Run START ===');
  const runStart = Date.now();

  // --- Step 1: Scrape all enabled sources ---
  const { listings, sourceStats } = await runSources(config, { only: args.only });
  if (listings.length === 0) {
    // Nothing scraped means every source failed (network down, site blocking) —
    // exit nonzero so Task Scheduler's retry-on-failure kicks in
    log.error('Zero listings from all sources — treating run as failed');
    process.exitCode = 1;
  }

  // --- Step 2: Relevance filter (industry/geography/size, config-driven) + new-vs-prior diff ---
  applyRelevanceFilters(listings, config.relevance);
  const seen = loadSeen();
  annotateNew(listings, seen);

  // Raw outputs keep EVERYTHING, annotated with Relevant/New, so the filter can be audited and tuned
  await saveJson(listings, config);
  await saveCsv(listings, config);

  if (args.scrapeOnly) {
    const elapsed = ((Date.now() - runStart) / 1000).toFixed(1);
    log.info(`=== Scrape-only run COMPLETE — ${listings.length} listings, ${elapsed}s elapsed (seen store NOT updated) ===`);
    return;
  }

  // --- Step 3: Screen only what's relevant, new, and not a cross-source duplicate ---
  const toScreen = listings.filter((l) => l.relevant && l.is_new && !l.duplicate_of);
  log.info(`Pipeline funnel: ${listings.length} scraped → ${listings.filter((l) => l.relevant).length} relevant → ${toScreen.length} new to screen`);

  const screened = toScreen.length > 0 ? await screenListings(toScreen, config) : [];
  await saveScreenedCsv(screened, config);

  // --- Step 4: Email delivery ---
  const runStats = {
    scraped:  listings.length,
    relevant: listings.filter((l) => l.relevant).length,
    new:      toScreen.length,
    total:    screened.length,
    tier1: screened.filter((l) => l.tier === 1).length,
    tier2: screened.filter((l) => l.tier === 2).length,
    tier3: screened.filter((l) => l.tier === 3).length,
    tier4: screened.filter((l) => l.tier === 4).length,
  };
  const emailSent = await sendDigest(screened, runStats);

  // Only mark listings as seen once the digest actually reached the inbox —
  // if email fails, this run's listings surface again as new next run.
  if (emailSent) {
    recordSeen(listings, seen);
    // Success marker consumed by run_if_due.js to decide whether this week's
    // scheduled run still needs to happen
    const markerPath = path.resolve(__dirname, 'data', 'last_success.json');
    fs.mkdirSync(path.dirname(markerPath), { recursive: true });
    fs.writeFileSync(markerPath, JSON.stringify({ completed_at: new Date().toISOString() }, null, 2));
  } else {
    log.warn('Digest email not sent — seen store NOT updated, so these listings will reappear as new next run');
    process.exitCode = 1;
  }

  const elapsed = ((Date.now() - runStart) / 1000).toFixed(1);
  const perSource = Object.entries(sourceStats)
    .map(([name, s]) => `${name}: ${s.error ? `FAILED (${s.error})` : `${s.listings} listings`}`)
    .join(' | ');
  log.info(`=== Run COMPLETE — ${listings.length} scraped [${perSource}], ${runStats.tier1} Tier 1, ${runStats.tier2} Tier 2, ${elapsed}s elapsed ===`);
}

if (require.main === module) {
  main().catch((err) => {
    log.error(`Unhandled error in main: ${err.message}`);
    process.exit(1);
  });
}

module.exports = { main };
