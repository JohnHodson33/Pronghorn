"use client";

// Companies table with John's requested controls: search bar, industry filter
// chips, Industry as its own column, and whole-row click-through to the
// company profile.
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { money } from "@/lib/mock";
import type { CompanyRow } from "@/lib/crm";
import { buildCsv, csvDate, downloadCsv } from "@/lib/csv";
import { companyLevel } from "@/lib/company-level";
import { LEVELS, LEVEL_META, type Completeness } from "@/lib/completeness";

const levelChip: Record<Completeness, string> = {
  full: "bg-emerald-700 text-white",
  contactable: "bg-emerald-100 text-emerald-800",
  identified: "bg-amber-100 text-amber-800",
  basic: "bg-zinc-100 text-zinc-600",
  raw: "bg-zinc-50 text-zinc-400",
};

export default function CompaniesTable({ companies }: { companies: CompanyRow[] }) {
  const router = useRouter();
  const industries = useMemo(
    () => [...new Set(companies.map((c) => c.industry).filter(Boolean))].sort() as string[],
    [companies]
  );
  const stages = useMemo(
    () => [...new Set(companies.map((c) => c.deals?.[0]?.stage).filter(Boolean))].sort() as string[],
    [companies]
  );

  const [q, setQ] = useState("");
  const [industry, setIndustry] = useState<string | null>(null);
  const [stage, setStage] = useState("all");
  const [level, setLevel] = useState<Completeness | null>(null);
  const [withDealOnly, setWithDealOnly] = useState(false);

  const levels = useMemo(() => {
    const m = new Map<string, ReturnType<typeof companyLevel>>();
    for (const c of companies) m.set(c.id, companyLevel(c.contacts));
    return m;
  }, [companies]);

  const levelCounts = useMemo(() => {
    const counts: Record<Completeness, number> = { full: 0, contactable: 0, identified: 0, basic: 0, raw: 0 };
    for (const c of companies) counts[levels.get(c.id)!.level]++;
    return counts;
  }, [companies, levels]);

  const rows = useMemo(
    () =>
      companies.filter((c) => {
        if (q && !`${c.name} ${c.industry ?? ""} ${c.city ?? ""} ${c.state ?? ""}`.toLowerCase().includes(q.toLowerCase()))
          return false;
        if (industry && c.industry !== industry) return false;
        if (level && levels.get(c.id)!.level !== level) return false;
        if (stage !== "all" && c.deals?.[0]?.stage !== stage) return false;
        if (withDealOnly && !c.deals?.[0]) return false;
        return true;
      }),
    [companies, q, industry, stage, level, levels, withDealOnly]
  );

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
        <select value={stage} onChange={(e) => setStage(e.target.value)} className={inputCls}>
          <option value="all">All stages</option>
          {stages.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
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

      <div className="flex flex-wrap items-center gap-1.5">
        <span className="mr-1 text-xs font-semibold uppercase tracking-wide text-zinc-400">Owner reach</span>
        {LEVELS.map((lv) => (
          <button
            key={lv}
            onClick={() => setLevel(level === lv ? null : lv)}
            className={`rounded-full px-2.5 py-1 text-xs font-semibold transition ${
              level === lv ? "ring-2 ring-emerald-600 " : ""
            }${levelChip[lv]}`}
            title={LEVEL_META[lv].label}
          >
            {LEVEL_META[lv].dot} {levelCounts[lv]} {lv}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <span className="mr-1 text-xs font-semibold uppercase tracking-wide text-zinc-400">Industry</span>
        <button
          onClick={() => setIndustry(null)}
          className={`rounded-full px-3 py-1 text-xs font-medium transition ${
            industry === null ? "bg-emerald-700 text-white" : "bg-white text-zinc-600 border border-zinc-200 hover:bg-zinc-50"
          }`}
        >
          All
        </button>
        {industries.map((i) => (
          <button
            key={i}
            onClick={() => setIndustry(industry === i ? null : i)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition ${
              industry === i ? "bg-emerald-700 text-white" : "bg-white text-zinc-600 border border-zinc-200 hover:bg-zinc-50"
            }`}
          >
            {i}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-200 text-left text-xs uppercase tracking-wide text-zinc-500">
              <th className="px-4 py-3">Company</th>
              <th className="px-4 py-3">Owner reach</th>
              <th className="px-4 py-3">Industry</th>
              <th className="px-4 py-3">Location</th>
              <th className="px-4 py-3 text-right">Revenue</th>
              <th className="px-4 py-3 text-right">EBITDA</th>
              <th className="px-4 py-3">Deal stage</th>
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
                <td className="px-4 py-3 text-right tabular-nums">
                  {money(c.revenue === null ? null : Number(c.revenue))}
                </td>
                <td className="px-4 py-3 text-right tabular-nums">
                  <span className="font-semibold text-emerald-800">
                    {money(c.ebitda === null ? null : Number(c.ebitda))}
                  </span>
                  {c.ebitda_type && <span className="ml-1 text-xs text-zinc-500">{c.ebitda_type}</span>}
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
                <td colSpan={9} className="px-4 py-10 text-center text-sm text-zinc-400">
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
