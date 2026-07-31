// Manual cost entry (John 7/20). Some spend is invoiced, not API-metered — the
// Upwork VA (~$6/hr, enriching existing contacts) is the first case. John/Tom
// log it here and it flows through variableTotal like any metered service.
//
// POST { cost_usd, units?, service?, activity?, note?, entered_by, dated? }
//   → usage_events { service:'upwork', activity:'va_enrichment', units, cost_usd,
//                    at: dated||now, meta:{ note, entered_by, dated, source:'manual' } }
// GET  ?limit=  → recent manual entries (so John can verify what was logged)
//
// Nothing is invented: cost_usd is required and taken verbatim. `dated` places
// the event in the right Month/YTD window (defaults to now).
import { NextResponse } from "next/server";
import { hasDb, serverDb } from "@/lib/db";

export const dynamic = "force-dynamic";

const ENTERERS = ["John", "Tom"];

export async function GET(req: Request) {
  if (!hasDb()) return NextResponse.json({ error: "no db" }, { status: 503 });
  const limit = Math.min(Number(new URL(req.url).searchParams.get("limit")) || 25, 200);
  // manual entries are tagged meta->>source='manual'; fall back to service filter
  const { data, error } = await serverDb()
    .from("usage_events")
    .select("id, at, service, activity, units, cost_usd, meta")
    .eq("meta->>source", "manual")
    .order("at", { ascending: false })
    .limit(limit);
  if (error) return NextResponse.json({ entries: [], note: "apply migration 0009" });
  return NextResponse.json({ entries: data ?? [] });
}

export async function POST(req: Request) {
  if (!hasDb()) return NextResponse.json({ error: "no db" }, { status: 503 });
  const b = await req.json().catch(() => ({}));

  const cost = Number(b.cost_usd);
  if (!Number.isFinite(cost) || cost < 0) {
    return NextResponse.json({ error: "cost_usd required (a non-negative number)" }, { status: 400 });
  }
  const enteredBy = String(b.entered_by ?? "").trim();
  if (!ENTERERS.includes(enteredBy)) {
    return NextResponse.json({ error: "entered_by must be John or Tom" }, { status: 400 });
  }
  // units are optional (hours or contacts) — never fabricated; null if omitted
  const units = b.units == null || b.units === "" ? null : Number(b.units);
  if (units != null && (!Number.isFinite(units) || units < 0)) {
    return NextResponse.json({ error: "units, if given, must be a non-negative number" }, { status: 400 });
  }
  const service = String(b.service ?? "upwork").trim() || "upwork";
  const activity = String(b.activity ?? "va_enrichment").trim() || "va_enrichment";
  const note = b.note == null ? null : String(b.note).trim() || null;

  // `dated` (YYYY-MM-DD or ISO) places the cost in the right window; default now
  let at: string;
  if (b.dated) {
    const d = new Date(b.dated);
    if (isNaN(d.getTime())) return NextResponse.json({ error: "dated must be a valid date (YYYY-MM-DD)" }, { status: 400 });
    at = d.toISOString();
  } else {
    at = new Date().toISOString();
  }

  const row = {
    service,
    activity,
    units: units ?? 1,
    cost_usd: Number(cost.toFixed(5)),
    at,
    meta: { note, entered_by: enteredBy, dated: b.dated ?? null, source: "manual" },
  };
  const { data, error } = await serverDb().from("usage_events").insert(row).select("id").single();
  if (error) return NextResponse.json({ error: `${error.message} — apply migration 0009` }, { status: 503 });
  return NextResponse.json({ ok: true, id: data.id, entry: { ...row } });
}
