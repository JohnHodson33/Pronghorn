// Loader for the Enrichment tab — the leads funnel between list building and
// outreach. Counts by status plus the working set of leads with their
// per-company enrichment state.
import { hasDb, serverDb } from "./db";

// Mirrors the leads.status check progression in the schema.
export const LEAD_STATUSES = [
  "new",
  "enriching",
  "enriched",
  "in_sequence",
  "contacted",
  "responded",
  "dead",
] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

export type EnrichmentLead = {
  id: string;
  name: string;
  website: string | null;
  phone: string | null;
  city: string | null;
  state: string | null;
  rating: number | null;
  review_count: number | null;
  source_tags: string[];
  bbb_grade: string | null;
  enrichment: Record<string, unknown> | null;
  owner_name: string | null;
  owner_email: string | null;
  owner_phone: string | null;
  owner_linkedin: string | null;
  status: string;
  created_at: string;
  list: { industry: string; geography: string | null } | null;
};

export type EnrichmentOverview = {
  counts: Record<string, number>;
  leads: EnrichmentLead[];
};

export async function fetchEnrichmentOverview(statusFilter?: string): Promise<EnrichmentOverview | null> {
  if (!hasDb()) return null;
  const db = serverDb();

  // Status counts — paged head-count queries, one per status (cheap; table is
  // small until the list-building workers start producing).
  const counts: Record<string, number> = {};
  await Promise.all(
    LEAD_STATUSES.map(async (s) => {
      const { count, error } = await db
        .from("leads")
        .select("id", { count: "exact", head: true })
        .eq("status", s);
      if (error) console.error(`lead count(${s}) failed:`, error.message);
      counts[s] = count ?? 0;
    })
  );

  let q = db
    .from("leads")
    .select(
      "id, name, website, phone, city, state, rating, review_count, source_tags, bbb_grade, enrichment, " +
        "owner_name, owner_email, owner_phone, owner_linkedin, status, created_at, " +
        "lead_lists(query_industry, query_geography)"
    )
    .order("created_at", { ascending: false })
    .limit(200);
  if (statusFilter && (LEAD_STATUSES as readonly string[]).includes(statusFilter))
    q = q.eq("status", statusFilter);

  const { data, error } = await q;
  if (error) {
    console.error("fetchEnrichmentOverview failed:", error.message);
    return { counts, leads: [] };
  }

  type Raw = Omit<EnrichmentLead, "list"> & {
    lead_lists: { query_industry: string; query_geography: string | null } | { query_industry: string; query_geography: string | null }[] | null;
  };
  const leads = ((data ?? []) as unknown as Raw[]).map((r) => {
    const ll = Array.isArray(r.lead_lists) ? r.lead_lists[0] : r.lead_lists;
    return {
      ...r,
      rating: r.rating === null ? null : Number(r.rating),
      list: ll ? { industry: ll.query_industry, geography: ll.query_geography } : null,
    };
  });

  return { counts, leads };
}
