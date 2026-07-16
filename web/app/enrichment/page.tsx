// Enrichment — the middle of the off-market funnel: leads arrive from List
// Building, get owner contacts (VA step) and AI signals (Claude: overview,
// PE flag, news, age), then graduate to outreach. Funnel cards filter by
// status server-side; the table adds search + CSV (shared list pattern).
import Link from "next/link";
import LeadsTable from "@/components/LeadsTable";
import { fetchEnrichmentOverview, LEAD_STATUSES } from "@/lib/enrichment";
import { hasDb } from "@/lib/db";

export const dynamic = "force-dynamic";

const statusLabel: Record<string, string> = {
  new: "New",
  enriching: "Enriching",
  enriched: "Enriched",
  in_sequence: "In sequence",
  contacted: "Contacted",
  responded: "Responded",
  dead: "Dead",
};

export default async function Enrichment({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  if (!hasDb()) return <div className="p-8 text-sm text-zinc-400">Database not connected.</div>;

  const data = await fetchEnrichmentOverview(status);
  if (!data) return <div className="p-8 text-sm text-zinc-400">Database not connected.</div>;
  const total = Object.values(data.counts).reduce((a, b) => a + b, 0);

  return (
    <div className="p-4 md:p-8 space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Enrichment</h1>
        <p className="text-sm text-zinc-500">
          Every lead from <Link href="/list-building" className="text-emerald-700 hover:underline">List Building</Link> passes
          through here: owner contacts filled (VA step), then AI signals per company — website overview,
          PE-backing flag, news, business age. Enriched leads feed the Outreach Library.
        </p>
      </header>

      <section className="grid grid-cols-2 gap-3 md:grid-cols-7">
        {LEAD_STATUSES.map((s) => {
          const active = status === s;
          return (
            <Link
              key={s}
              href={active ? "/enrichment" : `/enrichment?status=${s}`}
              className={`rounded-xl border p-3 text-center transition ${
                active ? "border-emerald-600 bg-emerald-50" : "border-zinc-200 bg-white hover:bg-zinc-50"
              }`}
            >
              <div className="text-xl font-bold tabular-nums">{data.counts[s] ?? 0}</div>
              <div className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">{statusLabel[s]}</div>
            </Link>
          );
        })}
      </section>

      {total === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-300 bg-white px-5 py-14 text-center text-sm text-zinc-400">
          No leads yet. Queue a list in{" "}
          <Link href="/list-building" className="text-emerald-700 hover:underline">List Building</Link>{" "}
          — leads land here once a source worker runs it.
        </div>
      ) : (
        <LeadsTable
          leads={data.leads}
          heading={status ? `${statusLabel[status] ?? status} leads` : "Latest leads"}
        />
      )}

      <p className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800">
        The AI-enrichment worker (Claude per-company overview / PE flag / news / age) is being built in
        Lane C (ENRICHMENT-STRATEGY.md) — statuses advance as it lands. Signals stored in{" "}
        <code>leads.enrichment</code> render here automatically. CSV export doubles as the VA handoff
        (blank owner cells = the fill list).
      </p>
    </div>
  );
}
