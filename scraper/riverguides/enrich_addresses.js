// River-guide FORMER-COMPANY STREET ADDRESSES — the unlock for the Tracerfy
// phone tier (John 7/31: "enrich guide addresses so the $0.02/hit phone tier
// unlocks"). Tracerfy batch person-mode structurally requires a street
// address (probed 7/20: 400s without one); guides store only city/state, but
// their FORMER company is a real business with a public record — Google
// Places is that record ($200/mo free credit, $0 marginal at our volume).
//
// NO-GUESS BAR (John's provenance rule): an address is stored ONLY when the
// Places result is corroborated as the guide's actual former company —
//   (a) the result's website domain matches the stored company_website, OR
//   (b) every distinctive token of the company name appears in the result
//       name (generic industry words don't count as evidence), AND
//   (c) the result's state matches the guide's state (always required), AND
//   (d) the result has a real street line (digit present — service-area
//       listings with no street are useless to Tracerfy).
// Misses are recorded as status NOT_FOUND so nightly passes never re-burn
// lookups on them (--retry re-attempts them deliberately).
//
// Written to contact.company_address (jsonb, no migration needed):
//   {status, street, city, state, zip, formatted, place_id, business_status,
//    company_phone, matched_by, source:'google_places', query, at}
// company_phone is the FORMER COMPANY's main line — kept ONLY as the
// company-line guard for the phone tier; it is never the guide's contact.
//
// Usage: node riverguides/enrich_addresses.js [--limit 100] [--dry-run] [--retry]

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const axios = require('axios');
const { supabase } = require('../core/db');
const log = require('../utils/logger');
const { recordUsage } = require('../core/usage');
const { parseCityState } = require('../leadgen/sources/serper');

const FIELDS = [
  'places.id', 'places.displayName', 'places.formattedAddress',
  'places.businessStatus', 'places.nationalPhoneNumber', 'places.websiteUri',
].join(',');

const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const domainOf = (url) => String(url || '').toLowerCase().replace(/^https?:\/\/(www\.)?/, '').split('/')[0] || null;

// words that are evidence of the INDUSTRY, not of THIS company — they never
// count toward a name match (same philosophy as the /discover distinctive-
// token corroboration guard)
const GENERIC = new Set([
  'the', 'of', 'and', 'a', 'an', 'llc', 'inc', 'co', 'corp', 'company', 'ltd', 'group',
  'service', 'services', 'solutions', 'professional', 'pros', 'pro',
  'tree', 'care', 'lawn', 'lawns', 'landscape', 'landscaping', 'landscapes', 'turf',
  'pest', 'control', 'insect', 'weed', 'spray', 'spraying',
  'pool', 'pools', 'spa', 'spas', 'irrigation', 'sprinkler', 'outdoor',
  'maintenance', 'management', 'enterprises', 'industries', 'div', 'division',
]);

function distinctiveTokens(name) {
  return norm(name).split(' ').filter((t) => t && !GENERIC.has(t));
}

/** Does this Places result NAME corroborate the company? */
function nameMatches(company, resultName) {
  const want = distinctiveTokens(company);
  const got = new Set(norm(resultName).split(' '));
  if (want.length) return want.every((t) => got.has(t));
  // all-generic name ("The Tree Care Company") — require full equality minus noise
  return norm(company) === norm(resultName);
}

/** Strip parentheticals/dividers research appended ("(maintenance div)"). */
const cleanCompany = (c) => String(c || '').replace(/\s*\([^)]*\)/g, '').trim();

async function placesSearch(query) {
  const { data } = await axios.post(
    'https://places.googleapis.com/v1/places:searchText',
    { textQuery: query, pageSize: 5 },
    { headers: { 'X-Goog-Api-Key': process.env.GOOGLE_PLACES_API_KEY, 'X-Goog-FieldMask': FIELDS }, timeout: 30000 },
  );
  return data.places || [];
}

/** Pick the corroborated candidate, or null. Domain match outranks name match. */
function pickMatch(g, places) {
  const wantDomain = domainOf(g.company_website);
  let best = null;
  for (const p of places) {
    const { city, state } = parseCityState(p.formattedAddress);
    if (!state || state !== String(g.location_state || '').toUpperCase()) continue;
    const street = String(p.formattedAddress || '').split(',')[0].trim();
    if (!/\d/.test(street)) continue; // service-area listing — no street to trace against
    const byDomain = wantDomain && domainOf(p.websiteUri) === wantDomain;
    const byName = nameMatches(cleanCompany(g.their_company), p.displayName?.text);
    if (!byDomain && !byName) continue;
    const zip = (String(p.formattedAddress).match(/\b(\d{5})(?:-\d{4})?\b(?!.*\b\d{5}\b)/) || [])[1] || null;
    const cand = {
      status: 'FOUND', street, city, state, zip,
      formatted: p.formattedAddress, place_id: p.id,
      business_status: p.businessStatus || null,
      company_phone: p.nationalPhoneNumber || null,
      matched_by: byDomain ? 'domain' : 'name',
      source: 'google_places', at: new Date().toISOString(),
    };
    if (byDomain) return cand; // strongest evidence — take it immediately
    if (!best) best = cand;
  }
  return best;
}

async function main() {
  const arg = (f, d) => { const i = process.argv.indexOf(f); return i > -1 ? process.argv[i + 1] : d; };
  const limit = Number(arg('--limit', 100));
  const dryRun = process.argv.includes('--dry-run');
  const retry = process.argv.includes('--retry');
  if (!process.env.GOOGLE_PLACES_API_KEY) { console.error('GOOGLE_PLACES_API_KEY not set'); process.exit(1); }

  const { data: all, error } = await supabase.from('river_guides').select('*')
    .eq('name_status', 'RESOLVED');
  if (error) { console.error(`${error.message} — apply migration 0016 first`); process.exit(1); }

  // address is skiptrace fuel — target guides that still lack a phone,
  // NEEDS_PAID (the queue John named) first, then the rest by score
  const RANK = { NEEDS_PAID: 0, T1_DONE: 1, PENDING_T1: 2 };
  const targets = (all || [])
    .filter((g) => g.their_company && g.location_state && !g.contact?.phone)
    .filter((g) => retry ? g.contact?.company_address?.status !== 'FOUND'
      : !g.contact?.company_address)
    .sort((a, b) => (RANK[a.enrichment_status] ?? 3) - (RANK[b.enrichment_status] ?? 3)
      || (b.screen_score ?? 0) - (a.screen_score ?? 0))
    .slice(0, limit);
  if (!targets.length) { log.info('No guides need an address lookup.'); return; }
  log.info(`address enrichment: ${targets.length} guides (Google Places, $0 marginal)${dryRun ? ' [dry]' : ''}`);

  let looked = 0, found = 0, byDomain = 0;
  for (const g of targets) {
    try {
      const company = cleanCompany(g.their_company);
      const q = [company, g.location_city, g.location_state].filter(Boolean).join(', ');
      const places = await placesSearch(q);
      looked++;
      let match = pickMatch(g, places);
      // second try without the city — small towns/counties often mislead Places
      if (!match && g.location_city) {
        match = pickMatch(g, await placesSearch(`${company}, ${g.location_state}`));
        looked++;
      }
      const rec = match || { status: 'NOT_FOUND', source: 'google_places', at: new Date().toISOString() };
      rec.query = q;

      if (match) { found++; if (match.matched_by === 'domain') byDomain++; }
      if (dryRun) { log.info(`  [dry] ${match ? '✓' : '✗'} ${g.deal_id} ${company} → ${match ? `${match.street}, ${match.city} ${match.state} (${match.matched_by})` : 'no corroborated result'}`); continue; }

      const { error: uErr } = await supabase.from('river_guides')
        .update({ contact: { ...(g.contact || {}), company_address: rec }, updated_at: new Date().toISOString() })
        .eq('deal_id', g.deal_id);
      if (uErr) { log.error(`  ${g.deal_id}: ${uErr.message}`); continue; }
      log.info(`  ${match ? '✓' : '✗'} ${g.full_name} · ${company} → ${match ? `${match.street}, ${match.city} ${match.state} [${match.matched_by}${match.business_status && match.business_status !== 'OPERATIONAL' ? ', ' + match.business_status : ''}]` : 'no corroborated result'}`);
    } catch (e) { log.error(`  ${g.deal_id}: ${e.response?.data?.error?.message || e.message}`); }
  }

  if (!dryRun && looked) {
    await recordUsage('places', 'address_lookup', looked, 0,
      { channel: 'river_guides', found, note: 'covered by $200/mo Places free credit — $0 marginal' });
  }
  log.info(`address enrichment done: ${found} of ${targets.length} guides now have a corroborated street address (${byDomain} by website domain) — ${looked} lookups, $0 marginal. These unlock the Tracerfy phone tier.`);
}

main().catch((e) => { console.error(e.message); process.exit(1); });
