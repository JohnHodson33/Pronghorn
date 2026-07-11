// Upgraded company profile (server component) — supersedes the body of
// app/companies/[id]/page.tsx. Adds: contacts section, listing history with
// events, and a market-multiple comparison vs the company's industry.
// PM swap: the page becomes `return <CompanyDetailV2 id={id} />`.
import Link from "next/link";
import { notFound } from "next/navigation";
import ActivityForm from "@/components/ActivityForm";
import CompanyEditor from "@/components/CompanyEditor";
import ContactsSection from "@/components/ContactsSection";
import DealControls from "@/components/DealControls";
import { fetchCompanyDetail } from "@/lib/company-detail";
import { money } from "@/lib/mock";

const kindIcon: Record<string, string> = {
  meeting: "🗓", call: "📞", email: "✉️", note: "📝", task: "☑", doc: "📄",
};

const eventLabel: Record<string, string> = {
  new: "first seen",
  price_change: "price change",
  relisted: "relisted",
  delisted: "delisted",
};

export default async function CompanyDetailV2({ id }: { id: string }) {
  const data = await fetchCompanyDetail(id);
  if (!data) notFound();
  const { company: c, deal, contacts, activities, listings, comparison } = data;

  const rich =
    comparison?.companyMultiple != null && comparison?.industryMedian != null
      ? comparison.companyMultiple > comparison.industryMedian
      : null;

  return (
    <div className="max-w-4xl p-4 md:p-8 space-y-6">
      <header>
        <Link href="/companies" className="text-sm text-emerald-700 hover:underline">← Companies</Link>
        <div className="mt-2 flex items-end justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{c.name}</h1>
            <p className="text-sm text-zinc-500">
              {[c.industry, [c.city, c.state].filter(Boolean).join(", ")].filter(Boolean).join(" · ")}
              {c.website && (
                <>
                  {" · "}
                  <a href={c.website} target="_blank" rel="noopener noreferrer" className="text-emerald-700 hover:underline">
                    website ↗
                  </a>
                </>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <CompanyEditor
              companyId={c.id}
              name={c.name}
              industry={c.industry}
              city={c.city}
              state={c.state}
              website={c.website}
              revenue={c.revenue}
              ebitda={c.ebitda}
              ebitdaType={c.ebitdaType}
            />
            {deal && (
              <Link
                href={`/deals/${deal.id}`}
                className="rounded-full bg-emerald-100 px-3 py-1 text-sm font-semibold text-emerald-800 hover:bg-emerald-200"
                title="Open deal working view"
              >
                {deal.stage} →
              </Link>
            )}
          </div>
        </div>
      </header>

      {deal && (
        <DealControls
          dealId={deal.id}
          stage={deal.stage}
          nextStep={deal.nextStep}
          nextStepDue={deal.nextStepDue}
          closedLostReason={deal.closedLostReason}
        />
      )}

      <section className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {[
          { label: "Revenue", value: money(c.revenue) },
          { label: c.ebitdaType, value: money(c.ebitda) },
          { label: "Asking", value: money(deal?.asking ?? null) },
          { label: "Origin", value: c.origin ?? "—" },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-zinc-200 bg-white p-4">
            <div className="text-xs font-medium uppercase tracking-wide text-zinc-500">{s.label}</div>
            <div className="mt-1 text-xl font-bold tabular-nums">{s.value}</div>
          </div>
        ))}
      </section>

      {comparison && (
        <section className="rounded-xl border border-zinc-200 bg-white p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-sm">
              <span className="font-semibold">Market check — {comparison.industry}: </span>
              {comparison.companyMultiple !== null ? (
                <>
                  asking{" "}
                  <span className={`font-bold ${rich ? "text-red-700" : "text-emerald-700"}`}>
                    {comparison.companyMultiple.toFixed(1)}×
                  </span>{" "}
                  vs market median{" "}
                  <span className="font-bold">
                    {comparison.industryMedian === null ? "—" : `${comparison.industryMedian.toFixed(1)}×`}
                  </span>
                  {rich !== null && (
                    <span className={`ml-2 rounded-full px-2 py-0.5 text-xs font-semibold ${
                      rich ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-800"
                    }`}>
                      {rich ? "priced above market" : "at/below market"}
                    </span>
                  )}
                </>
              ) : (
                <>
                  market median{" "}
                  <span className="font-bold">
                    {comparison.industryMedian === null ? "—" : `${comparison.industryMedian.toFixed(1)}×`}
                  </span>{" "}
                  (no asking price on the deal yet)
                </>
              )}
            </div>
            <div className="text-xs text-zinc-500 tabular-nums">
              n={comparison.industryN}
              {comparison.bandKey && comparison.bandMedian !== null && (
                <> · {comparison.bandKey} band: {comparison.bandMedian.toFixed(1)}× (n={comparison.bandN})</>
              )}
              {" · "}
              <Link href="/analytics" className="text-emerald-700 hover:underline">Market Multiples →</Link>
            </div>
          </div>
        </section>
      )}

      <ContactsSection companyId={c.id} contacts={contacts} />

      <section className="space-y-3">
        <h2 className="font-semibold">Listing history</h2>
        {listings.length === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-300 px-4 py-8 text-center text-xs text-zinc-400">
            No linked listings — this company came in via {c.origin ?? "manual entry"}.
          </div>
        ) : (
          <ul className="space-y-2">
            {listings.map((l) => (
              <li key={l.id} className="rounded-xl border border-zinc-200 bg-white p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    {l.url ? (
                      <a href={l.url} target="_blank" rel="noopener noreferrer" className="truncate text-sm font-medium hover:text-emerald-700 hover:underline">
                        {l.name ?? "(unnamed listing)"} ↗
                      </a>
                    ) : (
                      <span className="truncate text-sm font-medium">{l.name ?? "(unnamed listing)"}</span>
                    )}
                    <span className="ml-2 text-xs text-zinc-500">
                      {l.sourceId}
                      {l.tier ? ` · Tier ${l.tier}` : ""}
                      {l.isOrigin ? " · origin" : ""}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="tabular-nums text-zinc-600">
                      {money(l.cashFlow)} CF · ask {money(l.asking)}
                    </span>
                    {l.delistedAt ? (
                      <span className="rounded-full bg-zinc-100 px-2 py-0.5 font-semibold text-zinc-500">
                        delisted {l.delistedAt.slice(0, 10)}
                      </span>
                    ) : (
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 font-semibold text-emerald-800">live</span>
                    )}
                  </div>
                </div>
                <div className="mt-2 text-xs text-zinc-500">
                  seen {l.firstSeen} → {l.lastSeen}
                  {l.events.length > 0 && (
                    <span>
                      {" · "}
                      {l.events
                        .slice(0, 4)
                        .map((e) => `${eventLabel[e.event_type] ?? e.event_type} ${e.created_at.slice(0, 10)}`)
                        .join(" · ")}
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="font-semibold">Activity</h2>
        <ActivityForm companyId={id} />
        <ul className="space-y-2">
          {activities.map((a) => (
            <li key={a.id} className="rounded-xl border border-zinc-200 bg-white p-4">
              <div className="mb-1 flex items-center justify-between text-xs text-zinc-500">
                <span className="font-semibold capitalize">{kindIcon[a.kind] ?? "📝"} {a.kind}</span>
                <span>{a.created_at.slice(0, 16).replace("T", " ")}</span>
              </div>
              <p className="whitespace-pre-wrap text-sm text-zinc-800">{a.body}</p>
              {a.doc_url && (
                <a href={a.doc_url} target="_blank" rel="noopener noreferrer" className="mt-1 inline-block text-xs text-emerald-700 hover:underline">
                  linked doc ↗
                </a>
              )}
            </li>
          ))}
          {activities.length === 0 && (
            <li className="rounded-xl border border-dashed border-zinc-300 px-4 py-8 text-center text-xs text-zinc-400">
              No activity yet — log the first meeting note above.
            </li>
          )}
        </ul>
      </section>
    </div>
  );
}
