// Scrape-source roster: list + toggle. The pipeline checks `enabled` in the DB
// at run start, so these toggles directly control what gets scraped.
import { NextResponse } from "next/server";
import { hasDb, serverDb } from "@/lib/db";

export async function GET() {
  if (!hasDb()) return NextResponse.json({ error: "no db" }, { status: 503 });
  const { data, error } = await serverDb()
    .from("scrape_sources")
    .select("id, name, url, adapter, enabled, tier, last_run_at, last_run_status, notes")
    .order("tier")
    .order("name");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
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
