// Contacts — people tied to companies (owners, sellers, sell-side brokers,
// advisors). Shared list pattern: search + role chips + CSV export; rows
// link to the company profile where contacts are editable.
import ContactsTable, { type DirectoryContact } from "@/components/ContactsTable";
import { hasDb, serverDb } from "@/lib/db";

export const dynamic = "force-dynamic";

type Row = {
  id: string;
  name: string | null;
  role: string | null;
  email: string | null;
  phone: string | null;
  notes: string | null;
  company_id: string | null;
  broker_id: string | null;
  companies: { name: string } | { name: string }[] | null;
};

export default async function Contacts() {
  let rows: DirectoryContact[] = [];
  if (hasDb()) {
    const { data } = await serverDb()
      .from("contacts")
      .select("id, name, role, email, phone, notes, company_id, broker_id, companies(name)")
      .order("name")
      .limit(500);
    rows = ((data as unknown as Row[]) ?? []).map((r) => {
      const co = Array.isArray(r.companies) ? r.companies[0] : r.companies;
      return {
        id: r.id,
        name: r.name,
        role: r.role,
        email: r.email,
        phone: r.phone,
        notes: r.notes,
        company_id: r.company_id,
        broker_id: r.broker_id,
        companyName: co?.name ?? null,
      };
    });
  }

  return (
    <div className="p-4 md:p-8 space-y-5">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Contacts</h1>
        <p className="text-sm text-zinc-500">
          The full relationship directory — owners, brokers, investors, advisors — from the HubSpot
          import and deal enrichment. Click a row to open the company (contacts are editable there).
        </p>
      </header>

      {rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-300 bg-white px-6 py-16 text-center text-sm text-zinc-400">
          No contacts yet — they populate from the HubSpot deal import and as deals get enriched.
        </div>
      ) : (
        <ContactsTable contacts={rows} />
      )}
    </div>
  );
}
