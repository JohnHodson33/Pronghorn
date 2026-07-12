// Promote a broker-directory entry into the curated Contacts CRM
// (directory = scraped universe; contacts = relationships we work).
// Idempotent: an existing contact with this broker_id is returned as-is.
import { NextResponse } from "next/server";
import { hasDb, serverDb } from "@/lib/db";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!hasDb()) return NextResponse.json({ error: "no db" }, { status: 503 });
  const { id } = await params;
  const db = serverDb();

  const { data: broker } = await db
    .from("brokers")
    .select("id, name, brokerage, email, phone, linkedin")
    .eq("id", id)
    .maybeSingle();
  if (!broker) return NextResponse.json({ error: "broker not found" }, { status: 404 });

  const { data: existing } = await db.from("contacts").select("id").eq("broker_id", id).maybeSingle();
  if (existing) return NextResponse.json({ ok: true, contactId: existing.id, already: true });

  const row: Record<string, unknown> = {
    broker_id: broker.id,
    role: "broker",
    name: broker.name ?? broker.brokerage ?? "(unnamed broker)",
    email: broker.email,
    phone: broker.phone,
    linkedin: broker.linkedin,
    notes: broker.brokerage ? `Brokerage: ${broker.brokerage}` : null,
    firm: broker.brokerage,
    origin: "broker_directory",
  };
  let { data, error } = await db.from("contacts").insert(row).select("id").single();
  if (error && /column|firm|origin/.test(error.message)) {
    delete row.firm;
    delete row.origin;
    ({ data, error } = await db.from("contacts").insert(row).select("id").single());
  }
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, contactId: data!.id });
}
