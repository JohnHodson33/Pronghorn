// SERPER FOCUS GATE (John 8/4: thesis narrowed — TREE CARE primary;
// landscaping, irrigation, lawn care, pest ancillary; Serper credits fund the
// naming/contact push and 38% of the day's sweep burn was out-of-focus).
//
// A CONFIG READ, NOT A CODE STRIP: app_config `focus_industries` is the
// allowlist; `include_all_industries` ("true") flips the gate off. Workers
// process in-focus rows FIRST and skip out-of-focus by default — out-of-focus
// rows keep all their data (honesty rule), they just stop consuming credits.
//
// The gate keys on river_guides.industry, which the 8/4 audit found is
// ALREADY canonical on all 549 rows (0016's check constraint held; the dirty
// values live only in the free-text industry_group) — so no classification
// pass is needed and the gate cannot misfire on a dirty key.
const { supabase } = require('./db');

const DEFAULT_FOCUS = ['TREE_CARE', 'LANDSCAPE', 'IRRIGATION', 'LAWN_CARE', 'PEST'];

let _cache = null;
async function loadFocus() {
  if (_cache) return _cache;
  let list = DEFAULT_FOCUS, all = false;
  try {
    const { data } = await supabase.from('app_config').select('key, value')
      .in('key', ['focus_industries', 'include_all_industries']);
    const get = (k) => (data || []).find((r) => r.key === k)?.value;
    const rawList = get('focus_industries');
    if (rawList) {
      const parsed = typeof rawList === 'string' ? JSON.parse(rawList) : rawList;
      if (Array.isArray(parsed) && parsed.length) list = parsed.map((x) => String(x).toUpperCase());
    }
    const rawAll = get('include_all_industries');
    all = String(rawAll ?? '').replace(/"/g, '').toLowerCase() === 'true';
  } catch { /* pre-0018 app_config — defaults hold */ }
  _cache = { list, all };
  return _cache;
}

/** In-focus first, out-of-focus dropped (unless include_all_industries). */
function applyFocus(rows, focus, industryOf) {
  if (focus.all) return { rows, skipped: 0 };
  const inF = [], outF = [];
  for (const r of rows) {
    (focus.list.includes(String(industryOf(r) || '').toUpperCase()) ? inF : outF).push(r);
  }
  return { rows: inF, skipped: outF.length };
}

/** Count rows per industry — the meta.industries burn-attribution stamp. */
function industryBreakdown(rows, industryOf) {
  const out = {};
  for (const r of rows) {
    const k = String(industryOf(r) || 'UNKNOWN').toUpperCase();
    out[k] = (out[k] || 0) + 1;
  }
  return out;
}

/** A merged-away duplicate must never be processed again (8/4: merged rows kept
 *  being verified, producing FRESH contradictions — Damon Schrosk came back
 *  EXITED on one row and EMPLOYED on its duplicate in the same pass — and
 *  spending credits twice on one person). Reads the 0024 column when present,
 *  else the pre-migration contact-jsonb mirror. */
const isMerged = (g) => !!(g?.merged_into || g?.contact?.merged_into);
const notMerged = (rows) => rows.filter((r) => !isMerged(r));

module.exports = { loadFocus, applyFocus, industryBreakdown, DEFAULT_FOCUS, isMerged, notMerged };
