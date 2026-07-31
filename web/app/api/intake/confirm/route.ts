// Intake step 3 — CONFIRM. Executes the plan built at preview time and stored
// on the intake_jobs row. This is the ONLY step that writes to
// contacts/companies/river_guides. Idempotent: a job already 'committed' is not
// re-run. Returns the RECEIPT (created / updated / skipped / errors).
//
// POST { job_id, confirmed_by }
import { NextResponse } from "next/server";
import { hasDb, serverDb } from "@/lib/db";
import { executePlan, type Plan } from "@/lib/intake";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!hasDb()) return NextResponse.json({ error: "no db" }, { status: 503 });
  const b = await req.json().catch(() => ({}));
  const jobId = String(b.job_id ?? "").trim();
  const confirmedBy = String(b.confirmed_by ?? b.uploaded_by ?? "").trim();
  if (!jobId) return NextResponse.json({ error: "job_id required" }, { status: 400 });
  if (!["John", "Tom"].includes(confirmedBy)) return NextResponse.json({ error: "confirmed_by must be John or Tom" }, { status: 400 });

  const db = serverDb();
  const { data: job, error: selErr } = await db.from("intake_jobs").select("*").eq("id", jobId).maybeSingle();
  if (selErr) return NextResponse.json({ error: `${selErr.message} — apply migration 0021` }, { status: 500 });
  if (!job) return NextResponse.json({ error: "intake job not found" }, { status: 404 });
  if (job.status === "committed") {
    return NextResponse.json({ ok: true, already: true, receipt: job.receipt, note: "already committed" });
  }
  if (job.status !== "preview") {
    return NextResponse.json({ error: `job is '${job.status}', not 'preview'` }, { status: 409 });
  }
  const plan = job.plan as Plan | null;
  if (!plan || !Array.isArray(plan.rows)) {
    return NextResponse.json({ error: "job has no plan to execute" }, { status: 400 });
  }

  const result = await executePlan(db, plan, { uploaded_by: String(job.uploaded_by), filename: String(job.filename) });

  const receipt = {
    ...result,
    record_type: job.record_type,
    base_table: plan.base,
    confirmed_by: confirmedBy,
    at: new Date().toISOString(),
  };
  await db.from("intake_jobs").update({
    status: "committed", receipt, committed_at: new Date().toISOString(),
  }).eq("id", jobId);

  return NextResponse.json({ ok: true, receipt });
}
