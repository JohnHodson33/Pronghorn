// Market-multiples analytics: every scraped listing (on-thesis or not, live or
// delisted) is a market observation. Aggregates asking multiples and cash-flow
// margins by industry × EBITDA/SDE size band — the benchmark for judging
// whether a pipeline deal is priced rich or cheap vs. market.
import { hasDb, serverDb } from "./db";

export const SIZE_BANDS = [
  { key: "<300K", min: 0, max: 300_000 },
  { key: "300K–1M", min: 300_000, max: 1_000_000 },
  { key: "1M–3M", min: 1_000_000, max: 3_000_000 },
  { key: "3M+", min: 3_000_000, max: Infinity },
] as const;

type Obs = {
  industry: string;
  cashFlow: number;
  cfType: string; // SDE | EBITDA | CASH_FLOW
  asking: number | null;
  revenue: number | null;
  delisted: boolean;
};

export type IndustryStats = {
  industry: string;
  n: number;
  medMultiple: number | null; // all bases
  nMultiple: number;
  medMultipleSDE: number | null;
  medMultipleEBITDA: number | null;
  medMargin: number | null; // cash flow / revenue
  nMargin: number;
  bands: Record<string, { med: number | null; n: number }>;
};

function median(xs: number[]): number | null {
  if (xs.length === 0) return null;
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

export async function fetchMarketStats(): Promise<{
  stats: IndustryStats[];
  totalObs: number;
  withMultiple: number;
} | null> {
  if (!hasDb()) return null;
  const db = serverDb();

  const rows: {
    industry: string | null;
    cash_flow: number | string | null;
    cash_flow_type: string | null;
    asking_price: number | string | null;
    gross_revenue: number | string | null;
    delisted_at: string | null;
  }[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db
      .from("listings")
      .select("industry, cash_flow, cash_flow_type, asking_price, gross_revenue, delisted_at")
      .is("duplicate_of", null) // one observation per business
      .range(from, from + 999);
    if (error) {
      console.error("fetchMarketStats failed:", error.message);
      return null;
    }
    rows.push(...data);
    if (data.length < 1000) break;
  }

  const obs: Obs[] = rows
    .filter((r) => r.industry && r.cash_flow !== null && Number(r.cash_flow) > 0)
    .map((r) => ({
      industry: r.industry!,
      cashFlow: Number(r.cash_flow),
      cfType: r.cash_flow_type ?? "CASH_FLOW",
      asking: r.asking_price === null ? null : Number(r.asking_price),
      revenue: r.gross_revenue === null ? null : Number(r.gross_revenue),
      delisted: !!r.delisted_at,
    }));

  const byIndustry = new Map<string, Obs[]>();
  for (const o of obs) {
    if (!byIndustry.has(o.industry)) byIndustry.set(o.industry, []);
    byIndustry.get(o.industry)!.push(o);
  }

  const mult = (o: Obs) => (o.asking !== null && o.asking > 0 ? o.asking / o.cashFlow : null);

  const stats: IndustryStats[] = [...byIndustry.entries()]
    .map(([industry, list]) => {
      const multiples = list.map(mult).filter((x): x is number => x !== null && x > 0.2 && x < 20);
      const sde = list.filter((o) => o.cfType === "SDE").map(mult).filter((x): x is number => x !== null && x > 0.2 && x < 20);
      const ebitda = list.filter((o) => o.cfType === "EBITDA").map(mult).filter((x): x is number => x !== null && x > 0.2 && x < 20);
      const margins = list
        .filter((o) => o.revenue !== null && o.revenue > 0)
        .map((o) => o.cashFlow / o.revenue!)
        .filter((m) => m > 0 && m < 1);
      const bands: IndustryStats["bands"] = {};
      for (const b of SIZE_BANDS) {
        const inBand = list.filter((o) => o.cashFlow >= b.min && o.cashFlow < b.max);
        const ms = inBand.map(mult).filter((x): x is number => x !== null && x > 0.2 && x < 20);
        bands[b.key] = { med: median(ms), n: ms.length };
      }
      return {
        industry,
        n: list.length,
        medMultiple: median(multiples),
        nMultiple: multiples.length,
        medMultipleSDE: median(sde),
        medMultipleEBITDA: median(ebitda),
        medMargin: median(margins),
        nMargin: margins.length,
        bands,
      };
    })
    .filter((s) => s.nMultiple >= 3)
    .sort((a, b) => b.nMultiple - a.nMultiple);

  return {
    stats,
    totalObs: obs.length,
    withMultiple: obs.filter((o) => mult(o) !== null).length,
  };
}
