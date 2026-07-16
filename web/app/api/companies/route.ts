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
import { sizeEstimate, applyQualitativeFlags, TIERS } from "@/lib/size";
import { loadSizeModel } from "@/lib/size-model";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!hasDb()) return NextResponse.json({ error: "no db" }, { status: 503 });
  const url = new URL(req.url);
  const db = serverDb();

  const buildQuery = (cols: string) => {
    let q = db.from("companies").select(cols).order("name").limit(2000);
    const industry = url.searchParams.get("industry");
    const origin = url.searchParams.get("origin");
    const search = url.searchParams.get("q");
    if (industry) q = q.eq("industry", industry);
    if (origin) q = q.eq("origin", origin);
    if (search) q = q.ilike("name", `%${search}%`);
    return q;
  };
  // pe columns are 0016 — retry without them until John's SQL pass lands
  let { data, error } = await buildQuery("id, name, industry, city, state, website, origin, revenue, ebitda, pe_owned, pe_owner, contacts(role, name, email, phone, linkedin)");
  if (error && /pe_owned|pe_owner/.test(error.message)) {
    ({ data, error } = await buildQuery("id, name, industry, city, state, website, origin, revenue, ebitda, contacts(role, name, email, phone, linkedin)"));
  }
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  // dynamic select() string defeats supabase-js type inference — one honest cast
  const rows = (data ?? []) as unknown as Record<string, unknown>[];

  // size signals live on the source LEAD's enrichment — one join by company_id
  const { data: leadRows } = await db
    .from("leads")
    .select("company_id, enrichment, review_count, industry_verified")
    .not("company_id", "is", null)
    .limit(3000);
  const leadByCompany = new Map((leadRows ?? []).map((l) => [l.company_id as string, l]));
  const model = await loadSizeModel();

  // shortlist ★ state (0015; tolerated absent pre-migration)
  const shortlistRes = await db.from("company_shortlist").select("company_id, person, note, created_at");
  const shortlistByCompany = new Map<string, { person: string; note: string | null; created_at: string }[]>();
  for (const s of shortlistRes.data ?? []) {
    const arr = shortlistByCompany.get(s.company_id as string) ?? [];
    arr.push({ person: s.person as string, note: s.note as string | null, created_at: s.created_at as string });
    shortlistByCompany.set(s.company_id as string, arr);
  }

  const levelFilter = url.searchParams.get("level") as Completeness | null;
  let companies = rows.map((c) => {
    const { contacts, ...rest } = c as Record<string, unknown> & { contacts: unknown };
    const lead = leadByCompany.get(c.id as string);
    const leadEnrich = (lead?.enrichment ?? null) as { size_signals?: Record<string, unknown>; too_big?: boolean; pe_owned?: boolean; pe_owner?: string } | null;
    const size = lead
      ? applyQualitativeFlags(sizeEstimate(
          (lead.industry_verified as string | null) ?? (c.industry as string | null),
          leadEnrich?.size_signals,
          lead.review_count as number | null,
          model,
        ), leadEnrich)
      : null;
    const cRow = c as typeof c & { pe_owned?: boolean | null; pe_owner?: string | null };
    return {
      // company column (0016, ground truth) wins over lead-enrichment detection
      pe_owned: cRow.pe_owned === true || leadEnrich?.pe_owned === true,
      pe_owner: cRow.pe_owner ?? leadEnrich?.pe_owner ?? null,
      ...rest,
      ownerContactCount: ((contacts as { role?: string | null }[] | null) ?? [])
        .filter((x) => (x.role ?? "").toLowerCase() === "owner").length,
      completeness: companyCompleteness(c),
      size, size_tier: size?.tier ?? "unsized",
      // always-present columns (John amendment 3): actuals win over estimates
      est_revenue: size?.revenue ?? null,
      est_ebitda: size?.ebitda ?? null,
      shortlist: shortlistByCompany.get(c.id as string) ?? [],
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
  // ?shortlisted=any|John|Tom — "★ Shortlisted (mine / Tom's / any)"
  const shortlisted = url.searchParams.get("shortlisted");
  if (shortlisted) {
    companies = companies.filter((c) =>
      shortlisted === "any" ? c.shortlist.length > 0 : c.shortlist.some((s) => s.person === shortlisted));
  }
  // most-complete first, platform floats above within a level (outreach order)
  const tierRank = (t: string) => ({ platform: 0, tuckin: 1, toosmall: 3, unsized: 2 })[t] ?? 2;
  companies.sort((a, b) =>
    LEVELS.indexOf(a.completeness) - LEVELS.indexOf(b.completeness) ||
    tierRank(a.size_tier) - tierRank(b.size_tier));

  const industries = [...new Set(rows.map((c) => c.industry as string | null).filter(Boolean))].sort();
  return NextResponse.json({ companies, counts, tierCounts, industries, total: companies.length });
}
