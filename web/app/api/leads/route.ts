// Leads for a lead-list build (off-market sourcing results). GET ?list=<uuid>
// (or recent leads across lists if omitted). Feeds the List Building tab's
// results view and CSV export.
import { NextResponse } from "next/server";
import { hasDb, serverDb } from "@/lib/db";
import { completeness, LEVELS, type Completeness } from "@/lib/completeness";

export async function GET(req: Request) {
  if (!hasDb()) return NextResponse.json({ error: "no db" }, { status: 503 });
  const url = new URL(req.url);
  const list = url.searchParams.get("list");

  let q = serverDb()
    .from("leads")
    .select("id, lead_list_id, name, website, phone, address, city, state, owner_name, owner_email, owner_phone, owner_linkedin, enrichment, license_ids, source_tags, status, company_id, created_at")
    .order("created_at", { ascending: false })
    .limit(1000);
  if (list) q = q.eq("lead_list_id", list);

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // completeness = the demarcation John reads; computed server-side once,
  // default order = most complete first (results float to the top post-run)
  const rows = (data ?? []).map((l) => ({ ...l, completeness: completeness(l) }));
  rows.sort((a, b) => LEVELS.indexOf(a.completeness as Completeness) - LEVELS.indexOf(b.completeness as Completeness));
  const counts = Object.fromEntries(LEVELS.map((lv) => [lv, rows.filter((r) => r.completeness === lv).length]));
  return NextResponse.json({ leads: rows, counts, total: rows.length });
}
