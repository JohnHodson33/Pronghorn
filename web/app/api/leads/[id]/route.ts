// Lead row actions from the Enrichment surfaces: discard (status → dead) or
// clear/set the off-target flag. Whitelisted, no deletes — discarded leads
// stay queryable.
import { NextResponse } from "next/server";
import { hasDb, serverDb } from "@/lib/db";
import { LEAD_STATUSES } from "@/lib/enrichment";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!hasDb()) return NextResponse.json({ error: "no db" }, { status: 503 });
  const { id } = await params;
  const b = await req.json();

  const update: Record<string, unknown> = {};
  if (b.status !== undefined) {
    if (!(LEAD_STATUSES as readonly string[]).includes(b.status))
      return NextResponse.json({ error: `status must be one of ${LEAD_STATUSES.join(", ")}` }, { status: 400 });
    update.status = b.status;
  }
  if (b.offTarget !== undefined) update.off_target = !!b.offTarget;
  if (Object.keys(update).length === 0)
    return NextResponse.json({ error: "no updatable fields in body" }, { status: 400 });

  const db = serverDb();
  let { data, error } = await db.from("leads").update(update).eq("id", id).select("id").maybeSingle();
  if (error && /off_target|column/.test(error.message) && update.off_target !== undefined) {
    delete update.off_target;
    if (Object.keys(update).length === 0)
      return NextResponse.json({ error: "off_target needs Lane C's classification migration" }, { status: 400 });
    ({ data, error } = await db.from("leads").update(update).eq("id", id).select("id").maybeSingle());
  }
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "lead not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
