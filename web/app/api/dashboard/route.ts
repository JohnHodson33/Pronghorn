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

  const [listingsRes, reviewsRes, dealsRes, leadsRes, listsRes, outboxRes, outreachRes, untaggedNotesRes, dealProposalsRes, syncHealthRes] = await Promise.all([
    db.from("listings").select("id, industry, tier").in("tier", [1, 2]),
    // NOTE: only pre-0005 columns here; cim_received_at etc. exist after the
    // migration lands — reviewed_at is the portable timestamp until then.
    db.from("listing_reviews").select("listing_id, status, notes, reviewed_at, listings(name, industry, source_id)"),
    db.from("deals").select("id, name, stage, next_step, next_step_due, companies(industry, origin)"),
    db.from("leads").select("id, status, owner_name, owner_email, owner_phone, lead_list_id"),
    db.from("lead_lists").select("id, query_industry"),
    db.from("outbox_emails").select("id, subject, to_email, created_at").eq("status", "queued"),
    db.from("outreach_tracks")
      .select("company_id, state, next_followup_due, companies(name)")
      .lte("next_followup_due", new Date(Date.now() + 86400e3).toISOString().slice(0, 10))
      .not("state", "in", "(dead)"),
    // meeting notes the Notion sweep couldn't confidently attach — a human
    // decision, so it belongs in the attention queue (never silently dropped)
    db.from("activities").select("id, body, doc_url, created_at")
      .eq("kind", "meeting").is("company_id", null).is("contact_id", null)
      .not("doc_url", "is", null)
      .order("created_at", { ascending: false }).limit(10),
    // deal next-step changes proposed from Outlook replies — John approves
    // (0019; never silently rewrites a deal). Tolerated absent pre-migration.
    db.from("deal_proposals").select("id, deal_id, proposed_next_step, proposed_next_step_due, meeting_when, confidence, source_from, source_url, created_at, deals(name)")
      .eq("status", "pending").order("created_at", { ascending: false }).limit(15),
    // outlook-sync health (0018 app_config) — a dead sync must never be silent
    db.from("app_config").select("value, updated_at").eq("key", "outlook_sync_last_success").maybeSingle(),
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

  // outreach follow-ups due (table may not exist pre-0007 — error tolerated)
  for (const t of (outreachRes.data ?? []) as Row[]) {
    const co = (Array.isArray(t.companies) ? t.companies[0] : t.companies) as Row | null;
    keyActions.push({ kind: "followup_due", title: String(co?.name ?? "Company"), detail: String(t.state), refId: String(t.company_id), at: String(t.next_followup_due) });
  }

  // meeting notes needing a company tag (Notion sweep, low confidence)
  for (const n of (untaggedNotesRes.data ?? []) as Row[]) {
    const firstLine = String(n.body ?? "").split("\n")[0].replace(/^\[Notion meeting [^\]]*\]\s*/, "");
    keyActions.push({ kind: "note_needs_tagging", title: firstLine || "Meeting note", detail: "attach to a company/deal", refId: String(n.id), at: String(n.created_at) });
  }

  // deal next-step changes proposed from Outlook replies — John approves/dismisses
  // (0019). detail carries the proposed step; the card links to the source email.
  for (const p of (dealProposalsRes?.data ?? []) as Row[]) {
    const deal = (Array.isArray(p.deals) ? p.deals[0] : p.deals) as Row | null;
    const due = p.proposed_next_step_due ? ` (due ${String(p.proposed_next_step_due)})` : "";
    keyActions.push({
      kind: "deal_next_step_proposed",
      title: String(deal?.name ?? "Deal"),
      detail: `${String(p.proposed_next_step ?? "")}${due} — from ${String(p.source_from ?? "a reply")}`,
      refId: String(p.id), at: String(p.created_at),
    });
  }

  // outlook-sync health: a dead sync must never be silent (John 7/16 — the
  // Fahrenhorst reply sat 24h partly because the sync was red all day)
  {
    const last = (syncHealthRes?.data as Row | null)?.value as string | undefined;
    const lastMs = last ? new Date(last).getTime() : null;
    const staleHrs = lastMs ? (Date.now() - lastMs) / 3600e3 : Infinity;
    if (staleHrs > 6) {
      keyActions.push({
        kind: "outlook_sync_stale",
        title: "Outlook sync is behind",
        detail: lastMs ? `last successful sync ${Math.round(staleHrs)}h ago — deal updates from email may be missing` : "no successful sync recorded — check the outlook-sync workflow",
        refId: null, at: last ?? null,
      });
    }
  }

  keyActions.sort((a, b) => String(a.at ?? "").localeCompare(String(b.at ?? "")));
  return NextResponse.json({
    funnel: unpack(funnel),
    keyActions,
    coverage: [...cov.entries()].map(([subsector, c]) => ({ subsector, ...c })),
  });
}
