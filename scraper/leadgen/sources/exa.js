// Exa.ai — AI/semantic company search, RESCUE tier (thin markets). Fires only
// when primaries + Places still miss the target (docs/LISTBUILDING-API-SETUP.md
// #3: 1,000 free/mo, then ~$0.005–0.007/search). Activates on EXA_API_KEY.
const axios = require('axios');

const COST_PER_SEARCH = 0.006;

/**
 * @param industry free-text industry
 * @param geography "City, ST" or null
 * @param need how many more leads we still want (caps numResults)
 * @returns { leads, searches }
 */
async function fetchExaLeads(industry, geography, need, log) {
  const key = process.env.EXA_API_KEY;
  if (!key) { log?.info('  exa: EXA_API_KEY not set — skipped'); return { leads: [], searches: 0 }; }
  const where = geography ? ` in ${geography}` : '';
  try {
    const { data } = await axios.post('https://api.exa.ai/search', {
      query: `${industry} company${where} — official website`,
      type: 'auto',
      numResults: Math.min(Math.max(need, 10), 25),
      category: 'company',
    }, { headers: { 'x-api-key': key, 'Content-Type': 'application/json' }, timeout: 30000 });

    const leads = (data.results || [])
      .filter((r) => r.url && !/yelp|angi|thumbtack|houzz|facebook|bbb\.org|yellowpages|linkedin|wikipedia/i.test(r.url))
      .map((r) => ({
        name: (r.title || '').split(/\s*[|\-–]\s*/).pop().trim() || r.url,
        phone: null,
        website: r.url.split('/').slice(0, 3).join('/'),
        address: null, city: null, state: null,
        source_tags: ['exa'],
      }));
    return { leads, searches: 1 };
  } catch (e) {
    log?.error(`  exa: ${e.response?.status || ''} ${e.response?.data?.error || e.message}`);
    return { leads: [], searches: 0 };
  }
}

module.exports = { fetchExaLeads, COST_PER_SEARCH };
