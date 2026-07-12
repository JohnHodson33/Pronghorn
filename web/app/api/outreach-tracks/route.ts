// Outreach tracking (migration 0007). One track per company being worked.
//
// GET  [?state=...&due=1]      → tracks joined with company + owner contact
// POST { companyId, ...patch } → upsert a track (state, channelLast,
//        lastTouchAt, nextFollowupDue, ownerContactId, notes). Setting a
//        touch also mirrors an activity row (kind = channel) so history
//        lives on the company feed.
// Degrades with a clear message until 0007 is applied.
import { NextResponse } from "next/server";
import { hasDb, serverDb } from "@/lib/db";

export const dynamic = "force-dynamic";

const STATES = ["not_started", "contacted", "replied", "meeting", "nurture", "dead"];

export async function GET(req: Request) {
  if (!hasDb()) return NextResponse.json({ error: "no db" }, { status: 503 });
  const url = new URL(req.url);
  let q = serverDb().from("outreach_tracks")
    .select("company_id, state, channel_last, last_touch_at, next_followup_due, notes, companies(name, industry, city, state), contacts:owner_contact_id(name, email, phone)")
    .order("next_followup_due", { ascending: true, nullsFirst: false })
    .limit(500);
  const state = url.searchParams.get("state");
  if (state) q = q.eq("state", state);
  if (url.searchParams.get("due")) {
    q = q.lte("next_followup_due", new Date(Date.now() + 86400e3).toISOString().slice(0, 10));
  }
  const { data, error } = await q;
  if (error) return NextResponse.json({ error: `${error.message} — apply migration 0007`, tracks: [] }, { status: 200 });
  return NextResponse.json({ tracks: data });
}

export async function POST(req: Request) {
  if (!hasDb()) return NextResponse.json({ error: "no db" }, { status: 503 });
  const db = serverDb();
  const b = await req.json();
  if (!b.companyId) return NextResponse.json({ error: "companyId required" }, { status: 400 });
  if (b.state && !STATES.includes(b.state)) {
    return NextResponse.json({ error: `state must be one of ${STATES.join("|")}` }, { status: 400 });
  }

  const patch: Record<string, unknown> = { company_id: b.companyId, updated_at: new Date().toISOString() };
  if (b.state) patch.state = b.state;
  if (b.channelLast) patch.channel_last = b.channelLast;
  if (b.lastTouchAt) patch.last_touch_at = b.lastTouchAt;
  if (b.nextFollowupDue !== undefined) patch.next_followup_due = b.nextFollowupDue;
  if (b.ownerContactId) patch.owner_contact_id = b.ownerContactId;
  if (b.notes !== undefined) patch.notes = b.notes;

  const { error } = await db.from("outreach_tracks").upsert(patch, { onConflict: "company_id" });
  if (error) return NextResponse.json({ error: `${error.message} — apply migration 0007` }, { status: 503 });

  // a recorded touch mirrors onto the company activity feed
  if (b.lastTouchAt && b.channelLast) {
    await db.from("activities").insert({
      company_id: b.companyId,
      kind: ["email", "call"].includes(b.channelLast) ? b.channelLast : "note",
      body: `[outreach] ${b.channelLast} touch${b.state ? ` · state → ${b.state}` : ""}${b.notes ? ` · ${b.notes}` : ""}`,
    });
  }
  return NextResponse.json({ ok: true });
}
