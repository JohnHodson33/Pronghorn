// Google Places API (New) — official structured source, RESCUE tier: fires
// only when the primaries miss the lead target (docs/LISTBUILDING-API-SETUP.md
// #2 — $200/mo free credit covers our rescue volume, effectively $0).
// Activates automatically when GOOGLE_PLACES_API_KEY lands in scraper/.env.
const axios = require('axios');

const FIELDS = [
  'places.displayName', 'places.formattedAddress', 'places.nationalPhoneNumber',
  'places.websiteUri', 'places.rating', 'places.userRatingCount',
].join(',');

/**
 * @param industry free-text industry
 * @param geography "City, ST" or null
 * @returns candidate leads (up to 20 per text-search request)
 */
async function fetchPlacesLeads(industry, geography, log) {
  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!key) {
    log?.info('  places: GOOGLE_PLACES_API_KEY not set — skipped (see LISTBUILDING-API-SETUP.md)');
    return [];
  }
  try {
    const { data } = await axios.post(
      'https://places.googleapis.com/v1/places:searchText',
      { textQuery: geography ? `${industry} in ${geography}` : industry, pageSize: 20 },
      { headers: { 'X-Goog-Api-Key': key, 'X-Goog-FieldMask': FIELDS }, timeout: 30000 },
    );
    const { parseCityState } = require('./serper');
    return (data.places || []).map((p) => {
      const { city, state } = parseCityState(p.formattedAddress);
      return {
        name: p.displayName?.text,
        phone: p.nationalPhoneNumber || null,
        website: p.websiteUri || null,
        address: p.formattedAddress || null,
        city, state,
        rating: p.rating ?? null,
        review_count: p.userRatingCount ?? null,
        source_tags: ['google_places'],
      };
    }).filter((l) => l.name);
  } catch (e) {
    log?.error(`  places: ${e.response?.status || ''} ${e.response?.data?.error?.message || e.message}`);
    return [];
  }
}

module.exports = { fetchPlacesLeads };
