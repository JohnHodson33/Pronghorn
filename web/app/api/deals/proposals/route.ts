// Deal next-step proposals from Outlook (0019). John acts on the Key Actions
// card: approve → writes the deal's next_step/next_step_due + logs an activity;
// dismiss → drops it. Nothing is ever written to a live deal without approval
// (John's no-guess bar, 7/16).
//
// GET  ?deal_id= → pending proposals (or all pending if omitted)
// POST { id, action: 'approve' | 'dismiss', next_step?, next_step_due? }
//   optional next_step/next_step_due override the proposal (John can edit
//   before approving).
import { NextResponse } from "next/server";
import { hasDb, serverDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!hasDb()) return NextResponse.json({ error: "no db" }, { status: 503 });
  const dealId = new URL(req.url).searchParams.get("deal_id");
  let q = serverDb().from("deal_proposals").select("*").eq("status", "pending")
    .order("created_at", { ascending: false });
  if (dealId) q = q.eq("deal_id", dealId);
  const { data, error } = await q;
  if (error) return NextResponse.json({ proposals: [], note: "apply migration 0019" });
  return NextResponse.json({ proposals: data ?? [] });
}

export async function POST(req: Request) {
  if (!hasDb()) return NextResponse.json({ error: "no db" }, { status: 503 });
  const b = await req.json().catch(() => ({}));
  const id = String(b.id ?? "");
  const action = String(b.action ?? "");
  if (!id || !["approve", "dismiss"].includes(action)) {
    return NextResponse.json({ error: "id + action (approve|dismiss) required" }, { status: 400 });
  }
  const db = serverDb();
  const { data: prop, error: selErr } = await db.from("deal_proposals").select("*").eq("id", id).maybeSingle();
  if (selErr) return NextResponse.json({ error: `${selErr.message} — apply migration 0019` }, { status: 500 });
  if (!prop) return NextResponse.json({ error: "proposal not found" }, { status: 404 });
  if (prop.status !== "pending") return NextResponse.json({ ok: true, note: `already ${prop.status}` });

  if (action === "dismiss") {
    await db.from("deal_proposals").update({ status: "dismissed", resolved_at: new Date().toISOString() }).eq("id", id);
    return NextResponse.json({ ok: true, status: "dismissed" });
  }

  // approve: apply to the deal (John may have edited the values), then audit-log
  const nextStep = b.next_step != null ? String(b.next_step) : prop.proposed_next_step;
  const nextDue = b.next_step_due != null ? (b.next_step_due || null) : prop.proposed_next_step_due;
  const { error: dErr } = await db.from("deals")
    .update({ next_step: nextStep, next_step_due: nextDue }).eq("id", prop.deal_id);
  if (dErr) return NextResponse.json({ error: dErr.message }, { status: 500 });

  await db.from("activities").insert({
    deal_id: prop.deal_id, kind: "note",
    body: `[deal update — approved from Outlook] next step → "${nextStep}"${nextDue ? ` (due ${nextDue})` : ""}. Source: ${prop.source_from ?? "email"}. Evidence: ${prop.evidence ?? ""}`,
    doc_url: prop.source_url ?? null,
  });
  await db.from("deal_proposals").update({ status: "approved", resolved_at: new Date().toISOString() }).eq("id", id);
  return NextResponse.json({ ok: true, status: "approved", next_step: nextStep, next_step_due: nextDue });
}
