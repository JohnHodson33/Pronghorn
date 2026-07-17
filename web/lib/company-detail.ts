// Loader for the upgraded company profile: company + deal + contacts +
// activities, every linked listing with its event history, and a market-
// multiple comparison against the company's industry.
import { hasDb, serverDb } from "./db";
import { computeMarketCheck, type MarketCheck } from "./market-check";
import { sizeEstimate, type SizeEstimate } from "./size";
import { loadSizeModel } from "./size-model";

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

export type MultipleComparison = MarketCheck;

// A river-guide link (0016): this company was sold to a consolidator and its
// former owner is a River Guide prospect. company_id points here; contact_id
// points at the promoted contact once one exists.
export type RiverGuideLink = {
  dealId: string;
  fullName: string | null;
  theirCompany: string;
  acquirer: string | null;
  sponsor: string | null;          // acquirer_pe_sponsor
  acquirerWebsite: string | null;
  dealYear: number | null;
  exitStatus: string;              // EXITED | EMPLOYED | UNKNOWN (at close)
  verified: boolean;               // current_status_verified
  band: string | null;             // priority_band
  enrichmentStatus: string;
  notes: string | null;            // verify-worker evidence lives here
  contactId: string | null;
  companyId: string | null;
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
    peOwned: boolean;
    peOwner: string | null;
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
    riverGuide: RiverGuideLink | null; // set when this contact was a river guide
  }[];
  // river guides whose FORMER company is this one (company_id FK) — drives the
  // header banner. Usually one; a list keeps multi-owner exits honest.
  riverGuides: RiverGuideLink[];
  activities: { id: number; kind: string; body: string | null; doc_url: string | null; created_at: string }[];
  listings: CompanyListing[];
  comparison: MultipleComparison | null;
  // channels the source LEAD has that no contact carries yet (promotion/sync
  // gap — John 7/13: show with provenance rather than reading as blank)
  leadChannels: { ownerName: string | null; email: string | null; phone: string | null; linkedin: string | null } | null;
  size: SizeEstimate | null; // size-proxy tier for the header (null = unsized)
  shortlist: { person: string; note: string | null; created_at: string }[]; // ★ 0015; empty pre-migration
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

  const [{ data: dealRows }, { data: contacts }, { data: activities }, { data: linkedListings }, { data: leadRows }] =
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
      // the source lead: owner channels (sync-gap detection) + size signals
      db
        .from("leads")
        .select("owner_name, owner_email, owner_phone, owner_linkedin, enrichment, review_count, industry_verified")
        .eq("company_id", id)
        .limit(5),
    ]);

  // ★ shortlist (0015) — separate tolerant query so a missing table costs nothing
  const { data: shortlistRows } = await db
    .from("company_shortlist")
    .select("person, note, created_at")
    .eq("company_id", id);

  // River-guide links (0016): rows whose former company is this one, OR whose
  // promoted contact is on this company. Tolerant — a missing table costs
  // nothing, so pre-migration CRMs are unaffected.
  const contactIds = (contacts ?? []).map((p) => p.id);
  const rgOr = [`company_id.eq.${id}`];
  if (contactIds.length) rgOr.push(`contact_id.in.(${contactIds.join(",")})`);
  const { data: rgRows } = await db
    .from("river_guides")
    .select("deal_id, full_name, their_company, acquirer, acquirer_pe_sponsor, acquirer_website, deal_year, exit_status, current_status_verified, priority_band, enrichment_status, notes, contact_id, company_id")
    .or(rgOr.join(","));
  const riverGuides: RiverGuideLink[] = ((rgRows ?? []) as Record<string, unknown>[]).map((r) => ({
    dealId: String(r.deal_id),
    fullName: (r.full_name as string | null) ?? null,
    theirCompany: String(r.their_company ?? ""),
    acquirer: (r.acquirer as string | null) ?? null,
    sponsor: (r.acquirer_pe_sponsor as string | null) ?? null,
    acquirerWebsite: (r.acquirer_website as string | null) ?? null,
    dealYear: r.deal_year != null ? Number(r.deal_year) : null,
    exitStatus: String(r.exit_status ?? "UNKNOWN"),
    verified: !!r.current_status_verified,
    band: (r.priority_band as string | null) ?? null,
    enrichmentStatus: String(r.enrichment_status ?? ""),
    notes: (r.notes as string | null) ?? null,
    contactId: (r.contact_id as string | null) ?? null,
    companyId: (r.company_id as string | null) ?? null,
  }));

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
  const ebitda = num(c.ebitda);
  const comparison = await computeMarketCheck(c.industry, ebitda, deal?.asking ?? null);

  // Channels the lead carries that NO contact on the company has — surfaced
  // with provenance instead of reading as blank. (Lane C's write-path sync
  // will close the gap at promotion time; this catches the interim.)
  const contactList = contacts ?? [];
  const has = (k: "email" | "phone" | "linkedin") => contactList.some((p) => p[k]);
  let leadChannels: CompanyDetail["leadChannels"] = null;
  for (const l of (leadRows ?? []) as { owner_name: string | null; owner_email: string | null; owner_phone: string | null; owner_linkedin: string | null }[]) {
    const email = !has("email") ? l.owner_email : null;
    const phone = !has("phone") ? l.owner_phone : null;
    const linkedin = !has("linkedin") ? l.owner_linkedin : null;
    if (email || phone || linkedin) {
      leadChannels = { ownerName: l.owner_name, email, phone, linkedin };
      break;
    }
  }

  // size-proxy estimate from the source lead's signals (same math as every
  // other surface) — null when no lead/signals, so the header reads "Unsized"
  const sizeLead = ((leadRows ?? []) as { enrichment?: unknown; review_count?: number | null; industry_verified?: string | null }[])
    .find((l) => l.enrichment || l.review_count);
  const size = sizeLead
    ? sizeEstimate(
        sizeLead.industry_verified ?? c.industry,
        (sizeLead.enrichment as { size_signals?: Record<string, unknown> } | null)?.size_signals,
        sizeLead.review_count ?? null,
        await loadSizeModel(),
      )
    : null;

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
      // pe columns arrive with 0017 (select * tolerates absence)
      peOwned: !!(c as Record<string, unknown>).pe_owned,
      peOwner: ((c as Record<string, unknown>).pe_owner as string | null) ?? null,
    },
    deal,
    contacts: (contacts ?? []).map((p) => ({
      ...p,
      riverGuide: riverGuides.find((rg) => rg.contactId === p.id) ?? null,
    })),
    // header banner = river guides whose FORMER company is this one
    riverGuides: riverGuides.filter((rg) => rg.companyId === id),
    activities: activities ?? [],
    listings,
    comparison,
    leadChannels,
    size,
    shortlist: (shortlistRows as CompanyDetail["shortlist"] | null) ?? [],
  };
}
