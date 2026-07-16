// River-guide enrichment queue — Lane B's "Enrich selected" button posts
// {dealIds: [...]}. Flips RESOLVED rows to PENDING_T1 so the tier-1 waterfall
// worker (riverguides/enrich_t1.js — nightly + any loop pass) picks them up
// first. TBD rows can't be enriched (identity first) and are reported back.
// No spend happens in this route.
import { NextResponse } from "next/server";
import { hasDb, serverDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!hasDb()) return NextResponse.json({ error: "no db" }, { status: 503 });
  const b = await req.json().catch(() => ({}));
  const ids: string[] = Array.isArray(b.dealIds) ? b.dealIds.map(String)
    : Array.isArray(b.deal_ids) ? b.deal_ids.map(String) : [];
  if (!ids.length) return NextResponse.json({ error: "dealIds required" }, { status: 400 });

  const db = serverDb();
  const { data: rows, error: selErr } = await db.from("river_guides")
    .select("deal_id, name_status").in("deal_id", ids);
  if (selErr) return NextResponse.json({ error: `${selErr.message} — apply migration 0016` }, { status: 500 });

  const resolved = (rows ?? []).filter((r) => r.name_status === "RESOLVED").map((r) => r.deal_id);
  const tbd = (rows ?? []).length - resolved.length;
  if (resolved.length) {
    const { error } = await db.from("river_guides")
      .update({ enrichment_status: "PENDING_T1", updated_at: new Date().toISOString() })
      .in("deal_id", resolved);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({
    ok: true, queued: resolved.length,
    note: `Queued ${resolved.length} for tier-1 enrichment (Hunter/LinkedIn waterfall — next worker pass, est $0 marginal)${tbd ? `; ${tbd} skipped: name still TBD (identity resolution runs nightly)` : ""}.`,
  });
}
