// Outbox — pre-drafted broker inquiries queued for John's ONE-CLICK send
// (LISTING-PURSUIT-FLOW §1). This route DRAFTS and QUEUES only; the send
// endpoint is /api/outbox/[id] and fires solely on John's explicit click.
//
// GET  → queued + recent outbox emails
// POST { listingId, dryRun? } → builds the inquiry from JOHN'S VERBATIM
//   TEMPLATE (deterministic — only broker first name + industry vary; no
//   LLM, no API key), queues it, advances the listing to info_requested,
//   and logs a listing_event. dryRun returns the draft only.
import { NextResponse } from "next/server";
import { hasDb, serverDb } from "@/lib/db";
import { buildBrokerInquiry, type ListingForDraft } from "@/lib/inquiry";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!hasDb()) return NextResponse.json({ error: "no db" }, { status: 503 });
  // draft_meta (why-drafted provenance) arrives with 0013 — retry without it
  const select = (withMeta: boolean) =>
    serverDb()
      .from("outbox_emails")
      .select("id, listing_id, to_email, to_name, subject, body, status, created_at, sent_at" + (withMeta ? ", draft_meta" : ""))
      .order("created_at", { ascending: false })
      .limit(100);
  let { data, error } = await select(true);
  if (error) ({ data, error } = await select(false));
  if (error) return NextResponse.json({ error: `${error.message} — apply migration 0006`, emails: [] }, { status: 200 });
  return NextResponse.json({ emails: data });
}

export async function POST(req: Request) {
  if (!hasDb()) return NextResponse.json({ error: "no db" }, { status: 503 });
  const db = serverDb();
  const { listingId, dryRun } = await req.json();
  if (!listingId) return NextResponse.json({ error: "listingId required" }, { status: 400 });

  const { data: listing } = await db
    .from("listings")
    .select("id, name, industry, city, state, asking_price, cash_flow, cash_flow_type, gross_revenue, description, source_id, brokers(name, email, brokerage)")
    .eq("id", listingId)
    .maybeSingle();
  if (!listing) return NextResponse.json({ error: "listing not found" }, { status: 404 });
  const broker = (Array.isArray(listing.brokers) ? listing.brokers[0] : listing.brokers) as
    { name: string | null; email: string | null; brokerage: string | null } | null;
  if (!broker?.email) {
    return NextResponse.json({ error: "no broker email on this listing — use the co-pilot path" }, { status: 422 });
  }

  // John's verbatim template — deterministic, $0, exact words guaranteed
  const draft = buildBrokerInquiry(listing as unknown as ListingForDraft, { brokerName: broker.name });

  if (dryRun) return NextResponse.json({ draft, to: broker.email, broker });

  const { data: queued, error: qErr } = await db
    .from("outbox_emails")
    .insert({ listing_id: listing.id, to_email: broker.email, to_name: broker.name, subject: draft.subject, body: draft.body })
    .select("id")
    .single();
  if (qErr) return NextResponse.json({ error: `${qErr.message} — apply migration 0006` }, { status: 503 });

  // intent is captured immediately (flow doc): listing → info_requested
  const now = new Date().toISOString();
  const { data: review } = await db.from("listing_reviews").select("status, notes").eq("listing_id", listing.id).maybeSingle();
  if (!review || ["new", "interested"].includes(review.status)) {
    const payload = {
      status: "info_requested",
      reviewed_at: now,
      notes: [review?.notes, `[pursuit ${now.slice(0, 10)}] inquiry drafted & queued (outbox ${queued.id})`].filter(Boolean).join("\n"),
    };
    if (review) await db.from("listing_reviews").update(payload).eq("listing_id", listing.id);
    else await db.from("listing_reviews").insert({ listing_id: listing.id, ...payload });
  }
  await db.from("listing_events").insert({
    listing_id: listing.id, event_type: "inquiry_queued",
    detail: { outbox_id: queued.id, to: broker.email, at: now },
  });
  return NextResponse.json({ ok: true, id: queued.id, draft, to: broker.email });
}
