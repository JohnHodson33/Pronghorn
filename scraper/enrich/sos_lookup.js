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
