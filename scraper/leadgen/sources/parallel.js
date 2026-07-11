// Parallel.ai — AI entity search, RESCUE tier (docs/LISTBUILDING-API-SETUP.md
// #4: ~$0.005/request). Fires only when the target is still unmet after other
// sources. Activates on PARALLEL_API_KEY.
//
// NOTE: Parallel's Search API shape has been in flux; this targets the
// documented POST /v1/search { objective, ... } returning result URLs. If the
// endpoint 404s/401s it logs and returns [] (rescue tier — never fatal).
const axios = require('axios');

const COST_PER_SEARCH = 0.005;

async function fetchParallelLeads(industry, geography, need, log) {
  const key = process.env.PARALLEL_API_KEY;
  if (!key) { log?.info('  parallel: PARALLEL_API_KEY not set — skipped'); return { leads: [], searches: 0 }; }
  const where = geography ? ` located in ${geography}` : '';
  try {
    const { data } = await axios.post('https://api.parallel.ai/v1/search', {
      objective: `Find ${industry} companies${where}. Return each company's name and website.`,
      max_results: Math.min(Math.max(need, 10), 25),
    }, { headers: { 'x-api-key': key, 'Content-Type': 'application/json' }, timeout: 45000 });

    const rows = data.results || data.data || [];
    const leads = rows
      .map((r) => {
        const url = r.url || r.website || r.link;
        const name = r.name || r.title || (url ? '' : null);
        if (!name && !url) return null;
        return {
          name: (name || url).split(/\s*[|\-–]\s*/).pop().trim(),
          phone: null,
          website: url ? url.split('/').slice(0, 3).join('/') : null,
          address: null, city: null, state: null,
          source_tags: ['parallel'],
        };
      })
      .filter((l) => l && !/yelp|angi|thumbtack|houzz|facebook|bbb\.org|yellowpages|linkedin|wikipedia/i.test(l.website || ''));
    return { leads, searches: 1 };
  } catch (e) {
    log?.error(`  parallel: ${e.response?.status || ''} ${e.response?.data?.error || e.message} (rescue — non-fatal)`);
    return { leads: [], searches: 0 };
  }
}

module.exports = { fetchParallelLeads, COST_PER_SEARCH };
