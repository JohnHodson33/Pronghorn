// Leads for a lead-list build (off-market sourcing results). GET ?list=<uuid>
// (or recent leads across lists if omitted). Feeds the List Building tab's
// results view and CSV export.
import { NextResponse } from "next/server";
import { hasDb, serverDb } from "@/lib/db";
import { completeness, LEVELS, type Completeness } from "@/lib/completeness";
import { sizeEstimate, applyQualitativeFlags, TIERS } from "@/lib/size";
import { loadSizeModel } from "@/lib/size-model";

export async function GET(req: Request) {
  if (!hasDb()) return NextResponse.json({ error: "no db" }, { status: 503 });
  const url = new URL(req.url);
  const list = url.searchParams.get("list");

  let q = serverDb()
    .from("leads")
    .select("id, lead_list_id, name, website, phone, address, city, state, owner_name, owner_email, owner_phone, owner_linkedin, enrichment, license_ids, source_tags, status, company_id, created_at, review_count, rating, industry_verified, off_target")
    .order("created_at", { ascending: false })
    .limit(1000);
  if (list) q = q.eq("lead_list_id", list);

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // completeness = the demarcation John reads; computed server-side once,
  // default order = most complete first (results float to the top post-run)
  const model = await loadSizeModel();
  const rows = (data ?? []).map((l) => {
    const enrich = l.enrichment as { size_signals?: Record<string, unknown>; too_big?: boolean; pe_owned?: boolean; pe_owner?: string; hq_us?: boolean | string } | null;
    const size = applyQualitativeFlags(sizeEstimate(
      (l as { industry_verified?: string }).industry_verified,
      enrich?.size_signals,
      (l as { review_count?: number }).review_count,
      model,
    ), enrich);
    return {
      ...l, completeness: completeness(l), size,
      size_tier: size?.tier ?? "unsized",
      // always-present columns (John amendment 3): ranges or null, UI renders blank
      est_revenue: size?.revenue ?? null,
      est_ebitda: size?.ebitda ?? null,
      pe_owned: enrich?.pe_owned === true,
      pe_owner: enrich?.pe_owner ?? null,
      hq_us: enrich?.hq_us ?? null,
      linkedin_verified: (l.enrichment as { linkedin_verified?: boolean } | null)?.linkedin_verified === true,
    };
  });
  rows.sort((a, b) => LEVELS.indexOf(a.completeness as Completeness) - LEVELS.indexOf(b.completeness as Completeness));
  let out = rows;
  const tierFilter = url.searchParams.get("tier");
  if (tierFilter && TIERS.includes(tierFilter as (typeof TIERS)[number])) {
    out = rows.filter((r) => r.size_tier === tierFilter);
  }
  const counts = Object.fromEntries(LEVELS.map((lv) => [lv, rows.filter((r) => r.completeness === lv).length]));
  const tierCounts = Object.fromEntries(TIERS.map((t) => [t, rows.filter((r) => r.size_tier === t).length]));
  return NextResponse.json({ leads: out, counts, tierCounts, total: out.length });
}
