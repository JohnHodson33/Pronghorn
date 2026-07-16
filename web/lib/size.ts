// Size-proxy model — AMENDMENT 4 (John 7/13 ~17:45): ONE mental model,
// payroll-first, conservative by design.
//
//   PPP path (payroll-verified):  loan × 4.8 = annual payroll (PPP ≈ 2.5
//     months) → CPI-adjust from the draw year (editable factors, seed 1.25
//     for 2020 / 1.20 for 2021) → revenue = payroll ÷ payroll_pct
//   Employee path (LinkedIn band / stated / crews): payroll = employees ×
//     burdened wage (internal per-trade seed, NOT a headline input) →
//     revenue = payroll ÷ payroll_pct
//   est_ebitda = est_revenue × FLAT margin (single editable value, seed 20%)
//
// The Size Estimation tab's ONLY inputs: payroll % (per industry) · EBITDA
// margin (flat) · CPI factors · tier thresholds. rev-per-employee is retired
// as an input ("I don't have a great way to look at rev/employee and know if
// it makes sense"). Everything still ranges + confidence + basis; no signal =
// unsized, never guessed; tiers: TOO BIG > PLATFORM > TUCK-IN > TOO SMALL.
import benchmarks from "./size-benchmarks.json";

export type SizeConfidence = "high" | "medium" | "low";
export type SizeTier = "platform" | "tuckin" | "toosmall" | "too_big";

export interface SizeEstimate {
  tier: SizeTier;
  employees: [number, number] | null;  // null on the PPP-loan path (payroll-direct)
  revenue: [number, number];           // USD/yr
  ebitda: [number, number];            // USD/yr
  confidence: SizeConfidence;
  basis: string;
}

export interface Bench {
  payroll_pct?: number;                // THE input (amendment 4)
  burdened_wage?: number;              // internal bridge for employee-only estimates
  revenue_per_employee?: number;       // legacy fallback only
  ebitda_margin?: [number, number];    // legacy fallback only
}
export interface Thresholds {
  platform_min_ebitda: number;
  platform_min_revenue: number | null;
  toosmall_max_ebitda: number;
  toosmall_max_revenue: number | null;
  toobig_min_ebitda?: number;
  ebitda_margin_flat?: number;         // amendment 4: single margin, seed 0.20
  cpi_2020?: number;                   // PPP draw-year adjustment factors
  cpi_2021?: number;
}
export interface SizeModel { benchmarks: Record<string, Bench>; thresholds: Thresholds }

export const DEFAULT_THRESHOLDS: Thresholds = {
  platform_min_ebitda: 1_000_000,
  platform_min_revenue: null,
  toosmall_max_ebitda: 200_000,
  toosmall_max_revenue: null,
  toobig_min_ebitda: 10_000_000,
  ebitda_margin_flat: 0.20,
  cpi_2020: 1.25,
  cpi_2021: 1.20,
};

const PPP_LOAN_TO_ANNUAL_PAYROLL = 4.8; // loan ≈ 2.5 months of payroll

interface SizeSignals {
  employees_stated?: number | null;
  crew_count?: number | null;
  fleet_size?: number | null;
  locations?: number | null;
  linkedin_employee_band?: string | null;
  ppp?: { jobs?: number | null; loan?: number | null; date?: string | null } | null;
}

const seedBench = benchmarks as unknown as Record<string, Bench>;

/** Employee-count range from the best available signal (plausibility-clamped). */
export function employeeEstimate(sig: SizeSignals | null | undefined, reviewCount?: number | null):
  { range: [number, number]; confidence: SizeConfidence; basis: string } | null {
  if (!sig && !reviewCount) return null;
  const s = { ...(sig ?? {}) };
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
  if (reviewCount && reviewCount >= 100) return { range: [5, 25], confidence: "low", basis: `${reviewCount} Google reviews (volume proxy)` };
  return null;
}

function cpiFactor(dateStr: string | null | undefined, t: Thresholds): { factor: number; year: number | null } {
  const year = dateStr ? Number(String(dateStr).match(/(20\d\d)/)?.[1] ?? String(dateStr).match(/\/(\d{4})/)?.[1]) || null : null;
  if (year === 2020) return { factor: t.cpi_2020 ?? 1.25, year };
  if (year === 2021) return { factor: t.cpi_2021 ?? 1.20, year };
  return { factor: year && year <= 2019 ? (t.cpi_2020 ?? 1.25) : 1.0, year };
}

/** Full size estimate — amendment-4 payroll math. Null when no usable signal. */
export function sizeEstimate(
  industry: string | null | undefined,
  sig: SizeSignals | null | undefined,
  reviewCount?: number | null,
  model?: Partial<SizeModel>,
): SizeEstimate | null {
  const table = model?.benchmarks ?? seedBench;
  const b = table[String(industry ?? "")] ?? table.default ?? seedBench.default;
  const t = { ...DEFAULT_THRESHOLDS, ...(model?.thresholds ?? {}) };
  const pct = b.payroll_pct ?? seedBench.default.payroll_pct ?? 0.33;
  const margin = t.ebitda_margin_flat ?? 0.20;

  let revenue: [number, number] | null = null;
  let employees: [number, number] | null = null;
  let confidence: SizeConfidence = "low";
  let basis = "";

  const s = sig ?? {};
  const loan = s.ppp?.loan && s.ppp.loan > 0 && s.ppp.loan < 10_000_000 ? s.ppp.loan : null;
  if (loan) {
    // PPP path: payroll-verified, the anchor (Tom's method)
    const { factor, year } = cpiFactor(s.ppp?.date, t);
    const payroll = loan * PPP_LOAN_TO_ANNUAL_PAYROLL * factor;
    const rev = payroll / pct;
    revenue = [Math.round(rev * 0.85), Math.round(rev * 1.15)];
    confidence = "high";
    basis = `PPP loan $${Math.round(loan / 1000)}k → payroll ×4.8${factor !== 1 ? ` ×${factor} CPI (${year})` : ""} ÷ ${Math.round(pct * 100)}% payroll`;
    const emp = employeeEstimate(s, reviewCount);
    if (emp) employees = [Math.round(emp.range[0]), Math.round(emp.range[1])];
  } else {
    // Employee path: same payroll math via the internal burdened wage
    const emp = employeeEstimate(s, reviewCount);
    if (!emp) return null;
    const wage = b.burdened_wage ?? seedBench.default.burdened_wage ?? 58000;
    revenue = [
      Math.round((emp.range[0] * wage) / pct),
      Math.round((emp.range[1] * wage) / pct),
    ];
    employees = [Math.round(emp.range[0]), Math.round(emp.range[1])];
    confidence = emp.confidence;
    basis = `${emp.basis} × $${Math.round(wage / 1000)}k wage ÷ ${Math.round(pct * 100)}% payroll`;
  }

  const ebitda: [number, number] = [Math.round(revenue[0] * margin), Math.round(revenue[1] * margin)];
  const isTooBig = ebitda[0] >= (t.toobig_min_ebitda ?? 10_000_000);
  const isPlatform = ebitda[1] >= t.platform_min_ebitda ||
    (t.platform_min_revenue != null && revenue[1] >= t.platform_min_revenue);
  const isTooSmall = !isPlatform && ebitda[1] < t.toosmall_max_ebitda &&
    (t.toosmall_max_revenue == null || revenue[1] < t.toosmall_max_revenue);
  const tier: SizeTier = isTooBig ? "too_big" : isPlatform ? "platform" : isTooSmall ? "toosmall" : "tuckin";
  return { tier, employees, revenue, ebitda, confidence, basis };
}

export const TIERS: (SizeTier | "unsized")[] = ["platform", "tuckin", "toosmall", "too_big", "unsized"];
export const TIER_LABELS: Record<string, string> = {
  platform: "Platform", tuckin: "Tuck-in", toosmall: "Too small", too_big: "Too big", unsized: "Unsized",
};

/** Qualitative bigness override (conglomerate signals, no numeric estimate). */
export function applyQualitativeFlags(size: SizeEstimate | null, enrichment?: { too_big?: boolean | null } | null): SizeEstimate | null {
  if (enrichment?.too_big !== true) return size;
  if (!size) {
    return { tier: "too_big", employees: null, revenue: [0, 0], ebitda: [0, 0], confidence: "low", basis: "conglomerate signals (no numeric estimate)" };
  }
  return size.tier === "too_big" ? size : { ...size, tier: "too_big", basis: `${size.basis} + conglomerate signals` };
}
