// Texas TDLR license registry via the state's Socrata open-data API — free, no
// key, refreshed by the state (dataset 7358-krk7, "TDLR - All Licenses").
// A license board is a COMPLETE list of legal operators — the highest-signal
// free source there is for licensed trades. Covers TX HVAC/electrical/appliance
// contractors, and crucially includes OWNER NAMES (cuts VA enrichment cost).
// (TX pest control lives with the Dept of Agriculture, which publishes no open
// dataset — that board needs a dedicated scraper later.)
//
// Dataset columns (verified 2026-07-10): license_type, license_number,
// business_name, business_county, owner_name, license_expiration_date_mmddccyy,
// license_subtype, continuing_education_flag, mailing_address_county.
// No phone/city/status — county-level geography, expiry filtered client-side.
const axios = require('axios');

const DATASET = 'https://data.texas.gov/resource/7358-krk7.json';

// Business-level license types only (individual technician licenses excluded —
// we want companies, not employees).
const INDUSTRY_LICENSE_TYPES = [
  { match: /hvac|heating|cooling|air/i, types: ['A/C Contractor'] },
  { match: /electric/i, types: ['Electrical Contractor', 'Electrical Sign Contractor'] },
  { match: /appliance/i, types: ['Appliance Installation Contractor'] },
  { match: /water well|well drill/i, types: ['Water Well Driller/Pump Installer'] },
];

function notExpired(mmddccyy) {
  if (!mmddccyy) return true;
  const [m, d, y] = mmddccyy.split('/').map(Number);
  return new Date(y, m - 1, d) >= new Date();
}

/**
 * @param industry free-text industry
 * @param opts { county } optional TX-county narrowing (from the geocoder)
 * @returns candidate leads (name/owner/county + license id)
 */
async function fetchTdlrLeads(industry, opts = {}) {
  const hit = INDUSTRY_LICENSE_TYPES.find((t) => t.match.test(industry));
  if (!hit) return [];

  const where = [`license_type in(${hit.types.map((t) => `'${t.replace(/'/g, "''")}'`).join(',')})`];
  if (opts.county) where.push(`upper(business_county) = '${opts.county.toUpperCase().replace(/'/g, "''")}'`);

  const rows = [];
  for (let offset = 0; ; offset += 1000) {
    const { data } = await axios.get(DATASET, {
      params: { $where: where.join(' AND '), $limit: 1000, $offset: offset, $order: 'license_number' },
      timeout: 60000,
    });
    rows.push(...data);
    if (data.length < 1000 || rows.length >= 20000) break; // sanity cap per run
  }

  return rows
    .filter((r) => r.business_name && notExpired(r.license_expiration_date_mmddccyy))
    .map((r) => ({
      name: r.business_name,
      phone: null,
      website: null,
      address: null,
      city: r.business_county ? `${r.business_county} County` : null,
      state: 'TX',
      owner_name: r.owner_name || null,
      license_ids: [`TDLR:${r.license_type}:${r.license_number}`],
      source_tags: ['state_license'],
    }));
}

module.exports = { fetchTdlrLeads };
