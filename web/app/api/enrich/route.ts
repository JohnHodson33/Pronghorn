// Enrichment jobs — makes the UI "Enrich selected (est. $X)" button real
// (ENRICHMENT-UX §3). POST queues a job; the runner (scraper/enrich/run_jobs.js
// locally, GH workflow when secrets land) drains the queue.
//
// POST { leadIds?: string[], listId?: string, estimateOnly?: true }
//   → { jobId, count, estimate }   (estimate ~= $0.01/lead incl. Exa + Haiku)
// GET  [?job=<id>]  → job status | recent jobs
// Degrades with an apply-0008 message until the migration lands.
import { NextResponse } from "next/server";
import { hasDb, serverDb } from "@/lib/db";

export const dynamic = "force-dynamic";
const COST_PER_LEAD = 0.01;

export async function GET(req: Request) {
  if (!hasDb()) return NextResponse.json({ error: "no db" }, { status: 503 });
  const url = new URL(req.url);
  const jobId = url.searchParams.get("job");
  let q = serverDb().from("enrichment_jobs")
    .select("id, lead_list_id, lead_ids, status, cost_estimate, cost_actual, counts, created_at, finished_at")
    .order("created_at", { ascending: false }).limit(25);
  if (jobId) q = q.eq("id", jobId);
  const { data, error } = await q;
  if (error) return NextResponse.json({ error: `${error.message} — apply migration 0008`, jobs: [] }, { status: 200 });
  return NextResponse.json({ jobs: data });
}

export async function POST(req: Request) {
  if (!hasDb()) return NextResponse.json({ error: "no db" }, { status: 503 });
  const db = serverDb();
  const b = await req.json();
  const leadIds: string[] = Array.isArray(b.leadIds) ? b.leadIds : [];
  if (!leadIds.length && !b.listId) return NextResponse.json({ error: "leadIds or listId required" }, { status: 400 });

  // count what would actually run (un-enriched only)
  let cq = db.from("leads").select("id", { count: "exact", head: true }).eq("status", "new");
  if (leadIds.length) cq = cq.in("id", leadIds);
  else cq = cq.eq("lead_list_id", b.listId);
  const { count } = await cq;
  const estimate = Number(((count ?? 0) * COST_PER_LEAD).toFixed(2));
  if (b.estimateOnly) return NextResponse.json({ count, estimate });
  if (!count) return NextResponse.json({ error: "nothing to enrich in that selection" }, { status: 422 });

  const { data: job, error } = await db.from("enrichment_jobs").insert({
    lead_list_id: b.listId ?? null, lead_ids: leadIds, cost_estimate: estimate,
  }).select("id").single();
  if (error) return NextResponse.json({ error: `${error.message} — apply migration 0008` }, { status: 503 });
  return NextResponse.json({ jobId: job.id, count, estimate, note: "queued — the runner picks it up (local loop now; GH workflow when secrets land)" });
}
