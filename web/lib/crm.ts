// Live CRM loaders — deals with company detail, and the companies list.
import { hasDb, serverDb } from "./db";
import { sizeEstimate, type SizeEstimate } from "./size";
import { loadSizeModel } from "./size-model";

export type LiveDeal = {
  id: string;
  company: string;
  industry: string | null;
  city: string | null;
  state: string | null;
  revenue: number | null;
  ebitda: number | null;
  ebitdaType: string;
  asking: number | null;
  ourValuation: number | null;
  fitScore: number | null;
  stage: string;
  broker?: string;
  brokerage?: string;
  owner?: string;
  passReason: string | null;
  nextStep: string | null;
  nextStepDue: string | null;
};

type DealRow = {
  id: string;
  name: string;
  stage: string;
  asking_price: number | string | null;
  our_valuation: number | string | null;
  fit_score: number | string | null;
  closed_lost_reason: string | null;
  next_step: string | null;
  next_step_due: string | null;
  companies: {
    name: string;
    industry: string | null;
    city: string | null;
    state: string | null;
    revenue: number | string | null;
    ebitda: number | string | null;
    ebitda_type: string | null;
    contacts: { role: string | null; name: string | null }[] | null;
    origin_listing:
      | { brokers: { name: string | null; brokerage: string | null } | { name: string | null; brokerage: string | null }[] | null }
      | { brokers: { name: string | null; brokerage: string | null } | { name: string | null; brokerage: string | null }[] | null }[]
      | null;
  } | null;
};

const num = (v: number | string | null) => (v === null || v === undefined ? null : Number(v));

export async function fetchDeals(): Promise<LiveDeal[] | null> {
  if (!hasDb()) return null;
  const { data, error } = await serverDb()
    .from("deals")
    .select(
      "id, name, stage, asking_price, our_valuation, fit_score, closed_lost_reason, next_step, next_step_due, " +
        "companies(name, industry, city, state, revenue, ebitda, ebitda_type, contacts(role, name), " +
        "origin_listing:listings!companies_listing_id_fkey(brokers(name, brokerage)))"
    )
    .order("created_at", { ascending: false });
  if (error) {
    console.error("fetchDeals failed:", error.message);
    return null;
  }
  return (data as unknown as DealRow[]).map((d) => {
    // Broker: the company's role=broker contact first, listing broker fallback.
    const contactBroker = d.companies?.contacts?.find((c) => c.role === "broker")?.name ?? undefined;
    const owner = d.companies?.contacts?.find((c) => c.role === "owner" || c.role === "seller")?.name ?? undefined;
    const ol = Array.isArray(d.companies?.origin_listing) ? d.companies?.origin_listing[0] : d.companies?.origin_listing;
    const lb = Array.isArray(ol?.brokers) ? ol?.brokers[0] : ol?.brokers;
    return {
      id: d.id,
      company: d.companies?.name ?? d.name,
      industry: d.companies?.industry ?? null,
      city: d.companies?.city ?? null,
      state: d.companies?.state ?? null,
      revenue: num(d.companies?.revenue ?? null),
      ebitda: num(d.companies?.ebitda ?? null),
      ebitdaType: d.companies?.ebitda_type === "SDE" ? "SDE" : "EBITDA",
      asking: num(d.asking_price),
      ourValuation: num(d.our_valuation),
      fitScore: num(d.fit_score),
      stage: d.stage,
      broker: contactBroker ?? lb?.name ?? undefined,
      brokerage: lb?.brokerage ?? undefined,
      owner,
      passReason: d.closed_lost_reason,
      nextStep: d.next_step,
      nextStepDue: d.next_step_due,
    };
  });
}

export type CompanyRow = {
  id: string;
  name: string;
  industry: string | null;
  city: string | null;
  state: string | null;
  revenue: number | string | null;
  ebitda: number | string | null;
  ebitda_type: string | null;
  origin: string | null;
  created_at: string;
  deals: { stage: string }[];
  contacts: { role: string | null; name: string | null; email: string | null; phone: string | null; linkedin: string | null }[];
  // size-proxy estimate from the source lead's signals (null = unsized)
  size: SizeEstimate | null;
};

export type BrokerRow = {
  id: string;
  name: string;
  brokerage: string | null;
  phone: string | null;
  email: string | null;
  listingCount: number;
  industries: string[];
  states: string[];
  sources: string[];
  contactId: string | null; // set once promoted into the Contacts CRM
};

// Broker catalog: identities from `brokers`, coverage derived from their linked
// listings (what industries/states/how many deals each broker represents).
export async function fetchBrokers(): Promise<BrokerRow[] | null> {
  if (!hasDb()) return null;
  const db = serverDb();

  type BRaw = {
    id: string; name: string; brokerage: string | null; phone: string | null; email: string | null;
    contacts: { id: string } | { id: string }[] | null;
  };
  const brokers: BRaw[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db
      .from("brokers")
      .select("id, name, brokerage, phone, email, contacts(id)")
      .range(from, from + 999);
    if (error) { console.error("fetchBrokers failed:", error.message); return null; }
    brokers.push(...(data as unknown as BRaw[]));
    if (data.length < 1000) break;
  }
  if (brokers.length === 0) return [];

  // Coverage from linked listings
  const agg = new Map<string, { n: number; ind: Set<string>; st: Set<string>; src: Set<string> }>();
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db
      .from("listings")
      .select("broker_id, industry, state, source_id")
      .not("broker_id", "is", null)
      .range(from, from + 999);
    if (error) { console.error("fetchBrokers listings failed:", error.message); break; }
    for (const r of data as { broker_id: string; industry: string | null; state: string | null; source_id: string | null }[]) {
      if (!agg.has(r.broker_id)) agg.set(r.broker_id, { n: 0, ind: new Set(), st: new Set(), src: new Set() });
      const a = agg.get(r.broker_id)!;
      a.n++;
      if (r.industry) a.ind.add(r.industry);
      if (r.state) a.st.add(r.state);
      if (r.source_id) a.src.add(r.source_id);
    }
    if (data.length < 1000) break;
  }

  return brokers
    .map((b) => {
      const a = agg.get(b.id);
      const c = Array.isArray(b.contacts) ? b.contacts[0] : b.contacts;
      return {
        id: b.id,
        name: b.name,
        brokerage: b.brokerage,
        phone: b.phone,
        email: b.email,
        listingCount: a?.n ?? 0,
        industries: a ? [...a.ind].sort() : [],
        states: a ? [...a.st].sort() : [],
        sources: a ? [...a.src].sort() : [],
        contactId: c?.id ?? null,
      };
    })
    .sort((x, y) => y.listingCount - x.listingCount);
}

export async function fetchCompanies(): Promise<CompanyRow[] | null> {
  if (!hasDb()) return null;
  const { data, error } = await serverDb()
    .from("companies")
    .select(
      "id, name, industry, city, state, revenue, ebitda, ebitda_type, origin, created_at, deals(stage), " +
        "contacts(role, name, email, phone, linkedin)"
    )
    .order("created_at", { ascending: false });
  if (error) {
    console.error("fetchCompanies failed:", error.message);
    return null;
  }

  // size signals live on the source LEAD's enrichment — same join + math as
  // /api/companies so the chips can't drift between surfaces
  const [{ data: leadRows }, model] = await Promise.all([
    serverDb()
      .from("leads")
      .select("company_id, enrichment, review_count, industry_verified")
      .not("company_id", "is", null)
      .limit(3000),
    loadSizeModel(),
  ]);
  const leadByCompany = new Map((leadRows ?? []).map((l) => [l.company_id as string, l]));

  return (data as unknown as Omit<CompanyRow, "size">[]).map((c) => {
    const lead = leadByCompany.get(c.id);
    return {
      ...c,
      size: lead
        ? sizeEstimate(
            (lead.industry_verified as string | null) ?? c.industry,
            (lead.enrichment as { size_signals?: Record<string, unknown> } | null)?.size_signals,
            lead.review_count as number | null,
            model,
          )
        : null,
    };
  });
}
