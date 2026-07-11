// Dashboard v2 — all live data: real Tier-1 feed, source health, market-
// multiples snapshot, upcoming deadlines, and the pipeline chart driven by
// live deals (replaces the mock-data dashboard). PM promotes this to `/`.
import Link from "next/link";
import { fetchDashboard } from "@/lib/dashboard";
import { money, STAGES } from "@/lib/mock";

// Chart palette — validated (dataviz six checks, light surface):
const C_EBITDA = "#047857";
const C_REVENUE = "#3b82f6";

export const dynamic = "force-dynamic";

const mult = (asking: number | null, cf: number | null) =>
  asking !== null && cf !== null && cf > 0 ? `${(asking / cf).toFixed(1)}×` : null;

export default async function Dashboard() {
  const data = await fetchDashboard();
  if (!data) return <div className="p-8 text-sm text-zinc-400">Database not connected.</div>;

  const today = new Date().toISOString().slice(0, 10);
  const active = data.deals.filter((d) => d.stage !== "Closed");
  const pipeEbitda = active.reduce((s, d) => s + (d.ebitda ?? 0), 0);
  const deadlines = data.deals
    .filter((d) => d.nextStepDue)
    .sort((a, b) => (a.nextStepDue! < b.nextStepDue! ? -1 : 1))
    .slice(0, 5);

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

  const stats = [
    { label: "Active deals", value: String(active.length), sub: "live pipeline" },
    { label: "Pipeline EBITDA", value: money(pipeEbitda), sub: "active stages" },
    { label: "Tier-1 listings", value: String(data.tier1Count), sub: "screened, live" },
    {
      label: "Next deadline",
      value: deadlines[0]?.nextStepDue?.slice(5).replace("-", "/") ?? "—",
      sub: deadlines[0] ? `${deadlines[0].nextStep ?? "next step"} — ${deadlines[0].company}` : "nothing scheduled",
    },
  ];

  return (
    <div className="p-4 md:p-8 space-y-6">
      <header className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Sourcing Dashboard</h1>
          <p className="text-sm text-zinc-500">
            Live: {data.totalListings.toLocaleString()} listings in database · {data.tier1Count} Tier 1
          </p>
        </div>
        <Link href="/listings" className="text-sm font-medium text-emerald-700 hover:underline">
          {data.newThisWeek} new listings this week →
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

      <div className="grid gap-6 xl:grid-cols-2">
        {/* Real Tier-1 feed */}
        <section className="rounded-xl border border-zinc-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Newest Tier-1 listings</h2>
            <Link href="/listings" className="text-sm font-medium text-emerald-700 hover:underline">
              All listings →
            </Link>
          </div>
          <ul className="mt-3 divide-y divide-zinc-100">
            {data.tier1.map((l) => (
              <li key={l.id} className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  {l.url ? (
                    <a href={l.url} target="_blank" rel="noopener noreferrer" className="block truncate text-sm font-medium hover:text-emerald-700 hover:underline">
                      {l.name} ↗
                    </a>
                  ) : (
                    <div className="truncate text-sm font-medium">{l.name}</div>
                  )}
                  <div className="text-xs text-zinc-500">
                    {[l.city, l.state].filter(Boolean).join(", ") || "—"}
                    {l.priorityState && <span className="ml-1 text-emerald-700">★</span>}
                    {" · "}{l.sourceId} · {l.firstSeen}
                  </div>
                </div>
                <div className="shrink-0 text-right text-sm tabular-nums">
                  <div className="font-semibold text-emerald-800">
                    {money(l.cashFlow)}
                    {l.cashFlowType && <span className="ml-1 text-xs font-normal text-zinc-500">{l.cashFlowType}</span>}
                  </div>
                  <div className="text-xs text-zinc-500">
                    ask {money(l.asking)}{mult(l.asking, l.cashFlow) ? ` (${mult(l.asking, l.cashFlow)})` : ""}
                  </div>
                </div>
              </li>
            ))}
            {data.tier1.length === 0 && (
              <li className="py-8 text-center text-sm text-zinc-400">No live Tier-1 listings right now.</li>
            )}
          </ul>
        </section>

        {/* Source health */}
        <section className="rounded-xl border border-zinc-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Source health</h2>
            <Link href="/sources" className="text-sm font-medium text-emerald-700 hover:underline">
              Manage sources →
            </Link>
          </div>
          <table className="mt-3 w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-200 text-left text-xs uppercase tracking-wide text-zinc-500">
                <th className="py-2 font-medium">Source</th>
                <th className="py-2 font-medium">Last run</th>
                <th className="py-2 text-right font-medium">Listings</th>
                <th className="py-2 text-right font-medium">+7d</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {data.sources.map((s) => {
                const ok = s.lastRunStatus === "ok" || s.lastRunStatus === "success";
                return (
                  <tr key={s.id}>
                    <td className="py-2 font-medium">
                      <span
                        className={`mr-2 inline-block h-2 w-2 rounded-full ${
                          !s.lastRunStatus ? "bg-zinc-300" : ok ? "bg-emerald-500" : "bg-red-500"
                        }`}
                        title={s.lastRunStatus ?? "never run"}
                      />
                      {s.name}
                    </td>
                    <td className="py-2 text-xs text-zinc-500">
                      {s.lastRunAt ? s.lastRunAt.slice(0, 16).replace("T", " ") : "—"}
                    </td>
                    <td className="py-2 text-right tabular-nums">{s.total.toLocaleString()}</td>
                    <td className={`py-2 text-right tabular-nums ${s.newThisWeek > 0 ? "font-semibold text-emerald-700" : "text-zinc-400"}`}>
                      {s.newThisWeek > 0 ? `+${s.newThisWeek}` : "0"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        {/* Market multiples snapshot */}
        <section className="rounded-xl border border-zinc-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Market multiples — thesis verticals</h2>
            <Link href="/analytics" className="text-sm font-medium text-emerald-700 hover:underline">
              Full analysis →
            </Link>
          </div>
          <ul className="mt-3 divide-y divide-zinc-100 text-sm">
            {data.multiples.map((m) => (
              <li key={m.industry} className="flex items-center justify-between py-2.5">
                <span className="font-medium">{m.industry}</span>
                <span className="tabular-nums text-zinc-600">
                  <span className="font-bold text-zinc-900">{m.medMultiple === null ? "—" : `${m.medMultiple.toFixed(1)}×`}</span>
                  {" median"}
                  <span className="ml-2 text-xs text-zinc-400">n={m.nMultiple}</span>
                </span>
              </li>
            ))}
            {data.multiples.length === 0 && (
              <li className="py-8 text-center text-sm text-zinc-400">Not enough observations yet.</li>
            )}
          </ul>
        </section>

        {/* Upcoming deadlines */}
        <section className="rounded-xl border border-zinc-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Next steps due</h2>
            <Link href="/pipeline" className="text-sm font-medium text-emerald-700 hover:underline">
              Open pipeline →
            </Link>
          </div>
          <ul className="mt-3 divide-y divide-zinc-100 text-sm">
            {deadlines.map((d) => {
              const overdue = d.nextStepDue! < today;
              return (
                <li key={d.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <div className="truncate font-medium">{d.company}</div>
                    <div className="truncate text-xs text-zinc-500">{d.nextStep ?? "next step"} · {d.stage}</div>
                  </div>
                  <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold tabular-nums ${
                    overdue ? "bg-red-100 text-red-700" : "bg-amber-50 text-amber-800"
                  }`}>
                    {overdue ? "overdue " : ""}{d.nextStepDue!.slice(5).replace("-", "/")}
                  </span>
                </li>
              );
            })}
            {deadlines.length === 0 && (
              <li className="py-8 text-center text-sm text-zinc-400">
                No next-step dates set — add them from a deal page.
              </li>
            )}
          </ul>
        </section>
      </div>

      {/* Pipeline value by stage — now live deals */}
      <section className="rounded-xl border border-zinc-200 bg-white p-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="font-semibold">Pipeline value by stage</h2>
            <p className="text-xs text-zinc-500">Live deals. Hover a stage for detail; deal count below each stage.</p>
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
                <div className="w-5 rounded-t" style={{ background: C_REVENUE, height: `${(r.revenue / maxStageVal) * 100}%` }} />
                <div className="w-5 rounded-t" style={{ background: C_EBITDA, height: `${(r.ebitda / maxStageVal) * 100}%` }} />
              </div>
              <div className="mt-2 w-full border-t border-zinc-200 pt-1.5 text-center">
                <div className="truncate text-xs font-medium text-zinc-700">{r.stage}</div>
                <div className="text-xs text-zinc-400 tabular-nums">{r.count}</div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
