"use client";

// The CRM deals index — every deal ever, including Passed (deals fall out of
// the pipeline and may fall back in; they stay findable here). LIST-UX
// STANDARD (John 7/16 ~13:00): top bar = search + count + CSV; the column
// headers do the filtering (Stage/Size dropdowns) and the sorting.
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { money, STAGES } from "@/lib/mock";
import type { LiveDeal } from "@/lib/crm";
import { buildCsv, csvDate, downloadCsv } from "@/lib/csv";
import { TIER_LABELS } from "@/lib/size";
import { useUrlFilterSync } from "@/lib/use-url-filters";
import FilterDropdown from "@/components/FilterDropdown";
import SortHeader from "@/components/SortHeader";
import { presenceOptions, presenceMatch } from "@/lib/list-filters";

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
const TIERS = ["platform", "tuckin", "too_big", "toosmall", "unsized"];

// The live pipeline carries stages the STAGES constant doesn't know about
// (e.g. "CIM Received"). This index is "every deal ever, findable" — so the
// Stage filter/sort is built from what's actually in the data, with the known
// stages in pipeline order and any strangers appended rather than dropped.
function stageOrder(deals: LiveDeal[]) {
  const extra = [...new Set(deals.map((d) => d.stage))]
    .filter((s) => s && !ALL_STAGES.includes(s))
    .sort();
  return [...ALL_STAGES, ...extra];
}

type SortKey = "company" | "stage" | "owner" | "broker" | "size" | "estrev" | "estebitda" | "ebitda" | "asking" | "ourval" | "fit";

// EBITDA sorts on the real number when we have one and the estimate midpoint
// when we don't — the column already shows them interchangeably.
const ebitdaSortVal = (d: LiveDeal) =>
  d.ebitda ?? (d.size ? (d.size.ebitda[0] + d.size.ebitda[1]) / 2 : null);
// ~Rev / ~EBITDA columns sort on the size-model estimate midpoint; unsized last.
const estMid = (r: [number, number] | undefined) => (r ? (r[0] + r[1]) / 2 : null);

export default function DealsTable({ deals, initialStage }: { deals: LiveDeal[]; initialStage?: string }) {
  const router = useRouter();

  // csv-string convention (LIST-UX STANDARD): multi-select UI, and the old
  // singular ?stage=Diligence deep links (pipeline board) still hydrate
  const asSet = (v: string) => new Set(v ? v.split(",").filter(Boolean) : []);
  const stages = useMemo(() => stageOrder(deals), [deals]);
  const [q, setQ] = useState("");
  const [stage, setStage] = useState(initialStage ?? "");
  const [tier, setTier] = useState("");
  const [ownerSel, setOwnerSel] = useState<Set<string>>(new Set());
  const [brokerSel, setBrokerSel] = useState<Set<string>>(new Set());
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  // filters survive back-nav via URL params (John 7/15); ?stage= stays the
  // deep-link param the pipeline board already uses
  useUrlFilterSync(
    () => ({
      q, stage: stage || null, size: tier || null,
      owner: ownerSel.size ? [...ownerSel].join(",") : null,
      broker: brokerSel.size ? [...brokerSel].join(",") : null,
      sort: sortKey, dir: sortKey && sortDir === "asc" ? "asc" : null,
    }),
    (p) => {
      if (p.get("q")) setQ(p.get("q")!);
      if (p.get("stage")) setStage(p.get("stage")!);
      if (p.get("size")) setTier(p.get("size")!);
      if (p.get("owner")) setOwnerSel(new Set(p.get("owner")!.split(",")));
      if (p.get("broker")) setBrokerSel(new Set(p.get("broker")!.split(",")));
      if (p.get("sort")) setSortKey(p.get("sort") as SortKey);
      if (p.get("dir") === "asc") setSortDir("asc");
    },
    [q, stage, tier, ownerSel, brokerSel, sortKey, sortDir],
  );

  const counts = useMemo(() => {
    const m: Record<string, number> = {};
    for (const d of deals) m[d.stage] = (m[d.stage] ?? 0) + 1;
    return m;
  }, [deals]);

  const tierCounts = useMemo(() => {
    const m: Record<string, number> = {};
    for (const d of deals) {
      const t = d.size?.tier ?? "unsized";
      m[t] = (m[t] ?? 0) + 1;
    }
    return m;
  }, [deals]);

  const rows = useMemo(() => {
    const stageSel = asSet(stage);
    const tierSel = asSet(tier);
    const filtered = deals.filter((d) => {
      if (stageSel.size && !stageSel.has(d.stage)) return false;
      if (tierSel.size && !tierSel.has(d.size?.tier ?? "unsized")) return false;
      if (!presenceMatch(ownerSel, d.owner)) return false;
      if (!presenceMatch(brokerSel, d.broker)) return false;
      if (
        q &&
        !`${d.company} ${d.owner ?? ""} ${d.broker ?? ""} ${d.industry ?? ""} ${d.city ?? ""} ${d.state ?? ""} ${d.passReason ?? ""}`
          .toLowerCase()
          .includes(q.toLowerCase())
      )
        return false;
      return true;
    });
    if (!sortKey) return filtered; // server order
    const text = (v: string | null | undefined) => String(v ?? "zzz").toLowerCase();
    return [...filtered].sort((a, b) => {
      let cmp: number;
      switch (sortKey) {
        case "company": cmp = text(a.company).localeCompare(text(b.company)); break;
        case "owner": cmp = text(a.owner).localeCompare(text(b.owner)); break;
        case "broker": cmp = text(a.broker).localeCompare(text(b.broker)); break;
        // pipeline order, not alphabetical — Sourced→Passed is what the stage means
        case "stage": cmp = stages.indexOf(a.stage) - stages.indexOf(b.stage); break;
        case "size": cmp = TIERS.indexOf(a.size?.tier ?? "unsized") - TIERS.indexOf(b.size?.tier ?? "unsized"); break;
        default: {
          const pick = (d: LiveDeal) =>
            sortKey === "estrev" ? estMid(d.size?.revenue)
            : sortKey === "estebitda" ? estMid(d.size?.ebitda)
            : sortKey === "ebitda" ? ebitdaSortVal(d)
            : sortKey === "asking" ? d.asking
            : sortKey === "ourval" ? d.ourValuation
            : d.fitScore;
          const av = pick(a), bv = pick(b);
          // missing numbers sink to the bottom in BOTH directions
          if (av === null && bv === null) return 0;
          if (av === null) return 1;
          if (bv === null) return -1;
          return sortDir === "asc" ? av - bv : bv - av;
        }
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [deals, q, stage, tier, ownerSel, brokerSel, sortKey, sortDir, stages]);

  const sortSet = (key: SortKey) => (d: "asc" | "desc" | null) => {
    if (!d) setSortKey(null);
    else { setSortKey(key); setSortDir(d); }
  };
  const ownerOptions = useMemo(() => presenceOptions(deals, (d) => d.owner, "owner"), [deals]);
  const brokerOptions = useMemo(() => presenceOptions(deals, (d) => d.broker, "broker"), [deals]);

  function exportCsv() {
    downloadCsv(
      `pronghorn-deals-${csvDate()}.csv`,
      buildCsv(
        ["company", "stage", "industry", "city", "state", "owner", "broker", "brokerage",
         "size_tier", "est_revenue_low", "est_revenue_high", "est_ebitda_low", "est_ebitda_high",
         "size_confidence", "size_basis",
         "revenue", "ebitda", "ebitda_type", "asking", "our_valuation", "fit_score",
         "pass_reason", "next_step", "next_step_due"],
        rows.map((d) => [
          d.company, d.stage, d.industry, d.city, d.state, d.owner ?? null, d.broker ?? null,
          d.brokerage ?? null, TIER_LABELS[d.size?.tier ?? "unsized"],
          d.size?.revenue[0] ?? null, d.size?.revenue[1] ?? null, d.size?.ebitda[0] ?? null, d.size?.ebitda[1] ?? null,
          d.size?.confidence ?? null, d.size?.basis ?? null,
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

      {/* LIST-UX STANDARD: the stage chip row is retired — Stage filters from
          its own column header (multi-select, counts in the panel). */}
      <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-200 text-left text-xs uppercase tracking-wide text-zinc-500">
              <th className="px-4 py-3">
                <SortHeader label="Company" active={sortKey === "company"} dir={sortDir} onChange={sortSet("company")} />
              </th>
              <th className="px-4 py-3">
                <span className="inline-flex items-center gap-1">
                  <SortHeader label="Stage" active={sortKey === "stage"} dir={sortDir} onChange={sortSet("stage")} />
                  <FilterDropdown
                    header
                    label=""
                    name="Stage"
                    options={stages.filter((s) => counts[s]).map((s) => ({ value: s, label: s, count: counts[s] }))}
                    selected={asSet(stage)}
                    onChange={(s) => setStage([...s].join(","))}
                  />
                </span>
              </th>
              <th className="px-4 py-3">
                <span className="inline-flex items-center gap-1">
                  <SortHeader label="Owner" active={sortKey === "owner"} dir={sortDir} onChange={sortSet("owner")} />
                  <FilterDropdown header label="" name="Owner" options={ownerOptions} selected={ownerSel} onChange={setOwnerSel} />
                </span>
              </th>
              <th className="px-4 py-3">
                <span className="inline-flex items-center gap-1">
                  <SortHeader label="Broker" active={sortKey === "broker"} dir={sortDir} onChange={sortSet("broker")} />
                  <FilterDropdown header label="" name="Broker" options={brokerOptions} selected={brokerSel} onChange={setBrokerSel} />
                </span>
              </th>
              <th className="px-4 py-3">
                <span className="inline-flex items-center gap-1">
                  <SortHeader label="Size" active={sortKey === "size"} dir={sortDir} onChange={sortSet("size")} />
                  <FilterDropdown
                    header
                    label=""
                    name="Size"
                    options={TIERS.filter((t) => tierCounts[t]).map((t) => ({ value: t, label: TIER_LABELS[t], count: tierCounts[t] }))}
                    selected={asSet(tier)}
                    onChange={(s) => setTier([...s].join(","))}
                  />
                </span>
              </th>
              {/* est. Revenue/EBITDA on EVERY row (John 7/20 — show the numbers,
                  not just the tier chip; matches Enrichment + Companies) */}
              <th className="px-4 py-3 text-right">
                <SortHeader label="~Rev" numeric active={sortKey === "estrev"} dir={sortDir} onChange={sortSet("estrev")} />
              </th>
              <th className="px-4 py-3 text-right">
                <SortHeader label="~EBITDA" numeric active={sortKey === "estebitda"} dir={sortDir} onChange={sortSet("estebitda")} />
              </th>
              <th className="px-4 py-3 text-right">
                <SortHeader label="EBITDA" numeric active={sortKey === "ebitda"} dir={sortDir} onChange={sortSet("ebitda")} />
              </th>
              <th className="px-4 py-3 text-right">
                <SortHeader label="Asking" numeric active={sortKey === "asking"} dir={sortDir} onChange={sortSet("asking")} />
              </th>
              <th className="px-4 py-3 text-right">
                <SortHeader label="Our val" numeric active={sortKey === "ourval"} dir={sortDir} onChange={sortSet("ourval")} />
              </th>
              <th className="px-4 py-3 text-right">
                <SortHeader label="Fit" numeric active={sortKey === "fit"} dir={sortDir} onChange={sortSet("fit")} />
              </th>
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
                      ? `${d.size.employees ? `~${d.size.employees[0]}–${d.size.employees[1]} employees` : "sized"} (${d.size.basis}) → ${estShort(d.size.revenue)} rev → ${estShort(d.size.ebitda)} EBITDA · ${d.size.confidence} confidence`
                      : "no usable size signal — estimate needs enrichment (or the deal has actual financials)"}
                  >
                    {TIER_LABELS[d.size?.tier ?? "unsized"]}
                  </span>
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-right text-xs tabular-nums text-zinc-500"
                  title={d.size ? `estimate via ${d.size.basis} · ${d.size.confidence} confidence` : "no size signal yet"}>
                  {d.size ? estShort(d.size.revenue) : <span className="text-zinc-300">—</span>}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-right text-xs tabular-nums text-zinc-500"
                  title={d.size ? `est. revenue × industry margin · ${d.size.confidence} confidence` : "no size signal yet"}>
                  {d.size ? estShort(d.size.ebitda) : <span className="text-zinc-300">—</span>}
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
                <td colSpan={11} className="px-4 py-10 text-center text-sm text-zinc-400">
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
