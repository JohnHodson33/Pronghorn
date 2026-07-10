// Hard relevance filters applied between scrape and screening — industry keywords,
// geography, and size, all driven by the "relevance" block in config.json so
// criteria can shift over time without code changes.
//
// Philosophy: this stage annotates rather than deletes. Every listing keeps
// l.relevant (boolean) and l.filter_reason so the raw JSON/CSV always show what
// was dropped and why — that's how you audit and tune the keyword lists.
// Listings missing a field (unknown state, undisclosed cash flow) are KEPT by
// default (keep_when_unknown) so the filter never silently discards a deal for
// lack of data; the Haiku screener judges those.

const log = require('../utils/logger');

function compilePatterns(keywords) {
  return (keywords || [])
    .map((k) => String(k).trim())
    .filter(Boolean)
    .map((k) => new RegExp('\\b' + k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'i'));
}

function matchesAny(text, patterns) {
  return patterns.some((p) => p.test(text));
}

function inRange(value, min, max) {
  if (min != null && value < min) return false;
  if (max != null && value > max) return false;
  return true;
}

/**
 * Annotate every listing with l.relevant / l.filter_reason.
 * @param {import('./listing').Listing[]} listings
 * @param {Object} relevance  config.json "relevance" block
 * @returns {{kept: number, dropped: Object}} summary counts by reason
 */
function applyRelevanceFilters(listings, relevance = {}) {
  const include = compilePatterns(relevance.industry_keywords_include);
  const exclude = compilePatterns(relevance.industry_keywords_exclude);
  const geo = relevance.geography || {};
  const size = relevance.size || {};
  const keepUnknown = relevance.keep_when_unknown !== false;

  const dropped = { industry: 0, geography: 0, size: 0 };

  const drop = (l, reason) => {
    l.relevant = false;
    l.filter_reason = reason;
    dropped[reason.split(':')[0]]++;
  };

  for (const l of listings) {
    l.relevant = true;
    l.filter_reason = null;
    // Priority states flag listings for emphasis downstream — never a filter
    l.priority_state = !!(l.location?.state && geo.priority_states?.includes(l.location.state));

    // --- Industry: keyword match over name + industry + description ---
    const text = [l.name, l.industry, l.description].filter(Boolean).join(' ');
    if (include.length && !matchesAny(text, include)) { drop(l, 'industry: no include-keyword match'); continue; }
    if (exclude.length && matchesAny(text, exclude))  { drop(l, 'industry: exclude-keyword match'); continue; }

    // --- Geography: state allowlist / blocklist ---
    const st = l.location?.state || null;
    if (!st && (geo.include_states?.length || geo.exclude_states?.length) && !keepUnknown) {
      drop(l, 'geography: state unknown'); continue;
    }
    if (st) {
      if (geo.include_states?.length && !geo.include_states.includes(st)) { drop(l, `geography: ${st} not in include_states`); continue; }
      if (geo.exclude_states?.length && geo.exclude_states.includes(st))  { drop(l, `geography: ${st} in exclude_states`); continue; }
    }

    // --- Size: asking price and cash flow ranges (nulls pass unless keep_when_unknown is false) ---
    if (l.asking_price == null) {
      if (!keepUnknown && (size.min_asking_price != null || size.max_asking_price != null)) { drop(l, 'size: asking price unknown'); continue; }
    } else if (!inRange(l.asking_price, size.min_asking_price, size.max_asking_price)) {
      drop(l, `size: asking price ${l.asking_price} out of range`); continue;
    }

    if (l.cash_flow == null) {
      if (!keepUnknown && (size.min_cash_flow != null || size.max_cash_flow != null)) { drop(l, 'size: cash flow unknown'); continue; }
      // Proxy rule: an undisclosed cash flow is tolerated only when the asking
      // price is high enough to plausibly clear the min_cash_flow floor.
      if (size.unknown_cash_flow_min_asking_price != null && l.asking_price != null
          && l.asking_price < size.unknown_cash_flow_min_asking_price) {
        drop(l, `size: cash flow unknown and asking price ${l.asking_price} below proxy floor`); continue;
      }
    } else if (!inRange(l.cash_flow, size.min_cash_flow, size.max_cash_flow)) {
      drop(l, `size: cash flow ${l.cash_flow} out of range`); continue;
    }
  }

  const kept = listings.filter((l) => l.relevant).length;
  log.info(`Relevance filter: ${kept}/${listings.length} kept (dropped — industry: ${dropped.industry}, geography: ${dropped.geography}, size: ${dropped.size})`);
  return { kept, dropped };
}

module.exports = { applyRelevanceFilters };
