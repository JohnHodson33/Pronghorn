// Outbox — pre-drafted broker inquiries queued for John's ONE-CLICK send
// (LISTING-PURSUIT-FLOW §1). This route DRAFTS and QUEUES only; the send
// endpoint is /api/outbox/[id] and fires solely on John's explicit click.
//
// GET  → queued + recent outbox emails
// POST { listingId, dryRun? } → Claude-drafts an inquiry to the listing's
//   broker, queues it (status 'queued'), advances the listing to
//   info_requested, and logs a listing_event. dryRun returns the draft only.
//
// Activation (deliberately manual — John's hand, not an agent's):
//   - drafting: ANTHROPIC_API_KEY in web/.env.local (+ Vercel env)
//   - queueing: migration 0006 (outbox_emails table)
import { NextResponse } from "next/server";
import { hasDb, serverDb } from "@/lib/db";
import { DRAFT_SYSTEM, draftUserMessage, type InquiryProfile, type ListingForDraft } from "@/lib/inquiry";

export const dynamic = "force-dynamic";

const FALLBACK_PROFILE: InquiryProfile = {
  name: "John D. Hodson — Managing Director, Pronghorn Equity Partners",
  email: "jhodson@pronghornequity.com",
  phone: "(503) 899-0058",
  default_note: null,
};

async function claudeDraft(listing: ListingForDraft, profile: InquiryProfile) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return { error: "ANTHROPIC_API_KEY not set in web/.env.local — John adds it to enable drafting", status: 503 as const };
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 600,
      system: DRAFT_SYSTEM,
      messages: [{ role: "user", content: draftUserMessage(listing, profile) }],
    }),
  });
  if (!res.ok) return { error: `Claude API ${res.status}`, status: 502 as const };
  const data = await res.json();
  const raw = (data.content?.[0]?.text ?? "").trim().replace(/^```json?\s*|\s*```$/g, "");
  try {
    const d = JSON.parse(raw) as { subject: string; body: string };
    return { draft: d, usage: data.usage as { input_tokens: number; output_tokens: number } | undefined };
  } catch {
    return { error: "unparseable draft", status: 502 as const };
  }
}

/** Cost metering (0009) — tolerated if the table is missing. */
async function meter(db: ReturnType<typeof serverDb>, activity: string, usage?: { input_tokens: number; output_tokens: number }, meta?: object) {
  if (!usage) return;
  await db.from("usage_events").insert({
    service: "claude", activity, units: usage.input_tokens + usage.output_tokens,
    cost_usd: Number((usage.input_tokens * 0.8e-6 + usage.output_tokens * 4e-6).toFixed(5)), meta,
  });
}

export async function GET() {
  if (!hasDb()) return NextResponse.json({ error: "no db" }, { status: 503 });
  const { data, error } = await serverDb()
    .from("outbox_emails")
    .select("id, listing_id, to_email, to_name, subject, body, status, created_at, sent_at")
    .order("created_at", { ascending: false })
    .limit(100);
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

  const { data: profileRow } = await db.from("inquiry_profiles").select("name, email, phone, default_note").limit(1).maybeSingle();
  const profile = (profileRow as InquiryProfile) ?? FALLBACK_PROFILE;

  const drafted = await claudeDraft(listing as unknown as ListingForDraft, profile);
  if ("error" in drafted && drafted.error) return NextResponse.json({ error: drafted.error }, { status: drafted.status });
  const draft = drafted.draft!;
  await meter(db, "drafting", drafted.usage, { listing: listing.id });

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
