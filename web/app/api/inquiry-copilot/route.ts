// Form-inquiry co-pilot (LISTING-PURSUIT-FLOW §1 "form case", John-approved
// 7/11 BEHIND A REVIEW GATE): for BizBuySell-style listings where inquiry is a
// login+form, PREPARE the filled form values for John to review — this API
// never submits anything anywhere. Lane B renders the preview (copy-ready
// fields + the listing's inquiry URL); John pastes/confirms and clicks submit
// in his own browser. On his confirm, POST {confirm:true} flips the listing to
// info_requested and logs the audit event.
//
// POST { listingId }                → preview payload (no side effects)
// POST { listingId, confirm: true } → John submitted: status flip + audit log
import { NextResponse } from "next/server";
import { hasDb, serverDb } from "@/lib/db";
import { buildBrokerInquiryFormNote, type InquiryProfile, type ListingForDraft } from "@/lib/inquiry";

export const dynamic = "force-dynamic";

const FALLBACK_PROFILE: InquiryProfile = {
  name: "John D. Hodson — Managing Director, Pronghorn Equity Partners",
  email: "jhodson@pronghornequity.com",
  phone: "(503) 899-0058",
  default_note: null,
};

export async function POST(req: Request) {
  if (!hasDb()) return NextResponse.json({ error: "no db" }, { status: 503 });
  const db = serverDb();
  const { listingId, confirm } = await req.json();
  if (!listingId) return NextResponse.json({ error: "listingId required" }, { status: 400 });

  const { data: l } = await db.from("listings")
    .select("id, name, url, industry, city, state, asking_price, cash_flow, cash_flow_type, gross_revenue, description, source_id")
    .eq("id", listingId).maybeSingle();
  if (!l) return NextResponse.json({ error: "listing not found" }, { status: 404 });

  if (confirm) {
    // John clicked submit in his browser — capture intent + audit trail
    const now = new Date().toISOString();
    const { data: review } = await db.from("listing_reviews").select("status, notes").eq("listing_id", l.id).maybeSingle();
    if (!review || ["new", "interested"].includes(review.status)) {
      const payload = {
        status: "info_requested", reviewed_at: now,
        notes: [review?.notes, `[pursuit ${now.slice(0, 10)}] inquiry form submitted by John (co-pilot)`].filter(Boolean).join("\n"),
      };
      if (review) await db.from("listing_reviews").update(payload).eq("listing_id", l.id);
      else await db.from("listing_reviews").insert({ listing_id: l.id, ...payload });
    }
    await db.from("listing_events").insert({
      listing_id: l.id, event_type: "inquiry_form_submitted",
      detail: { via: "copilot", at: now },
    });
    return NextResponse.json({ ok: true, status: "info_requested" });
  }

  // preview: profile fields + Claude-drafted form note (no side effects)
  const { data: profileRow } = await db.from("inquiry_profiles").select("name, email, phone, default_note").limit(1).maybeSingle();
  const profile = (profileRow as InquiryProfile) ?? FALLBACK_PROFILE;

  // John's verbatim template (form variant: no greeting/signature — the form
  // carries separate contact fields). Only the {industry} phrase varies.
  const message = buildBrokerInquiryFormNote(l as unknown as ListingForDraft);

  return NextResponse.json({
    inquiryUrl: l.url,
    listing: { name: l.name, source: l.source_id },
    fields: {
      name: profile.name.split("—")[0].trim(),
      email: profile.email,
      phone: profile.phone,
      message,
    },
    reviewGate: "Preview only — nothing was submitted. John reviews, pastes/edits, and submits in his browser, then Lane B calls this endpoint with confirm:true.",
  });
}
