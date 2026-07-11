// Lead-list builds (off-market / proprietary sourcing). GET recent, POST create.
// The actual Google/OSM/license-board scraping runs server-side once data-source
// API keys are connected (Serper/Exa/Parallel) — this persists the request and
// surfaces status. Free sources (OpenStreetMap) can run without keys later.
import { NextResponse } from "next/server";
import { hasDb, serverDb } from "@/lib/db";

export async function GET() {
  if (!hasDb()) return NextResponse.json({ error: "no db" }, { status: 503 });
  const { data, error } = await serverDb()
    .from("lead_lists")
    .select("id, query_industry, query_geography, radius_miles, target_count, sources_enabled, status, leads_found, cost_estimate, created_at")
    .order("created_at", { ascending: false })
    .limit(40);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
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
      status: "pending", // becomes 'running' once a data-source worker is connected
      cost_estimate: b.costEstimate ?? null,
    })
    .select("id")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, id: data.id });
}
