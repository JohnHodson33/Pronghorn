// River-guide scoring — spec §3 (River-Guide-Archetype-Profiles.md).
// screen_score (0–85, automated) recomputes whenever underlying data changes;
// fit_score adds human/enrichment-assessed components later.

const BASE_YEAR = 2026;

// per-industry vertical fit vs the green/home-services thesis (§3a)
const VERTICAL_FIT = {
  LANDSCAPE: 10, LAWN_CARE: 10, TREE_CARE: 10, POOL_SERVICES: 9,
  PEST: 9, FENCING: 6, COMMERCIAL_KITCHEN_SERVICE: 5, OTHER: 5,
};

function screenScore(g) {
  const components = { archetype_base: 30 };
  components.exit_freedom = g.exit_status === 'EXITED' ? 25 : g.exit_status === 'EMPLOYED' ? 6 : 15;
  const age = g.deal_year ? BASE_YEAR - Number(g.deal_year) : null;
  components.recency = age == null ? 8 : age < 1 ? 7 : age <= 4 ? 15 : age <= 6 ? 11 : 8;
  components.vertical_fit = VERTICAL_FIT[g.industry] ?? 5;
  components.name_bonus = g.name_status === 'RESOLVED' ? 5 : 0;
  const score = Object.values(components).reduce((s, v) => s + v, 0);
  return { score, components };
}

function priorityBand(g, score) {
  if (g.name_status !== 'RESOLVED') return 'RESOLVE_NAME_FIRST'; // always overrides score
  const s = g.fit_score ?? score;
  if ((g.fit_score != null && g.fit_score >= 80) || score >= 70) return 'CALL_NOW';
  if (score >= 58) return 'ENRICH_THEN_ASSESS';
  return 'NURTURE';
}

/** Recompute score + band for a guide row; returns the patch. */
function rescore(g) {
  const { score, components } = screenScore(g);
  return {
    screen_score: score,
    score_components: { ...(g.score_components || {}), ...components },
    priority_band: priorityBand(g, score),
    updated_at: new Date().toISOString(),
  };
}

module.exports = { screenScore, priorityBand, rescore, BASE_YEAR };
