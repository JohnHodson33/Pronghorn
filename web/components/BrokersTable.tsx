"use client";

// Broker Directory — the scraped universe of brokers (cold), distinct from
// Contacts (curated relationships). Same searchable/filterable/exportable
// pattern as Broker Listings; "Add to Contacts" promotes a row into the CRM.
import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { BrokerRow } from "@/lib/crm";
import { buildCsv, csvDate, downloadCsv } from "@/lib/csv";

const inputCls = "rounded-md border border-zinc-300 px-3 py-1.5 text-sm outline-none focus:border-emerald-600";

export default function BrokersTable({ brokers }: { brokers: BrokerRow[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const industries = useMemo(() => [...new Set(brokers.flatMap((b) => b.industries))].sort(), [brokers]);
  const states = useMemo(() => [...new Set(brokers.flatMap((b) => b.states))].sort(), [brokers]);

  async function addToContacts(id: string) {
    setBusy(id);
    const res = await fetch(`/api/brokers/${id}/add-to-contacts`, { method: "POST" });
    setBusy(null);
    if (res.ok) router.refresh();
  }

  const [q, setQ] = useState("");
  const [industry, setIndustry] = useState("all");
  const [state, setState] = useState("all");
  const [minListings, setMinListings] = useState("");
  const [withContact, setWithContact] = useState(false);

  const rows = useMemo(
    () =>
      brokers.filter((b) => {
        if (q && !`${b.name ?? ""} ${b.brokerage ?? ""}`.toLowerCase().includes(q.toLowerCase())) return false;
        if (industry !== "all" && !b.industries.includes(industry)) return false;
        if (state !== "all" && !b.states.includes(state)) return false;
        if (minListings && b.listingCount < Number(minListings)) return false;
        if (withContact && !b.phone && !b.email) return false;
        return true;
      }),
    [brokers, q, industry, state, minListings, withContact]
  );

  function exportCsv() {
    downloadCsv(
      `pronghorn-brokers-${csvDate()}.csv`,
      buildCsv(
        ["name", "brokerage", "listings", "industries", "states", "phone", "email"],
        rows.map((b) => [
          b.name,
          b.brokerage,
          b.listingCount,
          b.industries.join("; "),
          b.states.join("; "),
          b.phone,
          b.email,
        ])
      )
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-zinc-200 bg-white p-4">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search broker / brokerage…" className={`w-56 ${inputCls}`} />
        <select value={industry} onChange={(e) => setIndustry(e.target.value)} className={inputCls}>
          <option value="all">All industries</option>
          {industries.map((i) => <option key={i}>{i}</option>)}
        </select>
        <select value={state} onChange={(e) => setState(e.target.value)} className={inputCls}>
          <option value="all">All states</option>
          {states.map((s) => <option key={s}>{s}</option>)}
        </select>
        <input
          value={minListings}
          onChange={(e) => setMinListings(e.target.value.replace(/\D/g, ""))}
          placeholder="Min listings"
          className={`w-28 ${inputCls}`}
        />
        <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-700">
          <input type="checkbox" checked={withContact} onChange={(e) => setWithContact(e.target.checked)} className="accent-emerald-700" />
          Has phone/email
        </label>
        <span className="ml-auto flex items-center gap-3">
          <span className="text-sm text-zinc-500 tabular-nums">{rows.length} of {brokers.length}</span>
          <button
            onClick={exportCsv}
            disabled={rows.length === 0}
            className="rounded-lg bg-emerald-700 px-4 py-1.5 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"
          >
            Export CSV ({rows.length})
          </button>
        </span>
      </div>

      <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-200 text-left text-xs uppercase tracking-wide text-zinc-500">
              <th className="px-4 py-3">Broker</th>
              <th className="px-4 py-3">Brokerage</th>
              <th className="px-4 py-3 text-right">Listings</th>
              <th className="px-4 py-3">Industries covered</th>
              <th className="px-4 py-3">States</th>
              <th className="px-4 py-3">Contact</th>
              <th className="px-4 py-3 text-right">CRM</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {rows.map((b) => (
              <tr key={b.id} className="align-top hover:bg-zinc-50">
                <td className="px-4 py-3 font-medium">
                  <Link href={`/brokers/${b.id}`} className="hover:text-emerald-700 hover:underline">
                    {b.name}
                  </Link>
                </td>
                <td className="px-4 py-3 text-zinc-600">{b.brokerage ?? "—"}</td>
                <td className="px-4 py-3 text-right font-semibold tabular-nums">{b.listingCount}</td>
                <td className="max-w-md px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {b.industries.slice(0, 6).map((i) => (
                      <span key={i} className="rounded bg-emerald-50 px-1.5 py-0.5 text-xs text-emerald-800">{i}</span>
                    ))}
                    {b.industries.length > 6 && <span className="text-xs text-zinc-400">+{b.industries.length - 6}</span>}
                    {b.industries.length === 0 && <span className="text-xs text-zinc-400">—</span>}
                  </div>
                </td>
                <td className="px-4 py-3 text-xs text-zinc-600">{b.states.join(", ") || "—"}</td>
                <td className="px-4 py-3 text-xs text-zinc-500">
                  {b.phone || b.email ? (
                    <>
                      {b.phone && <div>📞 {b.phone}</div>}
                      {b.email && (
                        <a href={`mailto:${b.email}`} className="text-emerald-700 hover:underline">{b.email}</a>
                      )}
                    </>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-right">
                  {b.contactId ? (
                    <Link href="/contacts" className="text-xs font-semibold text-emerald-700 hover:underline">
                      in Contacts ✓
                    </Link>
                  ) : (
                    <button
                      onClick={() => addToContacts(b.id)}
                      disabled={busy === b.id}
                      className="rounded-md border border-zinc-300 px-2.5 py-1 text-xs font-semibold text-zinc-600 hover:border-emerald-600 hover:text-emerald-700 disabled:opacity-50"
                      title="Promote into the curated Contacts CRM"
                    >
                      {busy === b.id ? "…" : "+ Contacts"}
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-sm text-zinc-400">
                  No brokers match the current filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
