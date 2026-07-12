"use client";

// List Building — the off-market / proprietary sourcing engine (Phase 5, John's
// primary deal channel). Input industry + geography + count, toggle sources,
// build a lead list. Scraping runs once data-source keys are connected; this
// UI + persistence is live now so John can react to the design and queue lists.

import { useCallback, useEffect, useState } from "react";
import { LEADGEN_SOURCES } from "@/lib/leadgen-sources";
import TypeaheadInput from "@/components/TypeaheadInput";
import { suggestGeo, suggestIndustryFallback } from "@/lib/geo-suggest";

type LeadList = {
  id: string;
  query_industry: string;
  query_geography: string | null;
  target_count: number;
  status: string;
  leads_found: number;
  created_at: string;
};

const costBadge: Record<string, string> = {
  free: "bg-emerald-100 text-emerald-800",
  paid: "bg-amber-100 text-amber-800",
  rescue: "bg-blue-100 text-blue-700",
};

export default function ListBuilding() {
  const [industry, setIndustry] = useState("");
  const [geography, setGeography] = useState("");
  const [national, setNational] = useState(false);
  const [targetCount, setTargetCount] = useState(50);
  const [radius, setRadius] = useState(70);
  const [enabled, setEnabled] = useState<Set<string>>(new Set(LEADGEN_SOURCES.filter((s) => s.defaultOn).map((s) => s.id)));
  const [recent, setRecent] = useState<LeadList[]>([]);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/lead-lists").then((r) => (r.ok ? r.json() : [])).then(setRecent).catch(() => {});
  }, []);

  // Industry typeahead: canonical taxonomy from Lane C's /api/taxonomy when it
  // exists; static trade list until then. Geography is fully static.
  const suggestIndustry = useCallback(async (q: string) => {
    if (q.trim().length < 2) return [];
    try {
      const res = await fetch(`/api/taxonomy?q=${encodeURIComponent(q.trim())}`);
      if (res.ok) {
        const j = await res.json();
        const items: string[] = j.suggestions ?? j.industries ?? [];
        if (items.length > 0) return items.slice(0, 8);
      }
    } catch {}
    return suggestIndustryFallback(q);
  }, []);

  const toggle = (id: string) =>
    setEnabled((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });

  // Rough estimate mirroring Jake's ~$0.03–0.05 / 10 paid-source leads.
  const paidOn = LEADGEN_SOURCES.filter((s) => s.cost !== "free" && enabled.has(s.id)).length;
  const costEst = paidOn === 0 ? 0 : (targetCount / 10) * 0.04;

  async function build() {
    if (!industry.trim()) { setMsg("Enter an industry/service first."); return; }
    const res = await fetch("/api/lead-lists", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        industry, geography, national, targetCount, radius,
        sources: [...enabled], costEstimate: costEst,
      }),
    });
    if (res.ok) {
      setMsg("Queued. Scraping runs once data-source keys are connected (see note below).");
      fetch("/api/lead-lists").then((r) => r.json()).then(setRecent);
    } else setMsg(`Failed: ${(await res.json()).error}`);
  }

  const inputCls = "w-full rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-emerald-600";
  const anyKeyNeeded = LEADGEN_SOURCES.some((s) => s.needsKey && enabled.has(s.id));

  return (
    <div className="max-w-5xl p-4 md:p-8 space-y-6">
      <header className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">List Building</h1>
          <p className="text-sm text-zinc-500">
            Proprietary off-market sourcing — build a lead list of companies that aren&apos;t for sale, then
            enrich and reach owners directly. This is where the differentiated deals come from.
          </p>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white px-4 py-2 text-right">
          <div className="text-[11px] uppercase tracking-wide text-zinc-400">Est. this build</div>
          <div className="text-lg font-bold tabular-nums">${costEst.toFixed(2)}</div>
        </div>
      </header>

      <section className="rounded-xl border border-zinc-200 bg-white p-5 space-y-4">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="md:col-span-1">
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-zinc-500">Industry / service</label>
            <TypeaheadInput
              value={industry}
              onChange={setIndustry}
              suggest={suggestIndustry}
              placeholder="Start typing — e.g. pool serv…"
              className={inputCls}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-zinc-500">Target leads</label>
            <input type="number" min={10} max={500} value={targetCount} onChange={(e) => setTargetCount(Number(e.target.value))} className={inputCls} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-zinc-500">Geography</label>
            <TypeaheadInput
              value={geography}
              onChange={setGeography}
              suggest={suggestGeo}
              disabled={national}
              placeholder="City/metro or state — e.g. Phoe…"
              className={`${inputCls} disabled:bg-zinc-100`}
            />
            <label className="mt-1.5 flex items-center gap-2 text-xs text-zinc-600">
              <input type="checkbox" checked={national} onChange={(e) => setNational(e.target.checked)} className="accent-emerald-700" />
              National search {!national && <span className="ml-auto text-zinc-400">· {radius}mi radius</span>}
            </label>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <p className="text-xs text-zinc-500">{enabled.size} of {LEADGEN_SOURCES.length} sources enabled</p>
          <button onClick={build} className="rounded-lg bg-emerald-700 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-800">
            Build list of {targetCount}
          </button>
        </div>
        {msg && <div className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{msg}</div>}
      </section>

      <section className="rounded-xl border border-zinc-200 bg-white p-5">
        <h2 className="mb-3 font-semibold">Sources</h2>
        <div className="grid gap-2 md:grid-cols-2">
          {LEADGEN_SOURCES.map((s) => (
            <label key={s.id} className="flex cursor-pointer items-start gap-3 rounded-lg border border-zinc-200 p-3 hover:bg-zinc-50">
              <input type="checkbox" checked={enabled.has(s.id)} onChange={() => toggle(s.id)} className="mt-0.5 accent-emerald-700" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{s.name}</span>
                  <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${costBadge[s.cost]}`}>{s.cost}</span>
                  {s.needsKey && <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] text-zinc-500">needs key</span>}
                </div>
                <div className="text-xs text-zinc-500">{s.desc}</div>
              </div>
            </label>
          ))}
        </div>
        {anyKeyNeeded && (
          <p className="mt-4 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800">
            Paid/rescue sources need API keys (Serper, Google Places, Parallel, Exa) before they run.
            Free sources (OpenStreetMap, BBB, license boards, associations, SoS) run without keys — the
            free-source scraper is the next build. Queued lists wait until a source worker is connected.
          </p>
        )}
      </section>

      <section className="rounded-xl border border-zinc-200 bg-white">
        <div className="border-b border-zinc-200 px-5 py-3 text-sm font-semibold">Recent lists</div>
        {recent.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-zinc-400">No lists yet — build your first above.</div>
        ) : (
          <ul className="divide-y divide-zinc-100">
            {recent.map((l) => (
              <li key={l.id}>
                <a href={`/list-building/${l.id}`} className="flex items-center justify-between px-5 py-3 hover:bg-zinc-50">
                  <div>
                    <div className="text-sm font-medium text-emerald-800">{l.query_industry}{l.query_geography ? ` — ${l.query_geography}` : " — National"}</div>
                    <div className="text-xs text-zinc-500">target {l.target_count} · {l.created_at.slice(0, 16).replace("T", " ")}</div>
                  </div>
                  <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-600">
                    {l.status === "pending" ? "queued" : l.status} · {l.leads_found} found →
                  </span>
                </a>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
