// Canonical listing schema shared by every source adapter.
// Scrapers emit facts via createListing(); derived fields (implied_multiple,
// multiple_flag) are computed centrally by enrich() so thresholds live in one place.

/**
 * @typedef {Object} Listing
 * @property {string} id                 Source-prefixed global id, e.g. "bizbuysell:2318765"
 * @property {string} source
 * @property {string} source_listing_id
 * @property {string|null} url
 * @property {string|null} name
 * @property {string|null} description
 * @property {{city: string|null, state: string|null, raw: string|null}} location
 * @property {string|null} industry
 * @property {string|null} naics
 * @property {number|null} asking_price
 * @property {number|null} gross_revenue
 * @property {number|null} cash_flow
 * @property {"SDE"|"EBITDA"|"CASH_FLOW"|null} cash_flow_type
 * @property {{name: string|null, company: string|null, phone: string|null, email: string|null}|null} broker
 * @property {string|null} date_listed   YYYY-MM-DD
 * @property {string} date_scraped       YYYY-MM-DD
 * @property {number|null} implied_multiple  Derived — set by enrich()
 * @property {boolean} multiple_flag         Derived — set by enrich()
 * @property {string|null} duplicate_of      Global id of the original — set by orchestrator dedup
 * @property {Object} raw                Source-specific extras (kept in JSON output, dropped from CSV)
 */

function parseMoney(val) {
  if (val === null || val === undefined) return null;
  const num = parseFloat(String(val).replace(/[^0-9.]/g, ''));
  return isNaN(num) ? null : num;
}

// Map whatever label a source uses ("Cash Flow:", "EBITDA", "Seller's Discretionary Earnings")
// onto the canonical enum.
function normalizeCashFlowType(label) {
  if (!label) return null;
  const s = String(label).toLowerCase();
  if (s.includes('sde') || s.includes('discretionary')) return 'SDE';
  if (s.includes('ebitda')) return 'EBITDA';
  if (s.includes('cash')) return 'CASH_FLOW';
  return null;
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Build a canonical Listing from source-reported facts.
 * @param {string} source
 * @param {Object} fields
 * @returns {Listing}
 */
function createListing(source, fields) {
  const sourceListingId = String(fields.source_listing_id ?? '');
  return {
    id:                `${source}:${sourceListingId}`,
    source,
    source_listing_id: sourceListingId,
    url:               fields.url ?? null,
    name:              fields.name ?? null,
    description:       fields.description ?? null,
    location: {
      city:  fields.location?.city ?? null,
      state: fields.location?.state ?? null,
      raw:   fields.location?.raw ?? null,
    },
    industry:          fields.industry ?? null,
    naics:             fields.naics ?? null,
    asking_price:      fields.asking_price ?? null,
    gross_revenue:     fields.gross_revenue ?? null,
    cash_flow:         fields.cash_flow ?? null,
    cash_flow_type:    normalizeCashFlowType(fields.cash_flow_type),
    broker:            fields.broker ?? null,
    date_listed:       fields.date_listed ?? null,
    date_scraped:      fields.date_scraped ?? today(),
    implied_multiple:  null,
    multiple_flag:     false,
    duplicate_of:      null,
    raw:               fields.raw ?? {},
  };
}

/**
 * Compute derived fields. Called by the orchestrator, never by scrapers.
 * @param {Listing} listing
 * @param {{max_multiple_flag?: number}} filters
 */
function enrich(listing, filters = {}) {
  const ap = listing.asking_price;
  const cf = listing.cash_flow;
  const rev = listing.gross_revenue;
  listing.implied_multiple = (ap && cf && cf > 0)
    ? Math.round((ap / cf) * 10) / 10
    : null;
  // EBITDA/SDE margin — needs revenue, which some sources (BizBuySell index) don't expose
  listing.ebitda_margin = (cf && rev && rev > 0)
    ? Math.round((cf / rev) * 1000) / 1000
    : null;
  const threshold = filters.max_multiple_flag ?? 5.0;
  listing.multiple_flag = listing.implied_multiple !== null && listing.implied_multiple > threshold;
  return listing;
}

/**
 * Sanity-check a listing a scraper produced. Returns warning strings; empty = clean.
 * @param {Listing} l
 * @returns {string[]}
 */
function validate(l) {
  const warnings = [];
  if (!l.source_listing_id) warnings.push('missing source_listing_id');
  if (!l.name && !l.url) warnings.push('missing both name and url');
  for (const field of ['asking_price', 'gross_revenue', 'cash_flow']) {
    if (l[field] !== null && typeof l[field] !== 'number') {
      warnings.push(`${field} is ${typeof l[field]}, expected number or null`);
    }
  }
  return warnings;
}

/**
 * Human-readable location for CSV/email/screener. Tolerates legacy string locations.
 * @param {Listing} l
 * @returns {string|null}
 */
function locationString(l) {
  const loc = l.location;
  if (!loc) return null;
  if (typeof loc === 'string') return loc;
  return [loc.city, loc.state].filter(Boolean).join(', ') || loc.raw || null;
}

module.exports = { createListing, enrich, validate, locationString, parseMoney, normalizeCashFlowType };
