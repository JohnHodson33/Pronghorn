"use client";

// Scrape Sources control panel — the roster with live on/off toggles PLUS the
// per-source health readout absorbed from the displaced dashboard-v2 table
// (recovered ⬜ item): unique listings, +7d, dupes filtered, last run/status.
// "adapter" = scraper code exists; sources without one are toggleable but
// won't produce listings until their adapter is built (build order in
// docs/SOURCES.md). [self-iterate] search + status filter + CSV export per
// the standing "every list searchable/filterable/exportable" rule.

import { useMemo, useEffect, useState } from "react";
import { buildCsv, csvDate, downloadCsv } from "@/lib/csv";

type Source = {
  id: string;
  name: string;
  url: string | null;
  adapter: string | null;
  enabled: boolean;
  tier: string | null;
  last_run_at: string | null;
  last_run_status: string | null;
  notes: string | null;
  // health readout (served by /api/sources)
  total?: number;
  newThisWeek?: number;
  dupes?: number;
};

const tierLabel: Record<string, string> = {
  aggregator: "Aggregators",
  network: "National networks",
  association: "State association MLS",
  specialist: "Sector specialists",
  franchise: "Franchise resale",
};

const inputCls = "rounded-md border border-zinc-300 px-3 py-1.5 text-sm outline-none focus:border-emerald-600";

export default function SourcesPage() {
  const [sources, setSources] = useState<Source[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [q, setQ] = useState("");
  // producing = has listings · quiet = enabled but 0 listings · off = disabled
  const [show, setShow] = useState<"all" | "producing" | "quiet" | "off">("all");

  useEffect(() => {
    fetch("/api/sources")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("Database not connected"))))
      .then(setSources)
      .catch((e: Error) => setErr(e.message));
  }, []);

  async function toggle(s: Source) {
    setSources((prev) => prev!.map((x) => (x.id === s.id ? { ...x, enabled: !s.enabled } : x)));
    const res = await fetch("/api/sources", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: s.id, enabled: !s.enabled }),
    });
    if (!res.ok) setSources((prev) => prev!.map((x) => (x.id === s.id ? { ...x, enabled: s.enabled } : x)));
  }

  const visible = useMemo(() => {
    if (!sources) return [];
    return sources.filter((s) => {
      if (q && !`${s.name} ${s.notes ?? ""} ${s.adapter ?? ""}`.toLowerCase().includes(q.toLowerCase())) return false;
      if (show === "producing" && !(s.total ?? 0)) return false;
      if (show === "quiet" && !(s.enabled && !(s.total ?? 0))) return false;
      if (show === "off" && s.enabled) return false;
      return true;
    });
  }, [sources, q, show]);

  if (err) return <div className="p-8 text-sm text-red-600">Sources unavailable: {err}</div>;
  if (!sources) return <div className="p-8 text-sm text-zinc-400">Loading sources…</div>;

  const groups = [...new Set(visible.map((s) => s.tier ?? "other"))];
  const withAdapter = sources.filter((s) => s.adapter).length;
  const enabled = sources.filter((s) => s.enabled).length;
  const totalListings = sources.reduce((a, s) => a + (s.total ?? 0), 0);
  const newWeek = sources.reduce((a, s) => a + (s.newThisWeek ?? 0), 0);

  function exportCsv() {
    downloadCsv(
      `pronghorn-sources-${csvDate()}.csv`,
      buildCsv(
        ["name", "tier", "enabled", "adapter", "listings", "new_7d", "dupes_filtered", "last_run", "last_status", "notes"],
        visible.map((s) => [
          s.name, s.tier, s.enabled ? "yes" : "no", s.adapter,
          s.total ?? 0, s.newThisWeek ?? 0, s.dupes ?? 0,
          s.last_run_at, s.last_run_status, s.notes,
        ])
      )
    );
  }

  return (
    <div className="max-w-5xl p-4 md:p-8 space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Scrape Sources</h1>
        <p className="text-sm text-zinc-500">
          {sources.length} sources on the roster · {withAdapter} with working scrapers · {enabled} enabled ·{" "}
          {totalListings.toLocaleString()} unique listings (+{newWeek.toLocaleString()} this week).
          Toggles take effect on the next run.
        </p>
      </header>

      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-zinc-200 bg-white p-4">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search sources…" className={`w-56 ${inputCls}`} />
        <select value={show} onChange={(e) => setShow(e.target.value as typeof show)} className={inputCls}>
          <option value="all">All sources</option>
          <option value="producing">Producing (has listings)</option>
          <option value="quiet">Enabled but quiet</option>
          <option value="off">Disabled</option>
        </select>
        <span className="ml-auto flex items-center gap-3">
          <span className="text-sm text-zinc-500 tabular-nums">{visible.length} of {sources.length}</span>
          <button
            onClick={exportCsv}
            disabled={visible.length === 0}
            className="rounded-lg bg-emerald-700 px-4 py-1.5 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"
          >
            Export CSV ({visible.length})
          </button>
        </span>
      </div>

      {groups.map((tier) => (
        <section key={tier} className="rounded-xl border border-zinc-200 bg-white">
          <div className="border-b border-zinc-200 px-5 py-3 text-sm font-semibold">
            {tierLabel[tier] ?? tier}
          </div>
          <ul className="divide-y divide-zinc-100">
            {visible
              .filter((s) => (s.tier ?? "other") === tier)
              .map((s) => (
                <li key={s.id} className="flex items-center gap-4 px-5 py-3">
                  <button
                    onClick={() => toggle(s)}
                    className={`relative h-5 w-9 shrink-0 rounded-full transition ${
                      s.enabled ? "bg-emerald-600" : "bg-zinc-300"
                    }`}
                    title={s.enabled ? "Enabled — click to disable" : "Disabled — click to enable"}
                  >
                    <span
                      className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${
                        s.enabled ? "left-[18px]" : "left-0.5"
                      }`}
                    />
                  </button>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{s.name}</span>
                      {s.adapter ? (
                        <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-800">
                          scraper built
                        </span>
                      ) : (
                        <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium text-zinc-500">
                          adapter pending
                        </span>
                      )}
                    </div>
                    {s.notes && <div className="truncate text-xs text-zinc-500">{s.notes}</div>}
                  </div>
                  {/* health readout (dashboard-v2 table, absorbed) */}
                  <div className="hidden shrink-0 text-right text-xs tabular-nums text-zinc-600 sm:block">
                    {(s.total ?? 0) > 0 ? (
                      <>
                        <div className="font-semibold">{(s.total ?? 0).toLocaleString()} listings</div>
                        <div className={s.newThisWeek ? "text-emerald-700" : "text-zinc-400"}>
                          +{s.newThisWeek ?? 0} this 7d{(s.dupes ?? 0) > 0 && <span className="text-zinc-400"> · {s.dupes} dupes filtered</span>}
                        </div>
                      </>
                    ) : (
                      <span className="text-zinc-300">no listings yet</span>
                    )}
                  </div>
                  <div className="w-32 shrink-0 text-right text-xs text-zinc-500">
                    {s.last_run_at ? (
                      <>
                        <div>last run {s.last_run_at.slice(0, 16).replace("T", " ")}</div>
                        <div className={/^ok/.test(s.last_run_status ?? "") ? "text-emerald-700" : "text-red-600"}>
                          {s.last_run_status}
                        </div>
                      </>
                    ) : (
                      "never run"
                    )}
                  </div>
                </li>
              ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
