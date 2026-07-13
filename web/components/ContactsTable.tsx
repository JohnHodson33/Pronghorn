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
};

const inputCls = "rounded-md border border-zinc-300 px-3 py-1.5 text-sm outline-none focus:border-emerald-600";

export default function ContactsTable({ contacts }: { contacts: DirectoryContact[] }) {
  const router = useRouter();
  const roles = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const c of contacts) counts[c.role ?? "other"] = (counts[c.role ?? "other"] ?? 0) + 1;
    return counts;
  }, [contacts]);

  const [q, setQ] = useState("");
  const [role, setRole] = useState<string | null>(null);
  const [industry, setIndustry] = useState<string | null>(null);
  const [withEmail, setWithEmail] = useState(false);
  const [withPhone, setWithPhone] = useState(false);
  const [brokerId, setBrokerId] = useState<string | null>(null);

  // URL → state on mount; state → URL on change (replaceState: no history spam)
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    if (p.get("q")) setQ(p.get("q")!);
    if (p.get("role")) setRole(p.get("role"));
    if (p.get("industry")) setIndustry(p.get("industry"));
    if (p.get("email") === "1") setWithEmail(true);
    if (p.get("phone") === "1") setWithPhone(true);
    if (p.get("broker")) setBrokerId(p.get("broker"));
  }, []);
  useEffect(() => {
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    if (role) p.set("role", role);
    if (industry) p.set("industry", industry);
    if (withEmail) p.set("email", "1");
    if (withPhone) p.set("phone", "1");
    if (brokerId) p.set("broker", brokerId);
    const qs = p.toString();
    window.history.replaceState(null, "", qs ? `?${qs}` : window.location.pathname);
  }, [q, role, industry, withEmail, withPhone, brokerId]);

  const industryCounts = useMemo(() => {
    const m: Record<string, number> = {};
    for (const c of contacts) if (c.companyIndustry) m[c.companyIndustry] = (m[c.companyIndustry] ?? 0) + 1;
    return m;
  }, [contacts]);

  const rows = useMemo(
    () =>
      contacts.filter((c) => {
        if (q && !`${c.name ?? ""} ${c.email ?? ""} ${c.companyName ?? ""} ${c.companyIndustry ?? ""} ${c.notes ?? ""}`.toLowerCase().includes(q.toLowerCase()))
          return false;
        if (role && (c.role ?? "other") !== role) return false;
        if (industry && c.companyIndustry !== industry) return false;
        if (withEmail && !c.email) return false;
        if (withPhone && !c.phone) return false;
        if (brokerId && c.broker_id !== brokerId) return false;
        return true;
      }),
    [contacts, q, role, industry, withEmail, withPhone, brokerId]
  );

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
        <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-700">
          <input type="checkbox" checked={withEmail} onChange={(e) => setWithEmail(e.target.checked)} className="accent-emerald-700" />
          Has email
        </label>
        <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-700">
          <input type="checkbox" checked={withPhone} onChange={(e) => setWithPhone(e.target.checked)} className="accent-emerald-700" />
          Has phone
        </label>
        <span className="ml-auto flex items-center gap-3">
          <span className="text-sm text-zinc-500 tabular-nums">{rows.length} of {contacts.length}</span>
          <button
            onClick={exportCsv}
            disabled={rows.length === 0}
            className="rounded-lg bg-emerald-700 px-4 py-1.5 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"
          >
            Export CSV ({rows.length})
          </button>
        </span>
      </div>

      <div className="flex flex-wrap gap-2">
        {brokerId && (
          <button
            onClick={() => setBrokerId(null)}
            className="rounded-full bg-blue-100 px-2.5 py-1 text-xs font-medium text-blue-700 ring-2 ring-blue-400"
            title="Showing only contacts linked to one Broker Directory record — click to clear"
          >
            linked to broker record ✕
          </button>
        )}
        <button
          onClick={() => setRole(null)}
          className={`rounded-full px-2.5 py-1 text-xs font-medium transition ${
            role === null ? "bg-emerald-700 text-white" : "border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50"
          }`}
        >
          all · {contacts.length}
        </button>
        {Object.entries(roles)
          .sort((a, b) => b[1] - a[1])
          .map(([r, n]) => (
            <button
              key={r}
              onClick={() => setRole(role === r ? null : r)}
              className={`rounded-full px-2.5 py-1 text-xs font-medium transition ${
                role === r ? "ring-2 ring-emerald-600 " : ""
              }${roleStyle[r] ?? "bg-zinc-100 text-zinc-600"}`}
            >
              {r} · {n}
            </button>
          ))}
        {Object.keys(industryCounts).length > 0 && <span className="mx-1 text-zinc-300">|</span>}
        {Object.entries(industryCounts)
          .sort((a, b) => b[1] - a[1])
          .map(([i, n]) => (
            <button
              key={i}
              onClick={() => setIndustry(industry === i ? null : i)}
              className={`rounded-full px-2.5 py-1 text-xs font-medium transition ${
                industry === i
                  ? "bg-emerald-700 text-white ring-2 ring-emerald-600"
                  : "border border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
              }`}
              title={`Every contact at a ${i} company`}
            >
              {i} · {n}
            </button>
          ))}
      </div>

      <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-200 text-left text-xs uppercase tracking-wide text-zinc-500">
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Company</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Phone</th>
              <th className="px-4 py-3">Notes</th>
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
                      {c.role}
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
