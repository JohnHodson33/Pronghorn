"use client";

// Broker Directory — the scraped universe of brokers (cold), distinct from
// Contacts (curated relationships). Same searchable/filterable/exportable
// pattern as Broker Listings; "Add to Contacts" promotes a row into the CRM.
import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { BrokerRow } from "@/lib/crm";
import { buildCsv, csvDate, downloadCsv } from "@/lib/csv";
import { useUrlFilterSync } from "@/lib/use-url-filters";
import FilterDropdown from "@/components/FilterDropdown";
import SortHeader from "@/components/SortHeader";

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

  // csv-string convention (LIST-UX STANDARD): multi-select UI, old singular
  // URL params still hydrate
  const asSet = (v: string) => new Set(v && v !== "all" ? v.split(",").filter(Boolean) : []);
  const [q, setQ] = useState("");
  const [industry, setIndustry] = useState("");
  const [state, setState] = useState("");
  const [minListings, setMinListings] = useState("");
  const [withContact, setWithContact] = useState(false);
  const [sortKey, setSortKey] = useState<"name" | "brokerage" | "listings" | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  // filters survive back-nav via URL params (John 7/15)
  useUrlFilterSync(
    () => ({
      q, industry: industry || null, state: state || null,
      min: minListings, contact: withContact ? "1" : null,
      sort: sortKey, dir: sortKey && sortDir === "asc" ? "asc" : null,
    }),
    (p) => {
      if (p.get("q")) setQ(p.get("q")!);
      if (p.get("industry")) setIndustry(p.get("industry")!);
      if (p.get("state")) setState(p.get("state")!);
      if (p.get("min")) setMinListings(p.get("min")!);
      if (p.get("contact") === "1") setWithContact(true);
      if (["name", "brokerage", "listings"].includes(p.get("sort") ?? "")) setSortKey(p.get("sort") as "name" | "brokerage" | "listings");
      if (p.get("dir") === "asc") setSortDir("asc");
    },
    [q, industry, state, minListings, withContact, sortKey, sortDir],
  );

  const rows = useMemo(() => {
    const iSet = asSet(industry);
    const sSet = asSet(state);
    const filtered = brokers.filter((b) => {
      if (q && !`${b.name ?? ""} ${b.brokerage ?? ""}`.toLowerCase().includes(q.toLowerCase())) return false;
      if (iSet.size && !b.industries.some((i) => iSet.has(i))) return false;
      if (sSet.size && !b.states.some((s) => sSet.has(s))) return false;
      if (minListings && b.listingCount < Number(minListings)) return false;
      if (withContact && !b.phone && !b.email) return false;
      return true;
    });
    if (!sortKey) return filtered; // server order = listingCount desc
    return [...filtered].sort((a, b) => {
      const cmp =
        sortKey === "listings"
          ? a.listingCount - b.listingCount
          : String((sortKey === "name" ? a.name : a.brokerage) ?? "zzz").toLowerCase()
              .localeCompare(String((sortKey === "name" ? b.name : b.brokerage) ?? "zzz").toLowerCase());
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [brokers, q, industry, state, minListings, withContact, sortKey, sortDir]);

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
        {/* LIST-UX STANDARD: categorical filters live in the column headers */}
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search broker / brokerage…" className={`w-56 ${inputCls}`} />
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
              <th className="px-4 py-3">
                <SortHeader label="Broker" active={sortKey === "name"} dir={sortDir}
                  onChange={(d) => { if (!d) setSortKey(null); else { setSortKey("name"); setSortDir(d); } }} />
              </th>
              <th className="px-4 py-3">
                <SortHeader label="Brokerage" active={sortKey === "brokerage"} dir={sortDir}
                  onChange={(d) => { if (!d) setSortKey(null); else { setSortKey("brokerage"); setSortDir(d); } }} />
              </th>
              <th className="px-4 py-3 text-right">
                <SortHeader label="Listings" numeric active={sortKey === "listings"} dir={sortDir}
                  onChange={(d) => { if (!d) setSortKey(null); else { setSortKey("listings"); setSortDir(d); } }} />
              </th>
              <th className="px-4 py-3">
                <FilterDropdown header label="Industries covered"
                  options={industries.map((i) => ({ value: i, label: i, count: brokers.filter((b) => b.industries.includes(i)).length }))}
                  selected={asSet(industry)} onChange={(s) => setIndustry([...s].join(","))} />
              </th>
              <th className="px-4 py-3">
                <FilterDropdown header label="States"
                  options={states.map((s) => ({ value: s, label: s, count: brokers.filter((b) => b.states.includes(s)).length }))}
                  selected={asSet(state)} onChange={(s) => setState([...s].join(","))} />
              </th>
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
                    <Link href={`/contacts?broker=${b.id}`} className="text-xs font-semibold text-emerald-700 hover:underline"
                      title="Open this broker's contact record, filtered">
                      in Contacts ✓ →
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
