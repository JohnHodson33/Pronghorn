// Lead row actions from the Enrichment surfaces: discard (status → dead),
// clear/set the off-target flag, or inline-edit data fields (John 7/15 —
// human-entered values WIN over future enrichment). Whitelisted, no deletes —
// discarded leads stay queryable.
import { NextResponse } from "next/server";
import { hasDb, serverDb } from "@/lib/db";
import { LEAD_STATUSES } from "@/lib/enrichment";

// inline-editable data fields; a human edit is recorded in
// enrichment.human_edited so fill-blanks enrichment never overwrites it
const DATA_FIELDS = ["owner_name", "owner_email", "owner_phone", "owner_linkedin", "website", "phone", "city", "state"] as const;

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

  const editedFields: string[] = [];
  for (const f of DATA_FIELDS) {
    if (b[f] !== undefined) {
      update[f] = String(b[f] ?? "").trim() || null;
      editedFields.push(f);
    }
  }
  if (editedFields.length) {
    // human-wins provenance: merge {field: timestamp} into enrichment jsonb
    const { data: row } = await serverDb().from("leads").select("enrichment").eq("id", id).maybeSingle();
    const enrichment = (row?.enrichment as Record<string, unknown> | null) ?? {};
    const humanEdited = (enrichment.human_edited as Record<string, string> | undefined) ?? {};
    for (const f of editedFields) humanEdited[f] = new Date().toISOString();
    update.enrichment = { ...enrichment, human_edited: humanEdited };
  }

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
