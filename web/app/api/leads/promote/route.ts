// Lead → Company promotion for Lane B's "Add to Companies" button.
// POST { leadId } — promotes ONE enriched lead into companies + owner contact
// (origin 'lead'), links leads.company_id. Same rules as the batch script
// (scraper/promote_leads.js): dedupe by normalized name+state, idempotent.
import { NextResponse } from "next/server";
import { hasDb, serverDb } from "@/lib/db";

export const dynamic = "force-dynamic";

const norm = (s: string | null | undefined) =>
  String(s ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

export async function POST(req: Request) {
  if (!hasDb()) return NextResponse.json({ error: "no db" }, { status: 503 });
  const db = serverDb();
  const { leadId } = await req.json();
  if (!leadId) return NextResponse.json({ error: "leadId required" }, { status: 400 });

  const { data: l } = await db.from("leads")
    .select("id, name, website, city, state, owner_name, owner_email, owner_phone, owner_linkedin, source_tags, lead_list_id, company_id, enrichment")
    .eq("id", leadId).maybeSingle();
  if (!l) return NextResponse.json({ error: "lead not found" }, { status: 404 });
  if (l.company_id) return NextResponse.json({ ok: true, companyId: l.company_id, already: true });
  if (!l.owner_name || (!l.owner_email && !l.owner_phone)) {
    return NextResponse.json({ error: "lead not outreach-ready (needs owner name + email or phone) — enrich first" }, { status: 422 });
  }

  // dedupe: existing company with same normalized name + state gets linked
  const { data: candidates } = await db.from("companies").select("id, name, state").ilike("name", `%${l.name.slice(0, 24)}%`);
  const key = `${norm(l.name)}|${(l.state ?? "").toUpperCase()}`;
  let companyId = (candidates ?? []).find((c) => `${norm(c.name)}|${(c.state ?? "").toUpperCase()}` === key)?.id ?? null;
  let createdCompany = false;

  if (!companyId) {
    const { data: list } = l.lead_list_id
      ? await db.from("lead_lists").select("query_industry").eq("id", l.lead_list_id).maybeSingle()
      : { data: null };
    const { data: co, error: cErr } = await db.from("companies").insert({
      name: l.name, website: l.website, city: l.city, state: l.state,
      industry: list?.query_industry ?? null, origin: "lead", lead_id: l.id,
      notes: [l.enrichment?.overview, `Proprietary target · sources: ${(l.source_tags ?? []).join(", ")}`].filter(Boolean).join(" | "),
    }).select("id").single();
    if (cErr) return NextResponse.json({ error: cErr.message }, { status: 500 });
    companyId = co.id;
    createdCompany = true;
  }

  const { data: exOwner } = await db.from("contacts")
    .select("id").eq("company_id", companyId).eq("role", "owner").maybeSingle();
  if (!exOwner) {
    await db.from("contacts").insert({
      company_id: companyId, role: "owner", name: l.owner_name,
      email: l.owner_email, phone: l.owner_phone, linkedin: l.owner_linkedin,
      notes: `Owner of ${l.name} · from proprietary list-building enrichment`,
    });
  }
  await db.from("leads").update({ company_id: companyId }).eq("id", l.id);
  return NextResponse.json({ ok: true, companyId, createdCompany });
}
