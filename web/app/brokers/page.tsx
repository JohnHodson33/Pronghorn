// Broker catalog — identities scraped from listings, with coverage (how many
// deals, which industries, which states) derived from their linked listings.
// First wave of CRM broker data: know who covers what before we engage.
import { fetchBrokers } from "@/lib/crm";

export const dynamic = "force-dynamic";

export default async function Brokers() {
  const brokers = await fetchBrokers();

  return (
    <div className="p-8 space-y-5">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Brokers</h1>
        <p className="text-sm text-zinc-500">
          Brokers scraped from listings, with the coverage they represent. As deals get pursued and
          enriched, brokers tag to the companies and deals they source.
        </p>
      </header>

      {!brokers || brokers.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-300 bg-white px-6 py-16 text-center text-sm text-zinc-400">
          No brokers captured yet. Broker names are scraped from sources that publish them
          (GABB, LINK Business, Transworld); the catalog fills in as those sources run.
        </div>
      ) : (
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
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {brokers.map((b) => (
                <tr key={b.id} className="align-top hover:bg-zinc-50">
                  <td className="px-4 py-3 font-medium">{b.name}</td>
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
                    {b.phone || b.email ? [b.phone, b.email].filter(Boolean).join(" · ") : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
