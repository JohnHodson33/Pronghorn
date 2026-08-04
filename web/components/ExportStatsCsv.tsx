"use client";

// Market Multiples CSV export — the stats table is the deliverable John
// compares deals against, so it must leave the site (every-list rule:
// searchable/filterable/exportable). Client-side from the server-rendered
// rows; no extra fetch.
import { buildCsv, csvDate, downloadCsv } from "@/lib/csv";
import type { IndustryStats } from "@/lib/analytics";
import { SIZE_BANDS } from "@/lib/analytics";

export default function ExportStatsCsv({ rows }: { rows: IndustryStats[] }) {
  function exportCsv() {
    downloadCsv(
      `pronghorn-market-multiples-${csvDate()}.csv`,
      buildCsv(
        [
          "industry", "thesis", "observations", "median_multiple", "n_multiple",
          ...SIZE_BANDS.flatMap((b) => [`${b.key}_median`, `${b.key}_n`]),
          "sde_median", "ebitda_median", "cf_margin_median", "n_margin",
        ],
        rows.map((s) => [
          s.industry, s.isThesis ? "yes" : "no", s.n,
          s.medMultiple === null ? null : Number(s.medMultiple.toFixed(2)), s.nMultiple,
          ...SIZE_BANDS.flatMap((b) => {
            const cell = s.bands[b.key];
            return [cell?.med == null ? null : Number(cell.med.toFixed(2)), cell?.n ?? 0];
          }),
          s.medMultipleSDE === null ? null : Number(s.medMultipleSDE.toFixed(2)),
          s.medMultipleEBITDA === null ? null : Number(s.medMultipleEBITDA.toFixed(2)),
          s.medMargin === null ? null : Number(s.medMargin.toFixed(3)),
          s.nMargin,
        ])
      )
    );
  }
  return (
    <button
      onClick={exportCsv}
      disabled={rows.length === 0}
      className="rounded-lg bg-emerald-700 px-4 py-1.5 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"
    >
      Export CSV ({rows.length})
    </button>
  );
}
