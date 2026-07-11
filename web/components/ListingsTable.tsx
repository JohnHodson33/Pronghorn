"use client";

import { useMemo, useState } from "react";
import { margin, money, multiple } from "@/lib/mock";
import type { UiListing } from "@/lib/types";

const tierBadge: Record<number, string> = {
  1: "bg-emerald-100 text-emerald-800",
  2: "bg-amber-100 text-amber-800",
  3: "bg-zinc-100 text-zinc-600",
  4: "bg-red-100 text-red-700",
};

const statusStyle: Record<UiListing["status"], string> = {
  new: "bg-blue-50 text-blue-700",
  reviewed: "bg-zinc-100 text-zinc-600",
  pursuing: "bg-emerald-100 text-emerald-800",
  passed: "bg-zinc-100 text-zinc-400 line-through",
};

// Numeric accessors for sorting (nulls sort last regardless of direction).
const marginNum = (l: UiListing) =>
  l.cashFlow !== null && l.revenue ? l.cashFlow / l.revenue : null;
const multipleNum = (l: UiListing) =>
  l.asking !== null && l.cashFlow ? l.asking / l.cashFlow : null;

type SortKey =
  | "tier" | "revenue" | "cashFlow" | "margin" | "asking" | "multiple" | "firstSeen" | "state";

const accessors: Record<SortKey, (l: UiListing) => number | string | null> = {
  tier: (l) => l.tier,
  revenue: (l) => l.revenue,
  cashFlow: (l) => l.cashFlow,
  margin: marginNum,
  asking: (l) => l.asking,
  multiple: multipleNum,
  firstSeen: (l) => l.firstSeen,
  state: (l) => l.state,
};

export default function ListingsTable({ rows: allRows, live }: { rows: UiListing[]; live: boolean }) {
  const industries = [...new Set(allRows.map((l) => l.industry))].sort();
  const states = [...new Set(allRows.map((l) => l.state).filter(Boolean))].sort() as string[];
  const sources = [...new Set(allRows.map((l) => l.source))].sort();
  const [promoted, setPromoted] = useState<Set<string>>(new Set());

  async function promote(l: UiListing) {
    const name = window.prompt(
      `Promote to CRM: create a company + deal from this listing.\n\nFirm rule: the CRM only takes REAL company names (from the CIM, NDA, or broker call) — no anonymized records.\n\nReal company name for:\n"${l.name}"`
    );
    if (!name || name.trim().length < 2) return;
    const res = await fetch("/api/promote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ listingId: l.id, companyName: name.trim() }),
    });
    if (res.ok) setPromoted((prev) => new Set(prev).add(l.id));
    else window.alert(`Promote failed: ${(await res.json()).error}`);
  }

  const [q, setQ] = useState("");
  const [industry, setIndustry] = useState("all");
  const [state, setState] = useState("all");
  const [source, setSource] = useState("all");
  const [tiers, setTiers] = useState<number[]>([1, 2, 3, 4]);
  const [minCF, setMinCF] = useState("");
  const [maxCF, setMaxCF] = useState("");
  const [maxMult, setMaxMult] = useState("");
  const [priorityOnly, setPriorityOnly] = useState(false);
  const [relevantOnly, setRelevantOnly] = useState(live);

  // Default sort: best deals first (tier asc, then newest).
  const [sortKey, setSortKey] = useState<SortKey>("tier");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  function clickSort(key: SortKey) {
    if (key === sortKey) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      // sensible default direction per column: money/margin/multiple high→low first
      setSortDir(["tier", "firstSeen", "state"].includes(key) ? "asc" : "desc");
    }
  }

  const rows = useMemo(() => {
    const filtered = allRows.filter((l) => {
      if (relevantOnly && !l.relevant) return false;
      if (q && !`${l.name} ${l.industry} ${l.city} ${l.state}`.toLowerCase().includes(q.toLowerCase())) return false;
      if (industry !== "all" && l.industry !== industry) return false;
      if (state !== "all" && l.state !== state) return false;
      if (source !== "all" && l.source !== source) return false;
      if (l.tier !== null && !tiers.includes(l.tier)) return false;
      if (minCF && (l.cashFlow === null || l.cashFlow < Number(minCF))) return false;
      if (maxCF && (l.cashFlow === null || l.cashFlow > Number(maxCF))) return false;
      if (maxMult) {
        const m = multipleNum(l);
        if (m === null || m > Number(maxMult)) return false;
      }
      if (priorityOnly && !l.priorityState) return false;
      return true;
    });

    const acc = accessors[sortKey];
    const dir = sortDir === "asc" ? 1 : -1;
    return filtered.sort((a, b) => {
      const va = acc(a);
      const vb = acc(b);
      // nulls always last, regardless of sort direction
      if (va === null && vb === null) return 0;
      if (va === null) return 1;
      if (vb === null) return -1;
      if (typeof va === "string" || typeof vb === "string") {
        return String(va).localeCompare(String(vb)) * dir;
      }
      return (va - vb) * dir;
    });
  }, [allRows, q, industry, state, source, tiers, minCF, maxCF, maxMult, priorityOnly, relevantOnly, sortKey, sortDir]);

  const toggleTier = (t: number) =>
    setTiers((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t].sort()));

  const arrow = (key: SortKey) => (sortKey === key ? (sortDir === "asc" ? " ▲" : " ▼") : "");
  const SortTh = ({ k, children, align = "left" }: { k: SortKey; children: React.ReactNode; align?: "left" | "right" }) => (
    <th
      onClick={() => clickSort(k)}
      className={`cursor-pointer select-none px-4 py-3 hover:text-zinc-900 ${align === "right" ? "text-right" : "text-left"} ${sortKey === k ? "text-emerald-700" : ""}`}
      title="Click to sort"
    >
      {children}
      <span className="text-emerald-600">{arrow(k)}</span>
    </th>
  );

  const inputCls = "rounded-md border border-zinc-300 px-3 py-1.5 text-sm outline-none focus:border-emerald-600";

  return (
    <div className="p-8 space-y-5">
      <header className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Broker Listings</h1>
          <p className="text-sm text-zinc-500">
            Filter with the controls, or click any column header to sort. This is the configurable search engine.
          </p>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${
            live ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
          }`}
        >
          {live ? "● LIVE DATA" : "sample data"}
        </span>
      </header>

      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-zinc-200 bg-white p-4">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…" className={`w-48 ${inputCls}`} />
        <select value={industry} onChange={(e) => setIndustry(e.target.value)} className={inputCls}>
          <option value="all">All industries</option>
          {industries.map((i) => <option key={i}>{i}</option>)}
        </select>
        <select value={state} onChange={(e) => setState(e.target.value)} className={inputCls}>
          <option value="all">All states</option>
          {states.map((s) => <option key={s}>{s}</option>)}
        </select>
        <select value={source} onChange={(e) => setSource(e.target.value)} className={inputCls}>
          <option value="all">All sources</option>
          {sources.map((s) => <option key={s}>{s}</option>)}
        </select>
        <input value={minCF} onChange={(e) => setMinCF(e.target.value.replace(/\D/g, ""))} placeholder="Min cash flow $" className={`w-32 ${inputCls}`} />
        <input value={maxCF} onChange={(e) => setMaxCF(e.target.value.replace(/\D/g, ""))} placeholder="Max cash flow $" className={`w-32 ${inputCls}`} />
        <input value={maxMult} onChange={(e) => setMaxMult(e.target.value.replace(/[^0-9.]/g, ""))} placeholder="Max multiple ×" className={`w-28 ${inputCls}`} />
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4].map((t) => (
            <button key={t} onClick={() => toggleTier(t)}
              className={`rounded-md px-2.5 py-1 text-xs font-semibold transition ${tiers.includes(t) ? tierBadge[t] : "bg-zinc-50 text-zinc-300"}`}>
              T{t}
            </button>
          ))}
        </div>
        <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-700">
          <input type="checkbox" checked={priorityOnly} onChange={(e) => setPriorityOnly(e.target.checked)} className="accent-emerald-700" />
          Priority states
        </label>
        <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-700">
          <input type="checkbox" checked={relevantOnly} onChange={(e) => setRelevantOnly(e.target.checked)} className="accent-emerald-700" />
          Thesis-fit only
        </label>
        <span className="ml-auto text-sm text-zinc-500 tabular-nums">{rows.length} of {allRows.length}</span>
      </div>

      <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-200 text-xs uppercase tracking-wide text-zinc-500">
              <th className="px-4 py-3 text-left">Status</th>
              <SortTh k="tier">Tier</SortTh>
              <th className="px-4 py-3 text-left">Listing</th>
              <SortTh k="state">Location</SortTh>
              <SortTh k="revenue" align="right">Revenue</SortTh>
              <SortTh k="cashFlow" align="right">EBITDA / SDE</SortTh>
              <SortTh k="margin" align="right">Margin</SortTh>
              <SortTh k="asking" align="right">Asking</SortTh>
              <SortTh k="multiple" align="right">Multiple</SortTh>
              <SortTh k="firstSeen">First seen</SortTh>
              {live && <th className="px-4 py-3" />}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {rows.map((l) => (
              <tr key={l.id} className="hover:bg-zinc-50" title={l.tierReasoning}>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusStyle[l.status]}`}>{l.status}</span>
                </td>
                <td className="px-4 py-3">
                  {l.tier !== null ? (
                    <span className={`rounded px-2 py-0.5 text-xs font-semibold ${tierBadge[l.tier]}`}>{l.tier}</span>
                  ) : (
                    <span className="rounded bg-zinc-50 px-2 py-0.5 text-xs text-zinc-400">—</span>
                  )}
                </td>
                <td className="max-w-md px-4 py-3">
                  {l.url ? (
                    <a href={l.url} target="_blank" rel="noopener noreferrer" className="block truncate font-medium hover:text-emerald-700 hover:underline">
                      {l.name} ↗
                    </a>
                  ) : (
                    <div className="truncate font-medium">{l.name}</div>
                  )}
                  <div className="text-xs text-zinc-500">{l.industry} · {l.source}</div>
                </td>
                <td className="whitespace-nowrap px-4 py-3">
                  {l.city ? `${l.city}, ` : ""}{l.state ?? "—"}
                  {l.priorityState && <span className="ml-1 text-emerald-700">★</span>}
                </td>
                <td className="px-4 py-3 text-right tabular-nums">{money(l.revenue)}</td>
                <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums">
                  <span className="font-semibold">{money(l.cashFlow)}</span>
                  {l.cashFlowType !== "unknown" && <span className="ml-1 text-xs text-zinc-500">{l.cashFlowType}</span>}
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-zinc-600">{margin(l.cashFlow, l.revenue)}</td>
                <td className="px-4 py-3 text-right tabular-nums">{money(l.asking)}</td>
                <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums">
                  <span className="font-semibold">{multiple(l.asking, l.cashFlow)}</span>
                  {l.cashFlowType !== "unknown" && l.asking !== null && l.cashFlow !== null && (
                    <span className="ml-1 text-xs text-zinc-500">{l.cashFlowType}</span>
                  )}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-xs text-zinc-500">{l.firstSeen}</td>
                {live && (
                  <td className="px-4 py-3">
                    {promoted.has(l.id) ? (
                      <span className="whitespace-nowrap rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800">in CRM ✓</span>
                    ) : (
                      <button onClick={() => promote(l)}
                        className="whitespace-nowrap rounded-md border border-emerald-700 px-2 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-50"
                        title="Create a company + deal in the CRM (requires the real company name)">
                        → CRM
                      </button>
                    )}
                  </td>
                )}
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={live ? 11 : 10} className="px-4 py-10 text-center text-sm text-zinc-400">
                  No listings match the current filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-zinc-400">
        Click a column header to sort (click again to reverse). Hover a row for the Claude screener&apos;s tier reasoning.
      </p>
    </div>
  );
}
