// Update a deal from the detail page: stage moves, next step, valuation,
// closed-lost reason. Whitelisted fields only.
import { NextResponse } from "next/server";
import { hasDb, serverDb } from "@/lib/db";
import { STAGES } from "@/lib/mock";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!hasDb()) return NextResponse.json({ error: "no db" }, { status: 503 });
  const { id } = await params;
  const body = await req.json();

  const update: Record<string, unknown> = {};
  if (body.stage !== undefined) {
    // "Passed" is a real stage but not a board column — passing removes the
    // deal from the pipeline; it stays findable on /deals forever.
    if (![...STAGES, "Passed"].includes(body.stage))
      return NextResponse.json({ error: `invalid stage: ${body.stage}` }, { status: 400 });
    update.stage = body.stage;
  }
  if (body.nextStep !== undefined) update.next_step = String(body.nextStep).trim() || null;
  if (body.nextStepDue !== undefined) update.next_step_due = body.nextStepDue || null;
  if (body.closedLostReason !== undefined)
    update.closed_lost_reason = String(body.closedLostReason).trim() || null;
  if (body.ourValuation !== undefined) {
    const v = body.ourValuation === null || body.ourValuation === "" ? null : Number(body.ourValuation);
    if (v !== null && !Number.isFinite(v))
      return NextResponse.json({ error: "ourValuation must be a number" }, { status: 400 });
    update.our_valuation = v;
  }
  if (Object.keys(update).length === 0)
    return NextResponse.json({ error: "no updatable fields in body" }, { status: 400 });
  update.updated_at = new Date().toISOString();

  const { data, error } = await serverDb().from("deals").update(update).eq("id", id).select("id").maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "deal not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
