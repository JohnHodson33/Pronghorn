// In-site feedback pipeline (IMPROVEMENTS-LOOP.md). Tom/John submit from the
// site; agents poll status='submitted' each loop and triage into TASK-QUEUE.
//
// GET  [?status=]        → feedback items (newest first)
// POST { author, type, page, body }  → create (status 'submitted')
// PATCH { id, status, lane?, task_ref?, shipped_ref? }  → lifecycle update
// Degrades with apply-0010 note until the migration lands.
import { NextResponse } from "next/server";
import { hasDb, serverDb } from "@/lib/db";

export const dynamic = "force-dynamic";

const TYPES = ["bug", "idea", "change"];
const STATUSES = ["submitted", "triaged", "building", "shipped", "verified"];

export async function GET(req: Request) {
  if (!hasDb()) return NextResponse.json({ error: "no db" }, { status: 503 });
  const url = new URL(req.url);
  let q = serverDb().from("feedback")
    .select("id, created_at, author, type, page, body, status, lane, task_ref, shipped_ref, updated_at")
    .order("created_at", { ascending: false }).limit(200);
  const status = url.searchParams.get("status");
  if (status) q = q.eq("status", status);
  const { data, error } = await q;
  if (error) return NextResponse.json({ error: `${error.message} — apply migration 0010`, items: [] }, { status: 200 });
  const counts = STATUSES.reduce<Record<string, number>>((a, s) => { a[s] = (data ?? []).filter((r) => r.status === s).length; return a; }, {});
  return NextResponse.json({ items: data, counts });
}

export async function POST(req: Request) {
  if (!hasDb()) return NextResponse.json({ error: "no db" }, { status: 503 });
  const b = await req.json();
  const body = String(b.body ?? "").trim();
  const author = String(b.author ?? "").trim();
  if (!body) return NextResponse.json({ error: "body required" }, { status: 400 });
  if (!["John", "Tom"].includes(author)) return NextResponse.json({ error: "author must be John or Tom" }, { status: 400 });
  const type = TYPES.includes(b.type) ? b.type : "idea";

  const { data, error } = await serverDb().from("feedback")
    .insert({ author, type, page: b.page ?? null, body })
    .select("id").single();
  if (error) return NextResponse.json({ error: `${error.message} — apply migration 0010` }, { status: 503 });
  return NextResponse.json({ ok: true, id: data.id });
}

export async function PATCH(req: Request) {
  if (!hasDb()) return NextResponse.json({ error: "no db" }, { status: 503 });
  const b = await req.json();
  if (!b.id) return NextResponse.json({ error: "id required" }, { status: 400 });
  if (b.status && !STATUSES.includes(b.status)) {
    return NextResponse.json({ error: `status must be one of ${STATUSES.join("|")}` }, { status: 400 });
  }
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const k of ["status", "lane", "task_ref", "shipped_ref"]) if (b[k] !== undefined) patch[k] = b[k];
  const { error } = await serverDb().from("feedback").update(patch).eq("id", b.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
