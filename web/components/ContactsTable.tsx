"use client";

// Contacts directory as the shared list pattern: search + role filter chips +
// CSV export; rows link to the contact's company profile.
// Filters sync to URL params (?q= ?role= ?industry= ?email=1 ?phone=1
// ?broker=<id>) so filtered views are shareable and other pages can deep-link
// (e.g. Broker Directory → this broker's contacts). Read once on mount —
// not in the initializer — so SSR markup matches first client render.
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { buildCsv, csvDate, downloadCsv } from "@/lib/csv";
import { PinButton } from "@/components/PinnedViews";
import FilterDropdown from "@/components/FilterDropdown";
import SortHeader from "@/components/SortHeader";
import { presenceOptions, presenceMatch, cmpText } from "@/lib/list-filters";

export type DirectoryContact = {
  id: string;
  name: string | null;
  role: string | null;
  email: string | null;
  phone: string | null;
  notes: string | null;
  company_id: string | null;
  broker_id: string | null; // links back to the Broker Directory record
  companyName: string | null;
  companyIndustry: string | null; // verified industry via the company join
};

const roleStyle: Record<string, string> = {
  owner: "bg-emerald-100 text-emerald-800",
  seller: "bg-emerald-100 text-emerald-800",
  broker: "bg-blue-100 text-blue-700",
  advisor: "bg-amber-100 text-amber-800",
  investor: "bg-purple-100 text-purple-800",
  recruiter: "bg-pink-100 text-pink-700",
  network: "bg-cyan-100 text-cyan-800",
  river_guide: "bg-orange-100 text-orange-800",
};

// John's terms, not the raw enum — river_guide (the ingest tag, outside
// CONTACT_ROLES) reads "river guide" in the filter and the badge.
const roleLabel = (role: string) => (role === "river_guide" ? "river guide" : role);

type SortKey = "name" | "role" | "company" | "email" | "phone" | "notes" | null;
const SORT_KEYS = ["name", "role", "company", "email", "phone", "notes"];

const inputCls = "rounded-md border border-zinc-300 px-3 py-1.5 text-sm outline-none focus:border-emerald-600";

export default function ContactsTable({ contacts }: { contacts: DirectoryContact[] }) {
  const router = useRouter();
  const roles = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const c of contacts) counts[c.role ?? "other"] = (counts[c.role ?? "other"] ?? 0) + 1;
    return counts;
  }, [contacts]);

  // csv-string convention: multi-select UI, back-compatible single-value URLs
  const asSet = (v: string) => new Set(v ? v.split(",").filter(Boolean) : []);
  const [q, setQ] = useState("");
  const [role, setRole] = useState("");
  const [industry, setIndustry] = useState("");
  // each channel owns a has/missing filter on its own column (John 7/21)
  const [emailSel, setEmailSel] = useState<Set<string>>(new Set());
  const [phoneSel, setPhoneSel] = useState<Set<string>>(new Set());
  const [notesSel, setNotesSel] = useState<Set<string>>(new Set());
  const [brokerId, setBrokerId] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  // URL → state on mount; state → URL on change (replaceState: no history spam)
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    if (p.get("q")) setQ(p.get("q")!);
    if (p.get("role")) setRole(p.get("role")!);
    if (p.get("industry")) setIndustry(p.get("industry")!);
    // old ?email=1 / ?phone=1 pinned views still hydrate as "has"
    if (p.get("email")) setEmailSel(new Set(p.get("email") === "1" ? ["has"] : p.get("email")!.split(",")));
    if (p.get("phone")) setPhoneSel(new Set(p.get("phone") === "1" ? ["has"] : p.get("phone")!.split(",")));
    if (p.get("notes")) setNotesSel(new Set(p.get("notes")!.split(",")));
    if (p.get("broker")) setBrokerId(p.get("broker"));
    if (SORT_KEYS.includes(p.get("sort") ?? "")) setSortKey(p.get("sort") as SortKey);
    if (p.get("dir") === "desc") setSortDir("desc");
  }, []);
  useEffect(() => {
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    if (role) p.set("role", role);
    if (industry) p.set("industry", industry);
    if (emailSel.size) p.set("email", [...emailSel].join(","));
    if (phoneSel.size) p.set("phone", [...phoneSel].join(","));
    if (notesSel.size) p.set("notes", [...notesSel].join(","));
    if (brokerId) p.set("broker", brokerId);
    if (sortKey) { p.set("sort", sortKey); if (sortDir === "desc") p.set("dir", "desc"); }
    const qs = p.toString();
    window.history.replaceState(null, "", qs ? `?${qs}` : window.location.pathname);
  }, [q, role, industry, emailSel, phoneSel, notesSel, brokerId, sortKey, sortDir]);

  const industryCounts = useMemo(() => {
    const m: Record<string, number> = {};
    for (const c of contacts) if (c.companyIndustry) m[c.companyIndustry] = (m[c.companyIndustry] ?? 0) + 1;
    return m;
  }, [contacts]);

  const rows = useMemo(() => {
    const roleSet = asSet(role);
    const indSet = asSet(industry);
    const filtered = contacts.filter((c) => {
      if (q && !`${c.name ?? ""} ${c.email ?? ""} ${c.companyName ?? ""} ${c.companyIndustry ?? ""} ${c.notes ?? ""}`.toLowerCase().includes(q.toLowerCase()))
        return false;
      if (roleSet.size && !roleSet.has(c.role ?? "other")) return false;
      if (indSet.size && !indSet.has(c.companyIndustry ?? "")) return false;
      if (!presenceMatch(emailSel, c.email)) return false;
      if (!presenceMatch(phoneSel, c.phone)) return false;
      if (!presenceMatch(notesSel, c.notes)) return false;
      if (brokerId && c.broker_id !== brokerId) return false;
      return true;
    });
    if (!sortKey) return filtered; // server order = name asc already
    const pick = (c: DirectoryContact) =>
      sortKey === "name" ? c.name
      : sortKey === "role" ? (c.role ? roleLabel(c.role) : null)
      : sortKey === "company" ? c.companyName
      : sortKey === "email" ? c.email
      : sortKey === "phone" ? c.phone
      : c.notes;
    return [...filtered].sort((a, b) => cmpText(pick(a), pick(b)) * (sortDir === "asc" ? 1 : -1));
  }, [contacts, q, role, industry, emailSel, phoneSel, notesSel, brokerId, sortKey, sortDir]);

  const sortSet = (key: SortKey) => (d: "asc" | "desc" | null) => {
    if (!d) setSortKey(null);
    else { setSortKey(key); setSortDir(d); }
  };
  const emailOptions = useMemo(() => presenceOptions(contacts, (c) => c.email, "email"), [contacts]);
  const phoneOptions = useMemo(() => presenceOptions(contacts, (c) => c.phone, "phone"), [contacts]);
  const notesOptions = useMemo(() => presenceOptions(contacts, (c) => c.notes, "notes"), [contacts]);

  function exportCsv() {
    downloadCsv(
      `pronghorn-contacts-${csvDate()}.csv`,
      buildCsv(
        ["name", "role", "company", "email", "phone", "notes"],
        rows.map((c) => [c.name, c.role, c.companyName, c.email, c.phone, c.notes])
      )
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-zinc-200 bg-white p-4">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name / email / company…" className={`w-64 ${inputCls}`} />
        {/* Has email / Has phone moved onto the Email and Phone columns */}
        <span className="ml-auto flex items-center gap-3">
          <span className="text-sm text-zinc-500 tabular-nums">{rows.length} of {contacts.length}</span>
          <PinButton defaultLabel={[role, industry, "contacts"].filter(Boolean).join(" ")} />
          <button
            onClick={exportCsv}
            disabled={rows.length === 0}
            className="rounded-lg bg-emerald-700 px-4 py-1.5 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"
          >
            Export CSV ({rows.length})
          </button>
        </span>
      </div>

      {/* LIST-UX STANDARD (John 7/16): chip rows retired — headers do the work */}
      {brokerId && (
        <button
          onClick={() => setBrokerId(null)}
          className="rounded-full bg-blue-100 px-2.5 py-1 text-xs font-medium text-blue-700 ring-2 ring-blue-400"
          title="Showing only contacts linked to one Broker Directory record — click to clear"
        >
          linked to broker record ✕
        </button>
      )}

      <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-200 text-left text-xs uppercase tracking-wide text-zinc-500">
              <th className="px-4 py-3">
                <SortHeader label="Name" active={sortKey === "name"} dir={sortDir} onChange={sortSet("name")} />
              </th>
              <th className="px-4 py-3">
                <span className="inline-flex items-center gap-1">
                  <SortHeader label="Role" active={sortKey === "role"} dir={sortDir} onChange={sortSet("role")} />
                  <FilterDropdown header label="" name="Role"
                    options={Object.entries(roles).sort((a, b) => b[1] - a[1]).map(([r, n]) => ({ value: r, label: roleLabel(r), count: n }))}
                    selected={asSet(role)} onChange={(s) => setRole([...s].join(","))} />
                </span>
              </th>
              <th className="px-4 py-3">
                <span className="inline-flex items-center gap-1">
                  <SortHeader label="Company" active={sortKey === "company"} dir={sortDir} onChange={sortSet("company")} />
                  <FilterDropdown header label="" name="Industry"
                    options={Object.entries(industryCounts).sort((a, b) => b[1] - a[1]).map(([i, n]) => ({ value: i, label: i, count: n }))}
                    selected={asSet(industry)} onChange={(s) => setIndustry([...s].join(","))} />
                </span>
              </th>
              <th className="px-4 py-3">
                <span className="inline-flex items-center gap-1">
                  <SortHeader label="Email" active={sortKey === "email"} dir={sortDir} onChange={sortSet("email")} />
                  <FilterDropdown header label="" name="Email" options={emailOptions} selected={emailSel} onChange={setEmailSel} />
                </span>
              </th>
              <th className="px-4 py-3">
                <span className="inline-flex items-center gap-1">
                  <SortHeader label="Phone" active={sortKey === "phone"} dir={sortDir} onChange={sortSet("phone")} />
                  <FilterDropdown header label="" name="Phone" options={phoneOptions} selected={phoneSel} onChange={setPhoneSel} />
                </span>
              </th>
              <th className="px-4 py-3">
                <span className="inline-flex items-center gap-1">
                  <SortHeader label="Notes" active={sortKey === "notes"} dir={sortDir} onChange={sortSet("notes")} />
                  <FilterDropdown header label="" name="Notes" options={notesOptions} selected={notesSel} onChange={setNotesSel} />
                </span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {rows.map((c) => (
              <tr
                key={c.id}
                onClick={() => c.company_id && router.push(`/companies/${c.company_id}`)}
                className={c.company_id ? "cursor-pointer hover:bg-zinc-50" : "hover:bg-zinc-50"}
                title={c.company_id ? "Open company profile" : undefined}
              >
                <td className="px-4 py-3 font-medium">{c.name ?? "—"}</td>
                <td className="whitespace-nowrap px-4 py-3">
                  {c.role ? (
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${roleStyle[c.role] ?? "bg-zinc-100 text-zinc-600"}`}>
                      {roleLabel(c.role)}
                    </span>
                  ) : (
                    "—"
                  )}
                  {c.broker_id && (
                    <a
                      href={`/brokers/${c.broker_id}`}
                      onClick={(e) => e.stopPropagation()}
                      className="ml-1.5 text-xs text-emerald-700 hover:underline"
                      title="Open the Broker Directory record (coverage + listings)"
                    >
                      directory →
                    </a>
                  )}
                </td>
                <td className="px-4 py-3 text-zinc-700">
                  {c.companyName ? (
                    <>
                      <span className={c.company_id ? "text-emerald-700" : ""}>{c.companyName}</span>
                      {c.companyIndustry ? (
                        <span className="ml-1.5 rounded bg-emerald-50 px-1.5 py-0.5 text-xs font-medium text-emerald-800">
                          {c.companyIndustry}
                        </span>
                      ) : (
                        <span className="ml-1.5 rounded bg-zinc-100 px-1.5 py-0.5 text-xs text-zinc-400">—</span>
                      )}
                    </>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="px-4 py-3 text-xs text-zinc-600" onClick={(e) => e.stopPropagation()}>
                  {c.email ? <a href={`mailto:${c.email}`} className="hover:text-emerald-700 hover:underline">{c.email}</a> : "—"}
                </td>
                <td className="px-4 py-3 text-xs text-zinc-600">{c.phone ?? "—"}</td>
                <td className="max-w-xs px-4 py-3 text-xs text-zinc-500">{c.notes ?? "—"}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-sm text-zinc-400">
                  No contacts match the current filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
