// Company shortlist ★ (John 7/15 — a memory aid, explicitly NOT a deal stage).
// GET current state, POST {person, note?} to star, DELETE ?person= to unstar.
// Degrades with an apply-0015 note until the migration lands.
import { NextResponse } from "next/server";
import { hasDb, serverDb } from "@/lib/db";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  if (!hasDb()) return NextResponse.json({ error: "no db" }, { status: 503 });
  const { id } = await params;
  const { data, error } = await serverDb()
    .from("company_shortlist").select("person, note, created_at").eq("company_id", id);
  if (error) return NextResponse.json({ shortlist: [], note: "apply migration 0015" });
  return NextResponse.json({ shortlist: data ?? [] });
}

export async function POST(req: Request, { params }: Params) {
  if (!hasDb()) return NextResponse.json({ error: "no db" }, { status: 503 });
  const { id } = await params;
  const b = await req.json().catch(() => ({}));
  const person = String(b.person ?? "");
  if (!["John", "Tom"].includes(person)) return NextResponse.json({ error: "person must be John or Tom" }, { status: 400 });
  const { error } = await serverDb().from("company_shortlist").upsert({
    company_id: id, person, note: b.note ? String(b.note) : null,
  }, { onConflict: "company_id,person" });
  if (error) return NextResponse.json({ error: `${error.message} — apply migration 0015` }, { status: 500 });
  return NextResponse.json({ ok: true, starred: true });
}

export async function DELETE(req: Request, { params }: Params) {
  if (!hasDb()) return NextResponse.json({ error: "no db" }, { status: 503 });
  const { id } = await params;
  const person = new URL(req.url).searchParams.get("person") ?? "";
  if (!["John", "Tom"].includes(person)) return NextResponse.json({ error: "person must be John or Tom" }, { status: 400 });
  const { error } = await serverDb().from("company_shortlist")
    .delete().eq("company_id", id).eq("person", person);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, starred: false });
}
