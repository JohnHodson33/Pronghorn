// Scrape-source roster: list + toggle. The pipeline checks `enabled` in the DB
// at run start, so these toggles directly control what gets scraped.
import { NextResponse } from "next/server";
import { hasDb, serverDb } from "@/lib/db";

export async function GET() {
  if (!hasDb()) return NextResponse.json({ error: "no db" }, { status: 503 });
  const db = serverDb();
  const { data, error } = await db
    .from("scrape_sources")
    .select("id, name, url, adapter, enabled, tier, last_run_at, last_run_status, notes")
    .order("tier")
    .order("name");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Per-source health (the displaced dashboard-v2 table, absorbed here):
  // unique listings, +7d, and dupes filtered by the mirror dedup. Head-count
  // queries in small batches so ~37 sources don't fire 100+ requests at once.
  const weekAgo = new Date(Date.now() - 7 * 86400_000).toISOString();
  const rows = data ?? [];
  const counts = new Map<string, { total: number; newThisWeek: number; dupes: number }>();
  for (let i = 0; i < rows.length; i += 8) {
    await Promise.all(
      rows.slice(i, i + 8).map(async (s) => {
        const [tot, nw, dup] = await Promise.all([
          db.from("listings").select("id", { count: "exact", head: true }).eq("source_id", s.id).is("duplicate_of", null),
          db.from("listings").select("id", { count: "exact", head: true }).eq("source_id", s.id).is("duplicate_of", null).gte("first_seen_at", weekAgo),
          db.from("listings").select("id", { count: "exact", head: true }).eq("source_id", s.id).not("duplicate_of", "is", null),
        ]);
        counts.set(s.id, { total: tot.count ?? 0, newThisWeek: nw.count ?? 0, dupes: dup.count ?? 0 });
      })
    );
  }
  return NextResponse.json(rows.map((s) => ({ ...s, ...(counts.get(s.id) ?? { total: 0, newThisWeek: 0, dupes: 0 }) })));
}

export async function PATCH(req: Request) {
  if (!hasDb()) return NextResponse.json({ error: "no db" }, { status: 503 });
  const { id, enabled } = await req.json();
  if (typeof id !== "string" || typeof enabled !== "boolean")
    return NextResponse.json({ error: "id + enabled required" }, { status: 400 });
  const { error } = await serverDb().from("scrape_sources").update({ enabled }).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
