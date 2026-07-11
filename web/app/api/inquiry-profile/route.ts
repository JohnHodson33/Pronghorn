// The reusable "inquiry profile" — John's contact block for broker inquiries
// (name, phone, email, default note) so it's never re-typed. Backed by the
// inquiry_profiles table from migration 0005 (uuid pk, default_note column);
// treated as a singleton: first row wins. Pre-migration, GET returns
// {missing: true} and the client falls back to localStorage.
import { NextResponse } from "next/server";
import { hasDb, serverDb } from "@/lib/db";

export async function GET() {
  if (!hasDb()) return NextResponse.json({ error: "no db" }, { status: 503 });
  const { data, error } = await serverDb()
    .from("inquiry_profiles")
    .select("id, name, email, phone, default_note")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) return NextResponse.json({ missing: true });
  return NextResponse.json({
    profile: data
      ? { name: data.name, email: data.email, phone: data.phone, note: data.default_note }
      : null,
  });
}

export async function PUT(req: Request) {
  if (!hasDb()) return NextResponse.json({ error: "no db" }, { status: 503 });
  const b = await req.json();
  const db = serverDb();
  const values = {
    name: String(b.name ?? "").trim() || "John Hodson",
    email: String(b.email ?? "").trim() || null,
    phone: String(b.phone ?? "").trim() || null,
    default_note: String(b.note ?? "").trim() || null,
  };

  const { data: existing, error: readErr } = await db
    .from("inquiry_profiles")
    .select("id")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (readErr) return NextResponse.json({ missing: true }, { status: 200 });

  const { error } = existing
    ? await db.from("inquiry_profiles").update(values).eq("id", existing.id)
    : await db.from("inquiry_profiles").insert(values);
  if (error) return NextResponse.json({ missing: true, error: error.message }, { status: 200 });
  return NextResponse.json({ ok: true });
}
