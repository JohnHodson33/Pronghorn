// Market Multiples — every scraped listing (any industry, live or delisted) is
// a pricing observation. Benchmarks pipeline deals against the market.
import { fetchMarketStats, SIZE_BANDS } from "@/lib/analytics";

export const dynamic = "force-dynamic";

const C_BAR = "#047857"; // validated chart hue (emerald)

const x = (m: number | null) => (m === null ? "—" : `${m.toFixed(1)}×`);
const pct = (m: number | null) => (m === null ? "—" : `${Math.round(m * 100)}%`);

export default async function Analytics() {
  const data = await fetchMarketStats();
  if (!data)
    return <div className="p-8 text-sm text-zinc-400">Database not connected.</div>;

  const { stats, totalObs, withMultiple } = data;
  const chartRows = stats.filter((s) => s.nMultiple >= 5).slice(0, 14);
  const maxMed = Math.max(...chartRows.map((s) => s.medMultiple ?? 0), 1);

  return (
    <div className="max-w-5xl p-8 space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Market Multiples</h1>
        <p className="text-sm text-zinc-500">
          {totalObs.toLocaleString()} pricing observations ({withMultiple.toLocaleString()} with
          asking multiples) from all scraped listings — on-thesis or not, live or delisted.
          Multiples are asking ÷ listed cash flow, as-reported basis (SDE vs EBITDA split below);
          medians shown, outliers (&lt;0.2× or &gt;20×) excluded. Grows with every scrape.
        </p>
      </header>

      <section className="rounded-xl border border-zinc-200 bg-white p-5">
        <h2 className="font-semibold">Median asking multiple by industry</h2>
        <p className="mb-4 text-xs text-zinc-500">Industries with ≥5 multiple observations. Hover for detail.</p>
        <div className="space-y-2">
          {chartRows.map((s) => (
            <div key={s.industry} className="group flex items-center gap-3">
              <div className="w-44 shrink-0 truncate text-right text-xs text-zinc-600">{s.industry}</div>
              <div className="relative h-5 flex-1 rounded-sm bg-zinc-50">
                <div
                  className="h-5 rounded-r"
                  style={{ background: C_BAR, width: `${((s.medMultiple ?? 0) / maxMed) * 100}%` }}
                  title={`${s.industry}: median ${x(s.medMultiple)} across ${s.nMultiple} listings (SDE ${x(s.medMultipleSDE)}, EBITDA ${x(s.medMultipleEBITDA)})`}
                />
              </div>
              <div className="w-20 shrink-0 text-xs tabular-nums">
                <span className="font-semibold">{x(s.medMultiple)}</span>
                <span className="ml-1 text-zinc-400">n={s.nMultiple}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="overflow-x-auto rounded-xl border border-zinc-200 bg-white">
        <div className="border-b border-zinc-200 px-5 py-4">
          <h2 className="font-semibold">Multiples by industry × cash-flow size band</h2>
          <p className="text-xs text-zinc-500">
            Median asking multiple (observation count). The size-band view is the deal-evaluation
            benchmark: compare a pipeline deal to its industry AND size peers.
          </p>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-200 text-left text-xs uppercase tracking-wide text-zinc-500">
              <th className="px-5 py-3">Industry</th>
              <th className="px-3 py-3 text-right">n</th>
              {SIZE_BANDS.map((b) => (
                <th key={b.key} className="px-3 py-3 text-right">{b.key}</th>
              ))}
              <th className="px-3 py-3 text-right">SDE med</th>
              <th className="px-3 py-3 text-right">EBITDA med</th>
              <th className="px-5 py-3 text-right">CF margin</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {stats.map((s) => (
              <tr key={s.industry} className="hover:bg-zinc-50">
                <td className="px-5 py-2.5 font-medium">{s.industry}</td>
                <td className="px-3 py-2.5 text-right text-xs text-zinc-500 tabular-nums">{s.n}</td>
                {SIZE_BANDS.map((b) => {
                  const cell = s.bands[b.key];
                  return (
                    <td key={b.key} className="whitespace-nowrap px-3 py-2.5 text-right tabular-nums">
                      {cell.med === null ? (
                        <span className="text-zinc-300">—</span>
                      ) : (
                        <>
                          <span className="font-semibold">{x(cell.med)}</span>
                          <span className="ml-1 text-xs text-zinc-400">({cell.n})</span>
                        </>
                      )}
                    </td>
                  );
                })}
                <td className="px-3 py-2.5 text-right tabular-nums text-zinc-600">{x(s.medMultipleSDE)}</td>
                <td className="px-3 py-2.5 text-right tabular-nums text-zinc-600">{x(s.medMultipleEBITDA)}</td>
                <td className="px-5 py-2.5 text-right tabular-nums text-zinc-600">
                  {pct(s.medMargin)}
                  {s.nMargin > 0 && <span className="ml-1 text-xs text-zinc-400">({s.nMargin})</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <p className="text-xs text-zinc-400">
        Time-series (multiples drift, price cuts, days-on-market) accumulates automatically via
        listing_events as scrapes repeat — charts for that land once there&apos;s history to show.
      </p>
    </div>
  );
}
