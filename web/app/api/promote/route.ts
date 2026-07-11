// Promote a listing into the CRM: creates a company + deal, links the listing.
// FIRM RULE enforced: a CRM record requires a REAL company name — broker
// listings are anonymized, so the promoter must supply the actual name
// (learned from the CIM/NDA/broker call).
import { NextResponse } from "next/server";
import { hasDb, serverDb } from "@/lib/db";

export async function POST(req: Request) {
  if (!hasDb()) return NextResponse.json({ error: "no db" }, { status: 503 });
  const { listingId, companyName, realRevenue, realEbitda, ownerName, ownerEmail, ownerPhone } =
    await req.json();
  const name = String(companyName ?? "").trim();
  if (!listingId || name.length < 2)
    return NextResponse.json(
      { error: "Real company name required (firm rule: no anonymized records in the CRM)" },
      { status: 400 }
    );
  const num = (v: unknown) => {
    if (v === null || v === undefined || v === "") return null;
    const n = Number(String(v).replace(/[,$]/g, ""));
    return Number.isFinite(n) ? n : null;
  };

  const db = serverDb();
  const { data: l, error: le } = await db
    .from("listings")
    .select("id, name, industry, industry_raw, city, state, asking_price, gross_revenue, cash_flow, cash_flow_type, company_id, url")
    .eq("id", listingId)
    .single();
  if (le || !l) return NextResponse.json({ error: le?.message ?? "listing not found" }, { status: 404 });
  if (l.company_id) return NextResponse.json({ error: "Listing already promoted" }, { status: 409 });

  const { data: company, error: ce } = await db
    .from("companies")
    .insert({
      name,
      industry: l.industry ?? l.industry_raw,
      city: l.city,
      state: l.state,
      revenue: num(realRevenue) ?? l.gross_revenue,
      ebitda: num(realEbitda) ?? l.cash_flow,
      ebitda_type: l.cash_flow_type,
      origin: "listing",
      listing_id: l.id,
      notes: `Promoted from listing: "${l.name}" (${l.url ?? "no url"})`,
    })
    .select("id")
    .single();
  if (ce) return NextResponse.json({ error: ce.message }, { status: 500 });

  const { data: deal, error: de } = await db
    .from("deals")
    .insert({ company_id: company.id, name, stage: "Sourced", asking_price: l.asking_price })
    .select("id")
    .single();
  if (de) return NextResponse.json({ error: de.message }, { status: 500 });

  await db.from("listings").update({ company_id: company.id }).eq("id", l.id);
  await db.from("listing_reviews").upsert({ listing_id: l.id, status: "promoted" });

  // Owner contact from the post-NDA reveal.
  if (String(ownerName ?? "").trim()) {
    await db.from("contacts").insert({
      company_id: company.id,
      role: "owner",
      name: String(ownerName).trim(),
      email: String(ownerEmail ?? "").trim() || null,
      phone: String(ownerPhone ?? "").trim() || null,
    });
  }

  // Carry the pursuit history over as the founding activity.
  const { data: events } = await db
    .from("listing_events")
    .select("event_type, created_at")
    .eq("listing_id", l.id)
    .order("created_at", { ascending: true })
    .limit(50);
  const history = (events ?? [])
    .map((e) => `${e.created_at.slice(0, 10)} — ${e.event_type}`)
    .join("\n");
  await db.from("activities").insert({
    company_id: company.id,
    deal_id: deal.id,
    kind: "note",
    body: `Deal created from broker listing "${l.name}"${history ? `\n\nPursuit history:\n${history}` : ""}`,
  });

  return NextResponse.json({ ok: true, companyId: company.id, dealId: deal.id });
}
