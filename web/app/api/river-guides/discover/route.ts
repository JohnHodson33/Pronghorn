// River-guide DISCOVERY — the "Find more" bar (John 7/16 ~01:15: "not just a
// repository… I want the functionality to find additional river guides").
// POST {industry?, consolidator?} → bounded on-demand consolidator sweep:
// Serper press/portfolio queries → Claude extracts add-on acquisitions →
// dedupe vs existing (company, acquirer) → new rows enter the SAME lifecycle.
//
// HALLUCINATION GUARD (hard law from the research): a seller name is stored
// ONLY when the model cites the source result that literally names them —
// otherwise the row lands as TBD/NEEDS_NAME for the identity-resolution
// worker. Domains are never guessed (left null for the enrichment waterfall).
import { NextResponse } from "next/server";
import { hasDb, serverDb } from "@/lib/db";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // bounded sweep: ~4 searches + 1 extraction

const INDUSTRY_ENUM: Record<string, string> = {
  landscape: "LANDSCAPE", landscaping: "LANDSCAPE", lawn: "LAWN_CARE", "lawn care": "LAWN_CARE",
  tree: "TREE_CARE", "tree care": "TREE_CARE", pool: "POOL_SERVICES", "pool services": "POOL_SERVICES",
  fencing: "FENCING", fence: "FENCING", kitchen: "COMMERCIAL_KITCHEN_SERVICE", pest: "PEST",
};

// spec §3a screen score (mirror of scraper/riverguides/score.js)
function screenScore(exit: string, year: number | null, industry: string, resolved: boolean) {
  const fit: Record<string, number> = { LANDSCAPE: 10, LAWN_CARE: 10, TREE_CARE: 10, POOL_SERVICES: 9, PEST: 9, FENCING: 6, COMMERCIAL_KITCHEN_SERVICE: 5, OTHER: 5 };
  const age = year ? 2026 - year : null;
  const recency = age == null ? 8 : age < 1 ? 7 : age <= 4 ? 15 : age <= 6 ? 11 : 8;
  const exitPts = exit === "EXITED" ? 25 : exit === "EMPLOYED" ? 6 : 15;
  return 30 + exitPts + recency + (fit[industry] ?? 5) + (resolved ? 5 : 0);
}

async function serper(q: string) {
  const res = await fetch("https://google.serper.dev/search", {
    method: "POST",
    headers: { "X-API-KEY": process.env.SERPER_API_KEY ?? "", "Content-Type": "application/json" },
    body: JSON.stringify({ q, num: 10 }),
  });
  if (!res.ok) return [];
  const data = await res.json();
  return (data.organic ?? []).map((r: { link: string; title?: string; snippet?: string }) =>
    ({ url: r.link, title: r.title ?? "", snippet: r.snippet ?? "" }));
}

const EXTRACT_SYSTEM = `You extract ADD-ON ACQUISITIONS by a specific consolidator from web search results, to find business owners who sold. This feeds an outreach list — a fabricated company or seller is worse than none.

For each acquisition EXPLICITLY described in the results, output: the acquired company name, the year if stated, the seller/owner name ONLY IF a result literally names them as the owner/founder who sold, and the index of the result that says so.

NEVER include: deals merely implied; sellers inferred from company names; people mentioned in other roles (acquirer execs, brokers); anything you know from memory but the results don't show.

Output JSON only:
{"acquisitions": [{"company": "...", "year": 2023 or null,
  "seller_name": "First Last or null", "seller_result_index": 0 or null,
  "city": "or null", "state": "2-letter or null", "result_index": 0}]}`;

export async function POST(req: Request) {
  if (!hasDb()) return NextResponse.json({ error: "no db" }, { status: 503 });
  if (!process.env.SERPER_API_KEY || !process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "discovery needs SERPER_API_KEY + ANTHROPIC_API_KEY in the web environment" }, { status: 503 });
  }
  const b = await req.json().catch(() => ({}));
  const consolidator = String(b.consolidator ?? "").trim();
  const industryRaw = String(b.industry ?? "").trim();
  if (!consolidator) return NextResponse.json({ error: "consolidator required (the acquirer to sweep, e.g. 'Senske')" }, { status: 400 });
  const industry = INDUSTRY_ENUM[industryRaw.toLowerCase()] ?? "OTHER";

  // bounded sweep: two query shapes, ~20 results
  const results = [
    ...await serper(`"${consolidator}" acquires OR acquired ${industryRaw || ""} announcement`),
    ...await serper(`"${consolidator}" acquisition "founder" OR "owner" ${industryRaw || ""}`),
  ].slice(0, 18);
  if (!results.length) return NextResponse.json({ ok: true, inserted: 0, note: `No press results for "${consolidator}" — try the full legal name.` });

  const aiRes = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": process.env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001", max_tokens: 1500, system: EXTRACT_SYSTEM,
      messages: [{ role: "user", content: JSON.stringify({ consolidator, industry: industryRaw, results }) }],
    }),
  });
  if (!aiRes.ok) return NextResponse.json({ error: `extraction failed (${aiRes.status})` }, { status: 502 });
  const ai = await aiRes.json();
  let acquisitions: { company: string; year: number | null; seller_name: string | null; seller_result_index: number | null; city: string | null; state: string | null; result_index: number }[] = [];
  try { acquisitions = JSON.parse(ai.content[0].text.match(/\{[\s\S]*\}/)[0]).acquisitions ?? []; } catch { /* no valid extraction */ }

  const db = serverDb();
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  const { data: existing, error: exErr } = await db.from("river_guides").select("their_company, acquirer");
  if (exErr) return NextResponse.json({ error: `${exErr.message} — apply migration 0016` }, { status: 500 });
  const seen = new Set((existing ?? []).map((r) => `${norm(r.their_company)}|${norm(r.acquirer ?? "")}`));

  let inserted = 0, named = 0;
  for (const a of acquisitions) {
    if (!a.company || seen.has(`${norm(a.company)}|${norm(consolidator)}`)) continue;
    // hallucination guard, code-enforced: seller kept only with a cited source result
    const sellerOk = a.seller_name && a.seller_result_index != null && results[a.seller_result_index];
    const srcIdx = sellerOk ? a.seller_result_index! : a.result_index;
    const source = results[srcIdx]?.url ?? null;
    if (!source) continue; // no provenance, no row
    const resolved = Boolean(sellerOk);
    const row = {
      deal_id: `RG-DISC-${Date.now().toString(36)}-${inserted}`,
      full_name: resolved ? a.seller_name : null,
      name_status: resolved ? "RESOLVED" : "TBD",
      archetype: "A_EXITED_OPERATOR", industry,
      their_company: a.company, acquirer: consolidator,
      deal_year: a.year ?? null, location_city: a.city ?? null, location_state: a.state ?? null,
      company_website: null, company_website_status: "NOT_FOUND",
      exit_status: "UNKNOWN", source_url: source, source_confidence: "MEDIUM",
      screen_score: screenScore("UNKNOWN", a.year ?? null, industry, resolved),
      priority_band: resolved ? "ENRICH_THEN_ASSESS" : "RESOLVE_NAME_FIRST",
      enrichment_status: resolved ? "PENDING_T1" : "NEEDS_NAME",
      notes: `discovered via Find-more sweep ${new Date().toISOString().slice(0, 10)}`,
    };
    const { error } = await db.from("river_guides").insert(row);
    if (!error) { inserted++; if (resolved) named++; seen.add(`${norm(a.company)}|${norm(consolidator)}`); }
  }

  return NextResponse.json({
    ok: true, inserted, named,
    note: inserted
      ? `Found ${inserted} new ${consolidator} add-on${inserted > 1 ? "s" : ""} (${named} with the seller named in the source; the rest queue for identity resolution). Status verification runs before anyone is contacted.`
      : `Sweep ran (${acquisitions.length} acquisitions seen) — all already tracked or unsourced.`,
  });
}
