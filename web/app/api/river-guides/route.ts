// River Guides — the third sourcing channel (John 7/16: exited operators
// recruited for equity + board seats; outreach to them SEQUENCES BEFORE
// company targets). GET the workstream list with filters + counts; PATCH a
// row (inline edits, band overrides). Enrichment/verification is run by the
// scraper workers (riverguides/*.js) on schedule — POST here queues nothing
// paid; it just marks rows for the next worker pass via enrichment_status.
//
// Filters: ?band= &status= &industry= &state= &name_status= &q=
// Degrades with an apply-0016 note until John runs the migration.
import { NextResponse } from "next/server";
import { hasDb, serverDb } from "@/lib/db";
import { excludeMergedColumn, excludeMergedJsonb, selectLiveGuides } from "@/lib/guide-merge";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!hasDb()) return NextResponse.json({ error: "no db" }, { status: 503 });
  const url = new URL(req.url);
  const f = (k: string) => url.searchParams.get(k);

  // Merged-away duplicates stay in the table for provenance but must NOT show
  // in the list — the same person appearing twice with contradictory exit
  // status is what nearly put a still-employed person in an outreach batch.
  const { data, error, variant: mergeFilter } = await selectLiveGuides<Record<string, unknown>>((variant) => {
    let q = serverDb().from("river_guides").select("*")
      .order("screen_score", { ascending: false }).limit(1000);
    if (variant === "column") q = excludeMergedColumn(q);
    else if (variant === "jsonb") q = excludeMergedJsonb(q);
    if (f("band")) q = q.eq("priority_band", f("band"));
    if (f("status")) q = q.eq("enrichment_status", f("status"));
    if (f("industry")) q = q.eq("industry", f("industry"));
    if (f("state")) q = q.eq("location_state", f("state"));
    if (f("name_status")) q = q.eq("name_status", f("name_status"));
    if (f("q")) q = q.or(`full_name.ilike.%${f("q")}%,their_company.ilike.%${f("q")}%,acquirer.ilike.%${f("q")}%`);
    return q;
  });
  if (error) return NextResponse.json({ error: `${error.message} — apply migration 0016/0017` }, { status: 503 });

  // ADVISORY duplicate flag (John's rule: flags inform, they never block).
  // A person can have another row on file — usually a merged-away duplicate,
  // sometimes a genuine second sale. That is worth SEEING before you call
  // someone; it is not grounds for hiding them. The 8/5 review confirmed only
  // one person book-wide is actually contradicted (differing non-UNKNOWN
  // claims), so suppressing every twin would have cost real leads to guard a
  // danger that mostly isn't there.
  const nameKey = (s: unknown) => String(s ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  const byPerson = new Map<string, { deal_id: string; exit_status: string; verified: boolean; merged: boolean }[]>();
  {
    // separate lightweight pass: the list query deliberately EXCLUDES merged
    // rows, so they have to be read back to be reported on
    const { data: allRows } = await serverDb().from("river_guides")
      .select("deal_id, full_name, exit_status, current_status_verified, contact").limit(5000);
    for (const r of (allRows ?? []) as Record<string, unknown>[]) {
      const k = nameKey(r.full_name);
      if (!k) continue;
      if (!byPerson.has(k)) byPerson.set(k, []);
      byPerson.get(k)!.push({
        deal_id: String(r.deal_id),
        exit_status: String(r.exit_status ?? "UNKNOWN"),
        verified: !!r.current_status_verified,
        merged: !!(r.contact as { merged_into?: string } | null)?.merged_into,
      });
    }
  }

  // page contract: contact dots read g.contact.{email,phone,linkedin_url};
  // canonical storage is the flat columns (0017) — synthesize when absent
  const guides = (data ?? []).map((g: Record<string, unknown>) => {
    const others = (byPerson.get(nameKey(g.full_name)) ?? []).filter((r) => r.deal_id !== String(g.deal_id));
    // CONTRADICTED = another row makes a DIFFERENT non-UNKNOWN claim. An
    // UNKNOWN twin is absence of evidence, not conflicting evidence.
    const mine = String(g.exit_status ?? "UNKNOWN");
    const contradicted = mine !== "UNKNOWN"
      && others.some((r) => r.exit_status !== "UNKNOWN" && r.exit_status !== mine);
    return {
      ...g,
      contact: g.contact ?? { email: g.email ?? null, phone: g.phone ?? null, linkedin_url: g.linkedin_url ?? null },
      ...(others.length ? { alsoOnFile: others, contradicted } : {}),
    };
  });
  const countBy = (key: string) =>
    guides.reduce((m: Record<string, number>, g: Record<string, unknown>) => {
      const v = String(g[key] ?? "—"); m[v] = (m[v] ?? 0) + 1; return m;
    }, {});
  return NextResponse.json({
    guides,
    counts: {
      band: countBy("priority_band"),
      status: countBy("enrichment_status"),
      industry: countBy("industry"),
      state: countBy("location_state"),   // state-level M&A-density view
      exit: countBy("exit_status"),
    },
    total: guides.length,
    // selectLiveGuides falls back column → jsonb → UNFILTERED. That last hop
    // silently re-admits merged duplicates — the contamination that nearly put
    // a still-employed person in an outreach batch — so it must never be
    // invisible. Surfaced, not swallowed; Lane B can badge it.
    ...(mergeFilter === "none"
      ? { warning: "duplicate filter unavailable — this list may contain merged-away duplicate rows; treat counts as unreliable until it recovers" }
      : {}),
  });
}

export async function PATCH(req: Request) {
  if (!hasDb()) return NextResponse.json({ error: "no db" }, { status: 503 });
  const b = await req.json();
  const dealId = String(b.deal_id ?? "");
  if (!dealId) return NextResponse.json({ error: "deal_id required" }, { status: 400 });
  const db = serverDb();
  const allowed = ["full_name", "name_status", "exit_status", "priority_band", "enrichment_status",
    "notes", "archetype", "archetype_subtype", "location_city", "location_state"];
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const k of allowed) if (k in b) patch[k] = b[k];
  // contact fields live in the contact jsonb (live 0016 schema) — merge edits
  if ("email" in b || "phone" in b || "linkedin_url" in b) {
    const { data: cur } = await db.from("river_guides").select("contact").eq("deal_id", dealId).maybeSingle();
    const contact = { ...((cur?.contact as Record<string, unknown>) ?? {}) };
    for (const k of ["email", "phone", "linkedin_url"]) if (k in b) contact[k] = b[k];
    patch.contact = contact;
  }
  const { error } = await db.from("river_guides").update(patch).eq("deal_id", dealId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

// POST {action: 'queue_enrichment'|'queue_verification', deal_ids: [...]}
// John's "select these people for enrichment": flips rows so the next worker
// pass picks them first. No spend happens here.
export async function POST(req: Request) {
  if (!hasDb()) return NextResponse.json({ error: "no db" }, { status: 503 });
  const b = await req.json();
  const ids: string[] = Array.isArray(b.deal_ids) ? b.deal_ids.map(String) : [];
  if (!ids.length) return NextResponse.json({ error: "deal_ids required" }, { status: 400 });
  const db = serverDb();
  if (b.action === "queue_enrichment") {
    const { error } = await db.from("river_guides")
      .update({ enrichment_status: "PENDING_T1", updated_at: new Date().toISOString() })
      .in("deal_id", ids).eq("name_status", "RESOLVED");
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, queued: ids.length, note: "tier-1 worker picks these up on its next pass" });
  }
  if (b.action === "queue_verification") {
    const { error } = await db.from("river_guides")
      .update({ current_status_verified: false, updated_at: new Date().toISOString() })
      .in("deal_id", ids);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, queued: ids.length, note: "status-verification worker re-checks these next pass" });
  }
  return NextResponse.json({ error: "action must be queue_enrichment or queue_verification" }, { status: 400 });
}
