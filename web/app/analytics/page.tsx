// Market Multiples — every scraped listing (any industry, live or delisted) is a
// pricing observation. Thesis verticals lead; all other industries are a
// secondary reference section (John: prioritize what we actually work in).
import { fetchMarketStats, isThesisIndustry, SIZE_BANDS, THESIS_INDUSTRIES, type IndustryStats } from "@/lib/analytics";

export const dynamic = "force-dynamic";

const C_BAR = "#047857"; // validated chart hue (emerald)

const x = (m: number | null) => (m === null ? "—" : `${m.toFixed(1)}×`);
const pct = (m: number | null) => (m === null ? "—" : `${Math.round(m * 100)}%`);

function BandTable({ rows, muted }: { rows: IndustryStats[]; muted?: boolean }) {
  return (
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
        {rows.map((s) => (
          <tr key={s.industry} className="hover:bg-zinc-50">
            <td className={`px-5 py-2.5 font-medium ${muted ? "text-zinc-500" : ""}`}>{s.industry}</td>
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
        {rows.length === 0 && (
          <tr><td colSpan={SIZE_BANDS.length + 4} className="px-5 py-8 text-center text-xs text-zinc-400">
            No observations yet in these industries.
          </td></tr>
        )}
      </tbody>
    </table>
  );
}

export default async function Analytics() {
  const data = await fetchMarketStats();
  if (!data) return <div className="p-8 text-sm text-zinc-400">Database not connected.</div>;

  const { stats, totalObs, withMultiple } = data;
  const thesis = stats.filter((s) => s.isThesis);
  const other = stats.filter((s) => !s.isThesis);
  const thesisObs = thesis.reduce((n, s) => n + s.nMultiple, 0);

  // Chart: thesis industries only, in priority order (already sorted).
  const chartRows = thesis.filter((s) => s.nMultiple >= 3);
  const maxMed = Math.max(...chartRows.map((s) => s.medMultiple ?? 0), 1);

  // Coverage: which thesis verticals still have no/thin data (worth surfacing).
  const covered = new Set(thesis.map((s) => s.industry));
  const missing = THESIS_INDUSTRIES.filter((i) => !covered.has(i));

  return (
    <div className="max-w-5xl p-4 md:p-8 space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Market Multiples</h1>
        <p className="text-sm text-zinc-500">
          {thesisObs.toLocaleString()} priced observations in <span className="font-medium">thesis verticals</span>{" "}
          (of {withMultiple.toLocaleString()} total across {totalObs.toLocaleString()} listings). Multiples are
          asking ÷ listed cash flow, as-reported basis (SDE vs EBITDA split in the table); medians shown,
          outliers (&lt;0.2× or &gt;20×) excluded. Grows with every scrape.
        </p>
      </header>

      <section className="rounded-xl border border-zinc-200 bg-white p-5">
        <h2 className="font-semibold">Median asking multiple — thesis verticals</h2>
        <p className="mb-4 text-xs text-zinc-500">
          Priority order (landscape, tree, pool, pest, mechanical trades…). Industries with ≥3 observations. Hover for detail.
        </p>
        <div className="space-y-2">
          {chartRows.map((s) => (
            <div key={s.industry} className="group flex items-center gap-3">
              <div className="w-44 shrink-0 truncate text-right text-xs text-zinc-700">{s.industry}</div>
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
          {chartRows.length === 0 && (
            <p className="text-xs text-zinc-400">No thesis-vertical observations yet — more scrapes will fill this in.</p>
          )}
        </div>
        {missing.length > 0 && (
          <p className="mt-4 border-t border-zinc-100 pt-3 text-xs text-zinc-400">
            Thesis verticals with no data yet: {missing.join(", ")}.
          </p>
        )}
      </section>

      <section className="overflow-x-auto rounded-xl border border-zinc-200 bg-white">
        <div className="border-b border-zinc-200 px-5 py-4">
          <h2 className="font-semibold">Thesis verticals — multiples by size band</h2>
          <p className="text-xs text-zinc-500">
            Median asking multiple (observation count). Compare a pipeline deal to its industry AND size peers.
          </p>
        </div>
        <BandTable rows={thesis} />
      </section>

      <details className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
        <summary className="cursor-pointer px-5 py-4 text-sm font-semibold text-zinc-600 hover:bg-zinc-50">
          Other industries — reference only ({other.length}) ▾
        </summary>
        <div className="overflow-x-auto border-t border-zinc-200">
          <BandTable rows={other} muted />
        </div>
      </details>

      <p className="text-xs text-zinc-400">
        Time-series (multiples drift, price cuts, days-on-market) accumulates via listing_events as scrapes
        repeat. Thesis-vertical list evolves — edit THESIS_INDUSTRIES in lib/analytics.ts.
      </p>
    </div>
  );
}
