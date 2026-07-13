// Size-proxy tier math — single source of truth (approved card 37450f11 +
// John's amendment 3: tiers are PLATFORM / TUCK-IN / TOO SMALL, and BOTH the
// per-industry benchmarks AND the tier threshold boundaries are editable
// assumptions with the math cascading).
//
// Proprietary leads carry no financials, so SIZE is estimated from free
// signals already captured at ingest/enrichment (size_signals jsonb, review
// counts). Everything is a RANGE with a confidence grade — never fake
// precision; no signal = no tier (unsized), never guessed.
//
//   employee estimate (best signal wins) × per-industry revenue-per-employee
//   → revenue range → EBITDA range via industry margin band → tier vs the
//   editable thresholds: PLATFORM (clears the platform bar in revenue OR
//   EBITDA terms) · TOO SMALL (under the floor on the optimistic end) ·
//   TUCK-IN (everything between).
//
// Benchmarks + thresholds live in size-benchmarks.json as seeds and become
// DB-editable with migration 0014 (size_benchmarks + size_thresholds; the
// /api/size-model endpoint is the Size Estimation tab's backend). Callers
// pass DB rows via `model` when available; omission = seeded defaults.
import benchmarks from "./size-benchmarks.json";

export type SizeConfidence = "high" | "medium" | "low";
export type SizeTier = "platform" | "tuckin" | "toosmall";

export interface SizeEstimate {
  tier: SizeTier;
  employees: [number, number];
  revenue: [number, number];   // USD/yr
  ebitda: [number, number];    // USD/yr
  confidence: SizeConfidence;
  basis: string;               // which signal produced the employee estimate
}

export interface Bench { revenue_per_employee: number; ebitda_margin: [number, number] }
export interface Thresholds {
  platform_min_ebitda: number;
  platform_min_revenue: number | null;  // null = EBITDA-only test
  toosmall_max_ebitda: number;
  toosmall_max_revenue: number | null;
}
export interface SizeModel { benchmarks: Record<string, Bench>; thresholds: Thresholds }

export const DEFAULT_THRESHOLDS: Thresholds = {
  platform_min_ebitda: 1_000_000,   // the $1M+ EBITDA anchor thesis
  platform_min_revenue: null,
  toosmall_max_ebitda: 200_000,     // below tuck-in floor even optimistically
  toosmall_max_revenue: null,
};

interface SizeSignals {
  employees_stated?: number | null;
  crew_count?: number | null;
  fleet_size?: number | null;
  locations?: number | null;
  linkedin_employee_band?: string | null;
  ppp?: { jobs?: number | null; loan?: number | null; date?: string | null } | null;
}

const seedBench = benchmarks as unknown as Record<string, Bench>;

/** Employee-count range from the best available signal. Order matters:
 *  stated > PPP jobs (payroll-verified) > LinkedIn band > crew/fleet heuristics. */
export function employeeEstimate(sig: SizeSignals | null | undefined, reviewCount?: number | null):
  { range: [number, number]; confidence: SizeConfidence; basis: string } | null {
  if (!sig && !reviewCount) return null;
  const s = { ...(sig ?? {}) };
  // plausibility clamps: numbers beyond small-business scale are marketplace/
  // franchise stats scraped off aggregator sites, not the target's own size —
  // drop the signal rather than mint a fake platform tier
  if ((s.employees_stated ?? 0) > 500) s.employees_stated = null;
  if ((s.crew_count ?? 0) > 50) s.crew_count = null;
  if ((s.fleet_size ?? 0) > 200) s.fleet_size = null;
  if ((s.ppp?.jobs ?? 0) > 500) s.ppp = null;
  if (s.employees_stated) return { range: [s.employees_stated * 0.8, s.employees_stated * 1.2], confidence: "high", basis: `${s.employees_stated} employees stated on their site` };
  if (s.ppp?.jobs) return { range: [s.ppp.jobs * 0.7, s.ppp.jobs * 1.1], confidence: "high", basis: `${s.ppp.jobs} jobs reported on their PPP loan` };
  if (s.linkedin_employee_band) {
    const m = String(s.linkedin_employee_band).match(/^(\d+)(?:-(\d+))?/);
    if (m) {
      const lo = Number(m[1]) || 1, hi = m[2] ? Number(m[2]) : lo * 2;
      return { range: [Math.max(1, lo), hi], confidence: "medium", basis: `LinkedIn ${s.linkedin_employee_band} employees` };
    }
  }
  if (s.crew_count) return { range: [s.crew_count * 2.5, s.crew_count * 4.5], confidence: "low", basis: `${s.crew_count} crews` };
  if (s.fleet_size) return { range: [s.fleet_size * 0.8, s.fleet_size * 1.6], confidence: "low", basis: `fleet of ${s.fleet_size}` };
  // review volume is the weakest proxy — only kicks in when it clearly
  // separates real operations (100+) from solo acts, and stays low-confidence
  if (reviewCount && reviewCount >= 100) return { range: [5, 25], confidence: "low", basis: `${reviewCount} Google reviews (volume proxy)` };
  return null;
}

/** Full size estimate for a lead/company. Null when no usable signal exists.
 *  `model` carries DB-edited benchmarks/thresholds; omitted = seeded defaults. */
export function sizeEstimate(
  industry: string | null | undefined,
  sig: SizeSignals | null | undefined,
  reviewCount?: number | null,
  model?: Partial<SizeModel>,
): SizeEstimate | null {
  const emp = employeeEstimate(sig, reviewCount);
  if (!emp) return null;
  const table = model?.benchmarks ?? seedBench;
  const b = table[String(industry ?? "")] ?? table.default ?? seedBench.default;
  const t = model?.thresholds ?? DEFAULT_THRESHOLDS;
  const revenue: [number, number] = [
    Math.round(emp.range[0] * b.revenue_per_employee),
    Math.round(emp.range[1] * b.revenue_per_employee),
  ];
  const ebitda: [number, number] = [
    Math.round(revenue[0] * b.ebitda_margin[0]),
    Math.round(revenue[1] * b.ebitda_margin[1]),
  ];
  // PLATFORM: optimistic end clears the bar in EBITDA terms OR (when set)
  // revenue terms. TOO SMALL: optimistic end under the floor on every set
  // metric. Everything between = TUCK-IN.
  const isPlatform = ebitda[1] >= t.platform_min_ebitda ||
    (t.platform_min_revenue != null && revenue[1] >= t.platform_min_revenue);
  const isTooSmall = !isPlatform && ebitda[1] < t.toosmall_max_ebitda &&
    (t.toosmall_max_revenue == null || revenue[1] < t.toosmall_max_revenue);
  const tier: SizeTier = isPlatform ? "platform" : isTooSmall ? "toosmall" : "tuckin";
  return {
    tier,
    employees: [Math.round(emp.range[0]), Math.round(emp.range[1])],
    revenue, ebitda,
    confidence: emp.confidence,
    basis: emp.basis,
  };
}

export const TIERS: (SizeTier | "unsized")[] = ["platform", "tuckin", "toosmall", "unsized"];
export const TIER_LABELS: Record<string, string> = {
  platform: "Platform", tuckin: "Tuck-in", toosmall: "Too small", unsized: "Unsized",
};
