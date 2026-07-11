// Dashboard V3 data layer (docs/DASHBOARD-VISION.md). Computes funnel /
// key-actions / coverage shapes directly from tables so Lane B is not blocked
// on migration 0006; once the views land this can become three selects.
//
// GET → {
//   funnel:   [{ prong: "broker"|"proprietary", subsector, stage, n }],
//   keyActions: [{ kind, title, detail, refId, at }],
//   coverage: [{ subsector, total, enriched, outreachReady }],
// }
import { NextResponse } from "next/server";
import { hasDb, serverDb } from "@/lib/db";

export const dynamic = "force-dynamic";

type Row = Record<string, unknown>;
const bump = (m: Map<string, number>, key: string) => m.set(key, (m.get(key) ?? 0) + 1);
const unpack = (m: Map<string, number>) =>
  [...m.entries()].map(([k, n]) => {
    const [prong, subsector, stage] = k.split("|");
    return { prong, subsector, stage, n };
  });

export async function GET() {
  if (!hasDb()) return NextResponse.json({ error: "no db" }, { status: 503 });
  const db = serverDb();

  const [listingsRes, reviewsRes, dealsRes, leadsRes, listsRes, outboxRes] = await Promise.all([
    db.from("listings").select("id, industry, tier").in("tier", [1, 2]),
    // NOTE: only pre-0005 columns here; cim_received_at etc. exist after the
    // migration lands — reviewed_at is the portable timestamp until then.
    db.from("listing_reviews").select("listing_id, status, notes, reviewed_at, listings(name, industry, source_id)"),
    db.from("deals").select("id, name, stage, next_step, next_step_due, companies(industry, origin)"),
    db.from("leads").select("id, status, owner_name, owner_email, owner_phone, lead_list_id"),
    db.from("lead_lists").select("id, query_industry"),
    db.from("outbox_emails").select("id, subject, to_email, created_at").eq("status", "queued"),
  ]);

  const funnel = new Map<string, number>();
  const keyActions: { kind: string; title: string; detail: string | null; refId: string | null; at: string | null }[] = [];

  // broker prong: screened tier 1/2 not yet pursued
  const reviewed = new Set((reviewsRes.data ?? []).map((r: Row) => r.listing_id));
  for (const l of (listingsRes.data ?? []) as Row[]) {
    if (reviewed.has(l.id)) continue;
    bump(funnel, `broker|${l.industry ?? "Other"}|screened_tier_${l.tier}`);
  }

  // broker prong: active pursuits + key actions
  const weekAgo = Date.now() - 7 * 86400e3;
  for (const r of (reviewsRes.data ?? []) as Row[]) {
    const listing = (Array.isArray(r.listings) ? r.listings[0] : r.listings) as Row | null;
    const status = String(r.status);
    if (["promoted", "passed", "pushed_to_crm"].includes(status)) continue;
    bump(funnel, `broker|${listing?.industry ?? "Other"}|${status}`);
    const title = String(listing?.name ?? "Listing");
    const at = (r.reviewed_at as string) ?? null;
    if (status === "info_requested" && String(r.notes ?? "").toLowerCase().includes("countersign pending")) {
      keyActions.push({ kind: "nda_countersign_pending", title, detail: String(listing?.source_id ?? ""), refId: String(r.listing_id), at });
    }
    if (status === "cim_received") {
      keyActions.push({ kind: "ready_to_promote", title, detail: String(listing?.source_id ?? ""), refId: String(r.listing_id), at });
    }
    if (["info_requested", "nda_signed"].includes(status) && at && Date.parse(at) < weekAgo) {
      keyActions.push({ kind: "stale_pursuit", title, detail: status, refId: String(r.listing_id), at });
    }
  }

  // CRM deals (both prongs)
  const tomorrow = new Date(Date.now() + 86400e3).toISOString().slice(0, 10);
  for (const d of (dealsRes.data ?? []) as Row[]) {
    const c = (Array.isArray(d.companies) ? d.companies[0] : d.companies) as Row | null;
    const prong = ["lead", "referral"].includes(String(c?.origin)) ? "proprietary" : "broker";
    bump(funnel, `${prong}|${c?.industry ?? "Other"}|deal_${d.stage}`);
    if (d.next_step_due && String(d.next_step_due) <= tomorrow && d.stage !== "Closed") {
      keyActions.push({ kind: "next_step_due", title: String(d.name), detail: String(d.next_step ?? ""), refId: String(d.id), at: String(d.next_step_due) });
    }
  }

  // proprietary prong: leads + coverage
  const listIndustry = new Map((listsRes.data ?? []).map((l: Row) => [l.id, String(l.query_industry ?? "Other")]));
  const cov = new Map<string, { total: number; enriched: number; outreachReady: number }>();
  for (const ld of (leadsRes.data ?? []) as Row[]) {
    const sub = listIndustry.get(ld.lead_list_id) ?? "Other";
    bump(funnel, `proprietary|${sub}|lead_${ld.status}`);
    const c = cov.get(sub) ?? { total: 0, enriched: 0, outreachReady: 0 };
    c.total++;
    if (ld.status === "enriched") c.enriched++;
    if (ld.owner_name && (ld.owner_email || ld.owner_phone)) c.outreachReady++;
    cov.set(sub, c);
  }

  // queued emails (outbox may not exist pre-0006 — error tolerated)
  for (const o of (outboxRes.data ?? []) as Row[]) {
    keyActions.push({ kind: "queued_email", title: String(o.subject), detail: String(o.to_email), refId: String(o.id), at: String(o.created_at) });
  }

  keyActions.sort((a, b) => String(a.at ?? "").localeCompare(String(b.at ?? "")));
  return NextResponse.json({
    funnel: unpack(funnel),
    keyActions,
    coverage: [...cov.entries()].map(([subsector, c]) => ({ subsector, ...c })),
  });
}
