// Log an activity (meeting note, call, general note) against a company,
// contact, or deal — any combination; at least one target required.
import { NextResponse } from "next/server";
import { hasDb, serverDb } from "@/lib/db";

export async function POST(req: Request) {
  if (!hasDb()) return NextResponse.json({ error: "no db" }, { status: 503 });
  const { companyId, contactId, dealId, kind, body, docUrl } = await req.json();
  if (!(companyId || contactId || dealId) || !String(body ?? "").trim())
    return NextResponse.json({ error: "a target (companyId/contactId/dealId) and body are required" }, { status: 400 });

  const db = serverDb();
  // attach to the company's most recent deal too, if one exists
  let attachDealId = dealId ?? null;
  if (companyId && !attachDealId) {
    const { data: deal } = await db
      .from("deals")
      .select("id")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    attachDealId = deal?.id ?? null;
  }

  const { error } = await db.from("activities").insert({
    company_id: companyId ?? null,
    contact_id: contactId ?? null,
    deal_id: attachDealId,
    kind: ["meeting", "call", "email", "note", "task", "doc"].includes(kind) ? kind : "note",
    body: String(body).trim(),
    doc_url: docUrl || null,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

// Tag (or retag) an existing activity — the 'needs tagging' resolution path:
// the Notion sweep leaves low-confidence notes untargeted; a human picks the
// record here and the note leaves the attention queue.
export async function PATCH(req: Request) {
  if (!hasDb()) return NextResponse.json({ error: "no db" }, { status: 503 });
  const { id, companyId, contactId, dealId } = await req.json();
  if (!id || !(companyId || contactId || dealId))
    return NextResponse.json({ error: "id and a target (companyId/contactId/dealId) required" }, { status: 400 });
  const patch: Record<string, unknown> = {};
  if (companyId) patch.company_id = companyId;
  if (contactId) patch.contact_id = contactId;
  if (dealId) patch.deal_id = dealId;
  const { error } = await serverDb().from("activities").update(patch).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
