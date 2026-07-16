// Size Estimation model — the backend for the Size Estimation tab (John
// amendment 3 on card 37450f11): per-industry benchmarks (revenue-per-employee,
// EBITDA margin band) AND the Platform / Tuck-in / Too-small threshold
// boundaries, all editable, with the math cascading (every tier/estimate is
// computed on read, so an edit here changes every chip on next load).
//
// GET  → { benchmarks: {industry → {revenue_per_employee, ebitda_margin}},
//          thresholds, source: "db" | "seed" }
// PATCH { industry, revenue_per_employee?, ebitda_margin? }   → update one benchmark row
// PATCH { thresholds: {platform_min_ebitda?, platform_min_revenue?, …} } → update boundaries
// Degrades pre-0014: GET serves the seeds; PATCH returns the apply note.
import { NextResponse } from "next/server";
import { hasDb, serverDb } from "@/lib/db";
import { loadSizeModel } from "@/lib/size-model";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!hasDb()) return NextResponse.json({ error: "no db" }, { status: 503 });
  return NextResponse.json(await loadSizeModel());
}

export async function PATCH(req: Request) {
  if (!hasDb()) return NextResponse.json({ error: "no db" }, { status: 503 });
  const db = serverDb();
  const b = await req.json();

  if (b.thresholds && typeof b.thresholds === "object") {
    const allowed = ["platform_min_ebitda", "platform_min_revenue", "toosmall_max_ebitda", "toosmall_max_revenue", "toobig_min_ebitda"];
    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    for (const k of allowed) if (k in b.thresholds) patch[k] = b.thresholds[k];
    const { error } = await db.from("size_thresholds").update(patch).eq("id", true);
    if (error) return NextResponse.json({ error: `${error.message} — apply migration 0014 first` }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  const industry = String(b.industry ?? "").trim();
  if (!industry) return NextResponse.json({ error: "industry or thresholds required" }, { status: 400 });
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (b.revenue_per_employee != null) patch.revenue_per_employee = Number(b.revenue_per_employee);
  if (Array.isArray(b.ebitda_margin) && b.ebitda_margin.length === 2) {
    patch.ebitda_margin_low = Number(b.ebitda_margin[0]);
    patch.ebitda_margin_high = Number(b.ebitda_margin[1]);
  }
  const { error } = await db.from("size_benchmarks").upsert({ industry, ...patch }, { onConflict: "industry" });
  if (error) return NextResponse.json({ error: `${error.message} — apply migration 0014 first` }, { status: 500 });
  return NextResponse.json({ ok: true });
}
