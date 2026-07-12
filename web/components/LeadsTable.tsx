"use client";

// Leads working table (ENRICHMENT-UX.md) — used on the Enrichment tab AND
// lead-list detail. Checkbox selection → "Enrich selected (est. $X)"
// (POST /api/enrich; degrades gracefully until Lane C's endpoint lands),
// VERIFIED Industry column (list is a filter, not the identity), off-target
// chip/filter/discard, owner/email filters, Add-to-Companies via
// /api/leads/promote, CSV export, and live polling while enrichment runs.
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { EnrichmentLead } from "@/lib/enrichment";
import { buildCsv, csvDate, downloadCsv } from "@/lib/csv";

const COST_PER_LEAD = 0.01; // ~Exa + Haiku + Hunter, per ENRICHMENT-UX cost policy

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
  enriching: "bg-amber-100 text-amber-800 animate-pulse",
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

const inputCls = "rounded-md border border-zinc-300 px-2.5 py-1.5 text-sm outline-none focus:border-emerald-600";

export default function LeadsTable({
  leads,
  heading,
  showListFilter = true,
}: {
  leads: EnrichmentLead[];
  heading: string;
  showListFilter?: boolean;
}) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [industry, setIndustry] = useState("all");
  const [state, setState] = useState("all");
  const [list, setList] = useState("all");
  const [ownerOnly, setOwnerOnly] = useState(false);
  const [emailOnly, setEmailOnly] = useState(false);
  const [showOffTarget, setShowOffTarget] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const effIndustry = (l: EnrichmentLead) => l.industry_verified ?? l.list?.industry ?? null;

  const industries = useMemo(
    () => [...new Set(leads.map(effIndustry).filter(Boolean))].sort() as string[],
    [leads]
  );
  const states = useMemo(() => [...new Set(leads.map((l) => l.state).filter(Boolean))].sort() as string[], [leads]);
  const lists = useMemo(
    () => [...new Set(leads.map((l) => (l.list ? `${l.list.industry}${l.list.geography ? ` — ${l.list.geography}` : ""}` : null)).filter(Boolean))].sort() as string[],
    [leads]
  );

  const rows = useMemo(
    () =>
      leads.filter((l) => {
        if (!showOffTarget && l.off_target) return false; // excluded by default per contract
        if (industry !== "all" && effIndustry(l) !== industry) return false;
        if (state !== "all" && l.state !== state) return false;
        if (list !== "all" && `${l.list?.industry}${l.list?.geography ? ` — ${l.list.geography}` : ""}` !== list) return false;
        if (ownerOnly && !l.owner_name) return false;
        if (emailOnly && !l.owner_email) return false;
        if (
          q &&
          !`${l.name} ${l.city ?? ""} ${l.state ?? ""} ${l.owner_name ?? ""} ${effIndustry(l) ?? ""}`
            .toLowerCase()
            .includes(q.toLowerCase())
        )
          return false;
        return true;
      }),
    [leads, q, industry, state, list, ownerOnly, emailOnly, showOffTarget]
  );

  const offTargetCount = useMemo(() => leads.filter((l) => l.off_target).length, [leads]);
  const enrichingCount = useMemo(() => leads.filter((l) => l.status === "enriching").length, [leads]);

  // Live updates: poll while anything is enriching (server flips statuses).
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    if (enrichingCount > 0 && !pollRef.current) {
      pollRef.current = setInterval(() => router.refresh(), 5000);
    }
    if (enrichingCount === 0 && pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      pollRef.current = null;
    };
  }, [enrichingCount, router]);

  const toggle = (id: string) =>
    setSelected((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  const allVisibleSelected = rows.length > 0 && rows.every((l) => selected.has(l.id));

  async function enrichSelected() {
    const ids = [...selected];
    if (ids.length === 0) return;
    setBusy("enrich");
    setNotice(null);
    try {
      const res = await fetch("/api/enrich", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadIds: ids }),
      });
      if (res.ok) {
        setNotice(`Enrichment queued for ${ids.length} lead${ids.length === 1 ? "" : "s"} — statuses update live below.`);
        setSelected(new Set());
        router.refresh();
      } else if (res.status === 404) {
        setNotice("Enrichment API isn't live yet (Lane C is building /api/enrich) — selection kept; try again shortly.");
      } else {
        setNotice(`Enrichment failed: ${(await res.json()).error ?? res.status}`);
      }
    } catch {
      setNotice("Enrichment API unreachable — selection kept.");
    }
    setBusy(null);
  }

  async function promote(leadId: string) {
    setBusy(leadId);
    setNotice(null);
    const res = await fetch("/api/leads/promote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ leadId }),
    });
    setBusy(null);
    if (res.ok) {
      const { companyId } = await res.json();
      router.push(`/companies/${companyId}`);
    } else setNotice((await res.json()).error ?? "promote failed");
  }

  async function discard(leadId: string) {
    setBusy(leadId);
    await fetch(`/api/leads/${leadId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "dead" }),
    });
    setBusy(null);
    router.refresh();
  }

  function exportCsv() {
    downloadCsv(
      `pronghorn-leads-${csvDate()}.csv`,
      buildCsv(
        ["name", "industry_verified", "list", "website", "phone", "city", "state", "rating", "reviews",
         "owner_name", "owner_email", "owner_phone", "owner_linkedin", "status", "off_target"],
        rows.map((l) => [
          l.name, effIndustry(l), l.list ? `${l.list.industry}${l.list.geography ? ` — ${l.list.geography}` : ""}` : null,
          l.website, l.phone, l.city, l.state, l.rating, l.review_count,
          l.owner_name, l.owner_email, l.owner_phone, l.owner_linkedin, l.status, l.off_target ? "yes" : "no",
        ])
      )
    );
  }

  return (
    <section className="rounded-xl border border-zinc-200 bg-white">
      <div className="flex flex-wrap items-center gap-3 border-b border-zinc-200 px-5 py-3">
        <span className="text-sm font-semibold">
          {heading} <span className="font-normal text-zinc-400">({rows.length})</span>
        </span>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…" className={`w-44 ${inputCls}`} />
        <select value={industry} onChange={(e) => setIndustry(e.target.value)} className={inputCls}>
          <option value="all">All industries</option>
          {industries.map((i) => <option key={i}>{i}</option>)}
        </select>
        <select value={state} onChange={(e) => setState(e.target.value)} className={inputCls}>
          <option value="all">All states</option>
          {states.map((s) => <option key={s}>{s}</option>)}
        </select>
        {showListFilter && lists.length > 1 && (
          <select value={list} onChange={(e) => setList(e.target.value)} className={`max-w-52 ${inputCls}`}>
            <option value="all">All lists</option>
            {lists.map((s) => <option key={s}>{s}</option>)}
          </select>
        )}
        <label className="flex cursor-pointer items-center gap-1.5 text-sm text-zinc-700">
          <input type="checkbox" checked={ownerOnly} onChange={(e) => setOwnerOnly(e.target.checked)} className="accent-emerald-700" />
          Owner found
        </label>
        <label className="flex cursor-pointer items-center gap-1.5 text-sm text-zinc-700">
          <input type="checkbox" checked={emailOnly} onChange={(e) => setEmailOnly(e.target.checked)} className="accent-emerald-700" />
          Email found
        </label>
        {offTargetCount > 0 && (
          <button
            onClick={() => setShowOffTarget((v) => !v)}
            className={`rounded-full px-2.5 py-1 text-xs font-semibold transition ${
              showOffTarget ? "bg-red-100 text-red-700 ring-2 ring-red-300" : "bg-red-50 text-red-600 hover:bg-red-100"
            }`}
          >
            off-target · {offTargetCount}
          </button>
        )}
        <span className="ml-auto flex items-center gap-2">
          <button
            onClick={enrichSelected}
            disabled={selected.size === 0 || busy === "enrich"}
            className="rounded-lg bg-emerald-700 px-4 py-1.5 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-40"
            title="Paid pass (~$0.01/lead): owner contact discovery + industry verification"
          >
            {busy === "enrich"
              ? "Queuing…"
              : `Enrich selected${selected.size ? ` (est. $${(selected.size * COST_PER_LEAD).toFixed(2)})` : ""}`}
          </button>
          <button
            onClick={exportCsv}
            disabled={rows.length === 0}
            className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-600 hover:bg-zinc-50"
          >
            CSV ({rows.length})
          </button>
        </span>
      </div>

      {notice && <div className="border-b border-zinc-100 bg-emerald-50 px-5 py-2 text-sm text-emerald-800">{notice}</div>}

      {rows.length === 0 ? (
        <div className="px-5 py-14 text-center text-sm text-zinc-400">
          {leads.length === 0 ? "No leads here yet." : "No leads match the filters."}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-200 text-left text-xs uppercase tracking-wide text-zinc-500">
                <th className="px-4 py-2">
                  <input
                    type="checkbox"
                    checked={allVisibleSelected}
                    onChange={() =>
                      setSelected(allVisibleSelected ? new Set() : new Set(rows.map((l) => l.id)))
                    }
                    className="accent-emerald-700"
                    title="Select all visible"
                  />
                </th>
                <th className="px-2 py-2 font-medium">Company</th>
                <th className="px-3 py-2 font-medium">Industry</th>
                <th className="px-3 py-2 font-medium">Location</th>
                <th className="px-3 py-2 font-medium">Owner contact</th>
                <th className="px-3 py-2 font-medium">Reviews</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-4 py-2 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {rows.map((l) => {
                const ready = !!l.owner_name && (!!l.owner_email || !!l.owner_phone);
                return (
                  <tr key={l.id} className={`hover:bg-zinc-50 ${l.off_target ? "opacity-60" : ""}`}>
                    <td className="px-4 py-2.5">
                      <input
                        type="checkbox"
                        checked={selected.has(l.id)}
                        onChange={() => toggle(l.id)}
                        className="accent-emerald-700"
                      />
                    </td>
                    <td className="max-w-56 px-2 py-2.5">
                      <div className="truncate font-medium">
                        {l.website ? (
                          <a href={l.website} target="_blank" rel="noopener noreferrer" className="hover:text-emerald-700 hover:underline">
                            {l.name} ↗
                          </a>
                        ) : (
                          l.name
                        )}
                      </div>
                      {l.owner_name && <div className="truncate text-xs text-zinc-500">{l.owner_name}</div>}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5">
                      {effIndustry(l) ? (
                        <span
                          className={`rounded px-1.5 py-0.5 text-xs font-medium ${
                            l.industry_verified ? "bg-emerald-50 text-emerald-800" : "bg-zinc-100 text-zinc-500"
                          }`}
                          title={l.industry_verified ? "Verified by enrichment" : "Inherited from the list — unverified"}
                        >
                          {effIndustry(l)}
                          {!l.industry_verified && "?"}
                        </span>
                      ) : (
                        <span className="text-xs text-zinc-300">—</span>
                      )}
                      {l.off_target && (
                        <span className="ml-1 rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-semibold text-red-700">off-target</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-zinc-600">
                      {[l.city, l.state].filter(Boolean).join(", ") || "—"}
                    </td>
                    <td className="px-3 py-2.5">
                      <ContactDots filled={[!!l.owner_phone, !!l.owner_email, !!l.owner_linkedin]} />
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 tabular-nums text-zinc-600">
                      {l.rating !== null ? `${l.rating.toFixed(1)}★` : "—"}
                      {l.review_count !== null && <span className="text-xs text-zinc-400"> ({l.review_count})</span>}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${statusBadge[l.status] ?? "bg-zinc-100 text-zinc-600"}`}>
                        {statusLabel[l.status] ?? l.status}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-right">
                      {l.company_id ? (
                        <a href={`/companies/${l.company_id}`} className="text-xs font-semibold text-emerald-700 hover:underline">
                          in CRM →
                        </a>
                      ) : ready ? (
                        <button
                          onClick={() => promote(l.id)}
                          disabled={busy === l.id}
                          className="rounded-md bg-emerald-700 px-2.5 py-1 text-xs font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"
                        >
                          {busy === l.id ? "…" : "+ Companies"}
                        </button>
                      ) : (
                        <span className="text-[11px] text-zinc-300" title="Needs owner name + email/phone — enrich first">
                          not ready
                        </span>
                      )}
                      {l.off_target && l.status !== "dead" && (
                        <button
                          onClick={() => discard(l.id)}
                          disabled={busy === l.id}
                          className="ml-2 rounded-md px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
                          title="Discard (marks dead; stays queryable)"
                        >
                          discard
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <div className="border-t border-zinc-100 px-5 py-2 text-[11px] text-zinc-400">
        Free enrichment (website/location/license cross-ref) runs automatically on new lists. &quot;Enrich
        selected&quot; is the paid pass (~$0.01/lead): owner discovery + verified industry. Off-target leads are
        hidden by default. Dots: phone · email · LinkedIn.
      </div>
    </section>
  );
}
