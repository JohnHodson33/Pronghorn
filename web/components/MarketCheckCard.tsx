// Presentational market-check card — "asking 4.0× vs market median 3.2× →
// rich" — shared by the deal detail and company profile.
import Link from "next/link";
import type { MarketCheck } from "@/lib/market-check";

export default function MarketCheckCard({ check }: { check: MarketCheck | null }) {
  if (!check) return null;
  const rich =
    check.companyMultiple != null && check.industryMedian != null
      ? check.companyMultiple > check.industryMedian
      : null;

  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-sm">
          <span className="font-semibold">Market check — {check.industry}: </span>
          {check.companyMultiple !== null ? (
            <>
              asking{" "}
              <span className={`font-bold ${rich ? "text-red-700" : "text-emerald-700"}`}>
                {check.companyMultiple.toFixed(1)}×
              </span>{" "}
              vs market median{" "}
              <span className="font-bold">
                {check.industryMedian === null ? "—" : `${check.industryMedian.toFixed(1)}×`}
              </span>
              {rich !== null && (
                <span
                  className={`ml-2 rounded-full px-2 py-0.5 text-xs font-semibold ${
                    rich ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-800"
                  }`}
                >
                  {rich ? "priced above market" : "at/below market"}
                </span>
              )}
            </>
          ) : (
            <>
              market median{" "}
              <span className="font-bold">
                {check.industryMedian === null ? "—" : `${check.industryMedian.toFixed(1)}×`}
              </span>{" "}
              (no asking price on the deal yet)
            </>
          )}
        </div>
        <div className="text-xs text-zinc-500 tabular-nums">
          n={check.industryN}
          {check.bandKey && check.bandMedian !== null && (
            <>
              {" "}· {check.bandKey} band: {check.bandMedian.toFixed(1)}× (n={check.bandN})
            </>
          )}
          {" · "}
          <Link href="/analytics" className="text-emerald-700 hover:underline">
            Market Multiples →
          </Link>
        </div>
      </div>
    </section>
  );
}
