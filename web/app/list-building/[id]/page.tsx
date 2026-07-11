// Lead-list detail — one build run: its parameters, per-source tags, and all
// leads with enrichment status. CSV export doubles as the VA handoff file.
import Link from "next/link";
import { notFound } from "next/navigation";
import LeadsTable from "@/components/LeadsTable";
import { fetchLeadList } from "@/lib/lead-list";
import { hasDb } from "@/lib/db";

export const dynamic = "force-dynamic";

const statusBadge: Record<string, string> = {
  pending: "bg-zinc-100 text-zinc-600",
  running: "bg-amber-100 text-amber-800",
  complete: "bg-emerald-100 text-emerald-800",
  failed: "bg-red-100 text-red-700",
};

export default async function LeadListPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!hasDb()) return <div className="p-8 text-sm text-zinc-400">Database not connected.</div>;

  const list = await fetchLeadList(id);
  if (!list) notFound();

  return (
    <div className="max-w-6xl p-4 md:p-8 space-y-6">
      <header>
        <Link href="/list-building" className="text-sm text-emerald-700 hover:underline">← List Building</Link>
        <div className="mt-2 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {list.industry}
              <span className="font-normal text-zinc-500">
                {" — "}
                {list.geography ?? "National"}
                {list.radiusMiles ? ` (${list.radiusMiles}mi)` : ""}
              </span>
            </h1>
            <p className="text-sm text-zinc-500">
              Built {list.createdAt.slice(0, 16).replace("T", " ")} · target {list.targetCount} leads
            </p>
          </div>
          <span className={`shrink-0 rounded-full px-3 py-1 text-sm font-semibold ${statusBadge[list.status] ?? "bg-zinc-100 text-zinc-600"}`}>
            {list.status === "pending" ? "queued" : list.status}
          </span>
        </div>
      </header>

      <section className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {[
          { label: "Leads found", value: String(list.leads.length || list.leadsFound) },
          { label: "Target", value: String(list.targetCount) },
          { label: "Est. cost", value: list.costEstimate === null ? "—" : `$${list.costEstimate.toFixed(2)}` },
          { label: "Actual cost", value: list.costActual === null ? "—" : `$${list.costActual.toFixed(2)}` },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-zinc-200 bg-white p-4">
            <div className="text-xs font-medium uppercase tracking-wide text-zinc-500">{s.label}</div>
            <div className="mt-1 text-xl font-bold tabular-nums">{s.value}</div>
          </div>
        ))}
      </section>

      {list.sourcesEnabled.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Sources</span>
          {list.sourcesEnabled.map((s) => (
            <span key={s} className="rounded bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600">{s}</span>
          ))}
        </div>
      )}

      {list.leads.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-300 bg-white px-5 py-14 text-center text-sm text-zinc-400">
          {list.status === "pending" || list.status === "running"
            ? "No leads yet — this list is still queued/running."
            : "This run produced no leads."}
        </div>
      ) : (
        <LeadsTable leads={list.leads} heading="Leads in this list" />
      )}
    </div>
  );
}
