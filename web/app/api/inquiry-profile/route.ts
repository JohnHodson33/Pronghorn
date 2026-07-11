// The reusable "inquiry profile" — John's contact block for broker inquiries
// (name, phone, email, default note) so it's never re-typed. Backed by the
// inquiry_profiles singleton (Lane C migration); until that lands, GET
// returns {missing: true} and the client falls back to localStorage.
import { NextResponse } from "next/server";
import { hasDb, serverDb } from "@/lib/db";

export async function GET() {
  if (!hasDb()) return NextResponse.json({ error: "no db" }, { status: 503 });
  const { data, error } = await serverDb().from("inquiry_profiles").select("*").limit(1).maybeSingle();
  if (error) return NextResponse.json({ missing: true });
  return NextResponse.json({ profile: data ?? null });
}

export async function PUT(req: Request) {
  if (!hasDb()) return NextResponse.json({ error: "no db" }, { status: 503 });
  const b = await req.json();
  const row = {
    id: 1, // singleton
    name: String(b.name ?? "").trim() || null,
    phone: String(b.phone ?? "").trim() || null,
    email: String(b.email ?? "").trim() || null,
    note: String(b.note ?? "").trim() || null,
  };
  const { error } = await serverDb().from("inquiry_profiles").upsert(row);
  if (error) return NextResponse.json({ missing: true, error: error.message }, { status: 200 });
  return NextResponse.json({ ok: true });
}
