// Lead-list builds (off-market / proprietary sourcing). GET recent, POST create.
// Builds are drained by the Lead-List Runner workflow (every 15 min) or any
// local worker pass. GET serves honest per-list status: what the runner is
// doing right now (0012 progress fields) and, for queued lists, when pickup
// happens — so a fresh build never reads as broken (John 7/12).
import { NextResponse } from "next/server";
import { hasDb, serverDb } from "@/lib/db";

const RUNNER_CADENCE_MIN = 15;

// Works pre- and post-0012: progress fields are simply undefined until the
// migration lands, and the detail strings degrade to cadence-based honesty.
function statusDetail(l: Record<string, unknown>): string {
  const status = String(l.status ?? "");
  if (status === "pending") {
    const ageMin = (Date.now() - new Date(String(l.created_at)).getTime()) / 60000;
    if (ageMin > RUNNER_CADENCE_MIN * 3)
      return `Queued ${Math.round(ageMin)} min — runner overdue (are the GitHub Actions secrets set?); it will still run on the next worker pass`;
    return `Queued — the runner picks this up within ~${RUNNER_CADENCE_MIN} minutes`;
  }
  if (status === "running") {
    const note = l.progress_note ? String(l.progress_note) : "querying sources…";
    const n = Number(l.candidates_found ?? 0);
    return `Running — ${note}${n > 0 && !note.includes("candidate") ? ` (${n} candidates so far)` : ""}`;
  }
  if (status === "failed")
    return l.last_error ? `Failed — ${l.last_error}` : "Failed — ask the agent to re-run this list";
  if (status === "complete") return `${Number(l.leads_found ?? 0)} leads found`;
  return status;
}

export async function GET() {
  if (!hasDb()) return NextResponse.json({ error: "no db" }, { status: 503 });
  const { data, error } = await serverDb()
    .from("lead_lists")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(40);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(
    (data ?? []).map((l) => ({
      id: l.id,
      query_industry: l.query_industry,
      query_geography: l.query_geography,
      radius_miles: l.radius_miles,
      target_count: l.target_count,
      sources_enabled: l.sources_enabled,
      status: l.status,
      leads_found: l.leads_found,
      cost_estimate: l.cost_estimate,
      cost_actual: l.cost_actual ?? null,
      created_at: l.created_at,
      started_at: l.started_at ?? null,
      finished_at: l.finished_at ?? null,
      progress_note: l.progress_note ?? null,
      candidates_found: l.candidates_found ?? 0,
      last_error: l.last_error ?? null,
      status_detail: statusDetail(l),
    }))
  );
}

export async function POST(req: Request) {
  if (!hasDb()) return NextResponse.json({ error: "no db" }, { status: 503 });
  const b = await req.json();
  const industry = String(b.industry ?? "").trim();
  if (!industry) return NextResponse.json({ error: "industry required" }, { status: 400 });

  const { data, error } = await serverDb()
    .from("lead_lists")
    .insert({
      query_industry: industry,
      query_geography: b.national ? null : String(b.geography ?? "").trim() || null,
      radius_miles: b.national ? null : Number(b.radius) || 70,
      target_count: Math.max(10, Math.min(500, Number(b.targetCount) || 50)),
      sources_enabled: Array.isArray(b.sources) ? b.sources : [],
      status: "pending",
      cost_estimate: b.costEstimate ?? null,
    })
    .select("id")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({
    ok: true,
    id: data.id,
    note: `Queued — the runner picks this up within ~${RUNNER_CADENCE_MIN} minutes`,
  });
}
