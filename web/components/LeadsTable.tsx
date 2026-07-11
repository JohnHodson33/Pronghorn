"use client";

// Leads table for the Enrichment tab — shared list pattern: search + CSV
// export over the rows the server loaded (status filtering stays server-side
// via the funnel cards).
import { useMemo, useState } from "react";
import type { EnrichmentLead } from "@/lib/enrichment";
import { buildCsv, csvDate, downloadCsv } from "@/lib/csv";

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

function ContactDots({ filled }: { filled: boolean[] }) {
  return (
    <span className="inline-flex gap-1">
      {filled.map((f, i) => (
        <span key={i} className={`h-2 w-2 rounded-full ${f ? "bg-emerald-600" : "bg-zinc-200"}`} />
      ))}
    </span>
  );
}

export default function LeadsTable({ leads, heading }: { leads: EnrichmentLead[]; heading: string }) {
  const [q, setQ] = useState("");

  const rows = useMemo(
    () =>
      leads.filter(
        (l) =>
          !q ||
          `${l.name} ${l.city ?? ""} ${l.state ?? ""} ${l.owner_name ?? ""} ${l.list?.industry ?? ""}`
            .toLowerCase()
            .includes(q.toLowerCase())
      ),
    [leads, q]
  );

  function exportCsv() {
    downloadCsv(
      `pronghorn-leads-${csvDate()}.csv`,
      buildCsv(
        ["name", "website", "phone", "city", "state", "rating", "reviews", "sources", "bbb_grade",
         "owner_name", "owner_email", "owner_phone", "owner_linkedin", "status", "list"],
        rows.map((l) => [
          l.name, l.website, l.phone, l.city, l.state, l.rating, l.review_count,
          l.source_tags.join("; "), l.bbb_grade,
          l.owner_name, l.owner_email, l.owner_phone, l.owner_linkedin, l.status,
          l.list ? `${l.list.industry}${l.list.geography ? ` — ${l.list.geography}` : ""}` : null,
        ])
      )
    );
  }

  return (
    <section className="rounded-xl border border-zinc-200 bg-white">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 px-5 py-3">
        <span className="text-sm font-semibold">
          {heading}{" "}
          <span className="font-normal text-zinc-400">({rows.length}{rows.length === 200 ? " shown, newest first" : ""})</span>
        </span>
        <span className="flex items-center gap-3">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search leads…"
            className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm outline-none focus:border-emerald-600"
          />
          <button
            onClick={exportCsv}
            disabled={rows.length === 0}
            className="rounded-lg bg-emerald-700 px-4 py-1.5 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"
          >
            Export CSV ({rows.length})
          </button>
          <span className="hidden text-xs text-zinc-400 lg:inline">owner-contact dots: phone · email · LinkedIn</span>
        </span>
      </div>
      {rows.length === 0 ? (
        <div className="px-5 py-14 text-center text-sm text-zinc-400">
          {leads.length === 0 ? "No leads with this status yet." : "No leads match the search."}
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
              {rows.map((l) => {
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
                    <td className="px-3 py-2.5 text-zinc-600">{[l.city, l.state].filter(Boolean).join(", ") || "—"}</td>
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
                        {l.source_tags.length > 3 && <span className="text-[10px] text-zinc-400">+{l.source_tags.length - 3}</span>}
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
  );
}
