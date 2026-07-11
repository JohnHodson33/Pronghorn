// Loader for the deal detail page — one deal with its company, contacts,
// origin listing, and listing broker resolved in a single fetch pass.
import { hasDb, serverDb } from "./db";

export type DealContact = {
  id: string;
  role: string | null;
  name: string | null;
  email: string | null;
  phone: string | null;
  linkedin: string | null;
  notes: string | null;
};

export type DealDetail = {
  id: string;
  name: string;
  stage: string;
  asking: number | null;
  ourValuation: number | null;
  thesis: string | null;
  fitScore: number | null;
  nextStep: string | null;
  nextStepDue: string | null;
  closedLostReason: string | null;
  createdAt: string;
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
  };
  contacts: DealContact[];
  listing: {
    name: string | null;
    url: string | null;
    sourceId: string | null;
    tier: number | null;
  } | null;
  broker: {
    name: string | null;
    brokerage: string | null;
    email: string | null;
    phone: string | null;
  } | null;
  activities: {
    id: number;
    kind: string;
    body: string | null;
    doc_url: string | null;
    created_at: string;
  }[];
};

const num = (v: number | string | null | undefined) =>
  v === null || v === undefined ? null : Number(v);

export async function fetchDealDetail(id: string): Promise<DealDetail | null> {
  if (!hasDb()) return null;
  const db = serverDb();

  const { data, error } = await db
    .from("deals")
    .select(
      "id, name, stage, asking_price, our_valuation, thesis, fit_score, next_step, next_step_due, closed_lost_reason, created_at, " +
        "companies(id, name, website, industry, city, state, revenue, ebitda, ebitda_type, origin, notes, listing_id)"
    )
    .eq("id", id)
    .maybeSingle();
  if (error) {
    console.error("fetchDealDetail failed:", error.message);
    return null;
  }
  if (!data) return null;
  // Supabase can't infer types for joined selects — cast like lib/crm.ts does.
  const d = data as unknown as {
    id: string;
    name: string;
    stage: string;
    asking_price: number | string | null;
    our_valuation: number | string | null;
    thesis: string | null;
    fit_score: number | string | null;
    next_step: string | null;
    next_step_due: string | null;
    closed_lost_reason: string | null;
    created_at: string;
    companies: unknown;
  };

  const c = (Array.isArray(d.companies) ? d.companies[0] : d.companies) as {
    id: string;
    name: string;
    website: string | null;
    industry: string | null;
    city: string | null;
    state: string | null;
    revenue: number | string | null;
    ebitda: number | string | null;
    ebitda_type: string | null;
    origin: string | null;
    notes: string | null;
    listing_id: string | null;
  } | null;
  if (!c) return null;

  const [{ data: contacts }, { data: activities }, listingRes] = await Promise.all([
    db
      .from("contacts")
      .select("id, role, name, email, phone, linkedin, notes")
      .eq("company_id", c.id)
      .order("created_at", { ascending: true }),
    db
      .from("activities")
      .select("id, kind, body, doc_url, created_at")
      .eq("company_id", c.id)
      .order("created_at", { ascending: false })
      .limit(100),
    c.listing_id
      ? db
          .from("listings")
          .select("name, url, source_id, tier, broker_id, brokers(name, brokerage, email, phone)")
          .eq("id", c.listing_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const listing = listingRes.data as {
    name: string | null;
    url: string | null;
    source_id: string | null;
    tier: number | null;
    brokers: { name: string | null; brokerage: string | null; email: string | null; phone: string | null } | null;
  } | null;
  const broker = Array.isArray(listing?.brokers) ? listing?.brokers[0] : listing?.brokers;

  return {
    id: d.id,
    name: d.name,
    stage: d.stage,
    asking: num(d.asking_price),
    ourValuation: num(d.our_valuation),
    thesis: d.thesis,
    fitScore: num(d.fit_score),
    nextStep: d.next_step,
    nextStepDue: d.next_step_due,
    closedLostReason: d.closed_lost_reason,
    createdAt: d.created_at,
    company: {
      id: c.id,
      name: c.name,
      website: c.website,
      industry: c.industry,
      city: c.city,
      state: c.state,
      revenue: num(c.revenue),
      ebitda: num(c.ebitda),
      ebitdaType: c.ebitda_type === "SDE" ? "SDE" : c.ebitda_type ?? "EBITDA",
      origin: c.origin,
      notes: c.notes,
    },
    contacts: (contacts ?? []) as DealContact[],
    listing: listing
      ? { name: listing.name, url: listing.url, sourceId: listing.source_id, tier: listing.tier }
      : null,
    broker: broker ?? null,
    activities: activities ?? [],
  };
}
