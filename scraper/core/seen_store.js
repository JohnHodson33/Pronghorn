// Persistent registry of every listing id ever scraped, so each weekly run can
// mark what is NEW versus prior pulls. Stored as data/seen_listings.json
// ({ "bizbuysell:12345": "2026-07-03", ... }) — global ids, so it works across
// sources. The store accumulates forever: a listing seen three weeks ago still
// won't reappear as new.

const fs = require('fs');
const path = require('path');
const log = require('../utils/logger');

const STORE_PATH = path.resolve(__dirname, '..', 'data', 'seen_listings.json');

function loadSeen() {
  if (!fs.existsSync(STORE_PATH)) return {};
  try {
    return JSON.parse(fs.readFileSync(STORE_PATH, 'utf8'));
  } catch (err) {
    log.warn(`Seen store unreadable (${err.message}) — treating all listings as new`);
    return {};
  }
}

/** Set l.is_new on every listing based on the store. */
function annotateNew(listings, seen) {
  let newCount = 0;
  for (const l of listings) {
    l.is_new = !(l.id in seen);
    if (l.is_new) newCount++;
  }
  log.info(`Seen store: ${newCount}/${listings.length} listings are new vs. ${Object.keys(seen).length} previously seen ids`);
  return newCount;
}

/**
 * Record listings into the store and persist. Call this only after the digest
 * actually reached the inbox — if email fails, ids stay unrecorded so the same
 * listings surface as new on the next run instead of vanishing unseen.
 */
function recordSeen(listings, seen) {
  let added = 0;
  for (const l of listings) {
    if (!(l.id in seen)) {
      seen[l.id] = l.date_scraped;
      added++;
    }
  }
  const dir = path.dirname(STORE_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(STORE_PATH, JSON.stringify(seen, null, 2));
  log.info(`Seen store updated: +${added} ids, ${Object.keys(seen).length} total (${STORE_PATH})`);
}

module.exports = { loadSeen, annotateNew, recordSeen };
