// Dashboard v2 loaders — everything on the home screen comes from live data:
// Tier-1 feed, per-source scrape health, market-multiples snapshot, deadlines.
import { hasDb, serverDb } from "./db";
import { fetchMarketStats, type IndustryStats } from "./analytics";
import { fetchDeals, type LiveDeal } from "./crm";

export type Tier1Listing = {
  id: string;
  name: string;
  city: string | null;
  state: string | null;
  cashFlow: number | null;
  cashFlowType: string | null;
  asking: number | null;
  url: string | null;
  sourceId: string | null;
  firstSeen: string;
  priorityState: boolean;
};

export type SourceHealth = {
  id: string;
  name: string;
  lastRunAt: string | null;
  lastRunStatus: string | null;
  total: number;
  newThisWeek: number;
};

export type DashboardData = {
  tier1: Tier1Listing[];
  tier1Count: number;
  sources: SourceHealth[];
  multiples: IndustryStats[];
  deals: LiveDeal[];
  totalListings: number;
  newThisWeek: number;
};

const num = (v: number | string | null) => (v === null || v === undefined ? null : Number(v));

export async function fetchDashboard(): Promise<DashboardData | null> {
  if (!hasDb()) return null;
  const db = serverDb();
  const weekAgo = new Date(Date.now() - 7 * 86400_000).toISOString();

  const [tier1Res, tier1CountRes, sourcesRes, market, deals, totRes, nwRes] = await Promise.all([
    db
      .from("listings")
      .select("id, name, city, state, cash_flow, cash_flow_type, asking_price, url, source_id, first_seen_at, priority_state")
      .eq("tier", 1)
      .is("delisted_at", null)
      .is("duplicate_of", null)
      .order("first_seen_at", { ascending: false })
      .limit(8),
    db
      .from("listings")
      .select("id", { count: "exact", head: true })
      .eq("tier", 1)
      .is("delisted_at", null)
      .is("duplicate_of", null),
    db.from("scrape_sources").select("id, name, enabled, last_run_at, last_run_status").eq("enabled", true),
    fetchMarketStats(),
    fetchDeals(),
    db.from("listings").select("id", { count: "exact", head: true }).is("delisted_at", null).is("duplicate_of", null),
    db.from("listings").select("id", { count: "exact", head: true }).is("duplicate_of", null).gte("first_seen_at", weekAgo),
  ]);

  const tier1: Tier1Listing[] = ((tier1Res.data ?? []) as {
    id: string; name: string | null; city: string | null; state: string | null;
    cash_flow: number | string | null; cash_flow_type: string | null;
    asking_price: number | string | null; url: string | null; source_id: string | null;
    first_seen_at: string; priority_state: boolean | null;
  }[]).map((r) => ({
    id: r.id,
    name: r.name ?? "(unnamed)",
    city: r.city,
    state: r.state,
    cashFlow: num(r.cash_flow),
    cashFlowType: r.cash_flow_type,
    asking: num(r.asking_price),
    url: r.url,
    sourceId: r.source_id,
    firstSeen: r.first_seen_at.slice(0, 10),
    priorityState: !!r.priority_state,
  }));

  // Per-source listing counts (head-count queries; source roster is small).
  const sourceRows = (sourcesRes.data ?? []) as {
    id: string; name: string; last_run_at: string | null; last_run_status: string | null;
  }[];
  const sources: SourceHealth[] = await Promise.all(
    sourceRows.map(async (s) => {
      const [tot, nw] = await Promise.all([
        db.from("listings").select("id", { count: "exact", head: true }).eq("source_id", s.id).is("duplicate_of", null),
        db.from("listings").select("id", { count: "exact", head: true }).eq("source_id", s.id).is("duplicate_of", null).gte("first_seen_at", weekAgo),
      ]);
      return {
        id: s.id,
        name: s.name,
        lastRunAt: s.last_run_at,
        lastRunStatus: s.last_run_status,
        total: tot.count ?? 0,
        newThisWeek: nw.count ?? 0,
      };
    })
  );
  sources.sort((a, b) => b.total - a.total);

  return {
    tier1,
    tier1Count: tier1CountRes.count ?? 0,
    // only sources that have actually produced listings or run
    sources: sources.filter((s) => s.total > 0 || s.lastRunAt),
    multiples: (market?.stats ?? []).filter((s) => s.isThesis).slice(0, 6),
    deals: deals ?? [],
    totalListings: totRes.count ?? 0,
    newThisWeek: nwRes.count ?? 0,
  };
}
