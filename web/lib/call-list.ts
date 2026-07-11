// Call-list loader for the Cold Calling screen — dialable leads (any phone
// number on record, not dead), enriched context included.
import { hasDb, serverDb } from "./db";

export type CallLead = {
  id: string;
  name: string;
  website: string | null;
  phone: string | null;
  city: string | null;
  state: string | null;
  rating: number | null;
  review_count: number | null;
  bbb_grade: string | null;
  enrichment: Record<string, unknown> | null;
  owner_name: string | null;
  owner_phone: string | null;
  owner_email: string | null;
  status: string;
  list: { industry: string; geography: string | null } | null;
};

export async function fetchCallList(): Promise<CallLead[] | null> {
  if (!hasDb()) return null;
  const { data, error } = await serverDb()
    .from("leads")
    .select(
      "id, name, website, phone, city, state, rating, review_count, bbb_grade, enrichment, " +
        "owner_name, owner_phone, owner_email, status, lead_lists(query_industry, query_geography)"
    )
    .neq("status", "dead")
    .or("owner_phone.not.is.null,phone.not.is.null")
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) {
    console.error("fetchCallList failed:", error.message);
    return [];
  }

  type Raw = Omit<CallLead, "list"> & {
    lead_lists: { query_industry: string; query_geography: string | null } | { query_industry: string; query_geography: string | null }[] | null;
  };
  return ((data ?? []) as unknown as Raw[]).map((r) => {
    const ll = Array.isArray(r.lead_lists) ? r.lead_lists[0] : r.lead_lists;
    return {
      ...r,
      rating: r.rating === null ? null : Number(r.rating),
      list: ll ? { industry: ll.query_industry, geography: ll.query_geography } : null,
    };
  });
}
