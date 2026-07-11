// OpenStreetMap Overpass source — free, no key. Long-tail coverage of local
// service businesses. Returns raw candidate leads; the orchestrator dedupes.
//
// PERFORMANCE REALITY (learned the hard way, 2026-07-10): Overpass indexes
// tag VALUE matches (craft=hvac → seconds) but key-existence and name-regex
// filters scan globally and time out at metro scale on the public servers.
// So: exact-tag clauses always run; the name-regex clause only runs for
// city-scale searches (radius ≤ 25 mi), nodes only. OSM is the long-tail
// supplement here — Serper/Places are the name-search workhorses once keyed.
const axios = require('axios');
const { UA } = require('../geocode');

const OVERPASS = 'https://overpass-api.de/api/interpreter';
const REGEX_MAX_RADIUS_MILES = 25;

// Keyword-matched against lead_lists.query_industry (free text from the UI).
// tags = value-indexed (always run). nameRe = regex (city-scale only).
const INDUSTRY_QUERIES = [
  { match: /landscap|lawn|garden/i, tags: [['craft', 'gardener']], nameRe: 'landscap|lawn ?(care|service|maintenance)' },
  { match: /tree|arborist/i, tags: [], nameRe: 'tree (service|care|expert|removal|specialist)|arborist|tree surgeon' },
  { match: /pest|exterminat|termite/i, tags: [['shop', 'pest_control'], ['craft', 'pest_control']], nameRe: 'pest ?(control|solution|management)|exterminat|termite' },
  { match: /pool/i, tags: [['shop', 'swimming_pool'], ['craft', 'pool_installation']], nameRe: 'pool ?(service|care|cleaning|maintenance|pros)' },
  { match: /hvac|heating|cooling|air/i, tags: [['craft', 'hvac']], nameRe: 'heating|cooling|air ?condition|hvac' },
  { match: /irrigat|sprinkler/i, tags: [], nameRe: 'irrigation|sprinkler' },
  { match: /plumb/i, tags: [['craft', 'plumber']], nameRe: 'plumbing|plumber' },
  { match: /electric/i, tags: [['craft', 'electrician']], nameRe: 'electric(al)? (service|contractor|company)' },
  { match: /fenc/i, tags: [['craft', 'fence_maker']], nameRe: 'fence|fencing' },
  { match: /roof/i, tags: [['craft', 'roofer']], nameRe: 'roofing' },
];

function queriesFor(industry) {
  const hit = INDUSTRY_QUERIES.find((q) => q.match.test(industry));
  // Unknown vertical: name-regex from the words themselves (city-scale only).
  return hit || { tags: [], nameRe: industry.trim().split(/\s+/).join(' ?') };
}

const BUSINESS_TAGS = ['shop', 'craft', 'office', 'amenity'];

function toLead(el) {
  const t = el.tags || {};
  const name = t.name;
  if (!name) return null;
  const phone = t.phone || t['contact:phone'] || null;
  const website = t.website || t['contact:website'] || null;
  const looksLikeBusiness = phone || website || BUSINESS_TAGS.some((k) => t[k]);
  if (!looksLikeBusiness) return null;
  const street = [t['addr:housenumber'], t['addr:street']].filter(Boolean).join(' ');
  return {
    name,
    phone,
    website,
    address: street || null,
    city: t['addr:city'] || null,
    state: t['addr:state'] || null,
    source_tags: ['osm'],
  };
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function overpass(query, log) {
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const { data } = await axios.post(OVERPASS, `data=${encodeURIComponent(query)}`, {
        headers: { 'User-Agent': UA, 'Content-Type': 'application/x-www-form-urlencoded' },
        timeout: 120000,
      });
      if (data.remark && /timed out/i.test(data.remark)) {
        log?.warn(`  osm: server-side timeout — results are partial (${data.elements?.length || 0} elements)`);
      }
      return data.elements || [];
    } catch (e) {
      const s = e.response?.status;
      if ((s === 429 || s >= 500) && attempt === 1) {
        log?.warn(`  osm: transient ${s}, retrying in 45s`);
        await sleep(45000);
        continue;
      }
      throw e;
    }
  }
  return [];
}

/**
 * Fetch candidate leads.
 * @param industry free-text industry from the lead list
 * @param geo geocode() result or null (OSM requires a geography — a US-wide
 *            scan is not viable on public Overpass; returns [])
 * @param radiusMiles search radius around the geocoded point
 * @param log optional logger for progress/warnings
 */
async function fetchOsmLeads(industry, geo, radiusMiles = 70, log) {
  if (!geo) return [];
  const q = queriesFor(industry);

  // bbox (spatially indexed) — around: at large radii is a known perf trap
  const km = radiusMiles * 1.609;
  const dLat = km / 111;
  const dLon = km / (111 * Math.cos((geo.lat * Math.PI) / 180));
  const bbox = [geo.lat - dLat, geo.lon - dLon, geo.lat + dLat, geo.lon + dLon]
    .map((n) => n.toFixed(4)).join(',');

  const clauses = q.tags.map(([k, v]) => `nwr["${k}"="${v}"](${bbox});`);
  if (q.nameRe && radiusMiles <= REGEX_MAX_RADIUS_MILES) {
    clauses.push(`node["name"~"${q.nameRe}",i](${bbox});`);
  } else if (q.nameRe && !q.tags.length) {
    log?.warn(`  osm: "${industry}" has no exact OSM tag and radius ${radiusMiles}mi > ${REGEX_MAX_RADIUS_MILES}mi regex cap — narrow the geography for OSM name search`);
  }
  if (!clauses.length) return [];

  const query = `[out:json][timeout:90];(${clauses.join('')});out center tags 800;`;
  const elements = await overpass(query, log);
  return elements.map(toLead).filter(Boolean);
}

module.exports = { fetchOsmLeads };
