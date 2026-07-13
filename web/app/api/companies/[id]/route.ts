// Company detail: GET returns the company + its server-side completeness level;
// PATCH updates whitelisted key fields (financials parse to numbers).
import { NextResponse } from "next/server";
import { hasDb, serverDb } from "@/lib/db";
import { companyCompleteness } from "@/lib/completeness";

const TEXT_FIELDS = ["name", "industry", "city", "state", "website", "notes"] as const;
const NUM_FIELDS = ["revenue", "ebitda"] as const;

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!hasDb()) return NextResponse.json({ error: "no db" }, { status: 503 });
  const { id } = await params;
  const { data, error } = await serverDb()
    .from("companies")
    .select("id, name, industry, city, state, website, notes, revenue, ebitda, ebitda_type, origin, contacts(role, name, email, phone, linkedin)")
    .eq("id", id)
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "company not found" }, { status: 404 });
  return NextResponse.json({ ...data, completeness: companyCompleteness(data) });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!hasDb()) return NextResponse.json({ error: "no db" }, { status: 503 });
  const { id } = await params;
  const body = await req.json();

  const update: Record<string, unknown> = {};
  for (const f of TEXT_FIELDS) {
    if (body[f] !== undefined) update[f] = String(body[f]).trim() || null;
  }
  for (const f of NUM_FIELDS) {
    if (body[f] !== undefined) {
      const v = body[f] === null || body[f] === "" ? null : Number(String(body[f]).replace(/[,$]/g, ""));
      if (v !== null && !Number.isFinite(v))
        return NextResponse.json({ error: `${f} must be a number` }, { status: 400 });
      update[f] = v;
    }
  }
  if (body.ebitda_type !== undefined) {
    const t = String(body.ebitda_type).trim();
    if (t && !["EBITDA", "SDE", "adj EBITDA"].includes(t))
      return NextResponse.json({ error: "ebitda_type must be EBITDA, SDE, or adj EBITDA" }, { status: 400 });
    update.ebitda_type = t || null;
  }
  // Company names are load-bearing (no-blind-teaser rule) — never blank one out.
  if (update.name === null) return NextResponse.json({ error: "name cannot be empty" }, { status: 400 });
  if (Object.keys(update).length === 0)
    return NextResponse.json({ error: "no updatable fields in body" }, { status: 400 });

  const { data, error } = await serverDb().from("companies").update(update).eq("id", id).select("id").maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "company not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
