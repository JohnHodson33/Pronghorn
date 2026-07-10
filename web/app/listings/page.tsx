"use client";

import { useMemo, useState } from "react";
import { listings, margin, money, multiple, type Listing } from "@/lib/mock";

const tierBadge: Record<number, string> = {
  1: "bg-emerald-100 text-emerald-800",
  2: "bg-amber-100 text-amber-800",
  3: "bg-zinc-100 text-zinc-600",
  4: "bg-red-100 text-red-700",
};

const statusStyle: Record<Listing["status"], string> = {
  new: "bg-blue-50 text-blue-700",
  reviewed: "bg-zinc-100 text-zinc-600",
  pursuing: "bg-emerald-100 text-emerald-800",
  passed: "bg-zinc-100 text-zinc-400 line-through",
};

export default function Listings() {
  const industries = [...new Set(listings.map((l) => l.industry))].sort();
  const states = [...new Set(listings.map((l) => l.state))].sort();

  const [q, setQ] = useState("");
  const [industry, setIndustry] = useState("all");
  const [state, setState] = useState("all");
  const [tiers, setTiers] = useState<number[]>([1, 2, 3, 4]);
  const [minCF, setMinCF] = useState("");
  const [priorityOnly, setPriorityOnly] = useState(false);

  const rows = useMemo(
    () =>
      listings.filter((l) => {
        if (q && !`${l.name} ${l.industry} ${l.city} ${l.state}`.toLowerCase().includes(q.toLowerCase())) return false;
        if (industry !== "all" && l.industry !== industry) return false;
        if (state !== "all" && l.state !== state) return false;
        if (!tiers.includes(l.tier)) return false;
        if (minCF && (l.cashFlow === null || l.cashFlow < Number(minCF))) return false;
        if (priorityOnly && !l.priorityState) return false;
        return true;
      }),
    [q, industry, state, tiers, minCF, priorityOnly]
  );

  const toggleTier = (t: number) =>
    setTiers((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t].sort()));

  return (
    <div className="p-8 space-y-5">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Broker Listings</h1>
        <p className="text-sm text-zinc-500">
          Every guardrail below is a live toggle — this is the configurable search engine, not a fixed filter.
        </p>
      </header>

      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-zinc-200 bg-white p-4">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search listings…"
          className="w-56 rounded-md border border-zinc-300 px-3 py-1.5 text-sm outline-none focus:border-emerald-600"
        />
        <select
          value={industry}
          onChange={(e) => setIndustry(e.target.value)}
          className="rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm"
        >
          <option value="all">All industries</option>
          {industries.map((i) => (
            <option key={i}>{i}</option>
          ))}
        </select>
        <select
          value={state}
          onChange={(e) => setState(e.target.value)}
          className="rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm"
        >
          <option value="all">All states</option>
          {states.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        <input
          value={minCF}
          onChange={(e) => setMinCF(e.target.value.replace(/\D/g, ""))}
          placeholder="Min cash flow ($)"
          className="w-36 rounded-md border border-zinc-300 px-3 py-1.5 text-sm outline-none focus:border-emerald-600"
        />
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4].map((t) => (
            <button
              key={t}
              onClick={() => toggleTier(t)}
              className={`rounded-md px-2.5 py-1 text-xs font-semibold transition ${
                tiers.includes(t) ? tierBadge[t] : "bg-zinc-50 text-zinc-300"
              }`}
            >
              T{t}
            </button>
          ))}
        </div>
        <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-700">
          <input
            type="checkbox"
            checked={priorityOnly}
            onChange={(e) => setPriorityOnly(e.target.checked)}
            className="accent-emerald-700"
          />
          Priority states only
        </label>
        <span className="ml-auto text-sm text-zinc-500 tabular-nums">
          {rows.length} of {listings.length}
        </span>
      </div>

      <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-200 text-left text-xs uppercase tracking-wide text-zinc-500">
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Tier</th>
              <th className="px-4 py-3">Listing</th>
              <th className="px-4 py-3">Location</th>
              <th className="px-4 py-3 text-right">Revenue</th>
              <th className="px-4 py-3 text-right">EBITDA / SDE</th>
              <th className="px-4 py-3 text-right">Margin</th>
              <th className="px-4 py-3 text-right">Asking</th>
              <th className="px-4 py-3 text-right">Multiple</th>
              <th className="px-4 py-3">First seen</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {rows.map((l) => (
              <tr key={l.id} className="hover:bg-zinc-50" title={l.tierReasoning}>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusStyle[l.status]}`}>
                    {l.status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`rounded px-2 py-0.5 text-xs font-semibold ${tierBadge[l.tier]}`}>
                    {l.tier}
                  </span>
                </td>
                <td className="max-w-md px-4 py-3">
                  <div className="truncate font-medium">{l.name}</div>
                  <div className="text-xs text-zinc-500">
                    {l.industry} · {l.source}
                  </div>
                </td>
                <td className="whitespace-nowrap px-4 py-3">
                  {l.city ? `${l.city}, ` : ""}
                  {l.state}
                  {l.priorityState && <span className="ml-1 text-emerald-700">★</span>}
                </td>
                <td className="px-4 py-3 text-right tabular-nums">{money(l.revenue)}</td>
                <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums">
                  <span className="font-semibold">{money(l.cashFlow)}</span>
                  {l.cashFlowType !== "unknown" && (
                    <span className="ml-1 text-xs text-zinc-500">{l.cashFlowType}</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-zinc-600">
                  {margin(l.cashFlow, l.revenue)}
                </td>
                <td className="px-4 py-3 text-right tabular-nums">{money(l.asking)}</td>
                <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums">
                  <span className="font-semibold">{multiple(l.asking, l.cashFlow)}</span>
                  {l.cashFlowType !== "unknown" && l.asking !== null && l.cashFlow !== null && (
                    <span className="ml-1 text-xs text-zinc-500">{l.cashFlowType}</span>
                  )}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-xs text-zinc-500">{l.firstSeen}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={10} className="px-4 py-10 text-center text-sm text-zinc-400">
                  No listings match the current filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-zinc-400">
        Hover a row to see the Claude screener&apos;s tier reasoning. Row click-through to a detail view comes next.
      </p>
    </div>
  );
}
