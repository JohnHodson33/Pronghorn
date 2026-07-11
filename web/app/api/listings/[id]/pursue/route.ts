// Advance a listing's pursuit state (LISTING-PURSUIT-FLOW.md).
// Upserts listing_reviews.status, stamps the matching timestamp column when
// the migration has landed, and logs a listing_events row so the pursuit
// history carries into the CRM on promote. Never sends anything.
import { NextResponse } from "next/server";
import { hasDb, serverDb } from "@/lib/db";
import { PURSUIT_STATUSES } from "@/lib/pursuit";

const STAMP: Record<string, string> = {
  info_requested: "requested_at",
  nda_signed: "nda_signed_at",
  cim_received: "cim_received_at",
};

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!hasDb()) return NextResponse.json({ error: "no db" }, { status: 503 });
  const { id } = await params;
  const { status, note } = await req.json();
  if (!(PURSUIT_STATUSES as readonly string[]).includes(status))
    return NextResponse.json(
      { error: `status must be one of ${PURSUIT_STATUSES.join(", ")}` },
      { status: 400 }
    );

  const db = serverDb();
  const { data: listing } = await db.from("listings").select("id, name").eq("id", id).maybeSingle();
  if (!listing) return NextResponse.json({ error: "listing not found" }, { status: 404 });

  const row: Record<string, unknown> = { listing_id: id, status };
  if (STAMP[status]) row[STAMP[status]] = new Date().toISOString();

  let { error } = await db.from("listing_reviews").upsert(row);
  if (error && /column/.test(error.message)) {
    // Timestamp columns not migrated yet (Lane C) — status alone still tracks.
    delete row[STAMP[status]];
    ({ error } = await db.from("listing_reviews").upsert(row));
  }
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await db.from("listing_events").insert({
    listing_id: id,
    event_type: status,
    detail: { via: "ui", note: note ?? null },
  });

  return NextResponse.json({ ok: true, status });
}
