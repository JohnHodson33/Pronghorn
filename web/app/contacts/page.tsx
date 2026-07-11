// Contacts — people tied to companies (owners, sellers, sell-side brokers,
// advisors). First wave from the HubSpot import (deal owners + brokers); grows
// as deals are enriched and (later) Outlook/HubSpot contact sync lands.
import { hasDb, serverDb } from "@/lib/db";

export const dynamic = "force-dynamic";

const roleStyle: Record<string, string> = {
  owner: "bg-emerald-100 text-emerald-800",
  seller: "bg-emerald-100 text-emerald-800",
  broker: "bg-blue-100 text-blue-700",
  advisor: "bg-amber-100 text-amber-800",
};

type Row = {
  id: string;
  name: string | null;
  role: string | null;
  email: string | null;
  phone: string | null;
  notes: string | null;
  companies: { name: string } | null;
};

export default async function Contacts() {
  let rows: Row[] = [];
  if (hasDb()) {
    const { data } = await serverDb()
      .from("contacts")
      .select("id, name, role, email, phone, notes, companies(name)")
      .order("role")
      .limit(500);
    rows = (data as unknown as Row[]) ?? [];
  }

  return (
    <div className="p-8 space-y-5">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Contacts</h1>
        <p className="text-sm text-zinc-500">
          Owners, sellers, and sell-side brokers tied to companies. Meeting notes and outreach attach
          to these. (Full Outlook/HubSpot contact-directory sync is a separate build.)
        </p>
      </header>

      {rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-300 bg-white px-6 py-16 text-center text-sm text-zinc-400">
          No contacts yet — they populate from the HubSpot deal import and as deals get enriched.
        </div>
      ) : (
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
                <tr key={c.id} className="hover:bg-zinc-50">
                  <td className="px-4 py-3 font-medium">{c.name ?? "—"}</td>
                  <td className="px-4 py-3">
                    {c.role ? (
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${roleStyle[c.role] ?? "bg-zinc-100 text-zinc-600"}`}>
                        {c.role}
                      </span>
                    ) : "—"}
                  </td>
                  <td className="px-4 py-3 text-zinc-700">{c.companies?.name ?? "—"}</td>
                  <td className="px-4 py-3 text-xs text-zinc-600">
                    {c.email ? <a href={`mailto:${c.email}`} className="hover:text-emerald-700 hover:underline">{c.email}</a> : "—"}
                  </td>
                  <td className="px-4 py-3 text-xs text-zinc-600">{c.phone ?? "—"}</td>
                  <td className="max-w-xs px-4 py-3 text-xs text-zinc-500">{c.notes ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
