// Leads for a lead-list build (off-market sourcing results). GET ?list=<uuid>
// (or recent leads across lists if omitted). Feeds the List Building tab's
// results view and CSV export.
import { NextResponse } from "next/server";
import { hasDb, serverDb } from "@/lib/db";

export async function GET(req: Request) {
  if (!hasDb()) return NextResponse.json({ error: "no db" }, { status: 503 });
  const url = new URL(req.url);
  const list = url.searchParams.get("list");

  let q = serverDb()
    .from("leads")
    .select("id, lead_list_id, name, website, phone, address, city, state, owner_name, license_ids, source_tags, status, created_at")
    .order("created_at", { ascending: false })
    .limit(1000);
  if (list) q = q.eq("lead_list_id", list);

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
