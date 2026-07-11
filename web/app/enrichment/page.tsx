// Enrichment — the middle of the off-market funnel: leads arrive from List
// Building, get owner contacts (VA step) and AI signals (Claude: overview,
// PE flag, news, age), then graduate to outreach. This tab shows where every
// lead sits and what's still missing on each.
import Link from "next/link";
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

const statusBadge: Record<string, string> = {
  new: "bg-zinc-100 text-zinc-600",
  enriching: "bg-amber-100 text-amber-800",
  enriched: "bg-emerald-100 text-emerald-800",
  in_sequence: "bg-sky-100 text-sky-800",
  contacted: "bg-sky-100 text-sky-800",
  responded: "bg-violet-100 text-violet-800",
  dead: "bg-zinc-100 text-zinc-400",
};

// Dot = one owner-contact field the VA/enrichment step has filled.
function ContactDots({ filled }: { filled: boolean[] }) {
  return (
    <span className="inline-flex gap-1">
      {filled.map((f, i) => (
        <span key={i} className={`h-2 w-2 rounded-full ${f ? "bg-emerald-600" : "bg-zinc-200"}`} />
      ))}
    </span>
  );
}

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
    <div className="max-w-6xl p-8 space-y-6">
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

      <section className="rounded-xl border border-zinc-200 bg-white">
        <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-3">
          <span className="text-sm font-semibold">
            {status ? `${statusLabel[status] ?? status} leads` : "Latest leads"}{" "}
            <span className="font-normal text-zinc-400">
              ({data.leads.length}
              {data.leads.length === 200 ? " shown, newest first" : ""})
            </span>
          </span>
          <span className="text-xs text-zinc-400">owner-contact dots: phone · email · LinkedIn</span>
        </div>
        {data.leads.length === 0 ? (
          <div className="px-5 py-14 text-center text-sm text-zinc-400">
            {total === 0 ? (
              <>
                No leads yet. Queue a list in{" "}
                <Link href="/list-building" className="text-emerald-700 hover:underline">List Building</Link>{" "}
                — leads land here once a source worker runs it.
              </>
            ) : (
              "No leads with this status."
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-200 text-left text-xs uppercase tracking-wide text-zinc-500">
                  <th className="px-5 py-2 font-medium">Company</th>
                  <th className="px-3 py-2 font-medium">Location</th>
                  <th className="px-3 py-2 font-medium">List</th>
                  <th className="px-3 py-2 font-medium">Reviews</th>
                  <th className="px-3 py-2 font-medium">Sources</th>
                  <th className="px-3 py-2 font-medium">Owner contact</th>
                  <th className="px-3 py-2 font-medium">AI signals</th>
                  <th className="px-5 py-2 text-right font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {data.leads.map((l) => {
                  const e = l.enrichment ?? {};
                  const hasOverview = typeof e.overview === "string" && e.overview.length > 0;
                  const peBacked = e.pe_backed === true;
                  return (
                    <tr key={l.id} className="hover:bg-zinc-50">
                      <td className="px-5 py-2.5">
                        <div className="font-medium">
                          {l.website ? (
                            <a href={l.website} target="_blank" rel="noopener noreferrer" className="hover:text-emerald-700 hover:underline">
                              {l.name} ↗
                            </a>
                          ) : (
                            l.name
                          )}
                        </div>
                        {l.owner_name && <div className="text-xs text-zinc-500">{l.owner_name}</div>}
                      </td>
                      <td className="px-3 py-2.5 text-zinc-600">
                        {[l.city, l.state].filter(Boolean).join(", ") || "—"}
                      </td>
                      <td className="px-3 py-2.5 text-xs text-zinc-500">
                        {l.list ? `${l.list.industry}${l.list.geography ? ` — ${l.list.geography}` : ""}` : "—"}
                      </td>
                      <td className="px-3 py-2.5 tabular-nums text-zinc-600">
                        {l.rating !== null ? `${l.rating.toFixed(1)}★` : "—"}
                        {l.review_count !== null && <span className="text-xs text-zinc-400"> ({l.review_count})</span>}
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex flex-wrap gap-1">
                          {l.source_tags.slice(0, 3).map((t) => (
                            <span key={t} className="rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] text-zinc-600">{t}</span>
                          ))}
                          {l.source_tags.length > 3 && (
                            <span className="text-[10px] text-zinc-400">+{l.source_tags.length - 3}</span>
                          )}
                          {l.bbb_grade && (
                            <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-800">
                              BBB {l.bbb_grade}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-2.5">
                        <ContactDots filled={[!!l.owner_phone, !!l.owner_email, !!l.owner_linkedin]} />
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex gap-1">
                          {hasOverview && (
                            <span className="rounded bg-violet-100 px-1.5 py-0.5 text-[10px] font-semibold text-violet-800">overview</span>
                          )}
                          {peBacked && (
                            <span className="rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-semibold text-red-800">PE-backed</span>
                          )}
                          {!hasOverview && !peBacked && <span className="text-xs text-zinc-300">—</span>}
                        </div>
                      </td>
                      <td className="px-5 py-2.5 text-right">
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusBadge[l.status] ?? "bg-zinc-100 text-zinc-600"}`}>
                          {statusLabel[l.status] ?? l.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <p className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800">
        Scaffold: the AI-enrichment worker (Claude per-company overview / PE flag / news / age) and the
        VA contact-fill export aren&apos;t wired yet — statuses advance once those jobs land. Signals stored
        in <code>leads.enrichment</code> render here automatically.
      </p>
    </div>
  );
}
