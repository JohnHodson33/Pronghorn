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

  const levelFilter = url.searchParams.get("level") as Completeness | null;
  let companies = (data ?? []).map((c) => {
    const { contacts, ...rest } = c as typeof c & { contacts: unknown };
    return {
      ...rest,
      ownerContactCount: (c.contacts ?? []).filter((x) => (x.role ?? "").toLowerCase() === "owner").length,
      completeness: companyCompleteness(c),
    };
  });

  // counts BEFORE applying the level filter (so the header shows the full split)
  const counts = Object.fromEntries(
    LEVELS.map((lv) => [lv, companies.filter((c) => c.completeness === lv).length]),
  );
  if (levelFilter && LEVELS.includes(levelFilter)) {
    companies = companies.filter((c) => c.completeness === levelFilter);
  }
  // most-complete first, matching the leads list convention
  companies.sort((a, b) => LEVELS.indexOf(a.completeness) - LEVELS.indexOf(b.completeness));

  const industries = [...new Set((data ?? []).map((c) => c.industry).filter(Boolean))].sort();
  return NextResponse.json({ companies, counts, industries, total: companies.length });
}
