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

// Brokers often write only a regional shorthand ("SOCAL", "Bay Area", "DFW")
// in listing titles when the structured location field is blank. regionState()
// maps unambiguous macros/metros to a state — conservatively (a wrong state is
// worse than a blank one). Graduated from the dealrelations adapter 7/15 after
// John's SOCAL-listing report; PM blessed the core move. Use as a FALLBACK
// after structured fields and stateFromText, never before.
const REGION_HINTS = [
  [/\bso(?:uthern)?\.?\s?cal(?:ifornia)?\b|\bnor(?:thern)?\.?\s?cal(?:ifornia)?\b|\bbay area\b|\bsilicon valley\b|\binland empire\b|\blos angeles\b|\bsan diego\b|\borange county\b|\bsacramento\b|\bfresno\b/i, 'CA'],
  [/\bdfw\b|\bdallas\b|\bfort worth\b|\bhouston\b|\baustin, ?tx\b|\bsan antonio\b/i, 'TX'],
  [/\bphoenix\b|\bscottsdale\b|\btucson\b|\bmesa, ?az\b/i, 'AZ'],
  [/\blas vegas\b|\breno, ?nv\b/i, 'NV'],
  [/\bdenver\b|\bcolorado springs\b|\bboulder, ?co\b/i, 'CO'],
  [/\b(?:metro )?atlanta\b/i, 'GA'],
  [/\bnashville\b|\bmemphis\b|\bknoxville\b|\bchattanooga\b/i, 'TN'],
  [/\bcharlotte\b|\braleigh\b|\bgreensboro\b/i, 'NC'],
  [/\bsalt lake city\b|\bslc, ?ut\b/i, 'UT'],
  [/\balbuquerque\b|\bsanta fe, ?nm\b/i, 'NM'],
  [/\bsouth florida\b|\bmiami\b|\borlando\b|\btampa\b|\bjacksonville, ?fl\b|\bfort lauderdale\b/i, 'FL'],
  [/\bchicagoland\b/i, 'IL'],
];

/** Infer a state from a regional shorthand in free text ("SOCAL" → CA). Fallback only. */
function regionState(text) {
  if (!text) return null;
  for (const [re, code] of REGION_HINTS) if (re.test(text)) return code;
  return null;
}

module.exports = { STATE_CODES, stateFromText, regionState };
