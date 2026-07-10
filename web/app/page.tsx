import Link from "next/link";
import { deals, listings, money, STAGES } from "@/lib/mock";

const tierBadge: Record<number, string> = {
  1: "bg-emerald-100 text-emerald-800",
  2: "bg-amber-100 text-amber-800",
  3: "bg-zinc-100 text-zinc-600",
  4: "bg-red-100 text-red-700",
};

export default function Dashboard() {
  const newThisWeek = listings.filter((l) => l.firstSeen >= "2026-07-03").length;
  const tier1New = listings.filter((l) => l.tier === 1 && l.status === "new").length;
  const activeDeals = deals.length;
  const nextDeadline = deals
    .filter((d) => d.nextStepDue)
    .sort((a, b) => (a.nextStepDue! < b.nextStepDue! ? -1 : 1))[0];

  const stats = [
    { label: "New listings (7 days)", value: String(newThisWeek), sub: "across 1 source" },
    { label: "Tier 1 awaiting review", value: String(tier1New), sub: "strong thesis fit" },
    { label: "Active deals", value: String(activeDeals), sub: "in pipeline" },
    {
      label: "Next deadline",
      value: nextDeadline?.nextStepDue?.slice(5).replace("-", "/") ?? "—",
      sub: nextDeadline ? `${nextDeadline.nextStep} — ${nextDeadline.company}` : "",
    },
  ];

  const hot = listings
    .filter((l) => l.tier <= 2 && l.status === "new")
    .sort((a, b) => a.tier - b.tier || (a.firstSeen < b.firstSeen ? 1 : -1))
    .slice(0, 5);

  return (
    <div className="p-8 space-y-8">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Sourcing Dashboard</h1>
        <p className="text-sm text-zinc-500">
          Mock data for UI iteration — Supabase connection comes next.
        </p>
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

      <section className="rounded-xl border border-zinc-200 bg-white">
        <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-4">
          <h2 className="font-semibold">High-fit new listings</h2>
          <Link href="/listings" className="text-sm font-medium text-emerald-700 hover:underline">
            View all listings →
          </Link>
        </div>
        <ul className="divide-y divide-zinc-100">
          {hot.map((l) => (
            <li key={l.id} className="flex items-center gap-4 px-5 py-3">
              <span className={`rounded px-2 py-0.5 text-xs font-semibold ${tierBadge[l.tier]}`}>
                Tier {l.tier}
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium">{l.name}</div>
                <div className="text-xs text-zinc-500">
                  {l.industry} · {l.city}, {l.state}
                  {l.priorityState && <span className="ml-2 text-emerald-700">★ priority state</span>}
                </div>
              </div>
              <div className="text-right text-sm">
                <div className="font-semibold tabular-nums">
                  {money(l.cashFlow)}{" "}
                  <span className="font-normal text-zinc-500">{l.cashFlowType !== "unknown" ? l.cashFlowType : ""}</span>
                </div>
                <div className="text-xs text-zinc-500 tabular-nums">ask {money(l.asking)}</div>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-xl border border-zinc-200 bg-white">
        <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-4">
          <h2 className="font-semibold">Pipeline at a glance</h2>
          <Link href="/pipeline" className="text-sm font-medium text-emerald-700 hover:underline">
            Open pipeline →
          </Link>
        </div>
        <div className="flex divide-x divide-zinc-100 overflow-x-auto">
          {STAGES.map((s) => {
            const n = deals.filter((d) => d.stage === s).length;
            return (
              <div key={s} className="min-w-32 flex-1 px-5 py-4 text-center">
                <div className="text-2xl font-bold tabular-nums">{n}</div>
                <div className="mt-0.5 text-xs text-zinc-500">{s}</div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
