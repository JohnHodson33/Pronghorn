// Outbox item actions: PATCH edits a queued draft; POST {action:"cancel"}
// withdraws it.
//
// There is intentionally NO send action here. This session's guardrail is
// draft-and-queue only — the one-click send route (Graph sendMail on John's
// explicit UI click) ships only when John directly asks for it. Spec lives in
// docs/LISTING-PURSUIT-FLOW.md §1; it is one small route + GRAPH_* env vars
// that John provisions himself.
import { NextResponse } from "next/server";
import { hasDb, serverDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!hasDb()) return NextResponse.json({ error: "no db" }, { status: 503 });
  const { id } = await params;
  const b = await req.json();
  const patch: Record<string, string> = {};
  if (typeof b.subject === "string") patch.subject = b.subject;
  if (typeof b.body === "string") patch.body = b.body;
  if (!Object.keys(patch).length) return NextResponse.json({ error: "nothing to update" }, { status: 400 });
  const { error } = await serverDb().from("outbox_emails").update(patch).eq("id", id).eq("status", "queued");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!hasDb()) return NextResponse.json({ error: "no db" }, { status: 503 });
  const { id } = await params;
  const { action } = await req.json();

  if (action === "cancel") {
    const { error } = await serverDb()
      .from("outbox_emails").update({ status: "cancelled" }).eq("id", id).eq("status", "queued");
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, status: "cancelled" });
  }
  if (action === "send") {
    return NextResponse.json({
      error: "Send is not built in this session (draft-and-queue ceiling). John: ask for the send route directly and provision GRAPH_* env vars yourself — see LISTING-PURSUIT-FLOW.md §1.",
    }, { status: 501 });
  }
  return NextResponse.json({ error: "action must be 'cancel'" }, { status: 400 });
}
