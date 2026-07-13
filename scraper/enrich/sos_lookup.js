// Secretary-of-State / corp-registry owner-name resolver (PM 7/12: the biggest
// free lift BASIC→IDENTIFIED, and names unlock Hunter downstream).
//
// RECON (2026-07-12, done so nobody re-walks it): the free public registries
// are bespoke anti-bot SPAs — AZ eCorp (ecorp.azcc.gov) is SPA-only / host
// won't resolve for scripted GET; FL Sunbiz (search.sunbiz.org) hard-403s bots;
// OpenCorporates' open API now returns 401 (token required). None are cleanly
// scriptable at scale today. The PROVEN free owner-name source remains the
// Socrata license boards (TX TDLR shipped) — extend THAT pattern per state
// where a Socrata licensee dataset with owner/officer names exists.
//
// This module is the correct SHAPE: a per-state resolver registry. It no-ops
// cleanly (returns null) until a resolver is registered, so wiring it into the
// cascade is safe now and it activates the moment a resolver lands — whether
// that's a keyed API (OpenCorporates ~$ / a skip-trace vendor) or a
// headless-browser resolver for a priority state.
//
// To add a state: registerResolver('AZ', async ({name, city}) => ownerName|null)

const RESOLVERS = new Map();

function registerResolver(state, fn) {
  RESOLVERS.set(String(state).toUpperCase(), fn);
}

// --- Socrata license-board resolvers (the free path that actually works) ----
// TX already has a dedicated adapter (sources/tdlr.js) used at ingest; this
// registers it as an on-demand owner-name resolver for the cascade too.
const { fetchTdlrLeads } = require('../leadgen/sources/tdlr');
const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
let _tdlrCache = null;
registerResolver('TX', async ({ name, industry }) => {
  try {
    if (!_tdlrCache) _tdlrCache = await fetchTdlrLeads(industry || 'HVAC', {});
    const hit = _tdlrCache.find((r) => norm(r.name) === norm(name));
    return hit?.owner_name || null;
  } catch { return null; }
});

// --- AZ ROC posting list (roc.az.gov/posting-list) -------------------------
// The Registrar of Contractors publishes ALL active licenses as a public CSV
// (~58k rows) including "Qualifying Party" — the licensed person, usually the
// owner. This is AZ's intended transparency channel (no key, no scrape of the
// search UI). The .csv path rejects bare clients; a normal session that first
// visits the posting-list page (cookie + referer) is served directly. File is
// cached in scraper/data/ (gitignored) and refreshed weekly.
const fs = require('fs');
const path = require('path');
const AZROC_FILE = path.resolve(__dirname, '../data/azroc_posting.csv');
const AZROC_MAX_AGE_MS = 7 * 24 * 3600 * 1000;
const AZROC_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';

async function azrocDownload() {
  const axios = require('axios');
  const page = await axios.get('https://roc.az.gov/posting-list', {
    headers: { 'User-Agent': AZROC_UA }, timeout: 30000,
  });
  const cookies = (page.headers['set-cookie'] || []).map((c) => c.split(';')[0]).join('; ');
  const m = String(page.data).match(/href="(https:\/\/roc\.az\.gov\/sites\/default\/files\/ROC_Posting-List_\d{4}-\d{2}-\d{2}\.csv)"/);
  if (!m) throw new Error('AZ ROC posting-list CSV link not found');
  const csv = await axios.get(m[1], {
    headers: { 'User-Agent': AZROC_UA, Referer: 'https://roc.az.gov/posting-list', Cookie: cookies },
    timeout: 180000, responseType: 'text', maxContentLength: 60e6,
  });
  if (!/Qualifying Party/.test(String(csv.data).slice(0, 500))) throw new Error('AZ ROC CSV: unexpected shape');
  fs.mkdirSync(path.dirname(AZROC_FILE), { recursive: true });
  fs.writeFileSync(AZROC_FILE, csv.data);
}

// QP must look like a PERSON — org-shaped qualifying parties (holding LLCs)
// would poison Hunter/LinkedIn lookups downstream.
const ORG_QP = /\b(llc|inc|corp|company|holdings|trust|l\.?l\.?c|enterprises|group)\b/i;

let _azMap = null;
async function azrocMap() {
  if (_azMap) return _azMap;
  const stat = fs.existsSync(AZROC_FILE) ? fs.statSync(AZROC_FILE) : null;
  if (!stat || Date.now() - stat.mtimeMs > AZROC_MAX_AGE_MS) await azrocDownload();
  const { csv2json } = require('json-2-csv');
  let text = fs.readFileSync(AZROC_FILE, 'utf8');
  text = text.slice(text.indexOf('\n') + 1); // line 1 is a title, header is line 2
  const rows = await csv2json(text);
  _azMap = new Map();
  const put = (n, qp) => { const k = norm(n); if (k && !_azMap.has(k)) _azMap.set(k, qp); };
  const SUFFIX = /\s(llc|inc|co|corp|company|ltd|pllc)$/;
  for (const r of rows) {
    const qp = String(r['Qualifying Party'] || '').trim();
    if (!qp || /^qp exempt$/i.test(qp) || ORG_QP.test(qp)) continue;
    for (const n of [r['Business Name'], r['Doing Business As']]) {
      if (!n) continue;
      put(n, qp);
      const stripped = norm(n).replace(SUFFIX, '');
      if (stripped !== norm(n)) put(stripped, qp);
    }
  }
  return _azMap;
}

registerResolver('AZ', async ({ name }) => {
  const map = await azrocMap();
  const k = norm(name);
  return map.get(k) || map.get(k.replace(/\s(llc|inc|co|corp|company|ltd|pllc)$/, '')) || null;
});

/**
 * Resolve an owner/officer name for a company from its state registry.
 * @param lead { name, state, city, industry }
 * @returns owner name string, or null if no resolver / no match
 */
async function resolveOwnerName(lead) {
  const fn = RESOLVERS.get(String(lead.state || '').toUpperCase());
  if (!fn) return null;
  try { return await fn(lead); } catch { return null; }
}

function hasResolver(state) { return RESOLVERS.has(String(state || '').toUpperCase()); }

module.exports = { resolveOwnerName, registerResolver, hasResolver };
