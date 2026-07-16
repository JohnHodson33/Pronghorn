// River Guides — the third sourcing channel (John 7/16: exited operators
// recruited for equity + board seats; outreach to them SEQUENCES BEFORE
// company targets). GET the workstream list with filters + counts; PATCH a
// row (inline edits, band overrides). Enrichment/verification is run by the
// scraper workers (riverguides/*.js) on schedule — POST here queues nothing
// paid; it just marks rows for the next worker pass via enrichment_status.
//
// Filters: ?band= &status= &industry= &state= &name_status= &q=
// Degrades with an apply-0016 note until John runs the migration.
import { NextResponse } from "next/server";
import { hasDb, serverDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!hasDb()) return NextResponse.json({ error: "no db" }, { status: 503 });
  const url = new URL(req.url);
  let q = serverDb().from("river_guides").select("*")
    .order("screen_score", { ascending: false }).limit(1000);
  const f = (k: string) => url.searchParams.get(k);
  if (f("band")) q = q.eq("priority_band", f("band"));
  if (f("status")) q = q.eq("enrichment_status", f("status"));
  if (f("industry")) q = q.eq("industry", f("industry"));
  if (f("state")) q = q.eq("location_state", f("state"));
  if (f("name_status")) q = q.eq("name_status", f("name_status"));
  if (f("q")) q = q.or(`full_name.ilike.%${f("q")}%,their_company.ilike.%${f("q")}%,acquirer.ilike.%${f("q")}%`);

  const { data, error } = await q;
  if (error) return NextResponse.json({ guides: [], counts: {}, note: "apply migration 0016 to enable river guides" });

  const guides = data ?? [];
  const countBy = (key: string) =>
    guides.reduce((m: Record<string, number>, g: Record<string, unknown>) => {
      const v = String(g[key] ?? "—"); m[v] = (m[v] ?? 0) + 1; return m;
    }, {});
  return NextResponse.json({
    guides,
    counts: {
      band: countBy("priority_band"),
      status: countBy("enrichment_status"),
      industry: countBy("industry"),
      state: countBy("location_state"),   // state-level M&A-density view
      exit: countBy("exit_status"),
    },
    total: guides.length,
  });
}

export async function PATCH(req: Request) {
  if (!hasDb()) return NextResponse.json({ error: "no db" }, { status: 503 });
  const b = await req.json();
  const dealId = String(b.deal_id ?? "");
  if (!dealId) return NextResponse.json({ error: "deal_id required" }, { status: 400 });
  const allowed = ["full_name", "name_status", "exit_status", "priority_band", "enrichment_status",
    "email", "phone", "linkedin_url", "notes", "archetype", "archetype_subtype", "location_city", "location_state"];
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const k of allowed) if (k in b) patch[k] = b[k];
  const { error } = await serverDb().from("river_guides").update(patch).eq("deal_id", dealId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

// POST {action: 'queue_enrichment'|'queue_verification', deal_ids: [...]}
// John's "select these people for enrichment": flips rows so the next worker
// pass picks them first. No spend happens here.
export async function POST(req: Request) {
  if (!hasDb()) return NextResponse.json({ error: "no db" }, { status: 503 });
  const b = await req.json();
  const ids: string[] = Array.isArray(b.deal_ids) ? b.deal_ids.map(String) : [];
  if (!ids.length) return NextResponse.json({ error: "deal_ids required" }, { status: 400 });
  const db = serverDb();
  if (b.action === "queue_enrichment") {
    const { error } = await db.from("river_guides")
      .update({ enrichment_status: "PENDING_T1", updated_at: new Date().toISOString() })
      .in("deal_id", ids).eq("name_status", "RESOLVED");
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, queued: ids.length, note: "tier-1 worker picks these up on its next pass" });
  }
  if (b.action === "queue_verification") {
    const { error } = await db.from("river_guides")
      .update({ current_status_verified: false, updated_at: new Date().toISOString() })
      .in("deal_id", ids);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, queued: ids.length, note: "status-verification worker re-checks these next pass" });
  }
  return NextResponse.json({ error: "action must be queue_enrichment or queue_verification" }, { status: 400 });
}
