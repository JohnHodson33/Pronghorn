// Dashboard V3 aggregates (DASHBOARD-VISION.md §1) — interim computation
// straight from tables; swaps to Lane C's SQL views / /api/dashboard when
// they land. Three surfaces: key-actions feed, combined funnel, subsector
// matrix (broker vs proprietary readiness).
import { hasDb, serverDb } from "./db";
import { PROSPECTING_STATUSES, PURSUIT_LABEL } from "./pursuit";
import { STAGES } from "./mock";

// ---------- subsector mapping (green-industry groupings for the commit call)
const SUBSECTORS = [
  { key: "Landscape", industries: ["Landscaping", "Lawn Care", "Irrigation", "Property Maintenance"] },
  { key: "Tree Care", industries: ["Tree Care"] },
  { key: "Pest Control", industries: ["Pest Control", "Wildlife/Animal Control"] },
  { key: "Pool & Outdoor", industries: ["Pool Services", "Fencing", "Lake/Pond Management"] },
  { key: "Home Systems", industries: ["HVAC", "Plumbing", "Electrical", "Roofing", "Windows & Doors", "Restoration", "Cleaning/Janitorial"] },
] as const;

function subsectorOf(industry: string | null): string | null {
  if (!industry) return null;
  for (const s of SUBSECTORS) if ((s.industries as readonly string[]).includes(industry)) return s.key;
  return null;
}

export type KeyAction = {
  kind: "promote" | "send_inquiry" | "nda" | "stale" | "deadline" | "queued_email";
  label: string;
  detail: string;
  href: string;
  urgent: boolean;
};

export type FunnelStep = { label: string; count: number; kind: "prospecting" | "deal" };

export type SubsectorRow = {
  key: string;
  brokerListings: number; // live thesis-fit (tier 1-2) broker listings
  brokerDeals: number; // CRM deals (via companies.industry)
  propTargets: number; // proprietary leads
  propReady: number; // outreach-ready: owner name + (email or phone)
};

export type DashboardV3 = {
  actions: KeyAction[];
  funnel: FunnelStep[];
  subsectors: SubsectorRow[];
  totals: { listings: number; tier12: number; leads: number; deals: number };
};

// Map Lane C's dashboard_key_actions view rows (migration 0006) onto the UI
// shape. Falls back to the interim table computation when the view errors
// (migration not applied).
const VIEW_ACTION_MAP: Record<string, { kind: KeyAction["kind"]; urgent: boolean; label: (t: string) => string; detail: (d: string | null) => string; href: (ref: string | null) => string }> = {
  ready_to_promote: {
    kind: "promote",
    urgent: true,
    label: (t) => `Ready to promote: ${t}`,
    detail: () => "CIM in hand — fill the real name/financials and create the deal",
    href: (r) => `/listings/${r}`,
  },
  nda_countersign_pending: {
    kind: "nda",
    urgent: false,
    label: (t) => `NDA in process: ${t}`,
    detail: (d) => `Signed by us — broker countersign pending${d ? ` (${d})` : ""}`,
    href: (r) => `/listings/${r}`,
  },
  queued_email: {
    kind: "queued_email",
    urgent: true,
    label: (t) => `Inquiry awaiting your send: ${t}`,
    detail: (d) => `To ${d ?? "broker"} — one click in the Outbox`,
    href: () => "/outbox",
  },
  stale_pursuit: {
    kind: "stale",
    urgent: false,
    label: (t) => `Stale pursuit: ${t}`,
    detail: (d) => `No movement since ${d ?? "the request"} — nudge the broker?`,
    href: (r) => `/listings/${r}`,
  },
  next_step_due: {
    kind: "deadline",
    urgent: true,
    label: (t) => `Next step due: ${t}`,
    detail: (d) => d ?? "next step",
    href: (r) => `/deals/${r}`,
  },
};

export async function fetchDashboardV3(): Promise<DashboardV3 | null> {
  if (!hasDb()) return null;
  const db = serverDb();
  const today = new Date().toISOString().slice(0, 10);
  const weekAgo = new Date(Date.now() - 7 * 86400_000).toISOString();

  // Lane C's server-side aggregates first (single source of truth).
  const [viewActions, viewCoverage] = await Promise.all([
    db.from("dashboard_key_actions").select("kind, title, detail, ref_id, at").limit(50),
    db.from("dashboard_enrichment_coverage").select("subsector, total, enriched, outreach_ready"),
  ]);
  const viewsLive = !viewActions.error && !viewCoverage.error;

  // Pursuit states + listing info + broker email (for the send-inquiry action).
  // requested_at lands with migration 0005 — retry without it until applied.
  const reviewsQuery = (withTimestamps: boolean) =>
    db
      .from("listing_reviews")
      .select(
        `status, notes${withTimestamps ? ", requested_at, cim_received_at" : ""}, ` +
          "listings!inner(id, name, industry, url, brokers(email))"
      )
      .in("status", [...PROSPECTING_STATUSES]);

  const [reviewsRes, dealsRes, leadsRes, listingCounts, tier12Res, outboxRes] = await Promise.all([
    reviewsQuery(true).then(async (res) => (res.error ? await reviewsQuery(false) : res)),
    db
      .from("deals")
      .select("id, name, stage, next_step, next_step_due, companies(industry)")
      .neq("stage", "Closed"),
    db.from("leads").select("id, owner_name, owner_email, owner_phone, lead_lists(query_industry)").limit(2000),
    db.from("listings").select("id", { count: "exact", head: true }).is("delisted_at", null).is("duplicate_of", null),
    db
      .from("listings")
      .select("industry")
      .in("tier", [1, 2])
      .is("delisted_at", null)
      .is("duplicate_of", null),
    // outbox_emails lands with migration 0006 — error tolerated below
    db.from("outbox_emails").select("id, subject, to_email").eq("status", "queued").limit(20),
  ]);

  type Review = {
    status: string;
    notes: string | null;
    requested_at?: string | null;
    cim_received_at?: string | null;
    listings: {
      id: string;
      name: string | null;
      industry: string | null;
      url: string | null;
      brokers: { email: string | null } | { email: string | null }[] | null;
    };
  };
  const reviews = ((reviewsRes.data ?? []) as unknown as Review[]).map((r) => ({
    ...r,
    listings: Array.isArray(r.listings) ? r.listings[0] : r.listings,
  }));

  type DealRow = {
    id: string;
    name: string;
    stage: string;
    next_step: string | null;
    next_step_due: string | null;
    companies: { industry: string | null } | { industry: string | null }[] | null;
  };
  const deals = ((dealsRes.data ?? []) as unknown as DealRow[]).map((d) => ({
    ...d,
    industry: (Array.isArray(d.companies) ? d.companies[0] : d.companies)?.industry ?? null,
  }));

  type LeadRow = {
    id: string;
    owner_name: string | null;
    owner_email: string | null;
    owner_phone: string | null;
    lead_lists: { query_industry: string } | { query_industry: string }[] | null;
  };
  const leads = ((leadsRes.data ?? []) as unknown as LeadRow[]).map((l) => ({
    ...l,
    industry: (Array.isArray(l.lead_lists) ? l.lead_lists[0] : l.lead_lists)?.query_industry ?? null,
  }));

  // ---------- key actions (the human-attention queue)
  const actions: KeyAction[] = [];
  if (viewsLive) {
    // Server-side view is the source of truth for actions.
    for (const a of (viewActions.data ?? []) as { kind: string; title: string; detail: string | null; ref_id: string | null }[]) {
      const m = VIEW_ACTION_MAP[a.kind];
      if (!m) continue;
      actions.push({ kind: m.kind, label: m.label(a.title), detail: m.detail(a.detail), href: m.href(a.ref_id), urgent: m.urgent });
    }
  }
  // Queued inquiry drafts awaiting John's one-click send (Outbox)
  if (!viewsLive && !outboxRes.error) {
    for (const o of (outboxRes.data ?? []) as { id: string; subject: string; to_email: string }[]) {
      actions.push({
        kind: "queued_email",
        label: `Inquiry awaiting your send: ${o.subject}`,
        detail: `To ${o.to_email} — one click in the Outbox`,
        href: "/outbox",
        urgent: true,
      });
    }
  }
  for (const r of viewsLive ? [] : reviews) {
    const broker = Array.isArray(r.listings.brokers) ? r.listings.brokers[0] : r.listings.brokers;
    const name = r.listings.name ?? "(unnamed listing)";
    const href = `/listings/${r.listings.id}`;
    if (r.status === "cim_received") {
      actions.push({
        kind: "promote",
        label: `Ready to promote: ${name}`,
        detail: "CIM in hand — fill the real name/financials and create the deal",
        href,
        urgent: true,
      });
    } else if (r.status === "nda_signed") {
      actions.push({
        kind: "nda",
        label: `NDA signed — awaiting CIM: ${name}`,
        detail: "Auto-advances when the CIM lands in Outlook",
        href,
        urgent: false,
      });
    } else if (r.status === "info_requested") {
      const notes = (r.notes ?? "").toLowerCase();
      if (notes.includes("countersign pending")) {
        // John already signed; the BROKER owes the countersign — watch, don't act.
        actions.push({
          kind: "nda",
          label: `NDA in process: ${name}`,
          detail: "Signed by us — broker countersign pending (auto-advances from Outlook)",
          href,
          urgent: false,
        });
      } else if (notes.includes("countersign")) {
        actions.push({
          kind: "nda",
          label: `NDA awaiting your signature: ${name}`,
          detail: "Broker sent the NDA — sign to advance",
          href,
          urgent: true,
        });
      } else if (broker?.email) {
        actions.push({
          kind: "send_inquiry",
          label: `Inquiry drafted — your click to send: ${name}`,
          detail: `One-click draft to ${broker.email} on the listing page`,
          href,
          urgent: true,
        });
      }
      const staleDays = r.requested_at
        ? (Date.now() - new Date(r.requested_at).getTime()) / 86400_000
        : null;
      if (staleDays !== null && staleDays > 7) {
        actions.push({
          kind: "stale",
          label: `Stale pursuit (${Math.floor(staleDays)}d): ${name}`,
          detail: "No movement since the info request — nudge the broker?",
          href,
          urgent: false,
        });
      }
    }
  }
  for (const d of viewsLive ? [] : deals) {
    if (d.next_step_due && d.next_step_due <= today) {
      actions.push({
        kind: "deadline",
        label: `${d.next_step_due < today ? "OVERDUE" : "Due today"}: ${d.name}`,
        detail: d.next_step ?? "next step",
        href: `/deals/${d.id}`,
        urgent: d.next_step_due < today,
      });
    }
  }
  actions.sort((a, b) => Number(b.urgent) - Number(a.urgent));

  // ---------- combined funnel: prospecting states then deal stages
  const funnel: FunnelStep[] = [
    ...PROSPECTING_STATUSES.map((s) => ({
      label: PURSUIT_LABEL[s],
      count: reviews.filter((r) => r.status === s).length,
      kind: "prospecting" as const,
    })),
    ...STAGES.filter((s) => s !== "Closed").map((s) => ({
      label: s,
      count: deals.filter((d) => d.stage === s).length,
      kind: "deal" as const,
    })),
  ];

  // ---------- subsector matrix
  // Proprietary side prefers the server-side coverage view; broker side and
  // the interim fallback compute from tables either way.
  const coverage = viewsLive
    ? ((viewCoverage.data ?? []) as { subsector: string; total: number; outreach_ready: number }[])
    : null;
  const covFor = (key: string) =>
    coverage
      ?.filter((c) => subsectorOf(c.subsector) === key || subsectorMatch(c.subsector, key))
      .reduce((a, c) => ({ total: a.total + c.total, ready: a.ready + c.outreach_ready }), { total: 0, ready: 0 });

  const tier12Industries = (tier12Res.data ?? []) as { industry: string | null }[];
  const subsectors: SubsectorRow[] = SUBSECTORS.map((s) => {
    const cov = covFor(s.key);
    return {
      key: s.key,
      brokerListings: tier12Industries.filter((l) => subsectorOf(l.industry) === s.key).length,
      brokerDeals: deals.filter((d) => subsectorOf(d.industry) === s.key).length,
      propTargets: cov
        ? cov.total
        : leads.filter((l) => subsectorOf(l.industry) === s.key || (l.industry && subsectorMatch(l.industry, s.key))).length,
      propReady: cov
        ? cov.ready
        : leads.filter(
            (l) =>
              (subsectorOf(l.industry) === s.key || (l.industry && subsectorMatch(l.industry, s.key))) &&
              !!l.owner_name &&
              (!!l.owner_email || !!l.owner_phone)
          ).length,
    };
  });

  return {
    actions,
    funnel,
    subsectors,
    totals: {
      listings: listingCounts.count ?? 0,
      tier12: tier12Industries.length,
      leads: leads.length,
      deals: deals.length,
    },
  };
}

// Lead-list industries are free text ("Lake Management", "Pool Service",
// "HVAC/Dallas") — fuzzy-match them into subsectors.
function subsectorMatch(freeText: string, subsector: string): boolean {
  const t = freeText.toLowerCase();
  switch (subsector) {
    case "Landscape":
      return /landscap|lawn|irrigat|property main/.test(t);
    case "Tree Care":
      return /tree|arbor/.test(t);
    case "Pest Control":
      return /pest|wildlife|exterminat/.test(t);
    case "Pool & Outdoor":
      return /pool|fenc|lake|pond/.test(t);
    case "Home Systems":
      return /hvac|plumb|electric|roof|window|door|restor|clean|janitor/.test(t);
    default:
      return false;
  }
}
