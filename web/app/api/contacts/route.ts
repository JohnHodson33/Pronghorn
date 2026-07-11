// Create a contact attached to a company (deal association derives via the
// company — PM/Lane C own any future contact↔deal join). origin=manual.
import { NextResponse } from "next/server";
import { hasDb, serverDb } from "@/lib/db";
import { CONTACT_ROLES as ROLES } from "@/lib/contact-roles";

export async function POST(req: Request) {
  if (!hasDb()) return NextResponse.json({ error: "no db" }, { status: 503 });
  const b = await req.json();
  const name = String(b.name ?? "").trim();
  if (!b.companyId || !name)
    return NextResponse.json({ error: "companyId and name required" }, { status: 400 });

  const row: Record<string, unknown> = {
    company_id: b.companyId,
    name,
    role: (ROLES as readonly string[]).includes(b.role) ? b.role : "other",
    email: String(b.email ?? "").trim() || null,
    phone: String(b.phone ?? "").trim() || null,
    linkedin: String(b.linkedin ?? "").trim() || null,
    notes: String(b.notes ?? "").trim() || null,
    firm: String(b.firm ?? "").trim() || null,
    title: String(b.title ?? "").trim() || null,
    origin: "manual",
  };

  const db = serverDb();
  let { data, error } = await db.from("contacts").insert(row).select("id").single();
  if (error && /column|firm|title|origin/.test(error.message)) {
    // 0004 migration not applied yet — retry without directory columns.
    delete row.firm;
    delete row.title;
    delete row.origin;
    ({ data, error } = await db.from("contacts").insert(row).select("id").single());
  }
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, id: data!.id });
}
