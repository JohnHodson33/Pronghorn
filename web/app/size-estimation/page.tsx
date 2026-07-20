"use client";

// Size Estimation — the editable assumptions behind every size tier.
// AMENDMENT 4 (John): the ONLY per-industry input is PAYROLL % OF REVENUE — the
// metric John & Tom actually reason in and can sanity-check — NOT revenue-per-
// employee. Math:
//   PPP path:      loan × 4.8 = annual payroll → × CPI(draw year) → ÷ payroll%  = revenue
//   Employee path: employees × avg fully-burdened wage = payroll → ÷ payroll%   = revenue
//   EBITDA = revenue × flat margin (single value, seed 20%).
// Edits PATCH /api/size-model and cascade to every chip + ~estimate on next load.
import { useEffect, useMemo, useState } from "react";
import { sizeEstimate, type Bench, type Thresholds, TIER_LABELS } from "@/lib/size";

const numCls = "w-24 rounded-md border border-zinc-300 px-2 py-1 text-sm text-right tabular-nums outline-none focus:border-emerald-600";
const money = (n: number) => n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(1)}M` : `$${Math.round(n / 1000)}K`;
const pct = (d: number | undefined) => d == null ? "" : +(d * 100).toFixed(1);

export default function SizeEstimation() {
  const [benchmarks, setBenchmarks] = useState<Record<string, Bench>>({});
  const [thresholds, setThresholds] = useState<Thresholds | null>(null);
  const [source, setSource] = useState<string>("seed");
  const [saving, setSaving] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [sampleEmployees, setSampleEmployees] = useState(12);
  const [sampleIndustry, setSampleIndustry] = useState("Tree Care");

  async function load() {
    const j = await fetch("/api/size-model", { cache: "no-store" }).then((r) => r.json()).catch(() => ({}));
    setBenchmarks(j.benchmarks ?? {});
    setThresholds(j.thresholds ?? null);
    setSource(j.source ?? "seed");
  }
  useEffect(() => { load(); }, []);

  async function patch(body: Record<string, unknown>, key: string) {
    setSaving(key);
    setErr(null);
    const res = await fetch("/api/size-model", {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    });
    setSaving(null);
    if (!res.ok) setErr((await res.json().catch(() => ({}))).error ?? "save failed");
    else load();
  }

  // live cascade preview from the currently-loaded model
  const preview = useMemo(() => {
    if (!thresholds) return null;
    return sizeEstimate(sampleIndustry, { employees_stated: sampleEmployees }, null, { benchmarks, thresholds });
  }, [sampleIndustry, sampleEmployees, benchmarks, thresholds]);

  const setBench = (ind: string, field: "payroll_pct" | "burdened_wage", v: number) =>
    setBenchmarks((prev) => (prev[ind] ? { ...prev, [ind]: { ...prev[ind], [field]: v } } : prev));

  const setThr = (patchObj: Partial<Thresholds>) => setThresholds((t) => t ? { ...t, ...patchObj } : t);

  return (
    <div className="max-w-4xl p-4 md:p-8 space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Size Estimation</h1>
        <p className="text-sm text-zinc-500">
          Proprietary leads carry no financials, so size is estimated from <span className="font-medium">payroll</span> — the
          one thing we can anchor. From a PPP loan (loan × 4.8 = annual payroll, CPI-adjusted for the draw year) or from an
          employee count (× avg fully-burdened wage), we back into revenue using each industry&apos;s{" "}
          <span className="font-medium">payroll % of revenue</span>, then apply a flat EBITDA margin →{" "}
          <span className="font-medium">Platform / Tuck-in / Too small / Too big</span>. Every number below is an assumption you tune — edits cascade to every chip and ~estimate.
        </p>
        {source === "seed" && (
          <p className="mt-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            Showing seeded defaults — edits save once the size migrations (0014/0018) are applied.
          </p>
        )}
        {err && <p className="mt-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">{err}</p>}
      </header>

      {thresholds && (
        <section className="rounded-xl border border-zinc-200 bg-white p-4 space-y-3">
          <h2 className="font-semibold">Global assumptions &amp; tier boundaries</h2>
          <div className="flex flex-wrap items-end gap-x-6 gap-y-3 text-sm">
            <label className="space-y-1">
              <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">EBITDA margin (flat) <span className="normal-case text-zinc-400">%</span></div>
              <input type="number" step={1} min={0} max={100} value={pct(thresholds.ebitda_margin_flat)}
                onChange={(e) => setThr({ ebitda_margin_flat: Number(e.target.value) / 100 })} className={numCls} />
            </label>
            <label className="space-y-1">
              <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">CPI factor — 2020 draws</div>
              <input type="number" step={0.01} value={thresholds.cpi_2020 ?? 1.25}
                onChange={(e) => setThr({ cpi_2020: Number(e.target.value) })} className={numCls} />
            </label>
            <label className="space-y-1">
              <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">CPI factor — 2021 draws</div>
              <input type="number" step={0.01} value={thresholds.cpi_2021 ?? 1.20}
                onChange={(e) => setThr({ cpi_2021: Number(e.target.value) })} className={numCls} />
            </label>
          </div>
          <div className="flex flex-wrap items-end gap-x-6 gap-y-3 border-t border-zinc-100 pt-3 text-sm">
            <label className="space-y-1">
              <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Platform: min EBITDA</div>
              <input type="number" step={50000} value={thresholds.platform_min_ebitda}
                onChange={(e) => setThr({ platform_min_ebitda: Number(e.target.value) })} className={numCls} />
            </label>
            <label className="space-y-1">
              <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Platform: min revenue <span className="normal-case text-zinc-400">(blank = EBITDA-only)</span></div>
              <input type="number" step={500000} value={thresholds.platform_min_revenue ?? ""}
                onChange={(e) => setThr({ platform_min_revenue: e.target.value === "" ? null : Number(e.target.value) })} className={numCls} />
            </label>
            <label className="space-y-1">
              <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Too small: max EBITDA</div>
              <input type="number" step={25000} value={thresholds.toosmall_max_ebitda}
                onChange={(e) => setThr({ toosmall_max_ebitda: Number(e.target.value) })} className={numCls} />
            </label>
            <label className="space-y-1">
              <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Too big: min EBITDA <span className="normal-case text-zinc-400">(conglomerate)</span></div>
              <input type="number" step={500000} value={thresholds.toobig_min_ebitda ?? 10_000_000}
                onChange={(e) => setThr({ toobig_min_ebitda: Number(e.target.value) })} className={numCls} />
            </label>
            <button
              onClick={() => patch({ thresholds }, "thresholds")}
              disabled={saving === "thresholds"}
              className="rounded-lg bg-emerald-700 px-4 py-1.5 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"
            >
              {saving === "thresholds" ? "Saving…" : "Save assumptions"}
            </button>
          </div>
          <p className="text-xs text-zinc-400">EBITDA = est. revenue × flat margin (one value, conservative). CPI grows 2020/2021 PPP-derived payroll to today. Platform = clears the bar · Too small = under the floor · Too big = conglomerate territory · between = Tuck-in.</p>
        </section>
      )}

      <section className="rounded-xl border border-zinc-200 bg-white p-4 space-y-2">
        <h2 className="font-semibold">Live example</h2>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span>A</span>
          <select value={sampleIndustry} onChange={(e) => setSampleIndustry(e.target.value)} className="rounded-md border border-zinc-300 px-2 py-1 text-sm">
            {Object.keys(benchmarks).filter((k) => k !== "default").map((k) => <option key={k}>{k}</option>)}
          </select>
          <span>company with</span>
          <input type="number" min={1} max={500} value={sampleEmployees} onChange={(e) => setSampleEmployees(Number(e.target.value) || 1)}
            className="w-16 rounded-md border border-zinc-300 px-2 py-1 text-sm text-right" />
          <span>employees →</span>
          {preview ? (
            <span className="font-medium">
              ~{money(preview.revenue[0])}–{money(preview.revenue[1])} revenue · ~{money(preview.ebitda[0])}–{money(preview.ebitda[1])} EBITDA ·{" "}
              <span className={preview.tier === "platform" ? "text-emerald-700" : preview.tier === "tuckin" ? "text-sky-700" : "text-zinc-500"}>
                {TIER_LABELS[preview.tier]}
              </span>
            </span>
          ) : <span className="text-zinc-400">—</span>}
        </div>
        <p className="text-xs text-zinc-400">
          Same math a PPP-loan company runs — there the payroll comes straight from the loan (× 4.8, CPI-adjusted) instead of from headcount, then ÷ payroll % of revenue.
        </p>
      </section>

      <section className="rounded-xl border border-zinc-200 bg-white">
        <div className="border-b border-zinc-200 px-4 py-3 font-semibold">Per-industry benchmarks</div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-200 text-left text-xs uppercase tracking-wide text-zinc-500">
                <th className="px-4 py-2">Industry</th>
                <th className="px-4 py-2 text-right">Payroll % of revenue</th>
                <th className="px-4 py-2 text-right">Avg fully-burdened wage <span className="normal-case text-zinc-400">(employee path)</span></th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {Object.entries(benchmarks).map(([ind, b]) => (
                <tr key={ind}>
                  <td className="px-4 py-2 font-medium">{ind === "default" ? <span className="text-zinc-400">default (unlisted)</span> : ind}</td>
                  <td className="px-4 py-2 text-right">
                    <span className="inline-flex items-center gap-1">
                      <input type="number" step={1} min={1} max={100} value={pct(b.payroll_pct)}
                        onChange={(e) => setBench(ind, "payroll_pct", Number(e.target.value) / 100)} className={numCls} />
                      <span className="text-zinc-400">%</span>
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right">
                    <span className="inline-flex items-center gap-1">
                      <span className="text-zinc-400">$</span>
                      <input type="number" step={1000} value={b.burdened_wage ?? ""}
                        onChange={(e) => setBench(ind, "burdened_wage", Number(e.target.value))} className={numCls} />
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right">
                    <button
                      onClick={() => patch({ industry: ind, payroll_pct: b.payroll_pct, burdened_wage: b.burdened_wage }, ind)}
                      disabled={saving === ind}
                      className="rounded-md border border-zinc-300 px-2.5 py-1 text-xs font-semibold text-zinc-600 hover:border-emerald-600 hover:text-emerald-700 disabled:opacity-50"
                    >
                      {saving === ind ? "…" : "Save"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="border-t border-zinc-100 px-4 py-2 text-xs text-zinc-400">
          Payroll % of revenue is THE input — e.g. Tree Care ~40%, Lawn Care ~35%. Revenue = payroll ÷ this %. The burdened wage only feeds the employee-count path (companies with no PPP loan).
        </p>
      </section>
    </div>
  );
}
