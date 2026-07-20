// Intake step 2 — PREVIEW. Downloads the uploaded file, Claude-maps its columns
// to our fields, detects the record type, dedupes against existing rows, and
// builds a resolved PLAN. NOTHING is written. The plan is stored on an
// intake_jobs row (status 'preview'); the client shows it and, on approval,
// calls /api/intake/confirm with the job id.
//
// POST { path, filename, uploaded_by, record_type?, fill_target? }
//   → { job_id, record_type, mapping, method, confidence, counts, sample,
//       conflicts, unmapped_headers, warnings }
import { NextResponse } from "next/server";
import { hasDb, serverDb } from "@/lib/db";
import {
  INTAKE_BUCKET, parseFile, mapColumns, resolveType, buildPlan, CATALOGS,
  type RecordType, type FillTarget,
} from "@/lib/intake";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!hasDb()) return NextResponse.json({ error: "no db" }, { status: 503 });
  const b = await req.json().catch(() => ({}));
  const path = String(b.path ?? "").trim();
  const filename = String(b.filename ?? path.split("/").pop() ?? "").trim();
  const uploadedBy = String(b.uploaded_by ?? "").trim();
  if (!path) return NextResponse.json({ error: "path required (from /api/intake/upload)" }, { status: 400 });
  if (!["John", "Tom"].includes(uploadedBy)) return NextResponse.json({ error: "uploaded_by must be John or Tom" }, { status: 400 });
  const hint = (["contact", "company", "river_guide", "enrichment_fill"].includes(b.record_type) ? b.record_type : undefined) as RecordType | undefined;
  const fillTargetHint = (["contact", "company"].includes(b.fill_target) ? b.fill_target : undefined) as FillTarget | undefined;

  const db = serverDb();

  // download the uploaded file from storage
  const { data: blob, error: dlErr } = await db.storage.from(INTAKE_BUCKET).download(path);
  if (dlErr || !blob) return NextResponse.json({ error: `could not read upload: ${dlErr?.message ?? "not found"}` }, { status: 404 });
  const buf = Buffer.from(await blob.arrayBuffer());

  let parsed;
  try { parsed = parseFile(filename, buf); }
  catch (e) { return NextResponse.json({ error: (e as Error).message }, { status: 400 }); }
  if (!parsed.headers.length || !parsed.rows.length) {
    return NextResponse.json({ error: "file has no header row + data rows" }, { status: 400 });
  }

  const mapped = await mapColumns(parsed, hint, fillTargetHint, db);
  const { base, fillOnly } = resolveType(mapped.record_type, mapped.fill_target);

  let plan;
  try { plan = await buildPlan(db, parsed, base, fillOnly, mapped.mapping); }
  catch (e) { return NextResponse.json({ error: `dedupe failed: ${(e as Error).message}` }, { status: 500 }); }

  const warnings: string[] = [];
  if (parsed.truncated) warnings.push(`file exceeds ${plan.counts.rows}-row preview cap — only the first rows are planned`);
  if (mapped.method === "heuristic") warnings.push("column mapping used the heuristic fallback (no ANTHROPIC_API_KEY) — review the mapping carefully");
  const mappedFields = Object.values(mapped.mapping).filter(Boolean).length;
  if (mappedFields === 0) warnings.push("no columns could be mapped to our fields — check the record type");
  const unmappedHeaders = parsed.headers.filter((h) => !Object.values(mapped.mapping).includes(h));

  // store the plan on an intake_jobs row (status 'preview') — the audit trail
  const jobRow = {
    uploaded_by: uploadedBy, filename, storage_path: path,
    record_type: mapped.record_type, status: "preview",
    mapping: mapped.mapping, plan, counts: plan.counts,
    note: mapped.notes ?? null,
  };
  const { data: job, error: jErr } = await db.from("intake_jobs").insert(jobRow).select("id").single();
  if (jErr) {
    // degrade cleanly pre-0021: still return the preview, just no persisted job
    return NextResponse.json({
      job_id: null, record_type: mapped.record_type, base_table: CATALOGS[base].table,
      mapping: mapped.mapping, method: mapped.method, confidence: mapped.confidence,
      counts: plan.counts, sample: plan.rows.slice(0, 20),
      conflicts: plan.rows.flatMap((r) => r.conflicts.map((c) => ({ row: r.i + 1, ...c }))).slice(0, 50),
      unmapped_headers: unmappedHeaders,
      warnings: [...warnings, `not persisted: ${jErr.message} — apply migration 0021 to enable confirm`],
    });
  }

  return NextResponse.json({
    job_id: job.id,
    record_type: mapped.record_type,
    base_table: CATALOGS[base].table,
    fill_only: fillOnly,
    mapping: mapped.mapping,
    method: mapped.method,
    confidence: mapped.confidence,
    counts: plan.counts,
    sample: plan.rows.slice(0, 20),
    conflicts: plan.rows.flatMap((r) => r.conflicts.map((c) => ({ row: r.i + 1, ...c }))).slice(0, 50),
    unmapped_headers: unmappedHeaders,
    warnings,
  });
}
