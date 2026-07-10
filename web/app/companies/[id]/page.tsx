// Company profile — the CRM hub. Everything about one target in one place:
// financials, deal state, provenance (listing/lead), and the shared activity
// feed where meeting notes land.
import Link from "next/link";
import { notFound } from "next/navigation";
import ActivityForm from "@/components/ActivityForm";
import { hasDb, serverDb } from "@/lib/db";
import { money } from "@/lib/mock";

export const dynamic = "force-dynamic";

const kindIcon: Record<string, string> = {
  meeting: "🗓", call: "📞", email: "✉️", note: "📝", task: "☑", doc: "📄",
};

export default async function CompanyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!hasDb()) return <div className="p-8 text-sm text-zinc-400">Database not connected.</div>;

  const db = serverDb();
  // companies↔listings relate in two directions (companies.listing_id origin
  // pointer AND listings.company_id identity link) — name the FK explicitly.
  const { data: c, error } = await db
    .from("companies")
    .select(
      "*, deals(id, name, stage, asking_price, next_step, next_step_due), origin_listing:listings!companies_listing_id_fkey(name, url, source_id, tier)"
    )
    .eq("id", id)
    .maybeSingle();
  if (error) console.error("company fetch failed:", error.message);
  if (!c) notFound();

  const { data: activities } = await db
    .from("activities")
    .select("id, kind, body, doc_url, created_at")
    .eq("company_id", id)
    .order("created_at", { ascending: false })
    .limit(100);

  const deal = c.deals?.[0];
  const listing = Array.isArray(c.origin_listing) ? c.origin_listing[0] : c.origin_listing;

  return (
    <div className="max-w-4xl p-8 space-y-6">
      <header>
        <Link href="/companies" className="text-sm text-emerald-700 hover:underline">← Companies</Link>
        <div className="mt-2 flex items-end justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{c.name}</h1>
            <p className="text-sm text-zinc-500">
              {[c.industry, [c.city, c.state].filter(Boolean).join(", ")].filter(Boolean).join(" · ")}
            </p>
          </div>
          {deal && (
            <span className="rounded-full bg-emerald-100 px-3 py-1 text-sm font-semibold text-emerald-800">
              {deal.stage}
            </span>
          )}
        </div>
      </header>

      <section className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {[
          { label: "Revenue", value: money(c.revenue === null ? null : Number(c.revenue)) },
          { label: c.ebitda_type ?? "EBITDA", value: money(c.ebitda === null ? null : Number(c.ebitda)) },
          { label: "Asking", value: money(deal?.asking_price == null ? null : Number(deal.asking_price)) },
          { label: "Origin", value: c.origin ?? "—" },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-zinc-200 bg-white p-4">
            <div className="text-xs font-medium uppercase tracking-wide text-zinc-500">{s.label}</div>
            <div className="mt-1 text-xl font-bold tabular-nums">{s.value}</div>
          </div>
        ))}
      </section>

      {listing && (
        <div className="rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm">
          <span className="text-zinc-500">Source listing: </span>
          {listing.url ? (
            <a href={listing.url} target="_blank" rel="noopener noreferrer" className="font-medium text-emerald-700 hover:underline">
              {listing.name} ↗
            </a>
          ) : (
            <span className="font-medium">{listing.name}</span>
          )}
          <span className="ml-2 text-xs text-zinc-500">({listing.source_id}{listing.tier ? `, Tier ${listing.tier}` : ""})</span>
        </div>
      )}

      <section className="space-y-3">
        <h2 className="font-semibold">Activity</h2>
        <ActivityForm companyId={id} />
        <ul className="space-y-2">
          {(activities ?? []).map((a) => (
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
          {(activities ?? []).length === 0 && (
            <li className="rounded-xl border border-dashed border-zinc-300 px-4 py-8 text-center text-xs text-zinc-400">
              No activity yet — log the first meeting note above.
            </li>
          )}
        </ul>
      </section>
    </div>
  );
}
