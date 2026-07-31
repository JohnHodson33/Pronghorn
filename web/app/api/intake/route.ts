// Intake job list — the audit trail (who uploaded what, when, and what it did).
// GET ?status=&limit= → recent intake_jobs (newest first). Plan is omitted from
// the list payload (it can be large); GET ?id= returns the full job incl. plan.
import { NextResponse } from "next/server";
import { hasDb, serverDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!hasDb()) return NextResponse.json({ error: "no db" }, { status: 503 });
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  const db = serverDb();

  if (id) {
    const { data, error } = await db.from("intake_jobs").select("*").eq("id", id).maybeSingle();
    if (error) return NextResponse.json({ error: `${error.message} — apply migration 0021` }, { status: 500 });
    if (!data) return NextResponse.json({ error: "not found" }, { status: 404 });
    return NextResponse.json({ job: data });
  }

  const limit = Math.min(Number(url.searchParams.get("limit")) || 25, 100);
  let q = db.from("intake_jobs")
    .select("id, created_at, uploaded_by, filename, record_type, status, counts, receipt, committed_at")
    .order("created_at", { ascending: false }).limit(limit);
  const status = url.searchParams.get("status");
  if (status) q = q.eq("status", status);
  const { data, error } = await q;
  if (error) return NextResponse.json({ jobs: [], note: "apply migration 0021" });
  return NextResponse.json({ jobs: data ?? [] });
}
