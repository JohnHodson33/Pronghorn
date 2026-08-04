// Dashboard V3 — the visual command center (DASHBOARD-VISION.md §1):
// Key Actions (the human-attention queue) on top, the total pipeline funnel
// across both prongs, and the per-subsector broker vs proprietary readiness
// matrix that informs the "commit to one vertical" decision.
import Link from "next/link";
import PinnedViews from "@/components/PinnedViews";
import TagNoteCard from "@/components/TagNoteCard";
import DealProposalCard from "@/components/DealProposalCard";
import { fetchDashboardV3 } from "@/lib/dashboard-v3";
import { fetchDataHealth, type Metric } from "@/lib/data-health";

export const dynamic = "force-dynamic";

const actionIcon: Record<string, string> = {
  promote: "🚀",
  send_inquiry: "✉️",
  queued_email: "📮",
  nda: "✍️",
  stale: "⏳",
  deadline: "📅",
  api_dead: "🔌",
  serper_low: "🪫",
  serper_runaway: "🚨",
};

// Chart palette — validated (dataviz six checks, light surface):
const C_BROKER = "#047857"; // emerald-700
const C_PROP = "#3b82f6"; // blue-500

// one funnel-stage row on the data-health card: label, count, target-marked
// bar, pct + weekly delta
function HealthRow({ m, delta }: { m: Metric; delta: number | undefined }) {
  const onTarget = m.pct >= m.target;
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2 text-sm">
        <span className="min-w-0 truncate text-zinc-700">{m.label}</span>
        <span className="flex shrink-0 items-baseline gap-1.5 tabular-nums">
          <span className={`font-bold ${onTarget ? "text-emerald-700" : "text-zinc-900"}`}>{m.pct}%</span>
          <span className="text-xs text-zinc-400">/{m.target}%</span>
          {delta !== undefined && delta !== 0 && (
            <span className={`rounded-full px-1.5 text-[11px] font-semibold ${delta > 0 ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-700"}`}>
              {delta > 0 ? "+" : ""}{delta}
            </span>
          )}
        </span>
      </div>
      <div className="relative mt-1 h-2 overflow-hidden rounded bg-zinc-100">
        <div
          className={`h-2 rounded ${onTarget ? "bg-emerald-600" : "bg-amber-500"}`}
          style={{ width: `${Math.min(m.pct, 100)}%` }}
        />
        {/* target tick */}
        <div className="absolute top-0 h-2 w-0.5 bg-zinc-500/70" style={{ left: `${m.target}%` }} title={`target ${m.target}%`} />
      </div>
      <div className="mt-0.5 text-[11px] tabular-nums text-zinc-400">{m.count} of {m.n}</div>
    </div>
  );
}

export default async function Dashboard() {
  const data = await fetchDashboardV3();
  if (!data) return <div className="p-8 text-sm text-zinc-400">Database not connected.</div>;
  const health = await fetchDataHealth();

  // proposals first (stable within each half), so an Outlook-detected next
  // step can't hide behind the 8-row display cut
  const orderedActions = [
    ...data.actions.filter((a) => a.kind === "deal_proposal"),
    ...data.actions.filter((a) => a.kind !== "deal_proposal"),
  ];
  const proposalCount = data.actions.filter((a) => a.kind === "deal_proposal").length;

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
      {/* deal proposals float to the top: they're time-boxed human decisions
          and were sliding past the 8-row cut when the queue was busy (7/31) */}
      <section id="key-actions" className="rounded-xl border-2 border-emerald-700/20 bg-white">
        <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-3">
          <h2 className="font-semibold">Key actions — needs John or Tom</h2>
          <span className="flex items-center gap-1.5">
            {proposalCount > 0 && (
              <span className="rounded-full bg-violet-100 px-2.5 py-0.5 text-xs font-semibold text-violet-800 tabular-nums"
                title="Deal next-step updates detected in Outlook replies — approve or dismiss below">
                📩 {proposalCount} deal update{proposalCount === 1 ? "" : "s"}
              </span>
            )}
            <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 tabular-nums">
              {data.actions.length}
            </span>
          </span>
        </div>
        {data.actions.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-zinc-400">
            Queue is clear — nothing needs a human right now.
          </div>
        ) : (
          <ul className="divide-y divide-zinc-100">
            {orderedActions.slice(0, 8).map((a, i) => (
              <li key={i}>
                {a.kind === "note_tag" ? (
                  <TagNoteCard action={a} />
                ) : a.kind === "deal_proposal" ? (
                  <DealProposalCard action={a} />
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

      {/* ---- Data health: the bulletproof-chain funnel (PROGRAM 7/31) ---- */}
      {health && (
        <section className="rounded-xl border border-zinc-200 bg-white p-5">
          <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
            <div>
              <h2 className="font-semibold">Data health — the core chain</h2>
              <p className="text-xs text-zinc-500">
                PE-status → size → owner → contact, measured live vs the program targets.
                {health.deltaRefAt && <> Deltas vs {health.deltaRefAt}.</>}
              </p>
            </div>
            <span className="text-xs tabular-nums text-zinc-400">
              {health.leadsN} on-target leads · {health.guidesN} river guides
            </span>
          </div>
          <div className="grid gap-x-8 gap-y-3 sm:grid-cols-2">
            <div className="space-y-3">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">Proprietary leads</div>
              {health.metrics.filter((m) => m.key.startsWith("lead_")).map((m) => (
                <HealthRow key={m.key} m={m} delta={health.deltas[m.key]} />
              ))}
            </div>
            <div className="space-y-3">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">River guides</div>
              {health.metrics.filter((m) => m.key.startsWith("rg_")).map((m) => (
                <HealthRow key={m.key} m={m} delta={health.deltas[m.key]} />
              ))}
              {/* LinkedIn-only is a real cohort but NOT sendable — reported
                  beside outreach-ready, never folded into it (PM 8/4) */}
              {health.linkedinOnly > 0 && (
                <p className="text-[11px] text-zinc-400">
                  + {health.linkedinOnly} cleared guide{health.linkedinOnly === 1 ? "" : "s"} whose only channel is LinkedIn —
                  a separate cohort for the VA/enrichment queue, not sendable.
                </p>
              )}
            </div>
          </div>
        </section>
      )}

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
