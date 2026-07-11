// Loader for the upgraded company profile: company + deal + contacts +
// activities, every linked listing with its event history, and a market-
// multiple comparison against the company's industry.
import { hasDb, serverDb } from "./db";
import { fetchMarketStats, SIZE_BANDS, type IndustryStats } from "./analytics";

const num = (v: number | string | null | undefined) =>
  v === null || v === undefined ? null : Number(v);

export type CompanyListing = {
  id: string;
  name: string | null;
  url: string | null;
  sourceId: string | null;
  tier: number | null;
  asking: number | null;
  cashFlow: number | null;
  firstSeen: string;
  lastSeen: string;
  delistedAt: string | null;
  isOrigin: boolean;
  events: { event_type: string; detail: Record<string, unknown> | null; created_at: string }[];
};

export type MultipleComparison = {
  industry: string;
  companyMultiple: number | null; // deal asking / company ebitda
  industryMedian: number | null;
  industryN: number;
  bandKey: string | null;
  bandMedian: number | null;
  bandN: number;
};

export type CompanyDetail = {
  company: {
    id: string;
    name: string;
    website: string | null;
    industry: string | null;
    city: string | null;
    state: string | null;
    revenue: number | null;
    ebitda: number | null;
    ebitdaType: string;
    origin: string | null;
    notes: string | null;
    listingId: string | null;
    createdAt: string;
  };
  deal: {
    id: string;
    name: string;
    stage: string;
    asking: number | null;
    nextStep: string | null;
    nextStepDue: string | null;
    closedLostReason: string | null;
  } | null;
  contacts: {
    id: string;
    role: string | null;
    name: string | null;
    email: string | null;
    phone: string | null;
    linkedin: string | null;
    notes: string | null;
  }[];
  activities: { id: number; kind: string; body: string | null; doc_url: string | null; created_at: string }[];
  listings: CompanyListing[];
  comparison: MultipleComparison | null;
};

export async function fetchCompanyDetail(id: string): Promise<CompanyDetail | null> {
  if (!hasDb()) return null;
  const db = serverDb();

  const { data: cRaw, error } = await db.from("companies").select("*").eq("id", id).maybeSingle();
  if (error) {
    console.error("fetchCompanyDetail failed:", error.message);
    return null;
  }
  if (!cRaw) return null;
  const c = cRaw as Record<string, never> & {
    id: string; name: string; website: string | null; industry: string | null;
    city: string | null; state: string | null; revenue: number | string | null;
    ebitda: number | string | null; ebitda_type: string | null; origin: string | null;
    notes: string | null; listing_id: string | null; created_at: string;
  };

  const [{ data: dealRows }, { data: contacts }, { data: activities }, { data: linkedListings }] =
    await Promise.all([
      db
        .from("deals")
        .select("id, name, stage, asking_price, next_step, next_step_due, closed_lost_reason")
        .eq("company_id", id)
        .order("created_at", { ascending: false })
        .limit(1),
      db
        .from("contacts")
        .select("id, role, name, email, phone, linkedin, notes")
        .eq("company_id", id)
        .order("created_at", { ascending: true }),
      db
        .from("activities")
        .select("id, kind, body, doc_url, created_at")
        .eq("company_id", id)
        .order("created_at", { ascending: false })
        .limit(100),
      // identity-linked listings (cross-source discoveries) + the origin listing
      c.listing_id
        ? db
            .from("listings")
            .select("id, name, url, source_id, tier, asking_price, cash_flow, first_seen_at, last_seen_at, delisted_at")
            .or(`company_id.eq.${id},id.eq.${c.listing_id}`)
        : db
            .from("listings")
            .select("id, name, url, source_id, tier, asking_price, cash_flow, first_seen_at, last_seen_at, delisted_at")
            .eq("company_id", id),
    ]);

  type LRow = {
    id: string; name: string | null; url: string | null; source_id: string | null;
    tier: number | null; asking_price: number | string | null; cash_flow: number | string | null;
    first_seen_at: string; last_seen_at: string; delisted_at: string | null;
  };
  const lRows = (linkedListings ?? []) as LRow[];

  // Event history for the linked listings, newest first.
  let events: { listing_id: string; event_type: string; detail: Record<string, unknown> | null; created_at: string }[] = [];
  if (lRows.length > 0) {
    const { data: ev } = await db
      .from("listing_events")
      .select("listing_id, event_type, detail, created_at")
      .in("listing_id", lRows.map((l) => l.id))
      .order("created_at", { ascending: false })
      .limit(100);
    events = (ev ?? []) as typeof events;
  }

  const listings: CompanyListing[] = lRows
    .map((l) => ({
      id: l.id,
      name: l.name,
      url: l.url,
      sourceId: l.source_id,
      tier: l.tier,
      asking: num(l.asking_price),
      cashFlow: num(l.cash_flow),
      firstSeen: l.first_seen_at.slice(0, 10),
      lastSeen: l.last_seen_at.slice(0, 10),
      delistedAt: l.delisted_at,
      isOrigin: l.id === c.listing_id,
      events: events.filter((e) => e.listing_id === l.id),
    }))
    .sort((a, b) => (a.isOrigin === b.isOrigin ? b.firstSeen.localeCompare(a.firstSeen) : a.isOrigin ? -1 : 1));

  const deal = dealRows?.[0]
    ? {
        id: dealRows[0].id,
        name: dealRows[0].name,
        stage: dealRows[0].stage,
        asking: num(dealRows[0].asking_price),
        nextStep: dealRows[0].next_step,
        nextStepDue: dealRows[0].next_step_due,
        closedLostReason: dealRows[0].closed_lost_reason,
      }
    : null;

  // Market-multiple comparison: the deal's asking over company cash flow vs the
  // industry median (and the matching EBITDA size band).
  let comparison: MultipleComparison | null = null;
  const ebitda = num(c.ebitda);
  if (c.industry) {
    const market = await fetchMarketStats();
    const stat: IndustryStats | undefined = market?.stats.find((s) => s.industry === c.industry);
    if (stat) {
      const band = ebitda !== null ? SIZE_BANDS.find((b) => ebitda >= b.min && ebitda < b.max) : undefined;
      comparison = {
        industry: c.industry,
        companyMultiple:
          deal?.asking != null && ebitda !== null && ebitda > 0 ? deal.asking / ebitda : null,
        industryMedian: stat.medMultiple,
        industryN: stat.nMultiple,
        bandKey: band?.key ?? null,
        bandMedian: band ? stat.bands[band.key]?.med ?? null : null,
        bandN: band ? stat.bands[band.key]?.n ?? 0 : 0,
      };
    }
  }

  return {
    company: {
      id: c.id,
      name: c.name,
      website: c.website,
      industry: c.industry,
      city: c.city,
      state: c.state,
      revenue: num(c.revenue),
      ebitda,
      ebitdaType: c.ebitda_type === "SDE" ? "SDE" : c.ebitda_type ?? "EBITDA",
      origin: c.origin,
      notes: c.notes,
      listingId: c.listing_id,
      createdAt: c.created_at,
    },
    deal,
    contacts: contacts ?? [],
    activities: activities ?? [],
    listings,
    comparison,
  };
}
