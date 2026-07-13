// Size-proxy tier math — single source of truth (approved card 37450f11).
// Proprietary leads carry no financials, so SIZE is estimated from free
// signals already captured at ingest/enrichment (size_signals jsonb, review
// counts). Everything is a RANGE with a confidence grade — never fake
// precision; no signal = no tier (null), never guessed.
//
//   employee estimate (best signal wins) × per-industry revenue-per-employee
//   → revenue range → EBITDA range via industry margin band → tier:
//   A = plausible anchor ($1M+ EBITDA possible) · B = tuck-in · C = too small
//
// Benchmarks live in size-benchmarks.json (seed) and become DB-editable with
// migration 0014; actual-vs-estimate CIM logs tune them over time.
import benchmarks from "./size-benchmarks.json";

export type SizeConfidence = "high" | "medium" | "low";
export type SizeTier = "A" | "B" | "C";

export interface SizeEstimate {
  tier: SizeTier;
  employees: [number, number];
  revenue: [number, number];   // USD/yr
  ebitda: [number, number];    // USD/yr
  confidence: SizeConfidence;
  basis: string;               // which signal produced the employee estimate
}

interface SizeSignals {
  employees_stated?: number | null;
  crew_count?: number | null;
  fleet_size?: number | null;
  locations?: number | null;
  linkedin_employee_band?: string | null;
  ppp?: { jobs?: number | null; loan?: number | null; date?: string | null } | null;
}

interface Bench { revenue_per_employee: number; ebitda_margin: [number, number] }

const bench = (industry?: string | null): Bench => {
  const table = benchmarks as unknown as Record<string, Bench>;
  return table[String(industry ?? "")] ?? table.default;
};

/** Employee-count range from the best available signal. Order matters:
 *  stated > PPP jobs (payroll-verified) > LinkedIn band > crew/fleet heuristics. */
export function employeeEstimate(sig: SizeSignals | null | undefined, reviewCount?: number | null):
  { range: [number, number]; confidence: SizeConfidence; basis: string } | null {
  if (!sig && !reviewCount) return null;
  const s = { ...(sig ?? {}) };
  // plausibility clamps: numbers beyond small-business scale are marketplace/
  // franchise stats scraped off aggregator sites, not the target's own size —
  // drop the signal rather than mint a fake tier-A
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

/** Full size estimate for a lead/company. Null when no usable signal exists. */
export function sizeEstimate(
  industry: string | null | undefined,
  sig: SizeSignals | null | undefined,
  reviewCount?: number | null,
): SizeEstimate | null {
  const emp = employeeEstimate(sig, reviewCount);
  if (!emp) return null;
  const b = bench(industry);
  const revenue: [number, number] = [
    Math.round(emp.range[0] * b.revenue_per_employee),
    Math.round(emp.range[1] * b.revenue_per_employee),
  ];
  const ebitda: [number, number] = [
    Math.round(revenue[0] * b.ebitda_margin[0]),
    Math.round(revenue[1] * b.ebitda_margin[1]),
  ];
  // Tier on the OPTIMISTIC end (ebitda hi): A = the $1M+ anchor thesis is
  // plausible; C = even optimistically under $200k (below tuck-in floor).
  const tier: SizeTier = ebitda[1] >= 1_000_000 ? "A" : ebitda[1] < 200_000 ? "C" : "B";
  return {
    tier,
    employees: [Math.round(emp.range[0]), Math.round(emp.range[1])],
    revenue, ebitda,
    confidence: emp.confidence,
    basis: emp.basis,
  };
}

export const TIERS: (SizeTier | "unsized")[] = ["A", "B", "C", "unsized"];
