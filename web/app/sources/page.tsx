"use client";

// Scrape Sources control panel — the 37-site roster with live on/off toggles.
// "adapter" = scraper code exists; sources without one are toggleable but
// won't produce listings until their adapter is built (build order in
// docs/SOURCES.md).

import { useEffect, useState } from "react";

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
};

const tierLabel: Record<string, string> = {
  aggregator: "Aggregators",
  network: "National networks",
  association: "State association MLS",
  specialist: "Sector specialists",
  franchise: "Franchise resale",
};

export default function SourcesPage() {
  const [sources, setSources] = useState<Source[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

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

  if (err) return <div className="p-8 text-sm text-red-600">Sources unavailable: {err}</div>;
  if (!sources) return <div className="p-8 text-sm text-zinc-400">Loading sources…</div>;

  const groups = [...new Set(sources.map((s) => s.tier ?? "other"))];
  const withAdapter = sources.filter((s) => s.adapter).length;
  const enabled = sources.filter((s) => s.enabled).length;

  return (
    <div className="max-w-5xl p-4 md:p-8 space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Scrape Sources</h1>
        <p className="text-sm text-zinc-500">
          {sources.length} sources on the roster · {withAdapter} with working scrapers · {enabled} enabled.
          Toggles take effect on the next run. Build order lives in docs/SOURCES.md.
        </p>
      </header>

      {groups.map((tier) => (
        <section key={tier} className="rounded-xl border border-zinc-200 bg-white">
          <div className="border-b border-zinc-200 px-5 py-3 text-sm font-semibold">
            {tierLabel[tier] ?? tier}
          </div>
          <ul className="divide-y divide-zinc-100">
            {sources
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
                  <div className="shrink-0 text-right text-xs text-zinc-500">
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
