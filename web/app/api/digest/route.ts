// Nightly digest (approved card 9bb9d925): GET the latest digest rows
// (receipt + tonight's plan), PATCH to pause/resume tonight's run BEFORE the
// 5am runner fires — John's one-tap control over auto-enrich spend.
// Degrades pre-0014 with an apply note. The digest never spends; the runner
// (scraper/nightly_digest.js --run) checks status==='paused' and stands down.
import { NextResponse } from "next/server";
import { hasDb, serverDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!hasDb()) return NextResponse.json({ error: "no db" }, { status: 503 });
  const { data, error } = await serverDb()
    .from("nightly_digests")
    .select("*")
    .order("digest_date", { ascending: false })
    .limit(7);
  if (error) return NextResponse.json({ digests: [], note: "apply migration 0014 to enable the nightly digest" });
  return NextResponse.json({ digests: data ?? [] });
}

export async function PATCH(req: Request) {
  if (!hasDb()) return NextResponse.json({ error: "no db" }, { status: 503 });
  const b = await req.json();
  const id = String(b.id ?? "");
  const status = String(b.status ?? "");
  if (!id || !["paused", "planned"].includes(status)) {
    return NextResponse.json({ error: "id + status (paused|planned) required" }, { status: 400 });
  }
  const { error } = await serverDb()
    .from("nightly_digests")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id)
    .in("status", ["planned", "paused"]); // can't pause a run that already happened
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, status });
}
