"use client";

// Companies table — 7/15 overhaul: industry multi-select dropdown w/ counts
// (chips don't scale), column-header dropdown filters (owner reach, size
// tier, deal stage), sortable est. Revenue/EBITDA columns, everything
// URL-param synced (pinnable). Whole-row click-through to the profile.
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { money } from "@/lib/mock";
import type { CompanyRow } from "@/lib/crm";
import { buildCsv, csvDate, downloadCsv } from "@/lib/csv";
import { companyLevel } from "@/lib/company-level";
import { LEVELS, LEVEL_META, type Completeness } from "@/lib/completeness";
import { PinButton } from "@/components/PinnedViews";
import { TIERS, TIER_LABELS } from "@/lib/size";
import FilterDropdown from "@/components/FilterDropdown";

// ~$X.XM–$Y.YM display for estimate ranges (never fake precision)
const estRange = (r: [number, number]) => {
  const f = (n: number) => (n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(1)}M` : `$${Math.round(n / 1000)}K`);
  return `~${f(r[0])}–${f(r[1])}`;
};
const tierChip: Record<string, string> = {
  platform: "bg-emerald-100 text-emerald-800",
  tuckin: "bg-sky-100 text-sky-800",
  toosmall: "bg-zinc-100 text-zinc-500",
  unsized: "bg-zinc-50 text-zinc-400 border border-zinc-200",
};

const levelChip: Record<Completeness, string> = {
  full: "bg-emerald-700 text-white",
  contactable: "bg-emerald-100 text-emerald-800",
  identified: "bg-amber-100 text-amber-800",
  basic: "bg-zinc-100 text-zinc-600",
  raw: "bg-zinc-50 text-zinc-400",
};

type SortKey = "revenue" | "ebitda" | null;

const csv = (s: Set<string>) => (s.size ? [...s].join(",") : null);
const fromCsv = (v: string | null) => new Set((v ?? "").split(",").filter(Boolean));

export default function CompaniesTable({ companies }: { companies: CompanyRow[] }) {
  const router = useRouter();

  const [q, setQ] = useState("");
  const [industriesSel, setIndustriesSel] = useState<Set<string>>(new Set());
  const [levelsSel, setLevelsSel] = useState<Set<string>>(new Set());
  const [tiersSel, setTiersSel] = useState<Set<string>>(new Set());
  const [stagesSel, setStagesSel] = useState<Set<string>>(new Set());
  const [withDealOnly, setWithDealOnly] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  // Filters/sort ↔ URL params (pinnable; multi-values as csv). Reads the old
  // singular params too so pre-overhaul pinned views keep working.
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    if (p.get("q")) setQ(p.get("q")!);
    if (p.get("industry")) setIndustriesSel(fromCsv(p.get("industry")));
    if (p.get("level")) setLevelsSel(fromCsv(p.get("level")));
    if (p.get("tier")) setTiersSel(fromCsv(p.get("tier")));
    if (p.get("stage")) setStagesSel(fromCsv(p.get("stage")));
    if (p.get("deal") === "1") setWithDealOnly(true);
    if (p.get("sort") === "revenue" || p.get("sort") === "ebitda") setSortKey(p.get("sort") as SortKey);
    if (p.get("dir") === "asc") setSortDir("asc");
  }, []);
  useEffect(() => {
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    const pairs: [string, string | null][] = [
      ["industry", csv(industriesSel)], ["level", csv(levelsSel)],
      ["tier", csv(tiersSel)], ["stage", csv(stagesSel)],
    ];
    for (const [k, v] of pairs) if (v) p.set(k, v);
    if (withDealOnly) p.set("deal", "1");
    if (sortKey) { p.set("sort", sortKey); if (sortDir === "asc") p.set("dir", "asc"); }
    const qs = p.toString();
    window.history.replaceState(null, "", qs ? `?${qs}` : window.location.pathname);
  }, [q, industriesSel, levelsSel, tiersSel, stagesSel, withDealOnly, sortKey, sortDir]);

  const levels = useMemo(() => {
    const m = new Map<string, ReturnType<typeof companyLevel>>();
    for (const c of companies) m.set(c.id, companyLevel(c.contacts));
    return m;
  }, [companies]);

  // option lists with counts (counts over the UNFILTERED set so the split is visible)
  const industryOptions = useMemo(() => {
    const m: Record<string, number> = {};
    for (const c of companies) if (c.industry) m[c.industry] = (m[c.industry] ?? 0) + 1;
    return Object.entries(m).sort((a, b) => b[1] - a[1]).map(([value, count]) => ({ value, label: value, count }));
  }, [companies]);
  const levelOptions = useMemo(() => {
    const m: Record<string, number> = {};
    for (const c of companies) { const lv = levels.get(c.id)!.level; m[lv] = (m[lv] ?? 0) + 1; }
    return LEVELS.map((lv) => ({ value: lv, label: `${LEVEL_META[lv].dot} ${lv}`, count: m[lv] ?? 0 }));
  }, [companies, levels]);
  const tierOptions = useMemo(() => {
    const m: Record<string, number> = {};
    for (const c of companies) { const t = c.size?.tier ?? "unsized"; m[t] = (m[t] ?? 0) + 1; }
    return TIERS.map((t) => ({ value: t, label: TIER_LABELS[t], count: m[t] ?? 0 }));
  }, [companies]);
  const stageOptions = useMemo(() => {
    const m: Record<string, number> = {};
    for (const c of companies) { const s = c.deals?.[0]?.stage; if (s) m[s] = (m[s] ?? 0) + 1; }
    return Object.entries(m).sort().map(([value, count]) => ({ value, label: value, count }));
  }, [companies]);

  // sort value: actual figure wins; else the estimate midpoint; null sorts last
  const sortVal = (c: CompanyRow, k: "revenue" | "ebitda"): number | null => {
    const actual = k === "revenue" ? c.revenue : c.ebitda;
    if (actual !== null && actual !== undefined) return Number(actual);
    const est = k === "revenue" ? c.size?.revenue : c.size?.ebitda;
    return est ? (est[0] + est[1]) / 2 : null;
  };

  const rows = useMemo(() => {
    const filtered = companies.filter((c) => {
      if (q && !`${c.name} ${c.industry ?? ""} ${c.city ?? ""} ${c.state ?? ""}`.toLowerCase().includes(q.toLowerCase()))
        return false;
      if (industriesSel.size && !industriesSel.has(c.industry ?? "")) return false;
      if (levelsSel.size && !levelsSel.has(levels.get(c.id)!.level)) return false;
      if (tiersSel.size && !tiersSel.has(c.size?.tier ?? "unsized")) return false;
      if (stagesSel.size && !stagesSel.has(c.deals?.[0]?.stage ?? "")) return false;
      if (withDealOnly && !c.deals?.[0]) return false;
      return true;
    });
    if (!sortKey) return filtered;
    return [...filtered].sort((a, b) => {
      const av = sortVal(a, sortKey), bv = sortVal(b, sortKey);
      if (av === null && bv === null) return 0;
      if (av === null) return 1; // nulls last regardless of direction
      if (bv === null) return -1;
      return sortDir === "asc" ? av - bv : bv - av;
    });
  }, [companies, q, industriesSel, levelsSel, tiersSel, stagesSel, withDealOnly, levels, sortKey, sortDir]);

  function toggleSort(k: "revenue" | "ebitda") {
    if (sortKey !== k) { setSortKey(k); setSortDir("desc"); }
    else if (sortDir === "desc") setSortDir("asc");
    else setSortKey(null); // third click clears
  }
  const sortArrow = (k: "revenue" | "ebitda") => (sortKey === k ? (sortDir === "desc" ? " ▼" : " ▲") : "");

  const inputCls = "rounded-md border border-zinc-300 px-3 py-1.5 text-sm outline-none focus:border-emerald-600";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-zinc-200 bg-white p-4">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search companies…"
          className={`w-56 ${inputCls}`}
        />
        <FilterDropdown label="Industry" options={industryOptions} selected={industriesSel} onChange={setIndustriesSel} />
        <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-700">
          <input
            type="checkbox"
            checked={withDealOnly}
            onChange={(e) => setWithDealOnly(e.target.checked)}
            className="accent-emerald-700"
          />
          Has deal
        </label>
        <span className="ml-auto flex items-center gap-3">
          <span className="text-sm text-zinc-500 tabular-nums">
            {rows.length} of {companies.length}
          </span>
          <PinButton defaultLabel={[[...levelsSel].join("/"), [...industriesSel].join("/"), "companies"].filter(Boolean).join(" ")} />
          <button
            onClick={() =>
              downloadCsv(
                `pronghorn-companies-${csvDate()}.csv`,
                buildCsv(
                  ["name", "industry", "city", "state", "revenue", "ebitda", "ebitda_type", "stage", "origin", "added"],
                  rows.map((c) => [
                    c.name,
                    c.industry,
                    c.city,
                    c.state,
                    c.revenue === null ? null : Number(c.revenue),
                    c.ebitda === null ? null : Number(c.ebitda),
                    c.ebitda_type,
                    c.deals?.[0]?.stage ?? null,
                    c.origin,
                    c.created_at.slice(0, 10),
                  ])
                )
              )
            }
            disabled={rows.length === 0}
            className="rounded-lg bg-emerald-700 px-4 py-1.5 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"
          >
            Export CSV ({rows.length})
          </button>
        </span>
      </div>

      <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-200 text-left text-xs uppercase tracking-wide text-zinc-500">
              <th className="px-4 py-3">Company</th>
              {/* column-header dropdown filters (John 7/15) */}
              <th className="px-4 py-3">
                <FilterDropdown header label="Owner reach" options={levelOptions} selected={levelsSel} onChange={setLevelsSel} />
              </th>
              <th className="px-4 py-3">
                <FilterDropdown header label="Size" options={tierOptions} selected={tiersSel} onChange={setTiersSel} />
              </th>
              <th className="px-4 py-3">Industry</th>
              <th className="px-4 py-3">Location</th>
              {/* sortable est columns: click toggles desc → asc → off */}
              <th className="px-4 py-3 text-right">
                <button onClick={() => toggleSort("revenue")} className={`uppercase tracking-wide ${sortKey === "revenue" ? "font-bold text-emerald-800" : "hover:text-zinc-700"}`} title="Sort by revenue (actuals win, then estimate midpoint; blanks last)">
                  Revenue{sortArrow("revenue")}
                </button>
              </th>
              <th className="px-4 py-3 text-right">
                <button onClick={() => toggleSort("ebitda")} className={`uppercase tracking-wide ${sortKey === "ebitda" ? "font-bold text-emerald-800" : "hover:text-zinc-700"}`} title="Sort by EBITDA (actuals win, then estimate midpoint; blanks last)">
                  EBITDA{sortArrow("ebitda")}
                </button>
              </th>
              <th className="px-4 py-3">
                <FilterDropdown header label="Deal stage" options={stageOptions} selected={stagesSel} onChange={setStagesSel} />
              </th>
              <th className="px-4 py-3">Origin</th>
              <th className="px-4 py-3">Added</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {rows.map((c) => (
              <tr
                key={c.id}
                onClick={() => router.push(`/companies/${c.id}`)}
                className="cursor-pointer hover:bg-zinc-50"
              >
                <td className="px-4 py-3 font-medium">{c.name}</td>
                <td className="whitespace-nowrap px-4 py-3">
                  {(() => {
                    const lv = levels.get(c.id)!;
                    return (
                      <span className="inline-flex items-center gap-2">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${levelChip[lv.level]}`} title={LEVEL_META[lv.level].label}>
                          {LEVEL_META[lv.level].dot} {lv.level}
                        </span>
                        <span className="inline-flex gap-1" title="owner phone · email · LinkedIn">
                          {lv.channels.map((f, i) => (
                            <span key={i} className={`h-2 w-2 rounded-full ${f ? "bg-emerald-600" : "bg-zinc-200"}`} />
                          ))}
                        </span>
                      </span>
                    );
                  })()}
                </td>
                <td className="whitespace-nowrap px-4 py-3">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-semibold ${tierChip[c.size?.tier ?? "unsized"]}`}
                    title={c.size
                      ? `~${c.size.employees[0]}–${c.size.employees[1]} employees (${c.size.basis}) → ${estRange(c.size.revenue)} revenue → ${estRange(c.size.ebitda)} EBITDA · ${c.size.confidence} confidence`
                      : "no usable size signal yet — enrichment adds them"}
                  >
                    {TIER_LABELS[c.size?.tier ?? "unsized"]}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {c.industry ? (
                    <span className="rounded bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-700">{c.industry}</span>
                  ) : (
                    <span className="text-xs text-zinc-400">—</span>
                  )}
                </td>
                <td className="whitespace-nowrap px-4 py-3">
                  {[c.city, c.state].filter(Boolean).join(", ") || "—"}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums">
                  {c.revenue !== null ? (
                    money(Number(c.revenue))
                  ) : c.size ? (
                    <span className="text-xs text-zinc-500" title={`PPP/signal-derived estimate — ${c.size.basis}`}>{estRange(c.size.revenue)}</span>
                  ) : (
                    money(null)
                  )}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums">
                  {c.ebitda !== null ? (
                    <>
                      <span className="font-semibold text-emerald-800">{money(Number(c.ebitda))}</span>
                      {c.ebitda_type && <span className="ml-1 text-xs text-zinc-500">{c.ebitda_type}</span>}
                    </>
                  ) : c.size ? (
                    <span className="text-xs text-zinc-500" title={`estimated via ${c.size.basis} × industry margin band`}>{estRange(c.size.ebitda)}</span>
                  ) : (
                    money(null)
                  )}
                </td>
                <td className="px-4 py-3">
                  {c.deals?.[0]?.stage ? (
                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-800">
                      {c.deals[0].stage}
                    </span>
                  ) : (
                    <span className="text-xs text-zinc-400">no deal</span>
                  )}
                </td>
                <td className="px-4 py-3 text-xs text-zinc-500">{c.origin ?? "—"}</td>
                <td className="px-4 py-3 text-xs text-zinc-500">{c.created_at.slice(0, 10)}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={10} className="px-4 py-10 text-center text-sm text-zinc-400">
                  No companies match the current filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
