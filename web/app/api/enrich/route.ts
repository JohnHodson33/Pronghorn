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
  // select * so the endpoint serves 0022's results/queued_by/label when they
  // exist and still works before the migration
  let q = serverDb().from("enrichment_jobs")
    .select("*")
    .order("created_at", { ascending: false }).limit(25);
  if (jobId) q = q.eq("id", jobId);
  const { data, error } = await q;
  if (error) return NextResponse.json({ error: `${error.message} — apply migration 0008`, jobs: [] }, { status: 200 });

  // outcome breakdown (0022) — aggregate counts + id lists per outcome so the
  // UI's quick-chips ("Gained contact" / "Nothing new") are one lookup
  const OUTCOMES = ["gained_owner", "gained_email", "gained_phone", "gained_linkedin", "escalated_paid", "nothing_new"];
  const jobs = (data ?? []).map((j: Record<string, unknown>) => {
    const res = j.results as Record<string, Record<string, boolean>> | null;
    if (!res) return j;
    const outcomes: Record<string, { count: number; ids: string[] }> = {};
    for (const k of OUTCOMES) {
      const ids = Object.entries(res).filter(([, o]) => o?.[k]).map(([id]) => id);
      if (ids.length) outcomes[k] = { count: ids.length, ids };
    }
    return { ...j, outcomes };
  });
  return NextResponse.json({ jobs });
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

  // queued_by + label (0022): who queued it and the UI's filter summary —
  // retried without them on a pre-0022 DB so queueing never breaks
  const baseRow = {
    lead_list_id: b.listId ?? null, lead_ids: leadIds, cost_estimate: estimate,
    counts: { total: count, processed: 0, tier1, tier2 },
  };
  const meta = {
    ...(typeof b.queuedBy === "string" && b.queuedBy.trim() ? { queued_by: b.queuedBy.trim().slice(0, 40) } : {}),
    ...(typeof b.label === "string" && b.label.trim() ? { label: b.label.trim().slice(0, 120) } : {}),
  };
  let ins = await db.from("enrichment_jobs").insert({ ...baseRow, ...meta }).select("id").single();
  if (ins.error && Object.keys(meta).length && /queued_by|label/.test(ins.error.message)) {
    ins = await db.from("enrichment_jobs").insert(baseRow).select("id").single();
  }
  const { data: job, error } = ins;
  if (error || !job) return NextResponse.json({ error: `${error?.message} — apply migration 0008` }, { status: 503 });
  return NextResponse.json({ jobId: job.id, count, tier1, tier2, estimate, note: "queued — runner picks it up within 15 min (or the next worker pass)" });
}
