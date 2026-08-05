// DATA-HEALTH — the bulletproof-the-core-chain funnel as live numbers
// (PROGRAM, John 7/31: "really bad hit rates on enrichment… really bad hit
// rates on sizing… all of that needs to be bulletproof"). Lane B workstream D:
// John watches the hit rates move on the dashboard without asking the PM.
//
// Chain: PE-status determined → sized → owner named → owner reachable, plus
// the river-guide channel. Weekly snapshots persist in app_config (0018, no
// new migration) so every metric shows its delta; the PM's measured 7/31
// audit seeds the first snapshot so deltas are meaningful from day one.
import { hasDb, serverDb } from "./db";
import { sizeEstimate } from "./size";
import { loadSizeModel } from "./size-model";

export type MetricKey =
  | "lead_pe" | "lead_sized" | "lead_named" | "lead_channel"
  | "rg_named" | "rg_verified" | "rg_channel" | "rg_outreach_ready";

export type Metric = { key: MetricKey; label: string; pct: number; count: number; n: number; target: number };

export type DataHealth = {
  asOf: string;
  leadsN: number;
  guidesN: number;
  metrics: Metric[];
  // pct-point change vs the reference snapshot (null = no reference yet)
  deltas: Partial<Record<MetricKey, number>>;
  deltaRefAt: string | null; // date of the snapshot the deltas compare against
  // cleared-to-contact people whose only channel is LinkedIn — a real cohort
  // for the VA/enrichment queue, deliberately NOT part of outreach-ready
  linkedinOnly: number;
};

// PROGRAM targets (TASK-QUEUE 7/31)
const TARGETS: Record<MetricKey, number> = {
  lead_pe: 95, lead_sized: 90, lead_named: 80, lead_channel: 60,
  rg_named: 80, rg_verified: 50, rg_channel: 60,
  // no PROGRAM target yet — it's the end of the chain, shown for truth not scoring
  rg_outreach_ready: 25,
};

// PM's measured 7/31 baseline (on-target n=597 / guides n=467) — seeds the
// snapshot history so week-1 deltas compare against something real.
const BASELINE = {
  at: "2026-07-31",
  // rg_outreach_ready not measured on 7/31 — omitted rather than invented, so
  // its delta stays blank until the first real snapshot
  metrics: { lead_pe: 2, lead_sized: 63, lead_named: 45, lead_channel: 23, rg_named: 61, rg_verified: 5, rg_channel: 40 } as Record<MetricKey, number>,
};

const SNAP_KEY = "data_health_snapshots";
const WEEK_MS = 7 * 24 * 3600_000;

type Snapshot = { at: string; metrics: Record<MetricKey, number> };

const pctOf = (count: number, n: number) => (n ? Math.round((count / n) * 1000) / 10 : 0);

export async function fetchDataHealth(): Promise<DataHealth | null> {
  if (!hasDb()) return null;
  const db = serverDb();

  // --- proprietary leads (on-target only — off-target rows aren't the chain)
  type LeadRow = {
    off_target: boolean | null;
    owner_name: string | null; owner_email: string | null;
    owner_phone: string | null; owner_linkedin: string | null;
    enrichment: { pe_owned?: boolean | null; size_signals?: Record<string, unknown> } | null;
    review_count: number | null; industry_verified: string | null;
    lead_lists: { query_industry: string } | { query_industry: string }[] | null;
  };
  // scope = Lane C's funnel scope (8/3): on-target AND not dead — a discarded
  // lead shouldn't count against the chain
  const leadsRes = await db.from("leads")
    .select("off_target, owner_name, owner_email, owner_phone, owner_linkedin, enrichment, review_count, industry_verified, lead_lists(query_industry)")
    .or("off_target.is.null,off_target.eq.false")
    .neq("status", "dead")
    .limit(5000);
  if (leadsRes.error) return null;
  const leads = (leadsRes.data ?? []) as unknown as LeadRow[];

  const model = await loadSizeModel();
  let pe = 0, sized = 0, named = 0, channel = 0;
  for (const l of leads) {
    // determined = the question was ANSWERED — pe_owned true OR false both
    // count; only null/absent is "never checked" (negatives count, 7/31)
    if (typeof l.enrichment?.pe_owned === "boolean") pe++;
    const ll = Array.isArray(l.lead_lists) ? l.lead_lists[0] : l.lead_lists;
    const industry = l.industry_verified ?? ll?.query_industry ?? null;
    if (sizeEstimate(industry, l.enrichment?.size_signals, l.review_count, model)) sized++;
    if (l.owner_name) named++;
    if (l.owner_email || l.owner_phone || l.owner_linkedin) channel++;
  }

  // --- river guides
  type GuideRow = {
    full_name: string | null; current_status_verified: boolean | null;
    exit_status: string | null;
    contact: { email?: string | null; phone?: string | null; linkedin_url?: string | null } | null;
  };
  // Merged-away duplicate rows must not inflate the denominators (Lane C 8/4:
  // "lists filter on merged_into is null" — 20 rows merged, kept for
  // provenance). merged_into arrives with 0025, so ask for it and fall back to
  // the unfiltered read while the migration is pending.
  const rgWithMerged = await db.from("river_guides")
    .select("full_name, current_status_verified, exit_status, contact, merged_into")
    .is("merged_into", null)
    .limit(5000);
  const rgRes = rgWithMerged.error
    ? await db.from("river_guides").select("full_name, current_status_verified, exit_status, contact").limit(5000)
    : rgWithMerged;
  const guides = (rgRes.data ?? []) as unknown as GuideRow[];
  // OUTREACH-READY IS ONE DEFINITION (PM 8/4, reconciling the 14-vs-23 split):
  // verified + EXITED + email-or-phone. A LinkedIn URL is NOT a channel an
  // email campaign can send to, so LinkedIn-only people are a separate cohort
  // counted alongside — never folded into the sendable number.
  let rgNamed = 0, rgVerified = 0, rgChannel = 0, rgReady = 0, rgLinkedinOnly = 0;
  for (const g of guides) {
    if (g.full_name) rgNamed++;
    if (g.current_status_verified) rgVerified++;
    const sendable = !!(g.contact?.email || g.contact?.phone);
    if (sendable || g.contact?.linkedin_url) rgChannel++;
    const cleared = !!g.current_status_verified && g.exit_status === "EXITED";
    if (cleared && sendable) rgReady++;
    else if (cleared && g.contact?.linkedin_url) rgLinkedinOnly++;
  }

  const n = leads.length, gn = guides.length;
  const current: Record<MetricKey, number> = {
    lead_pe: pctOf(pe, n), lead_sized: pctOf(sized, n),
    lead_named: pctOf(named, n), lead_channel: pctOf(channel, n),
    rg_named: pctOf(rgNamed, gn), rg_verified: pctOf(rgVerified, gn), rg_channel: pctOf(rgChannel, gn),
    rg_outreach_ready: pctOf(rgReady, gn),
  };

  // --- weekly snapshots in app_config (non-fatal on any failure)
  let snapshots: Snapshot[] = [];
  try {
    const { data: cfg } = await db.from("app_config").select("value").eq("key", SNAP_KEY).maybeSingle();
    const stored = (cfg?.value as { snapshots?: Snapshot[] } | null)?.snapshots;
    snapshots = Array.isArray(stored) && stored.length ? stored : [BASELINE];
    const newest = snapshots[snapshots.length - 1];
    if (Date.now() - new Date(newest.at).getTime() >= WEEK_MS) {
      snapshots = [...snapshots, { at: new Date().toISOString().slice(0, 10), metrics: current }].slice(-26);
      await db.from("app_config").upsert({ key: SNAP_KEY, value: { snapshots } }, { onConflict: "key" });
    }
  } catch { snapshots = [BASELINE]; }

  // delta reference: the newest snapshot at least ~5 days old (a real "last
  // week"), else the oldest one (the baseline)
  const ref = [...snapshots].reverse().find((s) => Date.now() - new Date(s.at).getTime() >= 5 * 24 * 3600_000) ?? snapshots[0];
  const deltas: Partial<Record<MetricKey, number>> = {};
  if (ref) {
    for (const k of Object.keys(current) as MetricKey[]) {
      if (typeof ref.metrics?.[k] === "number") deltas[k] = Math.round((current[k] - ref.metrics[k]) * 10) / 10;
    }
  }

  const label: Record<MetricKey, string> = {
    lead_pe: "PE-status determined",
    lead_sized: "Sized (rev/EBITDA est.)",
    lead_named: "Owner named",
    lead_channel: "Owner reachable (≥1 channel)",
    rg_named: "Guides named",
    rg_verified: "Guides exit-verified",
    rg_channel: "Guides w/ contact channel",
    rg_outreach_ready: "Outreach-ready (verified + exited + email/phone)",
  };
  const counts: Record<MetricKey, [number, number]> = {
    lead_pe: [pe, n], lead_sized: [sized, n], lead_named: [named, n], lead_channel: [channel, n],
    rg_named: [rgNamed, gn], rg_verified: [rgVerified, gn], rg_channel: [rgChannel, gn],
    rg_outreach_ready: [rgReady, gn],
  };

  return {
    asOf: new Date().toISOString(),
    leadsN: n,
    guidesN: gn,
    metrics: (Object.keys(current) as MetricKey[]).map((k) => ({
      key: k, label: label[k], pct: current[k], count: counts[k][0], n: counts[k][1], target: TARGETS[k],
    })),
    deltas,
    deltaRefAt: ref?.at ?? null,
    linkedinOnly: rgLinkedinOnly,
  };
}
