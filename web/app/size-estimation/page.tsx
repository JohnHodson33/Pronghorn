"use client";

// Size Estimation — the editable assumptions behind every size tier (John
// amendment 3, card 37450f11): per-industry revenue-per-employee + EBITDA
// margin bands, and the Platform / Tuck-in / Too-small boundaries. Edits
// PATCH /api/size-model and the math cascades — every chip and ~estimate
// recomputes on next load. A live example row makes the cascade visible.
import { useEffect, useMemo, useState } from "react";
import { sizeEstimate, type Bench, type Thresholds, TIER_LABELS } from "@/lib/size";

const inputCls = "w-24 rounded-md border border-zinc-300 px-2 py-1 text-sm text-right tabular-nums outline-none focus:border-emerald-600";
const money = (n: number) => n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(1)}M` : `$${Math.round(n / 1000)}K`;

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
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setSaving(null);
    if (!res.ok) setErr((await res.json().catch(() => ({}))).error ?? "save failed");
    else load();
  }

  // live cascade preview — recomputes from the CURRENT (possibly unsaved-on-
  // server, but loaded) model so John sees what an edit does
  const preview = useMemo(() => {
    if (!thresholds) return null;
    return sizeEstimate(sampleIndustry, { employees_stated: sampleEmployees }, null, { benchmarks, thresholds });
  }, [sampleIndustry, sampleEmployees, benchmarks, thresholds]);

  const setBench = (ind: string, k: "rpe" | "lo" | "hi", v: number) =>
    setBenchmarks((prev) => {
      const b = prev[ind];
      if (!b) return prev;
      const margin = b.ebitda_margin ?? [0.2, 0.2]; // amendment 4: flat 20% default
      return {
        ...prev,
        [ind]: {
          revenue_per_employee: k === "rpe" ? v : b.revenue_per_employee,
          ebitda_margin: [k === "lo" ? v : margin[0], k === "hi" ? v : margin[1]],
        },
      };
    });

  return (
    <div className="max-w-4xl p-4 md:p-8 space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Size Estimation</h1>
        <p className="text-sm text-zinc-500">
          Proprietary leads carry no financials, so size is estimated: employee signal × revenue-per-employee →
          revenue range → EBITDA range via margin band → <span className="font-medium">Platform / Tuck-in / Too small</span>.
          Every number below is an assumption you can tune — edits cascade to every chip and ~estimate in the app.
        </p>
        {source === "seed" && (
          <p className="mt-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            Showing seeded defaults — edits save once migration 0014 is applied.
          </p>
        )}
        {err && <p className="mt-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">{err}</p>}
      </header>

      {thresholds && (
        <section className="rounded-xl border border-zinc-200 bg-white p-4 space-y-3">
          <h2 className="font-semibold">Tier boundaries</h2>
          <div className="flex flex-wrap items-end gap-x-6 gap-y-3 text-sm">
            <label className="space-y-1">
              <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Platform: min EBITDA</div>
              <input type="number" step={50000} value={thresholds.platform_min_ebitda}
                onChange={(e) => setThresholds({ ...thresholds, platform_min_ebitda: Number(e.target.value) })} className={inputCls} />
            </label>
            <label className="space-y-1">
              <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Platform: min revenue <span className="normal-case text-zinc-400">(blank = EBITDA-only)</span></div>
              <input type="number" step={500000} value={thresholds.platform_min_revenue ?? ""}
                onChange={(e) => setThresholds({ ...thresholds, platform_min_revenue: e.target.value === "" ? null : Number(e.target.value) })} className={inputCls} />
            </label>
            <label className="space-y-1">
              <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Too small: max EBITDA</div>
              <input type="number" step={25000} value={thresholds.toosmall_max_ebitda}
                onChange={(e) => setThresholds({ ...thresholds, toosmall_max_ebitda: Number(e.target.value) })} className={inputCls} />
            </label>
            <label className="space-y-1">
              <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Too big: min EBITDA <span className="normal-case text-zinc-400">(conglomerate territory)</span></div>
              <input type="number" step={500000} value={thresholds.toobig_min_ebitda ?? 10_000_000}
                onChange={(e) => setThresholds({ ...thresholds, toobig_min_ebitda: Number(e.target.value) })} className={inputCls} />
            </label>
            <button
              onClick={() => patch({ thresholds }, "thresholds")}
              disabled={saving === "thresholds"}
              className="rounded-lg bg-emerald-700 px-4 py-1.5 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"
            >
              {saving === "thresholds" ? "Saving…" : "Save boundaries"}
            </button>
          </div>
          <p className="text-xs text-zinc-400">Platform = optimistic end clears the bar · Too small = under the floor even optimistically · everything between = Tuck-in.</p>
        </section>
      )}

      <section className="rounded-xl border border-zinc-200 bg-white p-4 space-y-2">
        <h2 className="font-semibold">Live example</h2>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span>A</span>
          <select value={sampleIndustry} onChange={(e) => setSampleIndustry(e.target.value)} className="rounded-md border border-zinc-300 px-2 py-1 text-sm">
            {Object.keys(benchmarks).filter((k) => k !== "default").map((k) => <option key={k}>{k}</option>)}
          </select>
          <span>company stating</span>
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
      </section>

      <section className="rounded-xl border border-zinc-200 bg-white">
        <div className="border-b border-zinc-200 px-4 py-3 font-semibold">Per-industry benchmarks</div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-200 text-left text-xs uppercase tracking-wide text-zinc-500">
                <th className="px-4 py-2">Industry</th>
                <th className="px-4 py-2 text-right">Revenue / employee</th>
                <th className="px-4 py-2 text-right">EBITDA margin low</th>
                <th className="px-4 py-2 text-right">high</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {Object.entries(benchmarks).map(([ind, b]) => (
                <tr key={ind}>
                  <td className="px-4 py-2 font-medium">{ind === "default" ? <span className="text-zinc-400">default (unlisted)</span> : ind}</td>
                  <td className="px-4 py-2 text-right">
                    <input type="number" step={5000} value={b.revenue_per_employee} onChange={(e) => setBench(ind, "rpe", Number(e.target.value))} className={inputCls} />
                  </td>
                  <td className="px-4 py-2 text-right">
                    <input type="number" step={0.01} min={0} max={1} value={(b.ebitda_margin ?? [0.2, 0.2])[0]} onChange={(e) => setBench(ind, "lo", Number(e.target.value))} className={inputCls} />
                  </td>
                  <td className="px-4 py-2 text-right">
                    <input type="number" step={0.01} min={0} max={1} value={(b.ebitda_margin ?? [0.2, 0.2])[1]} onChange={(e) => setBench(ind, "hi", Number(e.target.value))} className={inputCls} />
                  </td>
                  <td className="px-4 py-2 text-right">
                    <button
                      onClick={() => patch({ industry: ind, revenue_per_employee: b.revenue_per_employee, ebitda_margin: b.ebitda_margin ?? [0.2, 0.2] }, ind)}
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
      </section>
    </div>
  );
}
