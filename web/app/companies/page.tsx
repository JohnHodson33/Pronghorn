import CompaniesTable from "@/components/CompaniesTable";
import { fetchCompanies } from "@/lib/crm";

export const dynamic = "force-dynamic";

export default async function Companies() {
  const companies = await fetchCompanies();

  return (
    <div className="p-4 md:p-8 space-y-5">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Companies</h1>
        <p className="text-sm text-zinc-500">
          The canonical CRM entity — every listing promotion, lead, and (later) meeting note attaches here.
        </p>
      </header>

      {!companies || companies.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-300 bg-white px-6 py-16 text-center text-sm text-zinc-400">
          No companies yet. Promote a Tier 1 listing from Broker Listings (→ CRM button) — a
          company + deal get created together. Firm rule: requires the real company name.
        </div>
      ) : (
        <CompaniesTable companies={companies} />
      )}
    </div>
  );
}
