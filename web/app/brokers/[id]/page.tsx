// Broker detail — one directory entry: reachability, coverage, and every
// listing they represent (the relationship picture before we engage).
import Link from "next/link";
import { notFound } from "next/navigation";
import { hasDb, serverDb } from "@/lib/db";
import { money, multiple } from "@/lib/mock";

export const dynamic = "force-dynamic";

const tierBadge: Record<number, string> = {
  1: "bg-emerald-100 text-emerald-800",
  2: "bg-amber-100 text-amber-800",
  3: "bg-zinc-100 text-zinc-600",
  4: "bg-red-100 text-red-700",
};

export default async function BrokerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!hasDb()) return <div className="p-8 text-sm text-zinc-400">Database not connected.</div>;
  const db = serverDb();

  const [{ data: b }, { data: listings }, { data: contact }] = await Promise.all([
    db.from("brokers").select("id, name, brokerage, email, phone, website, linkedin, specialties, relationship_notes").eq("id", id).maybeSingle(),
    db
      .from("listings")
      .select("id, name, industry, city, state, asking_price, cash_flow, cash_flow_type, tier, delisted_at, first_seen_at")
      .eq("broker_id", id)
      .is("duplicate_of", null)
      .order("first_seen_at", { ascending: false })
      .limit(100),
    db.from("contacts").select("id").eq("broker_id", id).maybeSingle(),
  ]);
  if (!b) notFound();

  const live = (listings ?? []).filter((l) => !l.delisted_at);

  return (
    <div className="max-w-4xl p-4 md:p-8 space-y-6">
      <header>
        <Link href="/brokers" className="text-sm text-emerald-700 hover:underline">← Broker Directory</Link>
        <div className="mt-2 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{b.name ?? "(unnamed broker)"}</h1>
            <p className="text-sm text-zinc-500">
              {[b.brokerage, b.specialties].filter(Boolean).join(" · ") || "—"}
            </p>
          </div>
          {contact ? (
            <Link href={`/contacts?broker=${id}`} className="shrink-0 rounded-full bg-emerald-100 px-3 py-1 text-sm font-semibold text-emerald-800 hover:bg-emerald-200"
              title="Open this broker's contact record, filtered">
              in Contacts ✓ →
            </Link>
          ) : (
            <span className="shrink-0 rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-500">
              directory only
            </span>
          )}
        </div>
      </header>

      <section className="rounded-xl border border-zinc-200 bg-white p-4 text-sm">
        <div className="flex flex-wrap gap-x-6 gap-y-1">
          {b.phone && <span>📞 {b.phone}</span>}
          {b.email && (
            <a href={`mailto:${b.email}`} className="text-emerald-700 hover:underline">✉️ {b.email}</a>
          )}
          {b.website && (
            <a href={b.website} target="_blank" rel="noopener noreferrer" className="text-emerald-700 hover:underline">website ↗</a>
          )}
          {b.linkedin && (
            <a href={b.linkedin} target="_blank" rel="noopener noreferrer" className="text-emerald-700 hover:underline">LinkedIn ↗</a>
          )}
          {!b.phone && !b.email && !b.website && !b.linkedin && (
            <span className="text-zinc-400">No reachability scraped yet — broker-contact enrichment is a Lane A queue item.</span>
          )}
        </div>
        {b.relationship_notes && <p className="mt-2 text-xs text-zinc-500">{b.relationship_notes}</p>}
      </section>

      <section className="space-y-3">
        <h2 className="font-semibold">
          Listings represented{" "}
          <span className="text-sm font-normal text-zinc-500">
            ({live.length} live · {(listings ?? []).length - live.length} delisted)
          </span>
        </h2>
        <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-200 text-left text-xs uppercase tracking-wide text-zinc-500">
                <th className="px-4 py-2.5">Listing</th>
                <th className="px-4 py-2.5">Tier</th>
                <th className="px-4 py-2.5">Location</th>
                <th className="px-4 py-2.5 text-right">Cash flow</th>
                <th className="px-4 py-2.5 text-right">Asking</th>
                <th className="px-4 py-2.5 text-right">Multiple</th>
                <th className="px-4 py-2.5">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {(listings ?? []).map((l) => (
                <tr key={l.id} className={`hover:bg-zinc-50 ${l.delisted_at ? "text-zinc-400" : ""}`}>
                  <td className="max-w-sm px-4 py-2.5">
                    <Link href={`/listings/${l.id}`} className="block truncate font-medium hover:text-emerald-700 hover:underline">
                      {l.name ?? "(unnamed)"}
                    </Link>
                    <span className="text-xs text-zinc-500">{l.industry ?? "—"}</span>
                  </td>
                  <td className="px-4 py-2.5">
                    {l.tier !== null ? (
                      <span className={`rounded px-1.5 py-0.5 text-xs font-semibold ${tierBadge[l.tier] ?? "bg-zinc-100 text-zinc-600"}`}>
                        {l.tier}
                      </span>
                    ) : (
                      <span className="text-xs text-zinc-300">—</span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-4 py-2.5">{[l.city, l.state].filter(Boolean).join(", ") || "—"}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">
                    {money(l.cash_flow === null ? null : Number(l.cash_flow))}
                    {l.cash_flow_type && l.cash_flow_type !== "unknown" && (
                      <span className="ml-1 text-xs text-zinc-400">{l.cash_flow_type}</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{money(l.asking_price === null ? null : Number(l.asking_price))}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">
                    {multiple(
                      l.asking_price === null ? null : Number(l.asking_price),
                      l.cash_flow === null ? null : Number(l.cash_flow)
                    )}
                  </td>
                  <td className="px-4 py-2.5">
                    {l.delisted_at ? (
                      <span className="text-xs">delisted</span>
                    ) : (
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800">live</span>
                    )}
                  </td>
                </tr>
              ))}
              {(listings ?? []).length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-sm text-zinc-400">
                    No listings linked to this broker yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
