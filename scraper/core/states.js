// US state name ↔ code helpers shared by source adapters.

const STATE_CODES = {
  alabama: 'AL', alaska: 'AK', arizona: 'AZ', arkansas: 'AR', california: 'CA',
  colorado: 'CO', connecticut: 'CT', delaware: 'DE', florida: 'FL', georgia: 'GA',
  hawaii: 'HI', idaho: 'ID', illinois: 'IL', indiana: 'IN', iowa: 'IA',
  kansas: 'KS', kentucky: 'KY', louisiana: 'LA', maine: 'ME', maryland: 'MD',
  massachusetts: 'MA', michigan: 'MI', minnesota: 'MN', mississippi: 'MS',
  missouri: 'MO', montana: 'MT', nebraska: 'NE', nevada: 'NV',
  'new hampshire': 'NH', 'new jersey': 'NJ', 'new mexico': 'NM', 'new york': 'NY',
  'north carolina': 'NC', 'north dakota': 'ND', ohio: 'OH', oklahoma: 'OK',
  oregon: 'OR', pennsylvania: 'PA', 'rhode island': 'RI', 'south carolina': 'SC',
  'south dakota': 'SD', tennessee: 'TN', texas: 'TX', utah: 'UT', vermont: 'VT',
  virginia: 'VA', washington: 'WA', 'west virginia': 'WV', wisconsin: 'WI',
  wyoming: 'WY', 'district of columbia': 'DC',
};

/** Find a state code in free text like "Midland County, Texas" or "Tucson, AZ". */
function stateFromText(text) {
  if (!text) return null;
  const t = String(text);
  const abbr = t.match(/,\s*([A-Z]{2})\b/);
  if (abbr && Object.values(STATE_CODES).includes(abbr[1])) return abbr[1];
  const lower = t.toLowerCase();
  for (const [name, code] of Object.entries(STATE_CODES)) {
    if (new RegExp(`\\b${name}\\b`).test(lower)) return code;
  }
  return null;
}

module.exports = { STATE_CODES, stateFromText };
