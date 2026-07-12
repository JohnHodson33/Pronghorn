// Broker catalog — identities scraped from listings, with coverage (how many
// deals, which industries, which states) derived from their linked listings.
// Same searchable/filterable/exportable pattern as Broker Listings.
import BrokersTable from "@/components/BrokersTable";
import { fetchBrokers } from "@/lib/crm";

export const dynamic = "force-dynamic";

export default async function Brokers() {
  const brokers = await fetchBrokers();

  return (
    <div className="p-4 md:p-8 space-y-5">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Broker Directory</h1>
        <p className="text-sm text-zinc-500">
          The auto-scraped <span className="font-medium">universe</span> of brokers and the coverage they
          represent — hundreds of names, mostly cold. The people we actually work live in{" "}
          <a href="/contacts" className="text-emerald-700 hover:underline">Contacts</a>; use{" "}
          <span className="font-medium">+ Contacts</span> on a row to promote a broker into the CRM.
        </p>
      </header>

      {!brokers || brokers.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-300 bg-white px-6 py-16 text-center text-sm text-zinc-400">
          No brokers captured yet. Broker names are scraped from sources that publish them
          (GABB, LINK Business, Transworld); the catalog fills in as those sources run.
        </div>
      ) : (
        <BrokersTable brokers={brokers} />
      )}
    </div>
  );
}
