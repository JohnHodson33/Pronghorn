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

const nameKey = (s: unknown) => String(s ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
type PersonRow = { deal_id: string; exit_status: string; verified: boolean; merged: boolean };

// ADVISORY duplicate index (John's rule: flags inform, they never block).
// A person can have another row on file — usually a merged-away duplicate,
// sometimes a genuine second sale. That is worth SEEING before you call
// someone; it is not grounds for hiding them.
//
// It needs a SECOND read because the list query deliberately excludes merged
// rows, so they have to be read back to be reported on — and that read is
// unfiltered by design (a twin hidden by the caller's filters still counts).
// Measured 8/5: that made every request re-read the whole table, and the route
// ran 20s warm with a 205s outlier — the river-guides page effectively hung.
// The index only changes when a worker rewrites the book, so a short TTL cache
// is proportionate: the badge can be up to a minute stale, the page can't be
// unusable. In-process and best-effort — a cold lambda just rebuilds it.
const DUP_TTL_MS = 60_000;
let dupCache: { at: number; index: Map<string, PersonRow[]> } | null = null;

async function duplicateIndex(): Promise<Map<string, PersonRow[]>> {
  if (dupCache && Date.now() - dupCache.at < DUP_TTL_MS) return dupCache.index;
  const index = new Map<string, PersonRow[]>();
  const cols = "deal_id, full_name, exit_status, current_status_verified, contact";
  // merged_into is 0025; fall back to the jsonb mirror on an older DB
  const withCol = await serverDb().from("river_guides").select(`${cols}, merged_into`).limit(5000);
  const allRows: Record<string, unknown>[] | null = withCol.error
    ? ((await serverDb().from("river_guides").select(cols).limit(5000)).data as Record<string, unknown>[] | null)
    : (withCol.data as Record<string, unknown>[] | null);
  for (const r of allRows ?? []) {
    const k = nameKey(r.full_name);
    if (!k) continue;
    if (!index.has(k)) index.set(k, []);
    index.get(k)!.push({
      deal_id: String(r.deal_id),
      exit_status: String(r.exit_status ?? "UNKNOWN"),
      verified: !!r.current_status_verified,
      // 0025 column, with the pre-0025 jsonb mirror still honored
      merged: !!(r.merged_into ?? (r.contact as { merged_into?: string } | null)?.merged_into),
    });
  }
  dupCache = { at: Date.now(), index };
  return index;
}

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
  const byPerson = await duplicateIndex();

  // page contract: contact dots read g.contact.{email,phone,linkedin_url};
  // canonical storage is the flat columns (0017) — synthesize when absent
  const guides = (data ?? []).map((g: Record<string, unknown>) => {
    // score_components is a scoring-internals jsonb with ZERO consumers in web/
    // (grepped) and ~40kb of the payload across the book — dropped at the edge
    // rather than narrowed in the select, so nothing else that reads this route
    // loses a field it might rely on.
    const { score_components: _unused, ...row } = g;
    void _unused;
    const others = (byPerson.get(nameKey(g.full_name)) ?? []).filter((r) => r.deal_id !== String(g.deal_id));
    // CONTRADICTED = another row makes a DIFFERENT non-UNKNOWN claim. An
    // UNKNOWN twin is absence of evidence, not conflicting evidence.
    const mine = String(g.exit_status ?? "UNKNOWN");
    const contradicted = mine !== "UNKNOWN"
      && others.some((r) => r.exit_status !== "UNKNOWN" && r.exit_status !== mine);
    // CONTACT TRIM — RESPONSE EDGE ONLY, NEVER THE SELECT (Lane B audited every
    // contact.* read 8/5 and flagged the trap): the stored jsonb also carries
    // company_address, skiptrace (ranked phone arrays), verify/resolve attempt
    // stamps and merged_into — ~150kb across the book that no client reads.
    // `contact.merged_into` DOES have two server-side consumers (guide-merge's
    // `contact->>merged_into` predicate and duplicateIndex's pre-0025 fallback),
    // but both run their OWN queries, so trimming the response can't reach
    // them — whereas narrowing the select would break the pre-0025 fallback on
    // any DB without the column. Hence: edge only.
    const c = (g.contact ?? {}) as Record<string, unknown>;
    const contact = {
      email: (c.email ?? g.email ?? null) as string | null,
      phone: (c.phone ?? g.phone ?? null) as string | null,
      linkedin_url: (c.linkedin_url ?? g.linkedin_url ?? null) as string | null,
    };
    return {
      ...row,
      contact,
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
  // an edit can change a name or exit_status → the duplicate/contradiction
  // index is stale; drop it so the next read reflects the edit immediately
  dupCache = null;
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
