// Deal detail — the working view for one live deal: financials, stage
// control, next step, broker/owner contacts, and the activity feed.
import Link from "next/link";
import { notFound } from "next/navigation";
import ActivityForm from "@/components/ActivityForm";
import DealControls from "@/components/DealControls";
import { fetchDealDetail } from "@/lib/deal-detail";
import { hasDb } from "@/lib/db";
import { money } from "@/lib/mock";

export const dynamic = "force-dynamic";

const kindIcon: Record<string, string> = {
  meeting: "🗓", call: "📞", email: "✉️", note: "📝", task: "☑", doc: "📄",
};

const roleBadge: Record<string, string> = {
  owner: "bg-emerald-100 text-emerald-800",
  seller: "bg-emerald-100 text-emerald-800",
  broker: "bg-sky-100 text-sky-800",
  advisor: "bg-violet-100 text-violet-800",
};

export default async function DealPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!hasDb()) return <div className="p-8 text-sm text-zinc-400">Database not connected.</div>;

  const deal = await fetchDealDetail(id);
  if (!deal) notFound();
  const c = deal.company;

  const multiple =
    deal.asking !== null && c.ebitda !== null && c.ebitda > 0
      ? (deal.asking / c.ebitda).toFixed(1) + "×"
      : null;

  return (
    <div className="max-w-4xl p-8 space-y-6">
      <header>
        <Link href="/pipeline" className="text-sm text-emerald-700 hover:underline">← Pipeline</Link>
        <div className="mt-2 flex items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{deal.name}</h1>
            <p className="text-sm text-zinc-500">
              <Link href={`/companies/${c.id}`} className="text-emerald-700 hover:underline">
                {c.name}
              </Link>
              {[c.industry, [c.city, c.state].filter(Boolean).join(", ")]
                .filter(Boolean)
                .map((part) => ` · ${part}`)
                .join("")}
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
          {deal.fitScore !== null && (
            <span className="rounded-full bg-violet-100 px-3 py-1 text-sm font-semibold text-violet-800 tabular-nums">
              Fit {deal.fitScore}
            </span>
          )}
        </div>
      </header>

      <DealControls
        dealId={deal.id}
        stage={deal.stage}
        nextStep={deal.nextStep}
        nextStepDue={deal.nextStepDue}
        closedLostReason={deal.closedLostReason}
      />

      <section className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {[
          { label: "Revenue", value: money(c.revenue) },
          { label: c.ebitdaType, value: money(c.ebitda), accent: true },
          { label: multiple ? `Asking (${multiple})` : "Asking", value: money(deal.asking) },
          { label: "Our valuation", value: money(deal.ourValuation) },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-zinc-200 bg-white p-4">
            <div className="text-xs font-medium uppercase tracking-wide text-zinc-500">{s.label}</div>
            <div className={`mt-1 text-xl font-bold tabular-nums ${s.accent ? "text-emerald-800" : ""}`}>
              {s.value}
            </div>
          </div>
        ))}
      </section>

      {deal.listing && (
        <div className="rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm">
          <span className="text-zinc-500">Source listing: </span>
          {deal.listing.url ? (
            <a
              href={deal.listing.url}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-emerald-700 hover:underline"
            >
              {deal.listing.name} ↗
            </a>
          ) : (
            <span className="font-medium">{deal.listing.name}</span>
          )}
          <span className="ml-2 text-xs text-zinc-500">
            ({deal.listing.sourceId}
            {deal.listing.tier ? `, Tier ${deal.listing.tier}` : ""})
          </span>
        </div>
      )}

      <section className="space-y-3">
        <h2 className="font-semibold">Contacts</h2>
        <div className="grid gap-3 md:grid-cols-2">
          {deal.broker && (
            <div className="rounded-xl border border-zinc-200 bg-white p-4">
              <div className="flex items-center justify-between">
                <span className="font-semibold">{deal.broker.name ?? "Unnamed broker"}</span>
                <span className="rounded-full bg-sky-100 px-2 py-0.5 text-xs font-semibold text-sky-800">
                  listing broker
                </span>
              </div>
              {deal.broker.brokerage && <div className="mt-0.5 text-xs text-zinc-500">{deal.broker.brokerage}</div>}
              <div className="mt-2 space-y-0.5 text-sm">
                {deal.broker.phone && <div>📞 {deal.broker.phone}</div>}
                {deal.broker.email && (
                  <div>
                    ✉️ <a href={`mailto:${deal.broker.email}`} className="text-emerald-700 hover:underline">{deal.broker.email}</a>
                  </div>
                )}
              </div>
            </div>
          )}
          {deal.contacts.map((p) => (
            <div key={p.id} className="rounded-xl border border-zinc-200 bg-white p-4">
              <div className="flex items-center justify-between">
                <span className="font-semibold">{p.name ?? "Unnamed"}</span>
                {p.role && (
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${roleBadge[p.role] ?? "bg-zinc-100 text-zinc-600"}`}>
                    {p.role}
                  </span>
                )}
              </div>
              <div className="mt-2 space-y-0.5 text-sm">
                {p.phone && <div>📞 {p.phone}</div>}
                {p.email && (
                  <div>
                    ✉️ <a href={`mailto:${p.email}`} className="text-emerald-700 hover:underline">{p.email}</a>
                  </div>
                )}
                {p.linkedin && (
                  <div>
                    <a href={p.linkedin} target="_blank" rel="noopener noreferrer" className="text-emerald-700 hover:underline">
                      LinkedIn ↗
                    </a>
                  </div>
                )}
                {p.notes && <p className="pt-1 text-xs text-zinc-500">{p.notes}</p>}
              </div>
            </div>
          ))}
          {!deal.broker && deal.contacts.length === 0 && (
            <div className="rounded-xl border border-dashed border-zinc-300 px-4 py-8 text-center text-xs text-zinc-400 md:col-span-2">
              No contacts yet — broker and owner contacts land here as they&apos;re captured.
            </div>
          )}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="font-semibold">Activity</h2>
        <ActivityForm companyId={c.id} />
        <ul className="space-y-2">
          {deal.activities.map((a) => (
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
          {deal.activities.length === 0 && (
            <li className="rounded-xl border border-dashed border-zinc-300 px-4 py-8 text-center text-xs text-zinc-400">
              No activity yet — log the first note above.
            </li>
          )}
        </ul>
      </section>
    </div>
  );
}
