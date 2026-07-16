"use client";

// The CRM deals index — every deal ever, including Passed (deals fall out of
// the pipeline and may fall back in; they stay findable here). Shared list
// pattern: search + stage chips + CSV; rows open the deal working view.
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { money, STAGES } from "@/lib/mock";
import type { LiveDeal } from "@/lib/crm";
import { buildCsv, csvDate, downloadCsv } from "@/lib/csv";
import { TIER_LABELS } from "@/lib/size";
import { useUrlFilterSync } from "@/lib/use-url-filters";

const tierChip: Record<string, string> = {
  platform: "bg-emerald-100 text-emerald-800",
  tuckin: "bg-sky-100 text-sky-800",
  toosmall: "bg-zinc-100 text-zinc-500",
  too_big: "bg-violet-100 text-violet-800",
  unsized: "bg-zinc-50 text-zinc-400 border border-zinc-200",
};
const estShort = (r: [number, number]) => {
  const f = (n: number) => (n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(1)}M` : `$${Math.round(n / 1000)}K`);
  return `~${f(r[0])}–${f(r[1])}`;
};

const stageChip: Record<string, string> = {
  Sourced: "bg-zinc-100 text-zinc-600",
  "Info Requested": "bg-amber-100 text-amber-800",
  "Under Screening": "bg-amber-100 text-amber-800",
  "IOI Submitted": "bg-sky-100 text-sky-800",
  LOI: "bg-sky-100 text-sky-800",
  Diligence: "bg-violet-100 text-violet-800",
  Closed: "bg-emerald-100 text-emerald-800",
  Passed: "bg-zinc-100 text-zinc-400",
};

const ALL_STAGES = [...STAGES, "Passed"];

export default function DealsTable({ deals, initialStage }: { deals: LiveDeal[]; initialStage?: string }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [stage, setStage] = useState<string | null>(
    initialStage && ALL_STAGES.includes(initialStage) ? initialStage : null
  );

  // filters survive back-nav via URL params (John 7/15); ?stage= stays the
  // deep-link param the pipeline board already uses
  useUrlFilterSync(
    () => ({ q, stage }),
    (p) => {
      if (p.get("q")) setQ(p.get("q")!);
      if (p.get("stage") && ALL_STAGES.includes(p.get("stage")!)) setStage(p.get("stage"));
    },
    [q, stage],
  );

  const counts = useMemo(() => {
    const m: Record<string, number> = {};
    for (const d of deals) m[d.stage] = (m[d.stage] ?? 0) + 1;
    return m;
  }, [deals]);

  const rows = useMemo(
    () =>
      deals.filter((d) => {
        if (stage && d.stage !== stage) return false;
        if (
          q &&
          !`${d.company} ${d.owner ?? ""} ${d.broker ?? ""} ${d.industry ?? ""} ${d.city ?? ""} ${d.state ?? ""} ${d.passReason ?? ""}`
            .toLowerCase()
            .includes(q.toLowerCase())
        )
          return false;
        return true;
      }),
    [deals, q, stage]
  );

  function exportCsv() {
    downloadCsv(
      `pronghorn-deals-${csvDate()}.csv`,
      buildCsv(
        ["company", "stage", "industry", "city", "state", "owner", "broker", "brokerage",
         "size_tier", "est_ebitda_low", "est_ebitda_high",
         "revenue", "ebitda", "ebitda_type", "asking", "our_valuation", "fit_score",
         "pass_reason", "next_step", "next_step_due"],
        rows.map((d) => [
          d.company, d.stage, d.industry, d.city, d.state, d.owner ?? null, d.broker ?? null,
          d.brokerage ?? null, TIER_LABELS[d.size?.tier ?? "unsized"], d.size?.ebitda[0] ?? null, d.size?.ebitda[1] ?? null,
          d.revenue, d.ebitda, d.ebitdaType, d.asking, d.ourValuation,
          d.fitScore, d.passReason, d.nextStep, d.nextStepDue,
        ])
      )
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-zinc-200 bg-white p-4">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search company / owner / broker / reason…"
          className="w-72 rounded-md border border-zinc-300 px-3 py-1.5 text-sm outline-none focus:border-emerald-600"
        />
        <span className="ml-auto flex items-center gap-3">
          <span className="text-sm text-zinc-500 tabular-nums">{rows.length} of {deals.length}</span>
          <button
            onClick={exportCsv}
            disabled={rows.length === 0}
            className="rounded-lg bg-emerald-700 px-4 py-1.5 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"
          >
            Export CSV ({rows.length})
          </button>
        </span>
      </div>

      <div className="flex flex-wrap gap-1.5">
        <button
          onClick={() => setStage(null)}
          className={`rounded-full px-3 py-1 text-xs font-medium transition ${
            stage === null ? "bg-emerald-700 text-white" : "border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50"
          }`}
        >
          All · {deals.length}
        </button>
        {ALL_STAGES.filter((s) => counts[s]).map((s) => (
          <button
            key={s}
            onClick={() => setStage(stage === s ? null : s)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition ${
              stage === s ? "ring-2 ring-emerald-600 " : ""
            }${stageChip[s] ?? "bg-zinc-100 text-zinc-600"}`}
          >
            {s} · {counts[s]}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-200 text-left text-xs uppercase tracking-wide text-zinc-500">
              <th className="px-4 py-3">Company</th>
              <th className="px-4 py-3">Stage</th>
              <th className="px-4 py-3">Owner</th>
              <th className="px-4 py-3">Broker</th>
              <th className="px-4 py-3">Size</th>
              <th className="px-4 py-3 text-right">EBITDA</th>
              <th className="px-4 py-3 text-right">Asking</th>
              <th className="px-4 py-3 text-right">Our val</th>
              <th className="px-4 py-3 text-right">Fit</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {rows.map((d) => (
              <tr
                key={d.id}
                onClick={() => router.push(`/deals/${d.id}`)}
                className={`cursor-pointer hover:bg-zinc-50 ${d.stage === "Passed" ? "text-zinc-400" : ""}`}
              >
                <td className="max-w-xs px-4 py-3">
                  <div className={`truncate font-medium ${d.stage === "Passed" ? "" : "text-zinc-900"}`}>{d.company}</div>
                  <div className="truncate text-xs text-zinc-500">
                    {[d.industry, [d.city, d.state].filter(Boolean).join(", ")].filter(Boolean).join(" · ")}
                    {d.stage === "Passed" && d.passReason && <span> · passed: {d.passReason}</span>}
                  </div>
                </td>
                <td className="whitespace-nowrap px-4 py-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${stageChip[d.stage] ?? "bg-zinc-100 text-zinc-600"}`}>
                    {d.stage}
                  </span>
                </td>
                <td className="whitespace-nowrap px-4 py-3">{d.owner ?? <span className="text-xs text-zinc-300">—</span>}</td>
                <td className="max-w-40 truncate px-4 py-3">{d.broker ?? <span className="text-xs text-zinc-300">—</span>}</td>
                <td className="whitespace-nowrap px-4 py-3">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-semibold ${tierChip[d.size?.tier ?? "unsized"]}`}
                    title={d.size
                      ? `~${d.size.employees[0]}–${d.size.employees[1]} employees (${d.size.basis}) → ${estShort(d.size.revenue)} rev → ${estShort(d.size.ebitda)} EBITDA · ${d.size.confidence} confidence`
                      : "no usable size signal — estimate needs enrichment (or the deal has actual financials)"}
                  >
                    {TIER_LABELS[d.size?.tier ?? "unsized"]}
                  </span>
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums">
                  {d.ebitda !== null ? (
                    <>
                      <span className={d.stage === "Passed" ? "" : "font-semibold text-emerald-800"}>{money(d.ebitda)}</span>
                      <span className="ml-1 text-xs text-zinc-400">{d.ebitdaType}</span>
                    </>
                  ) : d.size ? (
                    <span className="text-xs text-zinc-500" title={`estimated via ${d.size.basis}`}>{estShort(d.size.ebitda)}</span>
                  ) : (
                    money(null)
                  )}
                </td>
                <td className="px-4 py-3 text-right tabular-nums">{money(d.asking)}</td>
                <td className="px-4 py-3 text-right tabular-nums">{money(d.ourValuation)}</td>
                <td className="px-4 py-3 text-right tabular-nums">{d.fitScore ?? "—"}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-10 text-center text-sm text-zinc-400">
                  No deals match the current filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
