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
  url: string | null;
  listing_reviews: { status: string } | { status: string }[] | null;
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
  // PostgREST caps a single response at 1,000 rows — page with .range()
  // Only fetch the thesis-fit review set (screened → tier assigned). The full
  // ~7k+ raw universe stays in the DB and feeds the Market Multiples page; it's
  // never all shipped to the browser (that made this page take 20s+). Screened
  // listings are a few hundred rows → fast.
  const PAGE = 1000;
  const MAX = 5_000;
  const all: Row[] = [];
  for (let from = 0; from < MAX; from += PAGE) {
    const { data, error } = await serverDb()
      .from("listings")
      .select(
        "id, source_id, name, industry, industry_raw, city, state, asking_price, gross_revenue, cash_flow, cash_flow_type, tier, tier_reasoning, priority_state, first_seen_at, raw, url, listing_reviews(status)"
      )
      .is("delisted_at", null)
      .is("duplicate_of", null)
      .not("tier", "is", null) // thesis-fit only (screened)
      .order("tier", { ascending: true })
      .order("first_seen_at", { ascending: false })
      .range(from, from + PAGE - 1);
    if (error) {
      console.error("fetchListings failed:", error.message);
      return null;
    }
    all.push(...(data as Row[]));
    if (!data || data.length < PAGE) break;
  }
  return all.map((r) => ({
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
    status: (() => {
      const rev = Array.isArray(r.listing_reviews) ? r.listing_reviews[0] : r.listing_reviews;
      return (rev?.status ?? "new") as UiListing["status"];
    })(),
    relevant: r.raw?.relevant !== false,
    url: r.url,
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
