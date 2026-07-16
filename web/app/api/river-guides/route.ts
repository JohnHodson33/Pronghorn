// River Guides list — serves the /river-guides page (third sourcing channel,
// John 7/16). Filtering/search stay client-side (433-row scale); this returns
// the full working set. PATCH/enrich/discover land with Lane C's waterfall.
//
// GET → { guides: [...], total } · 503 pre-migration-0016 (page shows its
// honest degrade banner until then).
import { NextResponse } from "next/server";
import { hasDb, serverDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!hasDb()) return NextResponse.json({ error: "no db" }, { status: 503 });
  const db = serverDb();

  const { data, error } = await db
    .from("river_guides")
    .select(
      "deal_id, full_name, name_status, archetype, archetype_subtype, industry, industry_group, vertical_raw, their_company, role, acquirer, acquirer_pe_sponsor, deal_year, location_city, location_state, company_website, company_website_status, exit_status, current_status_verified, source, source_confidence, screen_score, fit_score, priority_band, enrichment_status, contact, notes, contact_id, company_id"
    )
    .order("screen_score", { ascending: false, nullsFirst: false })
    .limit(2000);

  if (error) {
    // table missing (0016 not run yet) or transient — the page degrades honestly
    return NextResponse.json({ error: error.message }, { status: 503 });
  }
  return NextResponse.json({ guides: data ?? [], total: data?.length ?? 0 });
}
