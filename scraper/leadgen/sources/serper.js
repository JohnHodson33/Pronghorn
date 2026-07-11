// Serper.dev — Google Local/Maps/Web results. The core paid signal
// (docs/LISTBUILDING-API-SETUP.md #1): $1 per 1,000 searches, 10 results per
// credit. Activates automatically when SERPER_API_KEY lands in scraper/.env.
//
// UI source ids → engines: serper_local + serper_maps → /places and /maps
// (rating/review/phone-rich), serper_web → /search organic (company sites that
// don't show in Maps). Each request = 1 credit; we report credits used so the
// orchestrator can record cost_actual ($0.001/credit).
const axios = require('axios');

const COST_PER_CREDIT = 0.001; // $1 per 1,000 searches

function cleanName(title) {
  // organic titles look like "Best Tree Service in Phoenix | Acme Tree Co"
  const parts = String(title || '').split(/\s*[|\-–]\s*/);
  return (parts.length > 1 ? parts[parts.length - 1] : parts[0]).trim();
}

function placeToLead(p, tag) {
  if (!p.title) return null;
  return {
    name: p.title,
    phone: p.phoneNumber || null,
    website: p.website || null,
    address: p.address || null,
    city: null, // Serper places give a single address string; city parsed downstream if needed
    state: null,
    rating: p.rating ?? null,
    review_count: p.ratingCount ?? null,
    source_tags: [tag],
  };
}

async function post(key, engine, body) {
  const { data } = await axios.post(`https://google.serper.dev/${engine}`, body, {
    headers: { 'X-API-KEY': key, 'Content-Type': 'application/json' },
    timeout: 30000,
  });
  return data;
}

/**
 * @param industry free-text industry
 * @param geography "City, ST" or null
 * @param opts { engines: string[] (UI source ids), maxPages }
 * @returns { leads, credits }
 */
async function fetchSerperLeads(industry, geography, opts = {}, log) {
  const key = process.env.SERPER_API_KEY;
  if (!key) {
    log?.info('  serper: SERPER_API_KEY not set — skipped (see LISTBUILDING-API-SETUP.md)');
    return { leads: [], credits: 0 };
  }
  const engines = opts.engines || ['serper_local', 'serper_maps', 'serper_web'];
  const maxPages = opts.maxPages || 3;
  const q = geography ? `${industry} ${geography}` : industry;
  const leads = [];
  let credits = 0;

  try {
    if (engines.includes('serper_local') || engines.includes('serper_maps')) {
      for (const engine of ['places', 'maps']) {
        if (engine === 'places' && !engines.includes('serper_local')) continue;
        if (engine === 'maps' && !engines.includes('serper_maps')) continue;
        for (let page = 1; page <= maxPages; page++) {
          const data = await post(key, engine, { q, page });
          credits++;
          const rows = data.places || [];
          leads.push(...rows.map((p) => placeToLead(p, engine === 'places' ? 'serper_local' : 'serper_maps')).filter(Boolean));
          if (rows.length < 10) break; // last page
        }
      }
    }
    if (engines.includes('serper_web')) {
      const data = await post(key, 'search', { q: `${q} company`, num: 20 });
      credits++;
      for (const r of data.organic || []) {
        if (!r.link || /yelp|angi|thumbtack|houzz|facebook|bbb\.org|yellowpages|linkedin/i.test(r.link)) continue;
        leads.push({
          name: cleanName(r.title),
          phone: null,
          website: r.link.split('/').slice(0, 3).join('/'),
          address: null, city: null, state: null,
          source_tags: ['serper_web'],
        });
      }
    }
  } catch (e) {
    log?.error(`  serper: ${e.response?.status || ''} ${e.response?.data?.message || e.message} (${credits} credits used before failure)`);
  }
  return { leads, credits };
}

module.exports = { fetchSerperLeads, COST_PER_CREDIT };
