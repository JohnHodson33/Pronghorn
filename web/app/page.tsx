import Link from "next/link";
import { deals, listings, money, STAGES } from "@/lib/mock";

// Chart palette — validated (dataviz six checks, light surface):
const C_EBITDA = "#047857";
const C_REVENUE = "#3b82f6";

export default function Dashboard() {
  const active = deals.filter((d) => !d.passed);
  const pipeRev = active.reduce((s, d) => s + (d.revenue ?? 0), 0);
  const pipeEbitda = active.reduce((s, d) => s + (d.ebitda ?? 0), 0);
  const newThisWeek = listings.filter((l) => l.firstSeen >= "2026-07-03").length;
  const nextDeadline = active
    .filter((d) => d.nextStepDue)
    .sort((a, b) => (a.nextStepDue! < b.nextStepDue! ? -1 : 1))[0];

  // Pipeline by stage (revenue + EBITDA, same $ axis)
  const byStage = STAGES.map((stage) => {
    const inStage = active.filter((d) => d.stage === stage);
    return {
      stage,
      count: inStage.length,
      revenue: inStage.reduce((s, d) => s + (d.revenue ?? 0), 0),
      ebitda: inStage.reduce((s, d) => s + (d.ebitda ?? 0), 0),
    };
  });
  const maxStageVal = Math.max(...byStage.map((r) => r.revenue), 1);

  // EBITDA by industry
  const industries = [...new Set(active.map((d) => d.industry))];
  const byIndustry = industries
    .map((ind) => ({
      industry: ind,
      ebitda: active.filter((d) => d.industry === ind).reduce((s, d) => s + (d.ebitda ?? 0), 0),
      count: active.filter((d) => d.industry === ind).length,
    }))
    .sort((a, b) => b.ebitda - a.ebitda);
  const maxIndVal = Math.max(...byIndustry.map((r) => r.ebitda), 1);

  const stats = [
    { label: "Active deals", value: String(active.length), sub: "excl. passed" },
    { label: "Pipeline revenue", value: money(pipeRev), sub: "all active stages" },
    { label: "Pipeline EBITDA", value: money(pipeEbitda), sub: "all active stages" },
    {
      label: "Next deadline",
      value: nextDeadline?.nextStepDue?.slice(5).replace("-", "/") ?? "—",
      sub: nextDeadline ? `${nextDeadline.nextStep} — ${nextDeadline.company}` : "",
    },
  ];

  return (
    <div className="p-8 space-y-6">
      <header className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Sourcing Dashboard</h1>
          <p className="text-sm text-zinc-500">Mock data for UI iteration.</p>
        </div>
        <Link href="/listings" className="text-sm font-medium text-emerald-700 hover:underline">
          {newThisWeek} new listings this week →
        </Link>
      </header>

      <section className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl border border-zinc-200 bg-white p-5">
            <div className="text-xs font-medium uppercase tracking-wide text-zinc-500">{s.label}</div>
            <div className="mt-1 text-3xl font-bold tabular-nums">{s.value}</div>
            <div className="mt-1 truncate text-xs text-zinc-500">{s.sub}</div>
          </div>
        ))}
      </section>

      {/* Pipeline value by stage — grouped bars, one $ axis */}
      <section className="rounded-xl border border-zinc-200 bg-white p-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="font-semibold">Pipeline value by stage</h2>
            <p className="text-xs text-zinc-500">Hover a stage for detail. Deal count below each stage.</p>
          </div>
          <div className="flex items-center gap-4 text-xs text-zinc-600">
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm" style={{ background: C_REVENUE }} />
              Revenue
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm" style={{ background: C_EBITDA }} />
              EBITDA
            </span>
          </div>
        </div>
        <div className="flex items-end gap-2 overflow-x-auto">
          {byStage.map((r) => (
            <div key={r.stage} className="group relative flex min-w-24 flex-1 flex-col items-center">
              <div className="pointer-events-none absolute -top-2 z-10 hidden -translate-y-full whitespace-nowrap rounded-md bg-zinc-900 px-2.5 py-1.5 text-xs text-white shadow group-hover:block">
                <div className="font-semibold">{r.stage} · {r.count} deal{r.count === 1 ? "" : "s"}</div>
                <div className="tabular-nums">Revenue {money(r.revenue)} · EBITDA {money(r.ebitda)}</div>
              </div>
              <div className="flex h-40 w-full items-end justify-center gap-0.5 rounded-md px-2 group-hover:bg-zinc-50">
                <div
                  className="w-5 rounded-t"
                  style={{ background: C_REVENUE, height: `${(r.revenue / maxStageVal) * 100}%` }}
                />
                <div
                  className="w-5 rounded-t"
                  style={{ background: C_EBITDA, height: `${(r.ebitda / maxStageVal) * 100}%` }}
                />
              </div>
              <div className="mt-2 w-full border-t border-zinc-200 pt-1.5 text-center">
                <div className="truncate text-xs font-medium text-zinc-700">{r.stage}</div>
                <div className="text-xs text-zinc-400 tabular-nums">{r.count}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        {/* EBITDA by industry — single series, direct-labeled */}
        <section className="rounded-xl border border-zinc-200 bg-white p-5">
          <h2 className="font-semibold">Pipeline EBITDA by industry</h2>
          <p className="mb-4 text-xs text-zinc-500">Active deals only.</p>
          <div className="space-y-2.5">
            {byIndustry.map((r) => (
              <div key={r.industry} className="group flex items-center gap-3">
                <div className="w-32 shrink-0 truncate text-right text-xs text-zinc-600">{r.industry}</div>
                <div className="relative h-5 flex-1 rounded-sm bg-zinc-50">
                  <div
                    className="h-5 rounded-r"
                    style={{ background: C_EBITDA, width: `${(r.ebitda / maxIndVal) * 100}%` }}
                    title={`${r.industry}: ${money(r.ebitda)} EBITDA across ${r.count} deal(s)`}
                  />
                </div>
                <div className="w-14 shrink-0 text-xs font-semibold tabular-nums text-zinc-700">
                  {money(r.ebitda)}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Pipeline funnel summary linking out */}
        <section className="rounded-xl border border-zinc-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Where the funnel stands</h2>
            <Link href="/pipeline" className="text-sm font-medium text-emerald-700 hover:underline">
              Open pipeline →
            </Link>
          </div>
          <ul className="mt-4 divide-y divide-zinc-100 text-sm">
            {byStage
              .filter((r) => r.count > 0)
              .map((r) => (
                <li key={r.stage} className="flex items-center justify-between py-2.5">
                  <span className="font-medium">{r.stage}</span>
                  <span className="text-zinc-500 tabular-nums">
                    {r.count} · {money(r.revenue)} rev ·{" "}
                    <span className="font-semibold text-emerald-800">{money(r.ebitda)}</span>
                  </span>
                </li>
              ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
