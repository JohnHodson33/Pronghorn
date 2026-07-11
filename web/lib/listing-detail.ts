// Loader for the listing detail page — one raw broker listing with its
// screener output, event history, broker, and CRM link if promoted.
import { hasDb, serverDb } from "./db";

const num = (v: number | string | null | undefined) =>
  v === null || v === undefined ? null : Number(v);

export type ListingDetail = {
  id: string;
  name: string;
  description: string | null;
  url: string | null;
  sourceId: string | null;
  externalId: string | null;
  industry: string | null;
  industryRaw: string | null;
  city: string | null;
  state: string | null;
  asking: number | null;
  revenue: number | null;
  cashFlow: number | null;
  cashFlowType: string | null;
  impliedMultiple: number | null;
  tier: number | null;
  tierReasoning: string | null;
  priorityState: boolean;
  firstSeen: string;
  lastSeen: string;
  delistedAt: string | null;
  broker: { name: string | null; brokerage: string | null; phone: string | null; email: string | null } | null;
  company: { id: string; name: string } | null;
  events: { event_type: string; detail: Record<string, unknown> | null; created_at: string }[];
};

export async function fetchListingDetail(id: string): Promise<ListingDetail | null> {
  if (!hasDb()) return null;
  const db = serverDb();

  const { data, error } = await db
    .from("listings")
    .select(
      "id, name, description, url, source_id, external_id, industry, industry_raw, city, state, " +
        "asking_price, gross_revenue, cash_flow, cash_flow_type, implied_multiple, tier, tier_reasoning, " +
        "priority_state, first_seen_at, last_seen_at, delisted_at, company_id, " +
        "brokers(name, brokerage, phone, email), companies!listings_company_id_fkey(id, name)"
    )
    .eq("id", id)
    .maybeSingle();
  if (error) {
    console.error("fetchListingDetail failed:", error.message);
    return null;
  }
  if (!data) return null;

  const l = data as unknown as {
    id: string; name: string | null; description: string | null; url: string | null;
    source_id: string | null; external_id: string | null; industry: string | null;
    industry_raw: string | null; city: string | null; state: string | null;
    asking_price: number | string | null; gross_revenue: number | string | null;
    cash_flow: number | string | null; cash_flow_type: string | null;
    implied_multiple: number | string | null; tier: number | null; tier_reasoning: string | null;
    priority_state: boolean | null; first_seen_at: string; last_seen_at: string;
    delisted_at: string | null; company_id: string | null;
    brokers: ListingDetail["broker"] | ListingDetail["broker"][] | null;
    companies: { id: string; name: string } | { id: string; name: string }[] | null;
  };

  const { data: events } = await db
    .from("listing_events")
    .select("event_type, detail, created_at")
    .eq("listing_id", id)
    .order("created_at", { ascending: false })
    .limit(50);

  const broker = Array.isArray(l.brokers) ? l.brokers[0] : l.brokers;
  const company = Array.isArray(l.companies) ? l.companies[0] : l.companies;

  return {
    id: l.id,
    name: l.name ?? "(unnamed listing)",
    description: l.description,
    url: l.url,
    sourceId: l.source_id,
    externalId: l.external_id,
    industry: l.industry,
    industryRaw: l.industry_raw,
    city: l.city,
    state: l.state,
    asking: num(l.asking_price),
    revenue: num(l.gross_revenue),
    cashFlow: num(l.cash_flow),
    cashFlowType: l.cash_flow_type,
    impliedMultiple: num(l.implied_multiple),
    tier: l.tier,
    tierReasoning: l.tier_reasoning,
    priorityState: !!l.priority_state,
    firstSeen: l.first_seen_at.slice(0, 10),
    lastSeen: l.last_seen_at.slice(0, 10),
    delistedAt: l.delisted_at,
    broker: broker ?? null,
    company: company ?? null,
    events: (events ?? []) as ListingDetail["events"],
  };
}
