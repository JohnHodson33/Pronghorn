"use client";

// River Guides — the third sourcing channel (John 7/16 ~00:50): exited
// operators recruited as equity advisors/board members. Shared list pattern
// over Lane C's /api/river-guides (spec: RIVER-GUIDES-INTEGRATION.md +
// archetype spec §4); degrades honestly until migration 0016 + ingest land.
// "Find more" discovery bar (John 7/16 ~01:15 — a sourcing tool, not a
// repository) fires Lane C's on-demand consolidator sweep. Nothing sends.
import { Fragment, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import FilterDropdown from "@/components/FilterDropdown";
import SortHeader from "@/components/SortHeader";
import ScrollShell from "@/components/ScrollShell";
import { useUrlFilterSync } from "@/lib/use-url-filters";
import { buildCsv, csvDate, downloadCsv } from "@/lib/csv";

type Run = {
  id: string;
  deal_ids: string[] | null;
  state: "queued" | "running" | "done" | "failed";
  counts: { total?: number; processed?: number; found_email?: number; found_linkedin?: number; found_phone?: number; escalated_paid?: number } | null;
  note: string | null;
  stale?: boolean;
  created_at?: string;
  finished_at: string | null;
  cost_actual?: number | null;
  cost_estimate?: number | null;
};

type Estimate = {
  count: number;
  eligible: number;
  skipped_tbd?: number;
  totalEstUsd: number;
  breakdown?: {
    hunter?: { calls: number; quotaUnits: number; marginalUsd: number };
    linkedin_verify?: { searches: number; estUsd: number };
  };
  note?: string;
};

type Guide = {
  deal_id: string;
  full_name: string | null;
  name_status: "RESOLVED" | "TBD";
  archetype: string;
  industry: string;
  their_company: string;
  role: string | null;
  acquirer: string;
  acquirer_pe_sponsor: string | null;
  deal_year: number | null;
  location_city: string | null;
  location_state: string | null;
  company_website: string | null;
  exit_status: "EXITED" | "EMPLOYED" | "UNKNOWN";
  current_status_verified: boolean;
  screen_score: number | null;
  fit_score: number | null;
  priority_band: "CALL_NOW" | "ENRICH_THEN_ASSESS" | "NURTURE" | "RESOLVE_NAME_FIRST";
  enrichment_status: string;
  contact: { email?: string | null; phone?: string | null; linkedin_url?: string | null } | null;
  contact_id: string | null;
  company_id: string | null;
  notes: string | null; // verify-worker evidence lives here (PM 7/16 item j)
};

const BANDS = ["CALL_NOW", "ENRICH_THEN_ASSESS", "NURTURE", "RESOLVE_NAME_FIRST"] as const;
const BAND_LABEL: Record<string, string> = {
  CALL_NOW: "Call now",
  ENRICH_THEN_ASSESS: "Enrich & assess",
  NURTURE: "Nurture",
  RESOLVE_NAME_FIRST: "Resolve name",
};
const bandChip: Record<string, string> = {
  CALL_NOW: "bg-emerald-700 text-white",
  ENRICH_THEN_ASSESS: "bg-sky-100 text-sky-800",
  NURTURE: "bg-zinc-100 text-zinc-600",
  RESOLVE_NAME_FIRST: "bg-amber-100 text-amber-800",
};
// John's terms, not the raw enum (7/16): what happened to this person?
const STATUS_LABEL: Record<string, string> = {
  NEEDS_NAME: "Name first",
  PENDING_T1: "Queued",
  T1_DONE: "Enriched",
  NEEDS_PAID: "Needs paid",
  ENRICHED: "Enriched",
  VERIFIED: "Verified",
};
const STATUS_CHIP: Record<string, string> = {
  NEEDS_NAME: "bg-amber-100 text-amber-800",
  PENDING_T1: "bg-sky-100 text-sky-800",
  T1_DONE: "bg-emerald-100 text-emerald-800",
  NEEDS_PAID: "bg-violet-100 text-violet-800",
  ENRICHED: "bg-emerald-100 text-emerald-800",
  VERIFIED: "bg-emerald-700 text-white",
};
const ARCHETYPE_LABEL: Record<string, string> = {
  A_EXITED_OPERATOR: "★ Exited operator",
  B_EX_CONSOLIDATOR_DEALMAKER: "Ex-consolidator",
  C_OPERATING_BROKER: "Operating broker",
  EXCLUDED: "Excluded",
};

export default function RiverGuides() {
  const [guides, setGuides] = useState<Guide[] | null>(null);
  const [apiDown, setApiDown] = useState(false);
  const [q, setQ] = useState("");
  const [bandsSel, setBandsSel] = useState<Set<string>>(new Set());
  const [industriesSel, setIndustriesSel] = useState<Set<string>>(new Set());
  const [statusSel, setStatusSel] = useState<Set<string>>(new Set());
  const [exitSel, setExitSel] = useState<Set<string>>(new Set());
  const [statesSel, setStatesSel] = useState<Set<string>>(new Set());
  const [reachSel, setReachSel] = useState<Set<string>>(new Set()); // reachability (John 7/16 13:00)
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  // rows whose verify-evidence panel is expanded (item j — the inconclusives
  // are the human-review gold; a native tooltip can't be read or selected)
  const [evidenceOpen, setEvidenceOpen] = useState<Set<string>>(new Set());
  const [notice, setNotice] = useState<string | null>(null);
  const [runs, setRuns] = useState<{ active: Run[]; recent: Run[]; note: string | null }>({ active: [], recent: [], note: null });
  const [est, setEst] = useState<Estimate | null>(null);
  const [estBusy, setEstBusy] = useState(false);
  const [openRun, setOpenRun] = useState<Run | null>(null); // "show me that run's list"
  const [busy, setBusy] = useState(false);
  // Find-more discovery bar
  const [discIndustry, setDiscIndustry] = useState("");
  const [discConsolidator, setDiscConsolidator] = useState("");

  // Run visibility (John 7/16): the page must say what's happening and what
  // happened — without asking an agent. Polls while a run is active.
  async function loadRuns() {
    try {
      const res = await fetch("/api/river-guides/runs", { cache: "no-store" });
      if (!res.ok) return;
      const j = await res.json();
      setRuns({ active: j.active ?? [], recent: j.recent ?? [], note: j.note ?? null });
      if ((j.active ?? []).length) setTimeout(() => { loadRuns(); load(); }, 5000);
    } catch { /* runs API optional — page still works */ }
  }

  async function load() {
    try {
      const res = await fetch("/api/river-guides", { cache: "no-store" });
      if (!res.ok) { setApiDown(true); setGuides([]); return; }
      const j = await res.json();
      setGuides(j.guides ?? j.rows ?? []);
      setApiDown(false);
    } catch {
      setApiDown(true);
      setGuides([]);
    }
  }
  useEffect(() => { load(); loadRuns(); }, []);

  const csvSet = (s: Set<string>) => (s.size ? [...s].join(",") : null);
  const fromCsv = (v: string | null) => new Set((v ?? "").split(",").filter(Boolean));
  useUrlFilterSync(
    () => ({
      q, band: csvSet(bandsSel), industry: csvSet(industriesSel),
      status: csvSet(statusSel), exit: csvSet(exitSel), state: csvSet(statesSel),
      reach: csvSet(reachSel), sort: sortKey, dir: sortKey && sortDir === "asc" ? "asc" : null,
    }),
    (p) => {
      if (p.get("q")) setQ(p.get("q")!);
      if (p.get("band")) setBandsSel(fromCsv(p.get("band")));
      if (p.get("industry")) setIndustriesSel(fromCsv(p.get("industry")));
      if (p.get("status")) setStatusSel(fromCsv(p.get("status")));
      if (p.get("exit")) setExitSel(fromCsv(p.get("exit")));
      if (p.get("state")) setStatesSel(fromCsv(p.get("state")));
      if (p.get("reach")) setReachSel(fromCsv(p.get("reach")));
      if (p.get("sort")) setSortKey(p.get("sort"));
      if (p.get("dir") === "asc") setSortDir("asc");
    },
    [q, bandsSel, industriesSel, statusSel, exitSel, statesSel, reachSel, sortKey, sortDir],
  );

  const all = guides ?? [];
  const bandCounts = useMemo(() => {
    const m: Record<string, number> = {};
    for (const g of all) m[g.priority_band] = (m[g.priority_band] ?? 0) + 1;
    return m;
  }, [all]);
  const opt = (vals: (string | null)[], labeler?: (v: string) => string) => {
    const m: Record<string, number> = {};
    for (const v of vals) if (v) m[v] = (m[v] ?? 0) + 1;
    return Object.entries(m).sort((a, b) => b[1] - a[1]).map(([value, count]) => ({ value, label: labeler ? labeler(value) : value, count }));
  };
  const industryOptions = useMemo(() => opt(all.map((g) => g.industry)), [all]);
  const statusOptions = useMemo(() => opt(all.map((g) => g.enrichment_status)), [all]);
  const exitOptions = useMemo(
    () => opt(all.map((g) => `${g.exit_status}${g.current_status_verified ? " ✓" : " ⚠"}`)),
    [all],
  );
  const stateOptions = useMemo(() => opt(all.map((g) => g.location_state)), [all]);
  // reachability: which usable channels exist (John 7/16 13:00 — filter by it)
  const reachOf = (g: Guide): string[] => {
    const r: string[] = [];
    if (g.contact?.email) r.push("email");
    if (g.contact?.phone) r.push("phone");
    if (g.contact?.linkedin_url) r.push("linkedin");
    return r.length ? r : ["none"];
  };
  const reachOptions = useMemo(() => {
    const m: Record<string, number> = { email: 0, phone: 0, linkedin: 0, none: 0 };
    for (const g of all) for (const r of reachOf(g)) m[r]++;
    return [
      { value: "email", label: "has email", count: m.email },
      { value: "phone", label: "has phone", count: m.phone },
      { value: "linkedin", label: "has LinkedIn", count: m.linkedin },
      { value: "none", label: "no channels yet", count: m.none },
    ];
  }, [all]);

  const rows = useMemo(() => {
    const filtered = all.filter((g) => {
      // run filter: "show me exactly who was in that enrichment run"
      if (openRun?.deal_ids?.length && !openRun.deal_ids.includes(g.deal_id)) return false;
      if (bandsSel.size && !bandsSel.has(g.priority_band)) return false;
      if (industriesSel.size && !industriesSel.has(g.industry)) return false;
      if (statusSel.size && !statusSel.has(g.enrichment_status)) return false;
      if (exitSel.size && !exitSel.has(`${g.exit_status}${g.current_status_verified ? " ✓" : " ⚠"}`)) return false;
      if (statesSel.size && !statesSel.has(g.location_state ?? "")) return false;
      if (reachSel.size && !reachOf(g).some((r) => reachSel.has(r))) return false;
      if (q && !`${g.full_name ?? ""} ${g.their_company} ${g.acquirer} ${g.acquirer_pe_sponsor ?? ""} ${g.industry}`.toLowerCase().includes(q.toLowerCase()))
        return false;
      return true;
    });
    // explicit column sort wins; default = band order then screen_score desc (spec)
    if (sortKey) {
      const val = (g: Guide): string | number => {
        switch (sortKey) {
          case "name": return (g.full_name ?? "zzz").toLowerCase();
          case "company": return g.their_company.toLowerCase();
          case "industry": return g.industry;
          case "exit": return `${g.exit_status}${g.current_status_verified ? "1" : "0"}`;
          case "score": return g.fit_score ?? g.screen_score ?? -1;
          case "state": return g.location_state ?? "zz";
          case "band": return BANDS.indexOf(g.priority_band);
          default: return 0;
        }
      };
      return [...filtered].sort((a, b) => {
        const av = val(a), bv = val(b);
        const cmp = typeof av === "number" && typeof bv === "number" ? av - bv : String(av).localeCompare(String(bv));
        return sortDir === "asc" ? cmp : -cmp;
      });
    }
    return filtered.sort((a, b) => {
      const d = BANDS.indexOf(a.priority_band) - BANDS.indexOf(b.priority_band);
      return d !== 0 ? d : (b.screen_score ?? 0) - (a.screen_score ?? 0);
    });
  }, [all, q, bandsSel, industriesSel, statusSel, exitSel, statesSel, reachSel, sortKey, sortDir, openRun]);

  // COST BEFORE THE CLICK (John 7/16: "the cost should show up beforehand… to
  // the extent anything shows up more expensive, I want us to be thoughtful").
  // Debounced estimate on every selection change; the button carries the number.
  useEffect(() => {
    if (!selected.size) { setEst(null); return; }
    let cancelled = false;
    const t = setTimeout(async () => {
      setEstBusy(true);
      try {
        const res = await fetch("/api/river-guides/enrich", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ estimate: true, dealIds: [...selected] }),
        });
        if (!res.ok) return;
        const j = await res.json();
        if (!cancelled) setEst(j);
      } catch { /* estimate is advisory — never blocks the click */ }
      finally { if (!cancelled) setEstBusy(false); }
    }, 350);
    return () => { cancelled = true; clearTimeout(t); };
  }, [selected]);

  async function enrichSelected() {
    setBusy(true);
    setNotice(null);
    try {
      const res = await fetch("/api/river-guides/enrich", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dealIds: [...selected] }),
      });
      const j = await res.json().catch(() => ({}));
      if (res.ok) { setNotice(j.note ?? `Queued ${selected.size} for tier-1 enrichment.`); setSelected(new Set()); load(); }
      else setNotice(j.error ?? "Enrichment wiring lands with Lane C's waterfall — selection kept.");
    } catch {
      setNotice("Enrichment wiring lands with Lane C's waterfall — selection kept.");
    }
    setBusy(false);
  }

  async function findMore() {
    if (!discIndustry.trim() && !discConsolidator.trim()) return;
    setBusy(true);
    setNotice(null);
    try {
      const res = await fetch("/api/river-guides/discover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ industry: discIndustry.trim() || null, consolidator: discConsolidator.trim() || null }),
      });
      const j = await res.json().catch(() => ({}));
      if (res.ok) { setNotice(j.note ?? "Discovery sweep queued — new candidates appear here as the sweep lands them."); load(); }
      else setNotice(j.error ?? "Discovery lands with Lane C's consolidator-sweep endpoint.");
    } catch {
      setNotice("Discovery lands with Lane C's consolidator-sweep endpoint.");
    }
    setBusy(false);
  }

  function exportCsv() {
    downloadCsv(
      `pronghorn-river-guides-${csvDate()}.csv`,
      buildCsv(
        ["deal_id", "name", "name_status", "band", "archetype", "industry", "their_company", "acquirer",
         "pe_sponsor", "deal_year", "city", "state", "exit_status", "verified", "screen_score",
         "enrichment_status", "email", "phone", "linkedin"],
        rows.map((g) => [
          g.deal_id, g.full_name, g.name_status, g.priority_band, g.archetype, g.industry,
          g.their_company, g.acquirer, g.acquirer_pe_sponsor, g.deal_year, g.location_city,
          g.location_state, g.exit_status, g.current_status_verified ? "yes" : "no", g.screen_score,
          g.enrichment_status, g.contact?.email ?? null, g.contact?.phone ?? null, g.contact?.linkedin_url ?? null,
        ])
      )
    );
  }

  const inputCls = "rounded-md border border-zinc-300 px-3 py-1.5 text-sm outline-none focus:border-emerald-600";
  const sortSet = (k: string) => (dir: "asc" | "desc" | null) => {
    if (!dir) setSortKey(null);
    else { setSortKey(k); setSortDir(dir); }
  };

  return (
    <div className="w-full p-4 md:p-8 space-y-5">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">River Guides</h1>
        <p className="text-sm text-zinc-500">
          Exited operators (sold to a consolidator) recruited as deal advisors and board members for
          equity — they diligence deals, open proprietary deal flow, and lend credibility. Exit status is
          at-close (⚠) until verified (✓); nobody is contacted before <span className="font-medium">Call now + verified</span>.
        </p>
      </header>

      {apiDown && (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          The river-guides backend isn&apos;t up yet (Lane C: migration 0016 + ingest + /api/river-guides).
          This page lights up automatically when it lands — the 433 seeded candidates load here.
        </div>
      )}

      {/* Find more — the page is a sourcing tool, not a repository (John 7/16) */}
      <section className="flex flex-wrap items-center gap-2 rounded-xl border border-zinc-200 bg-white p-4">
        <span className="text-sm font-semibold">Find more:</span>
        <input value={discIndustry} onChange={(e) => setDiscIndustry(e.target.value)} placeholder="industry (e.g. Tree Care)…" className={`w-44 ${inputCls}`} />
        <input value={discConsolidator} onChange={(e) => setDiscConsolidator(e.target.value)} placeholder="consolidator (e.g. Mariani)…" className={`w-48 ${inputCls}`} />
        <button
          onClick={findMore}
          disabled={busy || (!discIndustry.trim() && !discConsolidator.trim())}
          className="rounded-lg bg-emerald-700 px-4 py-1.5 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"
        >
          {busy ? "Working…" : "Sweep for exits"}
        </button>
        <span className="text-xs text-zinc-400">runs the consolidator acquisition-log sweep; new candidates land in the list below</span>
      </section>

      {/* RUN VISIBILITY (John 7/16 ~12:50): "I click the button and have no idea
          if it's working, when it's done, or what happened." Active run =
          sticky live banner; last finished run = durable receipt anyone can
          read cold (Tom included). */}
      {runs.active.map((r) => {
        const c = r.counts ?? {};
        return (
          <div key={r.id} className="sticky top-2 z-10 rounded-md border border-sky-300 bg-sky-50 px-3 py-2 text-sm text-sky-900 shadow-sm">
            <span className="mr-2 inline-block h-2 w-2 animate-pulse rounded-full bg-sky-600 align-middle" />
            <span className="font-semibold">
              {r.state === "queued" ? "Enrichment queued" : `Enriching river guides: ${c.processed ?? 0}/${c.total ?? 0}`}
            </span>
            {r.state === "running" && (
              <span className="ml-2 tabular-nums">
                — {c.found_email ?? 0} emails · {c.found_linkedin ?? 0} LinkedIns
                {c.found_phone ? ` · ${c.found_phone} phones` : ""}
                {c.escalated_paid ? ` · ${c.escalated_paid} → paid queue` : ""}
              </span>
            )}
            {r.note && <span className={`ml-2 text-xs ${r.stale ? "font-semibold text-amber-800" : "text-sky-700"}`}>{r.note}</span>}
          </div>
        );
      })}
      {/* RUN HISTORY (John 7/16: "I want to click on the previously run session
          of enrichment and have it pull up that whole list"). Each past run is
          clickable → the table filters to exactly the people in that run. */}
      {!runs.active.length && runs.recent.length > 0 && (
        <div className="rounded-xl border border-zinc-200 bg-white p-3">
          <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Enrichment runs — click one to see exactly who was in it
          </div>
          <div className="space-y-1">
            {runs.recent.slice(0, 5).map((r) => {
              const isOpen = openRun?.id === r.id;
              const c = r.counts ?? {};
              return (
                <div key={r.id} className="flex flex-wrap items-center gap-2 text-sm">
                  <button
                    onClick={() => setOpenRun(isOpen ? null : r)}
                    className={`rounded border px-2 py-0.5 text-xs font-semibold ${isOpen ? "border-emerald-700 bg-emerald-700 text-white" : "border-zinc-300 text-zinc-600 hover:border-emerald-600 hover:text-emerald-700"}`}
                  >
                    {isOpen ? "showing this run ✓" : `show these ${c.total ?? r.deal_ids?.length ?? 0}`}
                  </button>
                  <span className="text-zinc-400">
                    {r.finished_at ? new Date(r.finished_at).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "—"}
                  </span>
                  <span className={r.state === "failed" ? "text-red-700" : "text-zinc-700"}>{r.note}</span>
                  {(c.escalated_paid ?? 0) > 0 && (
                    <button
                      onClick={() => { setOpenRun(r); setStatusSel(new Set(["NEEDS_PAID"])); }}
                      className="rounded border border-violet-300 px-2 py-0.5 text-xs font-semibold text-violet-800 hover:bg-violet-50"
                    >
                      {c.escalated_paid} → paid queue
                    </button>
                  )}
                </div>
              );
            })}
          </div>
          {openRun && (
            <button onClick={() => setOpenRun(null)} className="mt-2 text-xs font-semibold text-emerald-800 hover:underline">
              ← clear run filter (showing all {all.length})
            </button>
          )}
        </div>
      )}
      {runs.note && !runs.active.length && !runs.recent.length && (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">{runs.note}</div>
      )}

      {notice && <div className="rounded-md border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-800">{notice}</div>}

      {/* band counts header — the working split */}
      <div className="flex flex-wrap items-center gap-1.5">
        {BANDS.map((b) => (
          <button
            key={b}
            onClick={() => setBandsSel((prev) => { const n = new Set(prev); n.has(b) ? n.delete(b) : n.add(b); return n; })}
            className={`rounded-full px-2.5 py-1 text-xs font-semibold transition ${bandsSel.has(b) ? "ring-2 ring-emerald-600 " : ""}${bandChip[b]}`}
          >
            {BAND_LABEL[b]} · {bandCounts[b] ?? 0}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-zinc-200 bg-white p-4">
        {/* LIST-UX STANDARD (John 7/16 13:00): top bar = search + key-split
            chips + actions; the column headers do the filtering/sorting */}
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name / company / acquirer…" className={`w-56 ${inputCls}`} />
        <span className="ml-auto flex items-center gap-2">
          <span className="text-sm text-zinc-500 tabular-nums">{rows.length} of {all.length}</span>
          <button
            onClick={enrichSelected}
            disabled={selected.size === 0 || busy}
            className="rounded-lg bg-emerald-700 px-3 py-1.5 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-40"
            title={
              est
                ? [
                    `${est.eligible} eligible${est.skipped_tbd ? ` · ${est.skipped_tbd} skipped (name TBD)` : ""}`,
                    est.breakdown?.hunter ? `Hunter: ${est.breakdown.hunter.calls} lookups — $0 marginal (flat sub, ${est.breakdown.hunter.quotaUnits} quota units)` : null,
                    est.breakdown?.linkedin_verify ? `LinkedIn verify: ${est.breakdown.linkedin_verify.searches} searches — $${est.breakdown.linkedin_verify.estUsd.toFixed(3)}` : null,
                    "Tier-1 only; the paid tier never fires automatically.",
                  ].filter(Boolean).join("\n")
                : "Tier-1 (free/owned) enrichment only; paid tier stays a manual VA export"
            }
          >
            {selected.size === 0
              ? "Enrich selected"
              : estBusy && !est
                ? `Enrich selected (${selected.size} · pricing…)`
                : est
                  ? `Enrich selected (${selected.size} · est. ${est.totalEstUsd < 0.01 ? "$0.00" : `$${est.totalEstUsd.toFixed(2)}`})`
                  : `Enrich selected (${selected.size})`}
          </button>
          <button onClick={exportCsv} disabled={rows.length === 0} className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-600 hover:bg-zinc-50">
            CSV ({rows.length})
          </button>
        </span>
      </div>

      <ScrollShell className="rounded-xl border border-zinc-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-200 text-left text-xs uppercase tracking-wide text-zinc-500">
              <th className="px-3 py-2">
                <input
                  type="checkbox"
                  checked={rows.length > 0 && rows.every((g) => selected.has(g.deal_id))}
                  onChange={() => setSelected(rows.every((g) => selected.has(g.deal_id)) ? new Set() : new Set(rows.map((g) => g.deal_id)))}
                  className="accent-emerald-700"
                />
              </th>
              <th className="px-3 py-2">
                <span className="inline-flex items-center gap-1">
                  <SortHeader label="Band" active={sortKey === "band"} dir={sortDir} onChange={sortSet("band")} />
                  <FilterDropdown header label=""
                    options={BANDS.map((b) => ({ value: b, label: BAND_LABEL[b], count: bandCounts[b] ?? 0 }))}
                    selected={bandsSel} onChange={setBandsSel} />
                </span>
              </th>
              <th className="px-3 py-2">
                <SortHeader label="Name" active={sortKey === "name"} dir={sortDir} onChange={sortSet("name")} />
              </th>
              <th className="px-3 py-2">
                <SortHeader label="Former company → acquirer" active={sortKey === "company"} dir={sortDir} onChange={sortSet("company")} />
              </th>
              <th className="px-3 py-2">
                <span className="inline-flex items-center gap-1">
                  <SortHeader label="Industry" active={sortKey === "industry"} dir={sortDir} onChange={sortSet("industry")} />
                  <FilterDropdown header label="" options={industryOptions} selected={industriesSel} onChange={setIndustriesSel} />
                </span>
              </th>
              <th className="px-3 py-2">
                <span className="inline-flex items-center gap-1">
                  <SortHeader label="Exit" active={sortKey === "exit"} dir={sortDir} onChange={sortSet("exit")} />
                  <FilterDropdown header label="" options={exitOptions} selected={exitSel} onChange={setExitSel} />
                </span>
              </th>
              <th className="px-3 py-2 text-right">
                <SortHeader label="Score" numeric active={sortKey === "score"} dir={sortDir} onChange={sortSet("score")} />
              </th>
              <th className="px-3 py-2">
                <FilterDropdown header label="Email" options={reachOptions} selected={reachSel} onChange={setReachSel} />
              </th>
              <th className="px-3 py-2">Phone</th>
              <th className="px-3 py-2">LinkedIn</th>
              <th className="px-3 py-2">
                <FilterDropdown header label="Status" options={statusOptions} selected={statusSel} onChange={setStatusSel} />
              </th>
              <th className="px-3 py-2">
                <span className="inline-flex items-center gap-1">
                  <SortHeader label="Loc" active={sortKey === "state"} dir={sortDir} onChange={sortSet("state")} />
                  <FilterDropdown header label="" options={stateOptions} selected={statesSel} onChange={setStatesSel} />
                </span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {guides === null ? (
              <tr><td colSpan={11} className="px-4 py-10 text-center text-sm text-zinc-400">Loading…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={11} className="px-4 py-10 text-center text-sm text-zinc-400">
                {apiDown ? "Waiting on the backend — nothing to show yet." : "No river guides match the filters."}
              </td></tr>
            ) : (
              rows.map((g) => {
                const href = g.contact_id ? `/companies/${g.company_id ?? ""}` : g.company_id ? `/companies/${g.company_id}` : null;
                return (
                  <Fragment key={g.deal_id}>
                  <tr className="hover:bg-zinc-50">
                    <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selected.has(g.deal_id)}
                        onChange={() => setSelected((prev) => { const n = new Set(prev); n.has(g.deal_id) ? n.delete(g.deal_id) : n.add(g.deal_id); return n; })}
                        className="accent-emerald-700"
                      />
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${bandChip[g.priority_band]}`}>{BAND_LABEL[g.priority_band]}</span>
                    </td>
                    <td className="max-w-40 truncate px-3 py-2.5 font-medium">
                      {g.full_name ?? <span className="italic text-amber-600">TBD</span>}
                      <div className="truncate text-xs font-normal text-zinc-400" title={ARCHETYPE_LABEL[g.archetype] ?? g.archetype}>{ARCHETYPE_LABEL[g.archetype] ?? g.archetype}</div>
                    </td>
                    <td className="max-w-64 px-3 py-2.5">
                      {href ? (
                        <Link href={href} className="truncate font-medium text-emerald-800 hover:underline">{g.their_company}</Link>
                      ) : (
                        <span className="truncate font-medium">{g.their_company}</span>
                      )}
                      <div className="truncate text-xs text-zinc-500">
                        → {g.acquirer}{g.acquirer_pe_sponsor ? ` (${g.acquirer_pe_sponsor})` : ""}{g.deal_year ? ` · ${g.deal_year}` : ""}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-xs text-zinc-600">{g.industry}</td>
                    <td className="whitespace-nowrap px-3 py-2.5">
                      {/* item j: the verify-worker's evidence lives in notes.
                          When present, the chip becomes a click-to-expand so
                          the VA can READ (and text-select) it, not squint at a
                          truncated tooltip. Hover still previews via title. */}
                      {g.notes ? (
                        <button
                          type="button"
                          onClick={() => setEvidenceOpen((prev) => { const n = new Set(prev); n.has(g.deal_id) ? n.delete(g.deal_id) : n.add(g.deal_id); return n; })}
                          className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-medium ring-1 ring-inset ${g.current_status_verified ? "bg-emerald-50 text-emerald-800 ring-emerald-200" : "bg-amber-50 text-amber-700 ring-amber-300"} hover:brightness-95`}
                          title={`${g.current_status_verified ? "current status verified" : "status at deal close — not yet re-verified; no outreach until ✓"}\nEvidence: ${g.notes}\n(click to expand)`}
                          aria-expanded={evidenceOpen.has(g.deal_id)}
                        >
                          {g.exit_status} {g.current_status_verified ? "✓" : "⚠"}
                          <span aria-hidden className="opacity-60">{evidenceOpen.has(g.deal_id) ? "▲" : "🔍"}</span>
                        </button>
                      ) : (
                        <span
                          className={`rounded px-1.5 py-0.5 text-xs font-medium ${g.current_status_verified ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-700"}`}
                          title={g.current_status_verified ? "current status verified" : "status at deal close — not yet re-verified; no outreach until ✓"}
                        >
                          {g.exit_status} {g.current_status_verified ? "✓" : "⚠"}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{g.fit_score ?? g.screen_score ?? "—"}</td>
                    {/* real values, not dots (John 7/16: "I'd rather just have the actual
                        contacts — phone, email, LinkedIn — and see if they're filled") */}
                    <td className="max-w-56 px-3 py-2.5">
                      {g.contact?.email ? (
                        <a href={`mailto:${g.contact.email}`} className="block truncate text-emerald-800 hover:underline" title={g.contact.email}>
                          {g.contact.email}
                        </a>
                      ) : (
                        <span className="text-zinc-300">—</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5">
                      {g.contact?.phone ? (
                        <a href={`tel:${g.contact.phone}`} className="text-emerald-800 hover:underline">{g.contact.phone}</a>
                      ) : (
                        <span className="text-zinc-300">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5">
                      {g.contact?.linkedin_url ? (
                        <a href={g.contact.linkedin_url} target="_blank" rel="noreferrer" className="text-emerald-800 hover:underline" title={g.contact.linkedin_url}>
                          profile ↗
                        </a>
                      ) : (
                        <span className="text-zinc-300">—</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5">
                      <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${STATUS_CHIP[g.enrichment_status] ?? "bg-zinc-100 text-zinc-600"}`}>
                        {STATUS_LABEL[g.enrichment_status] ?? g.enrichment_status}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-xs text-zinc-500">
                      {[g.location_city, g.location_state].filter(Boolean).join(", ") || "—"}
                    </td>
                  </tr>
                  {evidenceOpen.has(g.deal_id) && g.notes && (
                    <tr className="bg-amber-50/50">
                      <td colSpan={12} className="px-6 py-3">
                        <div className="max-w-4xl text-xs">
                          <span className="font-semibold text-amber-800">Verification evidence</span>
                          <span className="ml-2 text-zinc-500">
                            {g.current_status_verified ? "current status verified ✓" : "as-of-close — UNVERIFIED ⚠ · confirm before outreach"}
                          </span>
                          <p className="mt-1 whitespace-pre-wrap text-zinc-700">{g.notes}</p>
                        </div>
                      </td>
                    </tr>
                  )}
                  </Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </ScrollShell>

      <p className="text-[11px] text-zinc-400">
        Bands: Call now (screen ≥70) · Enrich &amp; assess (58–69) · Nurture (&lt;58) · Resolve name (identity TBD, overrides score).
        CSV doubles as the VA handoff for the paid enrichment tier. Outreach eligibility = Call now + verified ✓, drafts only via the rules-gated engine after John approves.
      </p>
    </div>
  );
}
