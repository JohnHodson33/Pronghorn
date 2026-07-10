// File writers for the daily run: raw JSON (every field), raw CSV, screened CSV.
// Moved out of run_daily.js so the entry point is purely orchestration.

const fs = require('fs');
const path = require('path');
const { json2csv } = require('json-2-csv');
const log = require('../utils/logger');
const { locationString } = require('./listing');

const today = new Date().toISOString().slice(0, 10);
const clean = (v) => (v === null || v === undefined ? '' : v);

function outputFolder(config) {
  const folder = path.resolve(__dirname, '..', config.output.output_folder);
  if (!fs.existsSync(folder)) fs.mkdirSync(folder, { recursive: true });
  return folder;
}

function brokerString(l) {
  if (!l.broker) return '';
  return [l.broker.name, l.broker.company].filter(Boolean).join(' / ');
}

function multipleFlagLabel(l, config) {
  const threshold = config.filters?.max_multiple_flag ?? 5.0;
  return l.multiple_flag ? `FLAG >${threshold}x` : '';
}

// Raw JSON — every field including source-specific raw extras, no screening data
async function saveJson(listings, config) {
  if (!config.output.save_json) return;
  const filePath = path.join(outputFolder(config), `listings_raw_${today}.json`);
  fs.writeFileSync(filePath, JSON.stringify(listings, null, 2));
  log.info(`JSON saved: ${filePath}`);
}

// Raw CSV — scraped + derived fields only, no tier/reasoning
async function saveCsv(listings, config) {
  if (!config.output.save_csv) return;
  const rows = listings.map((l) => ({
    'Date Scraped':     clean(l.date_scraped),
    'New':              l.is_new === false ? '' : 'NEW',
    'Relevant':         l.relevant === false ? `DROPPED — ${l.filter_reason}` : 'Yes',
    'Source':           clean(l.source),
    'Listing ID':       clean(l.id),
    'Business Name':    clean(l.name),
    'Industry':         clean(l.industry),
    'Location':         clean(locationString(l)),
    'Priority State':   l.priority_state ? 'YES' : '',
    'Asking Price':     clean(l.asking_price),
    'Revenue':          clean(l.gross_revenue),
    'Cash Flow':        clean(l.cash_flow),
    'Cash Flow Type':   clean(l.cash_flow_type),
    'Margin':           clean(l.ebitda_margin),
    'Implied Multiple': clean(l.implied_multiple),
    'Multiple Flag':    multipleFlagLabel(l, config),
    'Broker':           brokerString(l),
    'Duplicate Of':     clean(l.duplicate_of),
    'Date Listed':      clean(l.date_listed),
    'URL':              clean(l.url),
    'Description':      clean(l.description),
  }));
  const csv = await json2csv(rows);
  const filePath = path.join(outputFolder(config), `listings_${today}.csv`);
  fs.writeFileSync(filePath, csv);
  log.info(`CSV saved: ${filePath}`);
}

// Screened CSV — tier first, sorted tier ascending (Tier 1 at top)
async function saveScreenedCsv(listings, config) {
  const sorted = [...listings].sort((a, b) =>
    (a.tier || 99) - (b.tier || 99) || (b.cash_flow ?? -1) - (a.cash_flow ?? -1));
  const rows = sorted.map((l) => ({
    'Tier':             clean(l.tier),
    'Reasoning':        clean(l.reasoning),
    'Industry':         clean(l.industry),
    'Source':           clean(l.source),
    'Business Name':    clean(l.name),
    'Location':         clean(locationString(l)),
    'Priority State':   l.priority_state ? 'YES' : '',
    'Asking Price':     clean(l.asking_price),
    'Revenue':          clean(l.gross_revenue),
    'Cash Flow':        clean(l.cash_flow),
    'Cash Flow Type':   clean(l.cash_flow_type),
    'Margin':           clean(l.ebitda_margin),
    'Implied Multiple': clean(l.implied_multiple),
    'Multiple Flag':    multipleFlagLabel(l, config),
    'Description':      clean(l.description),
    'URL':              clean(l.url),
    'Listing ID':       clean(l.id),
    'Date Scraped':     clean(l.date_scraped),
  }));
  const csv = await json2csv(rows);
  const filePath = path.join(outputFolder(config), `listings_screened_${today}.csv`);
  fs.writeFileSync(filePath, csv);
  log.info(`Screened CSV saved: ${filePath}`);
}

module.exports = { saveJson, saveCsv, saveScreenedCsv };
