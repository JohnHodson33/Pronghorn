// River-guide run state (John 7/16 ~12:50): the answer to "is it working /
// when is it done / what did I actually get". Lane B polls this for the
// banner + receipt.
//
// GET → { active: [run], recent: [last 5 done/failed] }
// Each run: state, counts {total, processed, found_email, found_linkedin,
// found_phone, escalated_paid}, a human `note` (honest queued message until a
// worker picks it up, live progress while running, receipt when done), and
// `stale` when a queued run has waited past the worker cadence.
import { NextResponse } from "next/server";
import { hasDb, serverDb } from "@/lib/db";

export const dynamic = "force-dynamic";

const WORKER_CADENCE_MIN = 15;

type Counts = { total?: number; processed?: number; found_email?: number; found_linkedin?: number; found_phone?: number; escalated_paid?: number };

function describe(r: { state: string; counts: Counts | null; note: string | null; created_at: string; finished_at: string | null }) {
  const c = r.counts ?? {};
  if (r.state === "queued") {
    const waitedMin = (Date.now() - new Date(r.created_at).getTime()) / 60000;
    const stale = waitedMin > WORKER_CADENCE_MIN * 2;
    return {
      note: stale
        ? `Queued ${Math.round(waitedMin)} min — the worker is overdue (check the river-guides workflow); it will still run on the next pass`
        : `Queued — the worker starts within ~${WORKER_CADENCE_MIN} minutes`,
      stale,
    };
  }
  if (r.state === "running") {
    return { note: `Enriching ${c.processed ?? 0}/${c.total ?? 0} — ${c.found_email ?? 0} emails, ${c.found_linkedin ?? 0} LinkedIn found so far…`, stale: false };
  }
  if (r.state === "done") {
    const found = (c.found_email ?? 0) + (c.found_linkedin ?? 0) + (c.found_phone ?? 0);
    return {
      note: r.note ?? `Done: ${c.processed ?? 0} processed — ${c.found_email ?? 0} emails, ${c.found_linkedin ?? 0} verified LinkedIn${c.found_phone ? `, ${c.found_phone} phones` : ""}${c.escalated_paid ? `, ${c.escalated_paid} need the paid tier` : ""}${found === 0 ? " — nothing new found on the free tier" : ""}`,
      stale: false,
    };
  }
  return { note: r.note ?? "Run failed — see the worker log", stale: false };
}

export async function GET() {
  if (!hasDb()) return NextResponse.json({ error: "no db" }, { status: 503 });
  const db = serverDb();
  const { data, error } = await db.from("river_guide_runs")
    .select("*").order("created_at", { ascending: false }).limit(20);
  if (error) return NextResponse.json({ active: [], recent: [], note: "apply migration 0018 to enable run tracking" });

  const rows = (data ?? []).map((r) => ({ ...r, ...describe(r as never) }));
  return NextResponse.json({
    active: rows.filter((r) => r.state === "queued" || r.state === "running"),
    recent: rows.filter((r) => r.state === "done" || r.state === "failed").slice(0, 5),
  });
}
