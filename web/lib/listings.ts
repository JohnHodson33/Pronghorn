// Live listings loader — maps Supabase rows onto UiListing.
import { hasDb, serverDb } from "./db";
import type { UiListing } from "./types";

type Row = {
  id: string;
  source_id: string | null;
  name: string | null;
  industry: string | null;
  industry_raw: string | null;
  city: string | null;
  state: string | null;
  asking_price: number | string | null;
  gross_revenue: number | string | null;
  cash_flow: number | string | null;
  cash_flow_type: string | null;
  tier: number | null;
  tier_reasoning: string | null;
  priority_state: boolean | null;
  first_seen_at: string;
  raw: { relevant?: boolean | null } | null;
};

function num(v: number | string | null): number | null {
  if (v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function cfType(t: string | null): UiListing["cashFlowType"] {
  if (t === "SDE" || t === "EBITDA") return t;
  if (t === "CASH_FLOW") return "CF";
  return "unknown";
}

export async function fetchListings(): Promise<UiListing[] | null> {
  if (!hasDb()) return null;
  const { data, error } = await serverDb()
    .from("listings")
    .select(
      "id, source_id, name, industry, industry_raw, city, state, asking_price, gross_revenue, cash_flow, cash_flow_type, tier, tier_reasoning, priority_state, first_seen_at, raw"
    )
    .is("delisted_at", null)
    .is("duplicate_of", null)
    .order("first_seen_at", { ascending: false })
    .limit(2000);
  if (error) {
    console.error("fetchListings failed:", error.message);
    return null;
  }
  return (data as Row[]).map((r) => ({
    id: r.id,
    name: r.name ?? "(unnamed listing)",
    source: r.source_id ?? "unknown",
    industry: r.industry ?? r.industry_raw ?? "—",
    city: r.city,
    state: r.state,
    asking: num(r.asking_price),
    cashFlow: num(r.cash_flow),
    cashFlowType: cfType(r.cash_flow_type),
    revenue: num(r.gross_revenue),
    tier: (r.tier as UiListing["tier"]) ?? null,
    tierReasoning: r.tier_reasoning ?? "",
    priorityState: !!r.priority_state,
    firstSeen: r.first_seen_at.slice(0, 10),
    status: "new", // listing_reviews workflow lands with auth (morning question)
    relevant: r.raw?.relevant !== false,
  }));
}

export async function listingStats(): Promise<{
  total: number;
  newThisWeek: number;
  tier1: number;
} | null> {
  if (!hasDb()) return null;
  const db = serverDb();
  const weekAgo = new Date(Date.now() - 7 * 86400_000).toISOString();
  const [tot, nw, t1] = await Promise.all([
    db.from("listings").select("*", { count: "exact", head: true }).is("delisted_at", null),
    db.from("listings").select("*", { count: "exact", head: true }).gte("first_seen_at", weekAgo),
    db.from("listings").select("*", { count: "exact", head: true }).eq("tier", 1),
  ]);
  return { total: tot.count ?? 0, newThisWeek: nw.count ?? 0, tier1: t1.count ?? 0 };
}
