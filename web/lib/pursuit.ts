// Listing pursuit lifecycle (docs/LISTING-PURSUIT-FLOW.md).
// listing_reviews.status is the tracker:
//   new → interested → info_requested → nda_signed → cim_received → promoted → passed
// State names coordinated with Lane C's migration; timestamp columns
// (requested_at, nda_signed_at, cim_received_at) and inquiry_profiles may not
// be applied yet — everything here degrades gracefully until they are.
import { hasDb, serverDb } from "./db";

export const PURSUIT_STATUSES = [
  "new",
  "interested",
  "info_requested",
  "nda_signed",
  "cim_received",
  "promoted",
  "passed",
] as const;
export type PursuitStatus = (typeof PURSUIT_STATUSES)[number];

// The pipeline's pre-company "Prospecting" lane shows these states.
export const PROSPECTING_STATUSES = ["info_requested", "nda_signed", "cim_received"] as const;

export const PURSUIT_LABEL: Record<string, string> = {
  new: "New",
  interested: "Interested",
  info_requested: "Info requested",
  nda_signed: "NDA signed",
  cim_received: "CIM received",
  promoted: "Promoted",
  passed: "Passed",
  reviewed: "Reviewed",
  pursuing: "Pursuing",
  pushed_to_crm: "Promoted",
};

export type ProspectingListing = {
  id: string;
  name: string;
  sourceId: string | null;
  industry: string | null;
  city: string | null;
  state: string | null;
  asking: number | null;
  cashFlow: number | null;
  cashFlowType: string | null;
  tier: number | null;
  status: string;
  statusSince: string | null;
  brokerName: string | null;
  brokerEmail: string | null;
};

export async function fetchProspecting(): Promise<ProspectingListing[]> {
  if (!hasDb()) return [];
  const { data, error } = await serverDb()
    .from("listing_reviews")
    .select(
      "status, updated_at, listings!inner(id, name, source_id, industry, city, state, asking_price, cash_flow, cash_flow_type, tier, brokers(name, email))"
    )
    .in("status", [...PROSPECTING_STATUSES]);
  if (error) {
    // updated_at may not exist pre-migration — retry without it.
    const retry = await serverDb()
      .from("listing_reviews")
      .select(
        "status, listings!inner(id, name, source_id, industry, city, state, asking_price, cash_flow, cash_flow_type, tier, brokers(name, email))"
      )
      .in("status", [...PROSPECTING_STATUSES]);
    if (retry.error) {
      console.error("fetchProspecting failed:", retry.error.message);
      return [];
    }
    return mapProspecting(retry.data as unknown as RawReview[]);
  }
  return mapProspecting(data as unknown as RawReview[]);
}

type RawReview = {
  status: string;
  updated_at?: string | null;
  listings: {
    id: string;
    name: string | null;
    source_id: string | null;
    industry: string | null;
    city: string | null;
    state: string | null;
    asking_price: number | string | null;
    cash_flow: number | string | null;
    cash_flow_type: string | null;
    tier: number | null;
    brokers:
      | { name: string | null; email: string | null }
      | { name: string | null; email: string | null }[]
      | null;
  };
};

function mapProspecting(rows: RawReview[]): ProspectingListing[] {
  return rows.map((r) => {
    const l = Array.isArray(r.listings) ? r.listings[0] : r.listings;
    const b = Array.isArray(l.brokers) ? l.brokers[0] : l.brokers;
    return {
      id: l.id,
      name: l.name ?? "(unnamed listing)",
      sourceId: l.source_id,
      industry: l.industry,
      city: l.city,
      state: l.state,
      asking: l.asking_price === null ? null : Number(l.asking_price),
      cashFlow: l.cash_flow === null ? null : Number(l.cash_flow),
      cashFlowType: l.cash_flow_type,
      tier: l.tier,
      status: r.status,
      statusSince: r.updated_at?.slice(0, 10) ?? null,
      brokerName: b?.name ?? null,
      brokerEmail: b?.email ?? null,
    };
  });
}

export async function fetchPursuitStatus(listingId: string): Promise<string | null> {
  if (!hasDb()) return null;
  const { data } = await serverDb()
    .from("listing_reviews")
    .select("status")
    .eq("listing_id", listingId)
    .maybeSingle();
  return data?.status ?? null;
}
