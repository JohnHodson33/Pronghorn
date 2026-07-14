"use client";

// Companies table with John's requested controls: search bar, industry filter
// chips, Industry as its own column, and whole-row click-through to the
// company profile.
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { money } from "@/lib/mock";
import type { CompanyRow } from "@/lib/crm";
import { buildCsv, csvDate, downloadCsv } from "@/lib/csv";
import { companyLevel } from "@/lib/company-level";
import { LEVELS, LEVEL_META, type Completeness } from "@/lib/completeness";
import { PinButton } from "@/components/PinnedViews";
import { TIERS, TIER_LABELS, type SizeTier } from "@/lib/size";

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
  const [tier, setTier] = useState<string | null>(null);

  // Filters ↔ URL params (?q= ?industry= ?level= ?stage= ?deal=1): filtered
  // views are shareable and deep-linkable ("CONTACTABLE owners in Tree Care"
  // is a URL). Read once on mount so SSR markup matches first client render.
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    if (p.get("q")) setQ(p.get("q")!);
    if (p.get("industry")) setIndustry(p.get("industry"));
    if (p.get("stage")) setStage(p.get("stage")!);
    if (p.get("level")) setLevel(p.get("level") as Completeness);
    if (p.get("deal") === "1") setWithDealOnly(true);
    if (p.get("tier")) setTier(p.get("tier"));
  }, []);
  useEffect(() => {
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    if (industry) p.set("industry", industry);
    if (stage !== "all") p.set("stage", stage);
    if (level) p.set("level", level);
    if (withDealOnly) p.set("deal", "1");
    if (tier) p.set("tier", tier);
    const qs = p.toString();
    window.history.replaceState(null, "", qs ? `?${qs}` : window.location.pathname);
  }, [q, industry, stage, level, withDealOnly, tier]);

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
        if (tier && (c.size?.tier ?? "unsized") !== tier) return false;
        return true;
      }),
    [companies, q, industry, stage, level, levels, withDealOnly, tier]
  );

  const tierCounts = useMemo(() => {
    const m: Record<string, number> = { platform: 0, tuckin: 0, toosmall: 0, unsized: 0 };
    for (const c of companies) m[c.size?.tier ?? "unsized"]++;
    return m;
  }, [companies]);

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
          <PinButton defaultLabel={[level, industry, "companies"].filter(Boolean).join(" ")} />
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
        <span className="mr-1 text-xs font-semibold uppercase tracking-wide text-zinc-400">Size</span>
        {TIERS.map((t) => (
          <button
            key={t}
            onClick={() => setTier(tier === t ? null : t)}
            className={`rounded-full px-2.5 py-1 text-xs font-semibold transition ${
              tier === t ? "ring-2 ring-emerald-600 " : ""
            }${tierChip[t]}`}
            title={t === "unsized" ? "no usable size signal yet — enrichment adds them" : `estimated ${TIER_LABELS[t]}`}
          >
            {TIER_LABELS[t]} · {tierCounts[t]}
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
              <th className="px-4 py-3">Size</th>
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
