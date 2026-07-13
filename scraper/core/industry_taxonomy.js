// Canonical industry taxonomy + snap() — the single source that keeps every
// industry chip in the app from fragmenting ("Tree care" / "Tree care services"
// / "Tree Care" were 3 separate filters; John/Lane B 7/12). Mirrors the seed in
// migration 0008 (industry_taxonomy) + web/app/api/taxonomy. Snap classifier
// output AND free-text list industries to a canonical label before writing.

const CANON = {
  'Pest Control': ['pest', 'exterminator', 'termite', 'wildlife control', 'wildlife'],
  'Tree Care': ['tree care', 'tree service', 'tree services', 'arborist', 'tree removal', 'tree trimming', 'tree surgery'],
  'Landscaping': ['landscap', 'hardscape', 'landscape design'],
  'Lawn Care': ['lawn', 'chemical lawn', 'fertiliz', 'mowing', 'turf'],
  'Lake/Pond Management': ['lake', 'pond', 'aquatic', 'water management', 'lake management'],
  'Pool Services': ['pool'],
  'Irrigation': ['irrigation', 'sprinkler'],
  'HVAC': ['hvac', 'heating', 'cooling', 'air conditioning', 'ac repair', 'a/c'],
  'Plumbing': ['plumb', 'drain', 'water heater'],
  'Electrical': ['electric'],
  'Roofing': ['roof'],
  'Windows & Doors': ['window', 'door'],
  'Cleaning/Janitorial': ['janitorial', 'cleaning', 'maid'],
  'Restoration': ['restoration', 'water damage', 'fire damage', 'mold'],
  'Property Maintenance': ['handyman', 'facilities', 'property maintenance', 'building maintenance', 'property solutions'],
};

const LABELS = new Set(Object.keys(CANON));

/**
 * Snap a raw industry string to a canonical label.
 * Exact canonical → itself. Otherwise nearest green-taxonomy label by alias.
 * No match → PRESERVE the original (Title-cased) rather than collapsing to
 * 'Other' — so legit non-green labels (e.g. "Nail Salon", "Restaurant/Food")
 * aren't erased. Only the KNOWN fragmenting industries get normalized.
 */
function snapIndustry(raw) {
  if (!raw) return null;
  const s = String(raw).trim();
  if (LABELS.has(s)) return s;                       // already canonical
  const low = s.toLowerCase();
  for (const [label, aliases] of Object.entries(CANON)) {
    if (low === label.toLowerCase()) return label;
    if (aliases.some((a) => low.includes(a))) return label;
  }
  // preserve unknown-but-clean labels; only tidy obvious "Other …" noise
  if (/^other\b/i.test(s)) return 'Other';
  return s.replace(/\s+/g, ' ');
}

module.exports = { snapIndustry, CANON, LABELS };
