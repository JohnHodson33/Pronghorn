// River-guide enrichment: PRICE FIRST, THEN RUN STATE (John 7/16).
//
//   {estimate:true, dealIds}  → what it will cost, queues NOTHING
//                               ("I wanna be conscious of price and make sure
//                                we understand the marginal cost")
//   {dealIds}                 → creates a RUN record + flips rows PENDING_T1;
//                               the worker updates the run per lead and closes
//                               it with a receipt, so the page can answer
//                               "is it working / when is it done / what did I get"
//                               ("if Tom were to use it he'd have no idea")
//
// Nothing here spends: the tier-1 waterfall is free/owned tools (Hunter is a
// flat sub → $0 marginal, quota units tracked; LinkedIn verify = Serper
// searches at $0.001 + a Haiku call). Paid escalation is never automatic.
import { NextResponse } from "next/server";
import { hasDb, serverDb } from "@/lib/db";

export const dynamic = "force-dynamic";

const SERPER_PER_SEARCH = 0.001;          // $1 / 1,000 searches
const HAIKU_PER_VERIFY = 0.0006;          // measured: ~600 in / ~150 out tokens
const LINKEDIN_SEARCHES_PER_GUIDE = 1.5;  // company query, + geo variant on miss
const WORKER_CADENCE_MIN = 15;

type Guide = {
  deal_id: string; name_status: string; enrichment_status: string;
  company_website_status: string | null; exit_status: string | null;
  contact: { email?: string | null; phone?: string | null; linkedin_url?: string | null } | null;
};

/** What the tier-1 waterfall will actually do for these rows (mirrors enrich_t1.js). */
function estimateFor(guides: Guide[]) {
  const eligible = guides.filter((g) => g.name_status === "RESOLVED");
  let hunterCalls = 0, linkedinGuides = 0;
  for (const g of eligible) {
    const c = g.contact ?? {};
    if (!c.email) {
      // domain-first routing: LIVE → own domain; REDIRECTS/EMPLOYED → acquirer domain
      if (g.company_website_status === "LIVE") hunterCalls += 1;
      if (g.company_website_status === "REDIRECTS" || g.exit_status === "EMPLOYED") hunterCalls += 1;
    }
    if (!c.linkedin_url) linkedinGuides += 1;
  }
  const searches = Math.round(linkedinGuides * LINKEDIN_SEARCHES_PER_GUIDE);
  const linkedinUsd = Number((searches * SERPER_PER_SEARCH + linkedinGuides * HAIKU_PER_VERIFY).toFixed(3));
  return {
    count: guides.length,
    eligible: eligible.length,
    skipped_tbd: guides.length - eligible.length,
    breakdown: {
      hunter: { calls: hunterCalls, marginalUsd: 0, quotaUnits: hunterCalls, note: "flat subscription — $0 marginal, quota units tracked" },
      linkedin_verify: { guides: linkedinGuides, searches, estUsd: linkedinUsd, note: "Serper searches + Claude verification" },
    },
    totalEstUsd: linkedinUsd,
  };
}

export async function POST(req: Request) {
  if (!hasDb()) return NextResponse.json({ error: "no db" }, { status: 503 });
  const b = await req.json().catch(() => ({}));
  const ids: string[] = Array.isArray(b.dealIds) ? b.dealIds.map(String)
    : Array.isArray(b.deal_ids) ? b.deal_ids.map(String) : [];
  if (!ids.length) return NextResponse.json({ error: "dealIds required" }, { status: 400 });

  const db = serverDb();
  const { data: rows, error: selErr } = await db.from("river_guides")
    .select("deal_id, name_status, enrichment_status, company_website_status, exit_status, contact")
    .in("deal_id", ids);
  if (selErr) return NextResponse.json({ error: `${selErr.message} — apply migration 0016` }, { status: 500 });
  const guides = (rows ?? []) as unknown as Guide[];
  const est = estimateFor(guides);

  // PRICE-ONLY: answer and stop — nothing queued, nothing spent
  if (b.estimate === true) {
    return NextResponse.json({
      ...est,
      note: est.eligible
        ? `${est.eligible} eligible · est. $${est.totalEstUsd.toFixed(2)} marginal (Hunter ${est.breakdown.hunter.calls} lookups on the flat sub = $0)${est.skipped_tbd ? ` · ${est.skipped_tbd} skipped: name still TBD` : ""}`
        : "Nothing eligible — these rows need identity resolution first (name is TBD).",
    });
  }

  const eligible = guides.filter((g) => g.name_status === "RESOLVED").map((g) => g.deal_id);
  if (!eligible.length) {
    return NextResponse.json({ ok: true, queued: 0, note: "Nothing queued — every selected row still needs its name resolved (identity resolution runs nightly)." });
  }

  // RUN RECORD first, so the page has something to poll immediately
  const { data: run, error: runErr } = await db.from("river_guide_runs").insert({
    deal_ids: eligible, state: "queued",
    counts: { total: eligible.length, processed: 0, found_email: 0, found_linkedin: 0, found_phone: 0, escalated_paid: 0 },
    cost_estimate: est.totalEstUsd,
    note: `Queued — the worker starts within ~${WORKER_CADENCE_MIN} minutes`,
  }).select("id").single();
  if (runErr) return NextResponse.json({ error: `${runErr.message} — apply migration 0018 (river_guide_runs)` }, { status: 500 });

  const { error: updErr } = await db.from("river_guides")
    .update({ enrichment_status: "PENDING_T1", updated_at: new Date().toISOString() })
    .in("deal_id", eligible);
  if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 });

  return NextResponse.json({
    ok: true, runId: run.id, queued: eligible.length,
    estimate: est,
    note: `Queued ${eligible.length} for tier-1 enrichment — the worker starts within ~${WORKER_CADENCE_MIN} min; est. $${est.totalEstUsd.toFixed(2)} marginal. Watch progress here${est.skipped_tbd ? `; ${est.skipped_tbd} skipped (name TBD)` : ""}.`,
  });
}
