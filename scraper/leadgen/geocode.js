// Free geocoding via Nominatim (OpenStreetMap). Usage policy: max 1 req/sec,
// identifying User-Agent. We geocode once per lead-list run, well within limits.
const axios = require('axios');

const UA = 'PronghornPlatform/1.0 (deal-sourcing research; contact: johndouglashodson@gmail.com)';

/** "Phoenix, AZ" → { lat, lon, boundingbox: [s, n, w, e], displayName } or null */
async function geocode(query) {
  const { data } = await axios.get('https://nominatim.openstreetmap.org/search', {
    params: { q: query, format: 'json', limit: 1, countrycodes: 'us' },
    headers: { 'User-Agent': UA },
    timeout: 30000,
  });
  if (!data || !data.length) return null;
  const r = data[0];
  return {
    lat: Number(r.lat),
    lon: Number(r.lon),
    boundingbox: r.boundingbox.map(Number), // [south, north, west, east]
    displayName: r.display_name,
  };
}

module.exports = { geocode, UA };
