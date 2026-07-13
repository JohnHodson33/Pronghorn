// Dashboard V3 — the visual command center (DASHBOARD-VISION.md §1):
// Key Actions (the human-attention queue) on top, the total pipeline funnel
// across both prongs, and the per-subsector broker vs proprietary readiness
// matrix that informs the "commit to one vertical" decision.
import Link from "next/link";
import PinnedViews from "@/components/PinnedViews";
import TagNoteCard from "@/components/TagNoteCard";
import { fetchDashboardV3 } from "@/lib/dashboard-v3";

export const dynamic = "force-dynamic";

const actionIcon: Record<string, string> = {
  promote: "🚀",
  send_inquiry: "✉️",
  queued_email: "📮",
  nda: "✍️",
  stale: "⏳",
  deadline: "📅",
};

// Chart palette — validated (dataviz six checks, light surface):
const C_BROKER = "#047857"; // emerald-700
const C_PROP = "#3b82f6"; // blue-500

export default async function Dashboard() {
  const data = await fetchDashboardV3();
  if (!data) return <div className="p-8 text-sm text-zinc-400">Database not connected.</div>;

  const maxFunnel = Math.max(...data.funnel.map((f) => f.count), 1);
  const maxSub = Math.max(
    ...data.subsectors.map((s) => Math.max(s.brokerListings, s.propTargets)),
    1
  );

  return (
    <div className="p-4 md:p-8 space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Command Center</h1>
          <p className="text-sm text-zinc-500">
            {data.totals.listings.toLocaleString()} listings scraped · {data.totals.tier12} thesis-fit ·{" "}
            {data.totals.leads} proprietary targets · {data.totals.deals} active deals
          </p>
        </div>
        <div className="flex gap-3 text-sm">
          <Link href="/listings" className="font-medium text-emerald-700 hover:underline">Broker Listings →</Link>
          <Link href="/list-building" className="font-medium text-emerald-700 hover:underline">Proprietary Deal Flow →</Link>
        </div>
      </header>

      <PinnedViews />

      {/* ---- Key Actions: the human-attention queue ---- */}
      <section className="rounded-xl border-2 border-emerald-700/20 bg-white">
        <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-3">
          <h2 className="font-semibold">Key actions — needs John or Tom</h2>
          <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 tabular-nums">
            {data.actions.length}
          </span>
        </div>
        {data.actions.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-zinc-400">
            Queue is clear — nothing needs a human right now.
          </div>
        ) : (
          <ul className="divide-y divide-zinc-100">
            {data.actions.slice(0, 8).map((a, i) => (
              <li key={i}>
                {a.kind === "note_tag" ? (
                  <TagNoteCard action={a} />
                ) : (
                <Link href={a.href} className="flex items-center gap-3 px-5 py-3 hover:bg-emerald-50/50">
                  <span className="text-lg">{actionIcon[a.kind]}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{a.label}</span>
                    <span className="block truncate text-xs text-zinc-500">{a.detail}</span>
                  </span>
                  {a.urgent && (
                    <span className="shrink-0 rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-semibold text-red-700">
                      action
                    </span>
                  )}
                  <span className="shrink-0 text-zinc-300">→</span>
                </Link>
                )}
              </li>
            ))}
            {data.actions.length > 8 && (
              <li className="px-5 py-2 text-center text-xs text-zinc-400">
                +{data.actions.length - 8} more
              </li>
            )}
          </ul>
        )}
      </section>

      {/* ---- Total pipeline funnel (both prongs) ---- */}
      <section className="rounded-xl border border-zinc-200 bg-white p-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="font-semibold">Total pipeline</h2>
            <p className="text-xs text-zinc-500">
              Prospecting (anonymized listings in pursuit) flows into the deal stages.
            </p>
          </div>
          <Link href="/pipeline" className="text-sm font-medium text-emerald-700 hover:underline">
            Open board →
          </Link>
        </div>
        <div className="flex items-end gap-1.5 overflow-x-auto pb-1">
          {data.funnel.map((f) => (
            <div key={f.label} className="flex min-w-20 flex-1 flex-col items-center gap-1">
              <div className="text-sm font-bold tabular-nums">{f.count}</div>
              <div className="flex h-32 w-full items-end justify-center">
                <div
                  className={`w-3/4 rounded-t ${f.kind === "prospecting" ? "opacity-70" : ""}`}
                  style={{
                    background: f.kind === "prospecting" ? "#f59e0b" : C_BROKER,
                    height: `${Math.max((f.count / maxFunnel) * 100, f.count > 0 ? 6 : 2)}%`,
                  }}
                />
              </div>
              <div className="w-full border-t border-zinc-200 pt-1 text-center text-[11px] leading-tight text-zinc-600">
                {f.label}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-3 flex items-center gap-4 text-xs text-zinc-600">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-amber-500 opacity-70" /> Prospecting (pre-NDA)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ background: C_BROKER }} /> CRM deals
          </span>
        </div>
      </section>

      {/* ---- Subsector matrix: broker vs proprietary readiness ---- */}
      <section className="rounded-xl border border-zinc-200 bg-white p-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="font-semibold">Deal flow by subsector</h2>
            <p className="text-xs text-zinc-500">
              Broker pipeline vs proprietary targets — the picture behind the &quot;commit to one vertical&quot; call.
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs text-zinc-600">
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm" style={{ background: C_BROKER }} /> Broker (thesis-fit live)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm" style={{ background: C_PROP }} /> Proprietary targets
            </span>
          </div>
        </div>
        <div className="space-y-4">
          {data.subsectors.map((s) => (
            <div key={s.key}>
              <div className="mb-1 flex items-baseline justify-between">
                <span className="text-sm font-semibold">{s.key}</span>
                <span className="text-xs text-zinc-500 tabular-nums">
                  {s.brokerDeals > 0 && (
                    <span className="mr-3 font-semibold text-emerald-800">{s.brokerDeals} in CRM</span>
                  )}
                  {s.propReady > 0 && (
                    <span className="font-semibold text-blue-700">{s.propReady} outreach-ready</span>
                  )}
                </span>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="h-4 flex-1 rounded-sm bg-zinc-50">
                    <div
                      className="h-4 rounded-r-sm"
                      style={{ background: C_BROKER, width: `${(s.brokerListings / maxSub) * 100}%` }}
                      title={`${s.brokerListings} live thesis-fit broker listings`}
                    />
                  </div>
                  <span className="w-10 shrink-0 text-right text-xs tabular-nums text-zinc-600">{s.brokerListings}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-4 flex-1 rounded-sm bg-zinc-50">
                    <div
                      className="relative h-4 rounded-r-sm"
                      style={{ background: C_PROP, width: `${(s.propTargets / maxSub) * 100}%` }}
                      title={`${s.propTargets} proprietary targets (${s.propReady} outreach-ready)`}
                    >
                      {s.propTargets > 0 && (
                        <div
                          className="absolute inset-y-0 left-0 rounded-r-sm bg-blue-800"
                          style={{ width: `${(s.propReady / Math.max(s.propTargets, 1)) * 100}%` }}
                        />
                      )}
                    </div>
                  </div>
                  <span className="w-10 shrink-0 text-right text-xs tabular-nums text-zinc-600">{s.propTargets}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-3 text-[11px] text-zinc-400">
          Darker blue segment = targets fully enriched (owner name + email/phone). Interim aggregates —
          swaps to Lane C&apos;s SQL views when they land.
        </p>
      </section>
    </div>
  );
}
