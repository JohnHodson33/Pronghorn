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

  // optional VA batch cost (John 7/31: "what did this batch cost?" at import —
  // prefilled $0 and skippable in the UI). Validated BEFORE the write so a bad
  // value can't leave a committed batch with its cost silently dropped.
  const rawCost = b.batch_cost_usd;
  const batchCost = rawCost == null || rawCost === "" ? null : Number(rawCost);
  if (batchCost != null && (!Number.isFinite(batchCost) || batchCost < 0)) {
    return NextResponse.json({ error: "batch_cost_usd, if given, must be a non-negative number" }, { status: 400 });
  }

  const result = await executePlan(db, plan, { uploaded_by: String(job.uploaded_by), filename: String(job.filename) });

  // log the batch cost against the delivered contacts (units = rows actually
  // updated) → true VA cost-per-contact-delivered, computed not estimated
  let costPerContactDelivered: number | null = null;
  if (batchCost != null && batchCost > 0) {
    costPerContactDelivered = result.updated ? Number((batchCost / result.updated).toFixed(2)) : null;
    await db.from("usage_events").insert({
      service: "upwork", activity: "va_enrichment",
      units: result.updated || 1, cost_usd: Number(batchCost.toFixed(2)),
      meta: {
        source: "manual", entered_by: confirmedBy,
        project: String(b.project ?? "").trim().slice(0, 120) || String(job.filename),
        intake_job_id: jobId,
        note: `VA batch: ${result.updated} contacts updated of ${plan.rows.length} rows`,
      },
    }).then(() => {}, () => {}); // metering is best-effort; the import itself already succeeded
  }

  const receipt = {
    ...result,
    record_type: job.record_type,
    base_table: plan.base,
    confirmed_by: confirmedBy,
    at: new Date().toISOString(),
    ...(batchCost != null ? { batch_cost_usd: batchCost, cost_per_contact_delivered: costPerContactDelivered } : {}),
  };
  await db.from("intake_jobs").update({
    status: "committed", receipt, committed_at: new Date().toISOString(),
  }).eq("id", jobId);

  return NextResponse.json({ ok: true, receipt });
}
