import { fetchCompanies } from "@/lib/crm";
import { money } from "@/lib/mock";

export const dynamic = "force-dynamic";

export default async function Companies() {
  const companies = await fetchCompanies();

  return (
    <div className="p-8 space-y-5">
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
        <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-200 text-left text-xs uppercase tracking-wide text-zinc-500">
                <th className="px-4 py-3">Company</th>
                <th className="px-4 py-3">Location</th>
                <th className="px-4 py-3 text-right">Revenue</th>
                <th className="px-4 py-3 text-right">EBITDA</th>
                <th className="px-4 py-3">Deal stage</th>
                <th className="px-4 py-3">Origin</th>
                <th className="px-4 py-3">Added</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {companies.map((c) => (
                <tr key={c.id} className="hover:bg-zinc-50">
                  <td className="px-4 py-3">
                    <a href={`/companies/${c.id}`} className="font-medium hover:text-emerald-700 hover:underline">
                      {c.name}
                    </a>
                    <div className="text-xs text-zinc-500">{c.industry ?? "—"}</div>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    {[c.city, c.state].filter(Boolean).join(", ") || "—"}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">{money(c.revenue === null ? null : Number(c.revenue))}</td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    <span className="font-semibold text-emerald-800">
                      {money(c.ebitda === null ? null : Number(c.ebitda))}
                    </span>
                    {c.ebitda_type && <span className="ml-1 text-xs text-zinc-500">{c.ebitda_type}</span>}
                  </td>
                  <td className="px-4 py-3">
                    {c.deals?.[0]?.stage ? (
                      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-800">
                        {c.deals[0].stage}
                      </span>
                    ) : (
                      <span className="text-xs text-zinc-400">no deal</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-zinc-500">{c.origin ?? "—"}</td>
                  <td className="px-4 py-3 text-xs text-zinc-500">{c.created_at.slice(0, 10)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
