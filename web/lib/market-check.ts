// Shared market-multiple comparison: a deal's implied multiple vs its
// industry's median and matching EBITDA size band (from lib/analytics).
import { fetchMarketStats, SIZE_BANDS } from "./analytics";

export type MarketCheck = {
  industry: string;
  companyMultiple: number | null; // asking / cash flow
  industryMedian: number | null;
  industryN: number;
  bandKey: string | null;
  bandMedian: number | null;
  bandN: number;
};

export async function computeMarketCheck(
  industry: string | null,
  ebitda: number | null,
  asking: number | null
): Promise<MarketCheck | null> {
  if (!industry) return null;
  const market = await fetchMarketStats();
  const stat = market?.stats.find((s) => s.industry === industry);
  if (!stat) return null;
  const band = ebitda !== null ? SIZE_BANDS.find((b) => ebitda >= b.min && ebitda < b.max) : undefined;
  return {
    industry,
    companyMultiple: asking != null && ebitda !== null && ebitda > 0 ? asking / ebitda : null,
    industryMedian: stat.medMultiple,
    industryN: stat.nMultiple,
    bandKey: band?.key ?? null,
    bandMedian: band ? stat.bands[band.key]?.med ?? null : null,
    bandN: band ? stat.bands[band.key]?.n ?? 0 : 0,
  };
}
