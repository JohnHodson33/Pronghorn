// Listing inline edits (John 7/15 — fix a polluted location or add financials
// he reads off the listing page himself). Whitelisted; human values win —
// scrape refreshes only fill blanks, so an edited field stays edited.
import { NextResponse } from "next/server";
import { hasDb, serverDb } from "@/lib/db";

const TEXT_FIELDS = ["city", "state", "industry"] as const;
const NUM_FIELDS = ["asking_price", "cash_flow", "gross_revenue"] as const;

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!hasDb()) return NextResponse.json({ error: "no db" }, { status: 503 });
  const { id } = await params;
  const b = await req.json();

  const update: Record<string, unknown> = {};
  for (const f of TEXT_FIELDS) {
    if (b[f] !== undefined) update[f] = String(b[f] ?? "").trim() || null;
  }
  for (const f of NUM_FIELDS) {
    if (b[f] !== undefined) {
      const v = b[f] === null || b[f] === "" ? null : Number(String(b[f]).replace(/[,$]/g, ""));
      if (v !== null && !Number.isFinite(v))
        return NextResponse.json({ error: `${f} must be a number` }, { status: 400 });
      update[f] = v;
    }
  }
  if (Object.keys(update).length === 0)
    return NextResponse.json({ error: "no updatable fields in body" }, { status: 400 });

  const { data, error } = await serverDb().from("listings").update(update).eq("id", id).select("id").maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "listing not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
