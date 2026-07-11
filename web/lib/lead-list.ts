// Loader for one built lead list: the run's parameters + all of its leads
// in the EnrichmentLead shape (so LeadsTable renders them directly).
import { hasDb, serverDb } from "./db";
import type { EnrichmentLead } from "./enrichment";

export type LeadListDetail = {
  id: string;
  industry: string;
  geography: string | null;
  radiusMiles: number | null;
  targetCount: number;
  sourcesEnabled: string[];
  status: string;
  leadsFound: number;
  costEstimate: number | null;
  costActual: number | null;
  createdAt: string;
  leads: EnrichmentLead[];
};

export async function fetchLeadList(id: string): Promise<LeadListDetail | null> {
  if (!hasDb()) return null;
  const db = serverDb();

  const [{ data: list, error }, { data: leads }] = await Promise.all([
    db.from("lead_lists").select("*").eq("id", id).maybeSingle(),
    db
      .from("leads")
      .select(
        "id, name, website, phone, city, state, rating, review_count, source_tags, bbb_grade, enrichment, " +
          "owner_name, owner_email, owner_phone, owner_linkedin, status, created_at"
      )
      .eq("lead_list_id", id)
      .order("created_at", { ascending: false })
      .limit(500),
  ]);
  if (error) {
    console.error("fetchLeadList failed:", error.message);
    return null;
  }
  if (!list) return null;

  const l = list as {
    id: string; query_industry: string; query_geography: string | null;
    radius_miles: number | null; target_count: number; sources_enabled: string[];
    status: string; leads_found: number; cost_estimate: number | string | null;
    cost_actual: number | string | null; created_at: string;
  };

  return {
    id: l.id,
    industry: l.query_industry,
    geography: l.query_geography,
    radiusMiles: l.radius_miles,
    targetCount: l.target_count,
    sourcesEnabled: l.sources_enabled ?? [],
    status: l.status,
    leadsFound: l.leads_found,
    costEstimate: l.cost_estimate === null ? null : Number(l.cost_estimate),
    costActual: l.cost_actual === null ? null : Number(l.cost_actual),
    createdAt: l.created_at,
    leads: ((leads ?? []) as unknown as (Omit<EnrichmentLead, "list" | "rating"> & { rating: number | string | null })[]).map(
      (r) => ({
        ...r,
        rating: r.rating === null ? null : Number(r.rating),
        list: { industry: l.query_industry, geography: l.query_geography },
      })
    ),
  };
}
