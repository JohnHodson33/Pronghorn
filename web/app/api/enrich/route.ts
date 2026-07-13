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
// Marginal cash only. Hunter is a flat monthly sub → $0 marginal (it counts
// against the plan's search quota, not per-lead cash), so a tier-2 lead's
// marginal cost is just the Exa LinkedIn call.
const COST_PER_LEAD = 0.01;          // tier 1: website scrape + Exa + Haiku
const COST_PER_TIER2 = 0.01;         // tier 2 marginal: Exa LinkedIn (~$0.006) + slack

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

  // THE CASCADE CONTRACT (John 7/12): a selection of already-enriched leads
  // never no-ops — it escalates to tier 2 (email/LinkedIn hunt, early exit
  // when complete). Estimate previews the MAX cascade cost across both tiers.
  let sq = db.from("leads").select("id, status, owner_name, owner_email, owner_phone, owner_linkedin");
  if (leadIds.length) sq = sq.in("id", leadIds);
  else sq = sq.eq("lead_list_id", b.listId);
  const { data: sel } = await sq.limit(1000);
  const tier1 = (sel ?? []).filter((l) => l.status === "new").length;
  const tier2 = (sel ?? []).filter((l) =>
    l.status === "enriched" && !(l.owner_name && l.owner_email && (l.owner_phone || l.owner_linkedin))).length;
  const count = tier1 + tier2;
  const estimate = Number((tier1 * COST_PER_LEAD + tier2 * COST_PER_TIER2).toFixed(2));
  if (b.estimateOnly) return NextResponse.json({ count, tier1, tier2, estimate });
  if (!count) return NextResponse.json({ error: "selection is fully enriched — every lead already has owner + email + phone/LinkedIn" }, { status: 422 });

  const { data: job, error } = await db.from("enrichment_jobs").insert({
    lead_list_id: b.listId ?? null, lead_ids: leadIds, cost_estimate: estimate,
    counts: { total: count, processed: 0, tier1, tier2 },
  }).select("id").single();
  if (error) return NextResponse.json({ error: `${error.message} — apply migration 0008` }, { status: 503 });
  return NextResponse.json({ jobId: job.id, count, tier1, tier2, estimate, note: "queued — runner picks it up within 15 min (or the next worker pass)" });
}
