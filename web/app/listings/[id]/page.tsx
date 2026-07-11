// Listing detail — in-app view of one raw broker listing: financials, the
// Claude screener's tier + reasoning, price/event history, broker, and the
// promote-to-CRM action (real company name required).
import Link from "next/link";
import { notFound } from "next/navigation";
import PromoteForm from "@/components/PromoteForm";
import { fetchListingDetail } from "@/lib/listing-detail";
import { hasDb } from "@/lib/db";
import { money, margin, multiple } from "@/lib/mock";

export const dynamic = "force-dynamic";

const tierBadge: Record<number, string> = {
  1: "bg-emerald-100 text-emerald-800",
  2: "bg-amber-100 text-amber-800",
  3: "bg-zinc-100 text-zinc-600",
  4: "bg-red-100 text-red-700",
};

const eventLabel: Record<string, string> = {
  new: "First seen",
  price_change: "Price change",
  relisted: "Relisted",
  delisted: "Delisted",
};

export default async function ListingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!hasDb()) return <div className="p-8 text-sm text-zinc-400">Database not connected.</div>;

  const l = await fetchListingDetail(id);
  if (!l) notFound();

  return (
    <div className="max-w-4xl p-4 md:p-8 space-y-6">
      <header>
        <Link href="/listings" className="text-sm text-emerald-700 hover:underline">← Broker Listings</Link>
        <div className="mt-2 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold leading-snug tracking-tight">{l.name}</h1>
            <p className="mt-1 text-sm text-zinc-500">
              {[l.industry ?? l.industryRaw, [l.city, l.state].filter(Boolean).join(", ")].filter(Boolean).join(" · ")}
              {l.priorityState && <span className="ml-1 text-emerald-700">★ priority state</span>}
              {" · "}
              {l.url ? (
                <a href={l.url} target="_blank" rel="noopener noreferrer" className="text-emerald-700 hover:underline">
                  {l.sourceId} ↗
                </a>
              ) : (
                l.sourceId
              )}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {l.tier !== null && (
              <span className={`rounded px-2.5 py-1 text-sm font-semibold ${tierBadge[l.tier] ?? "bg-zinc-100 text-zinc-600"}`}>
                Tier {l.tier}
              </span>
            )}
            {l.delistedAt ? (
              <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-semibold text-zinc-500">
                DELISTED {l.delistedAt.slice(0, 10)}
              </span>
            ) : (
              <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">● LIVE</span>
            )}
          </div>
        </div>
      </header>

      <section className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {[
          { label: "Asking", value: money(l.asking) },
          {
            label: l.cashFlowType && l.cashFlowType !== "unknown" ? l.cashFlowType : "Cash flow",
            value: money(l.cashFlow),
            accent: true,
          },
          { label: "Revenue", value: money(l.revenue) },
          {
            label: "Multiple / Margin",
            value: `${multiple(l.asking, l.cashFlow)} · ${margin(l.cashFlow, l.revenue)}`,
          },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-zinc-200 bg-white p-4">
            <div className="text-xs font-medium uppercase tracking-wide text-zinc-500">{s.label}</div>
            <div className={`mt-1 text-xl font-bold tabular-nums ${s.accent ? "text-emerald-800" : ""}`}>{s.value}</div>
          </div>
        ))}
      </section>

      {l.company ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 px-4 py-3 text-sm">
          ✓ In the CRM as{" "}
          <Link href={`/companies/${l.company.id}`} className="font-semibold text-emerald-700 hover:underline">
            {l.company.name}
          </Link>
        </div>
      ) : (
        !l.delistedAt && <PromoteForm listingId={l.id} />
      )}

      {l.tierReasoning && (
        <section className="rounded-xl border border-zinc-200 bg-white p-5">
          <h2 className="font-semibold">Screener reasoning {l.tier !== null && <span className="text-sm font-normal text-zinc-500">(Tier {l.tier})</span>}</h2>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-zinc-700">{l.tierReasoning}</p>
        </section>
      )}

      {l.description && (
        <section className="rounded-xl border border-zinc-200 bg-white p-5">
          <h2 className="font-semibold">Listing description</h2>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-zinc-700">{l.description}</p>
        </section>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <section className="rounded-xl border border-zinc-200 bg-white p-5">
          <h2 className="font-semibold">Event history</h2>
          <ul className="mt-3 space-y-2 text-sm">
            <li className="flex items-center justify-between text-zinc-600">
              <span>Last seen by scraper</span>
              <span className="tabular-nums">{l.lastSeen}</span>
            </li>
            {l.events.filter((e) => e.event_type !== "new").map((e, i) => (
              <li key={i} className="flex items-center justify-between">
                <span className="font-medium">
                  {eventLabel[e.event_type] ?? e.event_type}
                  {e.event_type === "price_change" && e.detail?.from != null && e.detail?.to != null && (
                    <span className="ml-1 font-normal text-zinc-500 tabular-nums">
                      {money(Number(e.detail.from))} → {money(Number(e.detail.to))}
                    </span>
                  )}
                </span>
                <span className="text-zinc-500 tabular-nums">{e.created_at.slice(0, 10)}</span>
              </li>
            ))}
            <li className="flex items-center justify-between text-zinc-600">
              <span>First seen</span>
              <span className="tabular-nums">{l.firstSeen}</span>
            </li>
          </ul>
        </section>

        <section className="rounded-xl border border-zinc-200 bg-white p-5">
          <h2 className="font-semibold">Broker</h2>
          {l.broker ? (
            <div className="mt-3 text-sm">
              <div className="font-semibold">{l.broker.name ?? "Unnamed broker"}</div>
              {l.broker.brokerage && <div className="text-xs text-zinc-500">{l.broker.brokerage}</div>}
              <div className="mt-2 space-y-0.5">
                {l.broker.phone && <div>📞 {l.broker.phone}</div>}
                {l.broker.email && (
                  <div>
                    ✉️ <a href={`mailto:${l.broker.email}`} className="text-emerald-700 hover:underline">{l.broker.email}</a>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <p className="mt-3 text-sm text-zinc-400">
              No broker captured for this listing{l.sourceId ? ` (${l.sourceId} doesn't expose one on the card)` : ""}.
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
