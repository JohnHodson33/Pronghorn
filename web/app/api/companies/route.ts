// Companies list with server-side completeness (John 7/12: the FULL/CONTACTABLE/
// IDENTIFIED/BASIC/RAW level must live outside the enrichment tab, on /companies,
// filterable + counted, combinable with industry). Answers his query: "how many
// CONTACTABLE owners in tree care across the whole company DB."
//
// GET [?industry=&level=&origin=&q=] →
//   { companies:[{…, completeness}], counts:{level→n}, industries:[…], total }
import { NextResponse } from "next/server";
import { hasDb, serverDb } from "@/lib/db";
import { companyCompleteness, LEVELS, type Completeness } from "@/lib/completeness";
import { sizeEstimate, TIERS } from "@/lib/size";
import { loadSizeModel } from "@/lib/size-model";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!hasDb()) return NextResponse.json({ error: "no db" }, { status: 503 });
  const url = new URL(req.url);
  const db = serverDb();

  let q = db
    .from("companies")
    .select("id, name, industry, city, state, website, origin, revenue, ebitda, contacts(role, name, email, phone, linkedin)")
    .order("name")
    .limit(2000);
  const industry = url.searchParams.get("industry");
  const origin = url.searchParams.get("origin");
  const search = url.searchParams.get("q");
  if (industry) q = q.eq("industry", industry);
  if (origin) q = q.eq("origin", origin);
  if (search) q = q.ilike("name", `%${search}%`);

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // size signals live on the source LEAD's enrichment — one join by company_id
  const { data: leadRows } = await db
    .from("leads")
    .select("company_id, enrichment, review_count, industry_verified")
    .not("company_id", "is", null)
    .limit(3000);
  const leadByCompany = new Map((leadRows ?? []).map((l) => [l.company_id as string, l]));
  const model = await loadSizeModel();

  const levelFilter = url.searchParams.get("level") as Completeness | null;
  let companies = (data ?? []).map((c) => {
    const { contacts, ...rest } = c as typeof c & { contacts: unknown };
    const lead = leadByCompany.get(c.id as string);
    const size = lead
      ? sizeEstimate(
          (lead.industry_verified as string | null) ?? (c.industry as string | null),
          (lead.enrichment as { size_signals?: Record<string, unknown> } | null)?.size_signals,
          lead.review_count as number | null,
          model,
        )
      : null;
    return {
      ...rest,
      ownerContactCount: (c.contacts ?? []).filter((x) => (x.role ?? "").toLowerCase() === "owner").length,
      completeness: companyCompleteness(c),
      size, size_tier: size?.tier ?? "unsized",
      // always-present columns (John amendment 3): actuals win over estimates
      est_revenue: size?.revenue ?? null,
      est_ebitda: size?.ebitda ?? null,
    };
  });

  // counts BEFORE applying filters (so the header shows the full split)
  const counts = Object.fromEntries(
    LEVELS.map((lv) => [lv, companies.filter((c) => c.completeness === lv).length]),
  );
  const tierCounts = Object.fromEntries(
    TIERS.map((t) => [t, companies.filter((c) => c.size_tier === t).length]),
  );
  if (levelFilter && LEVELS.includes(levelFilter)) {
    companies = companies.filter((c) => c.completeness === levelFilter);
  }
  const tierFilter = url.searchParams.get("tier");
  if (tierFilter && TIERS.includes(tierFilter as (typeof TIERS)[number])) {
    companies = companies.filter((c) => c.size_tier === tierFilter);
  }
  // most-complete first, platform floats above within a level (outreach order)
  const tierRank = (t: string) => ({ platform: 0, tuckin: 1, toosmall: 3, unsized: 2 })[t] ?? 2;
  companies.sort((a, b) =>
    LEVELS.indexOf(a.completeness) - LEVELS.indexOf(b.completeness) ||
    tierRank(a.size_tier) - tierRank(b.size_tier));

  const industries = [...new Set((data ?? []).map((c) => c.industry).filter(Boolean))].sort();
  return NextResponse.json({ companies, counts, tierCounts, industries, total: companies.length });
}
