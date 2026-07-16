// Upgraded company profile (server component) — supersedes the body of
// app/companies/[id]/page.tsx. Adds: contacts section, listing history with
// events, and a market-multiple comparison vs the company's industry.
// PM swap: the page becomes `return <CompanyDetailV2 id={id} />`.
import Link from "next/link";
import { notFound } from "next/navigation";
import ActivityForm from "@/components/ActivityForm";
import { AttachmentPanel } from "@/components/Attachments";
import BackLink from "@/components/BackLink";
import CompanyEditor from "@/components/CompanyEditor";
import ContactsSection from "@/components/ContactsSection";
import DealControls from "@/components/DealControls";
import InlineField from "@/components/InlineField";
import StarButton from "@/components/StarButton";
import MarketCheckCard from "@/components/MarketCheckCard";
import { fetchCompanyDetail } from "@/lib/company-detail";
import { companyLevel } from "@/lib/company-level";
import { TIER_LABELS } from "@/lib/size";
import { LEVEL_META } from "@/lib/completeness";
import { money } from "@/lib/mock";

const levelChipCls: Record<string, string> = {
  full: "bg-emerald-700 text-white",
  contactable: "bg-emerald-100 text-emerald-800",
  identified: "bg-amber-100 text-amber-800",
  basic: "bg-zinc-100 text-zinc-600",
  raw: "bg-zinc-50 text-zinc-400",
};

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
  const { company: c, deal, contacts, activities, listings, comparison, leadChannels, size, shortlist } = data;
  const estRange = (r: [number, number]) => {
    const f = (n: number) => (n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(1)}M` : `$${Math.round(n / 1000)}K`);
    return `~${f(r[0])}–${f(r[1])}`;
  };
  const tierChipCls: Record<string, string> = {
    platform: "bg-emerald-100 text-emerald-800",
    tuckin: "bg-sky-100 text-sky-800",
    toosmall: "bg-zinc-100 text-zinc-500",
    unsized: "bg-zinc-50 text-zinc-400 border border-zinc-200",
  };

  return (
    <div className="max-w-4xl p-4 md:p-8 space-y-6">
      <header>
        <BackLink fallback="/companies" fallbackLabel="Companies" />
        <div className="mt-2 flex items-end justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{c.name}</h1>
            {/* inline-editable facts (John 7/15): click a value to fix/add it */}
            <p className="flex flex-wrap items-center gap-x-1 text-sm text-zinc-500">
              <InlineField endpoint={`/api/companies/${c.id}`} field="industry" value={c.industry} placeholder="industry…" />
              <span className="text-zinc-300">·</span>
              <InlineField endpoint={`/api/companies/${c.id}`} field="city" value={c.city} placeholder="city…" />
              <span className="text-zinc-300">,</span>
              <InlineField endpoint={`/api/companies/${c.id}`} field="state" value={c.state} placeholder="ST" />
              <span className="text-zinc-300">·</span>
              <InlineField endpoint={`/api/companies/${c.id}`} field="website" value={c.website} type="url" placeholder="website…"
                className="text-emerald-700" />
              {c.website && (
                <a href={c.website} target="_blank" rel="noopener noreferrer" className="text-emerald-700 hover:underline">↗</a>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <StarButton companyId={c.id} shortlist={shortlist} />
            {(() => {
              const lv = companyLevel(contacts, c.website);
              return (
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-semibold ${levelChipCls[lv.level]}`}
                  title={LEVEL_META[lv.level].label}
                >
                  {LEVEL_META[lv.level].dot} {lv.level}
                </span>
              );
            })()}
            {size && (
              <span
                className={`rounded-full px-2.5 py-1 text-xs font-semibold ${tierChipCls[size.tier]}`}
                title={`~${size.employees[0]}–${size.employees[1]} employees (${size.basis}) → ${estRange(size.revenue)} rev → ${estRange(size.ebitda)} EBITDA · ${size.confidence} confidence`}
              >
                {TIER_LABELS[size.tier]}
              </span>
            )}
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
          { label: "Revenue", field: "revenue", raw: c.revenue, est: c.revenue === null && size ? estRange(size.revenue) : null },
          { label: c.ebitdaType, field: "ebitda", raw: c.ebitda, est: c.ebitda === null && size ? estRange(size.ebitda) : null },
          { label: "Asking", field: null, raw: deal?.asking ?? null, est: null },
          { label: "Origin", field: null, raw: null, text: c.origin ?? "—", est: null },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-zinc-200 bg-white p-4">
            <div className="text-xs font-medium uppercase tracking-wide text-zinc-500">{s.label}</div>
            {s.field ? (
              // click the figure (or the ~estimate) to type the real number
              <div className={`mt-1 tabular-nums ${s.est ? "text-lg font-semibold text-zinc-500" : "text-xl font-bold"}`}>
                <InlineField
                  endpoint={`/api/companies/${c.id}`}
                  field={s.field}
                  value={s.raw}
                  type="number"
                  placeholder={s.est ?? "add…"}
                  format="money"
                />
              </div>
            ) : (
              <div className="mt-1 text-xl font-bold tabular-nums">{"text" in s ? s.text : money(s.raw)}</div>
            )}
          </div>
        ))}
      </section>

      <MarketCheckCard check={comparison} />

      {leadChannels && (
        <div className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-xs text-sky-900">
          <span className="font-semibold">From enrichment — not yet on a contact:</span>{" "}
          {leadChannels.email && <span className="mr-3">📧 {leadChannels.email}</span>}
          {leadChannels.phone && <span className="mr-3">📞 {leadChannels.phone}</span>}
          {leadChannels.linkedin && (
            <a href={leadChannels.linkedin} target="_blank" rel="noreferrer" className="mr-3 underline">in/ LinkedIn</a>
          )}
          {leadChannels.ownerName && <span className="text-sky-700">(lead&apos;s owner: {leadChannels.ownerName})</span>}
          <span className="ml-1 text-sky-600">— the nightly sync folds these onto the contact; edit the contact below to adopt them now.</span>
        </div>
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

      <AttachmentPanel endpoint={`/api/companies/${c.id}/attachments`} heading="Documents" hint="No documents yet — attach a CIM, NDA, LOI, or analysis to this company." />

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
