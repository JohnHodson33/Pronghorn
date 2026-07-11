// Edit a contact: role, reachability fields, or re-attach to a company.
import { NextResponse } from "next/server";
import { hasDb, serverDb } from "@/lib/db";
import { CONTACT_ROLES as ROLES } from "@/lib/contact-roles";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!hasDb()) return NextResponse.json({ error: "no db" }, { status: 503 });
  const { id } = await params;
  const b = await req.json();

  const update: Record<string, unknown> = {};
  if (b.name !== undefined) {
    const n = String(b.name).trim();
    if (!n) return NextResponse.json({ error: "name cannot be empty" }, { status: 400 });
    update.name = n;
  }
  if (b.role !== undefined) {
    if (!(ROLES as readonly string[]).includes(b.role))
      return NextResponse.json({ error: `role must be one of ${ROLES.join(", ")}` }, { status: 400 });
    update.role = b.role;
  }
  for (const f of ["email", "phone", "linkedin", "notes", "firm", "title"] as const) {
    if (b[f] !== undefined) update[f] = String(b[f]).trim() || null;
  }
  if (b.companyId !== undefined) update.company_id = b.companyId || null;
  if (Object.keys(update).length === 0)
    return NextResponse.json({ error: "no updatable fields in body" }, { status: 400 });

  const db = serverDb();
  let { data, error } = await db.from("contacts").update(update).eq("id", id).select("id").maybeSingle();
  if (error && /column|firm|title/.test(error.message)) {
    delete update.firm;
    delete update.title;
    if (Object.keys(update).length === 0)
      return NextResponse.json({ error: "firm/title need migration 0004 applied" }, { status: 400 });
    ({ data, error } = await db.from("contacts").update(update).eq("id", id).select("id").maybeSingle());
  }
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "contact not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
