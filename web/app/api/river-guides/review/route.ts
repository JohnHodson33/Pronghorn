// Discovery review pen (0023, John 7/31 card (b)): MEDIUM sweep candidates +
// auto-discovered new consolidators wait here for a one-click keep/reject on
// the river-guides page ("N candidates awaiting confirm").
//
// GET → { pending: [...], counts: {deals, consolidators} }
// POST { id, action: "keep"|"reject", decided_by }
//   keep(deal)          → files the river_guides row (same shape as the sweep)
//   keep(consolidator)  → files a NEEDS_NAME river_guides marker row so future
//                         sweeps include this acquirer (it enters the DB set)
//   reject              → status=rejected (kept for audit, never resurfaces)
import { NextResponse } from "next/server";
import { hasDb, serverDb } from "@/lib/db";

export const dynamic = "force-dynamic";

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);

export async function GET() {
  if (!hasDb()) return NextResponse.json({ error: "no db" }, { status: 503 });
  const { data, error } = await serverDb().from("discovery_candidates")
    .select("*").eq("status", "pending").order("created_at", { ascending: true });
  if (error) return NextResponse.json({ pending: [], counts: { deals: 0, consolidators: 0 }, note: "apply migration 0023 to enable the review pen" });
  const pending = data ?? [];
  return NextResponse.json({
    pending,
    counts: {
      deals: pending.filter((r) => r.kind === "deal").length,
      consolidators: pending.filter((r) => r.kind === "consolidator").length,
    },
  });
}

export async function POST(req: Request) {
  if (!hasDb()) return NextResponse.json({ error: "no db" }, { status: 503 });
  const b = await req.json().catch(() => ({}));
  const id = String(b.id ?? "").trim();
  const action = String(b.action ?? "").trim();
  const decidedBy = String(b.decided_by ?? "").trim();
  if (!id || !["keep", "reject"].includes(action)) {
    return NextResponse.json({ error: "id and action (keep|reject) required" }, { status: 400 });
  }
  if (!["John", "Tom"].includes(decidedBy)) {
    return NextResponse.json({ error: "decided_by must be John or Tom" }, { status: 400 });
  }

  const db = serverDb();
  const { data: cand, error: selErr } = await db.from("discovery_candidates").select("*").eq("id", id).maybeSingle();
  if (selErr) return NextResponse.json({ error: `${selErr.message} — apply migration 0023` }, { status: 500 });
  if (!cand) return NextResponse.json({ error: "candidate not found" }, { status: 404 });
  if (cand.status !== "pending") return NextResponse.json({ ok: true, already: cand.status });

  let filedDealId: string | null = null;
  if (action === "keep") {
    // same filing shape as the sweep's HIGH path — a kept candidate is a real deal.
    // possible_duplicate (0024) files like a DEAL, not like a consolidator:
    // "keep" on a maybe-dupe means "this is NOT a duplicate, it's a distinct
    // deal", and it carries company + seller. Filing it on the consolidator
    // branch would create a nameless "<acquirer> (platform — targets TBD)" row —
    // exactly the junk-twin class the 8/4 dedupe just cleaned up.
    const isDeal = cand.kind === "deal" || cand.kind === "possible_duplicate";
    const company = isDeal ? String(cand.company) : `${cand.acquirer} (platform — targets TBD)`;
    filedDealId = `RG-REVIEW-${slug(isDeal ? String(cand.company) : String(cand.acquirer))}-${id.slice(0, 6)}`;
    const { error: insErr } = await db.from("river_guides").upsert({
      deal_id: filedDealId,
      full_name: isDeal && cand.seller_name ? cand.seller_name : null,
      name_status: isDeal && cand.seller_name ? "RESOLVED" : "TBD",
      archetype: "A_EXITED_OPERATOR",
      industry: cand.industry ?? "OTHER",
      their_company: company,
      acquirer: String(cand.acquirer),
      acquirer_pe_sponsor: cand.acquirer_pe_sponsor ?? null,
      location_city: cand.city ?? null,
      location_state: cand.state ?? null,
      source: "discovery-review",
      source_url: cand.source_url ?? null,
      source_confidence: "MEDIUM",
      exit_status: "UNKNOWN",
      current_status_verified: false,
      enrichment_status: isDeal && cand.seller_name ? "PENDING_T1" : "NEEDS_NAME",
      priority_band: isDeal && cand.seller_name ? "ENRICH_THEN_ASSESS" : "RESOLVE_NAME_FIRST",
      deal_year: cand.deal_year ?? null,
      // keep the pen's evidence (for a maybe-dupe: which row it may duplicate
      // and any seller-name conflict) so the adjudication stays auditable
      notes: [
        `Kept from the discovery review pen by ${decidedBy} on ${new Date().toISOString().slice(0, 10)}.`,
        cand.kind === "possible_duplicate" ? `Human ruled NOT a duplicate. Pen evidence: ${cand.notes ?? "(none recorded)"}` : null,
      ].filter(Boolean).join(" "),
    }, { onConflict: "deal_id", ignoreDuplicates: true });
    if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 });
  }

  const { error: updErr } = await db.from("discovery_candidates").update({
    status: action === "keep" ? "kept" : "rejected",
    decided_by: decidedBy,
    decided_at: new Date().toISOString(),
  }).eq("id", id);
  if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 });

  return NextResponse.json({ ok: true, action, filed: filedDealId });
}
