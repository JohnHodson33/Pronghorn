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
import CardList from "@/components/CardList";
import RunsPanel, { type RunRow, type RunOutcome } from "@/components/RunsPanel";
import ReviewPen from "@/components/ReviewPen";
import { useUrlFilterSync } from "@/lib/use-url-filters";
import { buildCsv, csvDate, downloadCsv } from "@/lib/csv";
import { presenceOptions, presenceMatch } from "@/lib/list-filters";

type Run = {
  id: string;
  deal_ids: string[] | null;
  state: "queued" | "running" | "done" | "failed";
  label?: string | null; // 0022 column; pre-0022 runs carry it in counts
  counts: { total?: number; processed?: number; found_email?: number; found_linkedin?: number; found_phone?: number; escalated_paid?: number; label?: string } | null;
  results?: Record<string, RunOutcome> | null; // per-row outcomes (Lane C's half)
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
// REACHABILITY COHORTS (PM 8/5) — the canonical rule, made visible:
// outreach-ready = status-VERIFIED + EXITED + email-or-phone. A LinkedIn URL
// is NOT a channel an email or call campaign can use, so LinkedIn-only people
// are their own labelled group and must never read as sendable.
type Cohort = "READY" | "LINKEDIN_ONLY" | "CLEARED_NO_CHANNEL" | "NOT_CLEARED";
const COHORTS: Cohort[] = ["READY", "LINKEDIN_ONLY", "CLEARED_NO_CHANNEL", "NOT_CLEARED"];
const COHORT_LABEL: Record<Cohort, string> = {
  READY: "Outreach-ready",
  LINKEDIN_ONLY: "LinkedIn only — needs a channel",
  CLEARED_NO_CHANNEL: "Cleared, no channel",
  NOT_CLEARED: "Not cleared yet",
};
const COHORT_CHIP: Record<Cohort, string> = {
  READY: "bg-emerald-700 text-white",
  LINKEDIN_ONLY: "bg-amber-100 text-amber-900",
  CLEARED_NO_CHANNEL: "bg-zinc-100 text-zinc-600",
  NOT_CLEARED: "bg-zinc-50 text-zinc-500",
};
const COHORT_HELP: Record<Cohort, string> = {
  READY: "Status-verified + EXITED + an email or phone — the only group a campaign can actually send to",
  LINKEDIN_ONLY: "Verified + EXITED but the ONLY channel is a LinkedIn URL — not sendable; route to the VA/enrichment queue for an email or phone",
  CLEARED_NO_CHANNEL: "Verified + EXITED but no channel at all yet — enrichment or the VA has to find one",
  NOT_CLEARED: "Not yet status-verified as EXITED — no outreach until verification clears them",
};
function cohortOf(g: { exit_status: string; current_status_verified: boolean; contact: Guide["contact"] }): Cohort {
  const cleared = g.current_status_verified && g.exit_status === "EXITED";
  if (!cleared) return "NOT_CLEARED";
  if (g.contact?.email || g.contact?.phone) return "READY";
  if (g.contact?.linkedin_url) return "LINKEDIN_ONLY";
  return "CLEARED_NO_CHANNEL";
}

const ARCHETYPE_LABEL: Record<string, string> = {
  A_EXITED_OPERATOR: "★ Exited operator",
  B_EX_CONSOLIDATOR_DEALMAKER: "Ex-consolidator",
  C_OPERATING_BROKER: "Operating broker",
  EXCLUDED: "Excluded",
};

export default function RiverGuides() {
  const [guides, setGuides] = useState<Guide[] | null>(null);
  const [apiDown, setApiDown] = useState(false);
  // set when the API couldn't apply the merged-duplicate filter — the list may
  // show the same person twice with contradictory exit status, so say so
  const [dataWarning, setDataWarning] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [bandsSel, setBandsSel] = useState<Set<string>>(new Set());
  const [industriesSel, setIndustriesSel] = useState<Set<string>>(new Set());
  const [statusSel, setStatusSel] = useState<Set<string>>(new Set());
  const [exitSel, setExitSel] = useState<Set<string>>(new Set());
  const [statesSel, setStatesSel] = useState<Set<string>>(new Set());
  const [emailSel, setEmailSel] = useState<Set<string>>(new Set());
  const [phoneSel, setPhoneSel] = useState<Set<string>>(new Set());
  const [linkedinSel, setLinkedinSel] = useState<Set<string>>(new Set());
  const [cohortSel, setCohortSel] = useState<Set<string>>(new Set());
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
  // outcome quick-chips narrow the run filter to a subset ("the 31 that
  // gained an email"); null = the whole run
  const [openRunIds, setOpenRunIds] = useState<string[] | null>(null);
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

  // A blipped fetch (deploy swap, cold start) used to show a permanent-looking
  // "backend isn't up yet — migration 0016" banner (long obsolete; John hit it
  // 7/31 and reasonably asked if the site was broken). Now: retry with backoff
  // before declaring anything, and say something honest when we do.
  async function load(attempt = 0) {
    try {
      const res = await fetch("/api/river-guides", { cache: "no-store" });
      if (!res.ok) throw new Error(String(res.status));
      const j = await res.json();
      setGuides(j.guides ?? j.rows ?? []);
      setDataWarning(j.warning ?? null);
      setApiDown(false);
    } catch {
      if (attempt < 3) {
        setTimeout(() => load(attempt + 1), (attempt + 1) * 3000);
      } else {
        setApiDown(true);
        setGuides([]);
      }
    }
  }
  useEffect(() => { load(); loadRuns(); }, []);

  const csvSet = (s: Set<string>) => (s.size ? [...s].join(",") : null);
  const fromCsv = (v: string | null) => new Set((v ?? "").split(",").filter(Boolean));
  useUrlFilterSync(
    () => ({
      q, band: csvSet(bandsSel), cohort: csvSet(cohortSel), industry: csvSet(industriesSel),
      status: csvSet(statusSel), exit: csvSet(exitSel), state: csvSet(statesSel),
      email: csvSet(emailSel), phone: csvSet(phoneSel), linkedin: csvSet(linkedinSel),
      sort: sortKey, dir: sortKey && sortDir === "asc" ? "asc" : null,
    }),
    (p) => {
      if (p.get("q")) setQ(p.get("q")!);
      if (p.get("band")) setBandsSel(fromCsv(p.get("band")));
      if (p.get("cohort")) setCohortSel(fromCsv(p.get("cohort")));
      if (p.get("industry")) setIndustriesSel(fromCsv(p.get("industry")));
      if (p.get("status")) setStatusSel(fromCsv(p.get("status")));
      if (p.get("exit")) setExitSel(fromCsv(p.get("exit")));
      if (p.get("state")) setStatesSel(fromCsv(p.get("state")));
      // legacy ?reach=phone style links map onto the per-channel filters
      const legacy = fromCsv(p.get("reach"));
      if (legacy.has("email")) setEmailSel(new Set(["has"]));
      if (legacy.has("phone")) setPhoneSel(new Set(["has"]));
      if (legacy.has("linkedin")) setLinkedinSel(new Set(["has"]));
      if (p.get("email")) setEmailSel(fromCsv(p.get("email")));
      if (p.get("phone")) setPhoneSel(fromCsv(p.get("phone")));
      if (p.get("linkedin")) setLinkedinSel(fromCsv(p.get("linkedin")));
      if (p.get("sort")) setSortKey(p.get("sort"));
      if (p.get("dir") === "asc") setSortDir("asc");
    },
    [q, bandsSel, cohortSel, industriesSel, statusSel, exitSel, statesSel, emailSel, phoneSel, linkedinSel, sortKey, sortDir],
  );

  const all = guides ?? [];
  const bandCounts = useMemo(() => {
    const m: Record<string, number> = {};
    for (const g of all) m[g.priority_band] = (m[g.priority_band] ?? 0) + 1;
    return m;
  }, [all]);
  const cohortCounts = useMemo(() => {
    const m: Record<string, number> = {};
    for (const g of all) { const c = cohortOf(g); m[c] = (m[c] ?? 0) + 1; }
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
  // each channel owns its own has/missing filter, like every other list
  const emailOptions = useMemo(() => presenceOptions(all, (g) => g.contact?.email, "email"), [all]);
  const phoneOptions = useMemo(() => presenceOptions(all, (g) => g.contact?.phone, "phone"), [all]);
  const linkedinOptions = useMemo(() => presenceOptions(all, (g) => g.contact?.linkedin_url, "LinkedIn"), [all]);

  const rows = useMemo(() => {
    // run view = EXACTLY that run's rows (John 7/31) — other filters don't
    // apply while a run is open, so they can't silently hide run rows; the
    // outcome chips pass a narrower id set than the whole run
    const runIds = openRunIds ?? openRun?.deal_ids;
    const filtered = runIds?.length
      ? all.filter((g) => runIds.includes(g.deal_id))
      : all.filter((g) => {
      if (bandsSel.size && !bandsSel.has(g.priority_band)) return false;
      if (cohortSel.size && !cohortSel.has(cohortOf(g))) return false;
      if (industriesSel.size && !industriesSel.has(g.industry)) return false;
      if (statusSel.size && !statusSel.has(g.enrichment_status)) return false;
      if (exitSel.size && !exitSel.has(`${g.exit_status}${g.current_status_verified ? " ✓" : " ⚠"}`)) return false;
      if (statesSel.size && !statesSel.has(g.location_state ?? "")) return false;
      if (!presenceMatch(emailSel, g.contact?.email)) return false;
      if (!presenceMatch(phoneSel, g.contact?.phone)) return false;
      if (!presenceMatch(linkedinSel, g.contact?.linkedin_url)) return false;
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
          // blanks sort last so "who has an email" reads top-down
          case "email": return (g.contact?.email ?? "zzz").toLowerCase();
          case "phone": return (g.contact?.phone ?? "zzz").toLowerCase();
          case "linkedin": return (g.contact?.linkedin_url ?? "zzz").toLowerCase();
          case "status": return STATUS_LABEL[g.enrichment_status] ?? g.enrichment_status;
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
  }, [all, q, bandsSel, cohortSel, industriesSel, statusSel, exitSel, statesSel, emailSel, phoneSel, linkedinSel, sortKey, sortDir, openRun, openRunIds]);

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

  // human label for the run, from the filters live at queue time (7/31 item g)
  function runLabel() {
    return [
      ...[...industriesSel],
      ...[...bandsSel].map((b) => BAND_LABEL[b] ?? b),
      `${selected.size} selected`,
    ].join(" · ").slice(0, 120);
  }

  async function enrichSelected() {
    setBusy(true);
    setNotice(null);
    try {
      const res = await fetch("/api/river-guides/enrich", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dealIds: [...selected], label: runLabel() }),
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

  // "Send to VA" — the paid-tier handoff (STATUS 7/31 edit #3). Exports the
  // NEEDS_PAID guides in the current view as a fill-in workbook the VA sends
  // back through /intake: name+firm are the match keys (do not edit), the
  // channel columns are what the VA fills, and the instructions column is
  // ignored by intake's column mapper (unmapped headers are dropped), so the
  // same file round-trips cleanly as a contact enrichment-fill.
  const needsPaid = useMemo(() => rows.filter((g) => g.enrichment_status === "NEEDS_PAID" && g.full_name), [rows]);
  function exportVaCsv() {
    const instructions =
      "FILL the email / phone / linkedin columns for each person. Leave a cell BLANK if you cannot verify it — never guess. " +
      "Paste the URL where you found each datum into the notes column (e.g. 'phone from acme.com/contact'). " +
      "Do NOT edit the name or firm columns — they are how rows match back to the CRM. " +
      "When done, save as CSV and upload it at the platform's Data Intake page (/intake); if asked for a type, pick 'Enrichment fill'. " +
      "Context: each person sold the company in the firm column and we want to reach them — their current direct contact info, not the company's old main line.";
    downloadCsv(
      `pronghorn-va-batch-${csvDate()}.csv`,
      buildCsv(
        ["name", "firm", "city", "state", "email", "phone", "linkedin", "notes", "instructions"],
        needsPaid.map((g, i) => [
          g.full_name, g.their_company, g.location_city, g.location_state,
          g.contact?.email ?? null, g.contact?.phone ?? null, g.contact?.linkedin_url ?? null,
          null, i === 0 ? instructions : null,
        ])
      )
    );
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
        <div className="flex flex-wrap items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          <span>
            Couldn&apos;t load the river guides after several tries — usually a brief deploy window or
            connection blip. Your data is safe.
          </span>
          <button
            onClick={() => { setApiDown(false); setGuides(null); load(); }}
            className="rounded border border-amber-300 px-2 py-0.5 text-xs font-semibold hover:bg-amber-100"
          >
            Retry now
          </button>
        </div>
      )}

      {/* the merged-duplicate filter failed server-side (Lane C 8/5): the same
          person can appear twice with contradictory exit status, which is how
          a still-employed operator nearly reached an outreach batch. Loud, red,
          and specific about what not to trust — never a silent degrade. */}
      {dataWarning && (
        <div className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm font-medium text-red-800">
          ⚠ {dataWarning} — do not build an outreach list off this view until it clears.
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
      {/* DISCOVERY REVIEW PEN (John 7/31 card (b); Lane C 8/4): below-HIGH
          sweep candidates + new consolidators await one-click keep/reject;
          kept guides reload into the list below */}
      <ReviewPen onFiled={load} />

      {/* RUNS SURFACE (John 7/31 NEW #1 — supersedes the 7/16 history panel):
          ALWAYS visible (the old panel hid during an active run), every run
          clickable → the table filters to exactly that run's rows; outcome
          quick-chips light up when Lane C's per-row results land; a finished
          run stays flagged until dismissed. */}
      <RunsPanel
        channel="river-guides"
        openRunId={openRun?.id ?? null}
        onOpenRun={(run, ids) => {
          if (!run) { setOpenRun(null); setOpenRunIds(null); return; }
          const orig = [...runs.active, ...runs.recent].find((x) => x.id === run.id) ?? null;
          setOpenRun(orig);
          setOpenRunIds(ids);
        }}
        runs={[...runs.active, ...runs.recent].map((r): RunRow => ({
          id: r.id,
          state: r.state,
          label: r.label ?? r.counts?.label ?? null,
          note: r.note,
          stale: r.stale,
          counts: r.counts,
          ids: r.deal_ids,
          results: r.results ?? null,
          created_at: r.created_at ?? null,
          finished_at: r.finished_at,
        }))}
      />
      {runs.note && !runs.active.length && !runs.recent.length && (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">{runs.note}</div>
      )}

      {notice && <div className="rounded-md border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-800">{notice}</div>}

      {/* REACHABILITY COHORTS (PM 8/5) — who can actually be contacted, in
          John's canonical terms. LinkedIn-only is its own labelled group so it
          can never be mistaken for sendable; click any chip to filter. */}
      <div className="rounded-xl border border-zinc-200 bg-white px-4 py-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="mr-1 text-xs font-semibold uppercase tracking-wide text-zinc-500">Reachability</span>
          {COHORTS.map((c) => (
            <button
              key={c}
              onClick={() => setCohortSel((prev) => { const n = new Set(prev); n.has(c) ? n.delete(c) : n.add(c); return n; })}
              title={COHORT_HELP[c]}
              className={`rounded-full px-2.5 py-1 text-xs font-semibold transition ${cohortSel.has(c) ? "ring-2 ring-emerald-600 " : ""}${COHORT_CHIP[c]}`}
            >
              {COHORT_LABEL[c]} · {cohortCounts[c] ?? 0}
            </button>
          ))}
        </div>
        <p className="mt-1.5 text-[11px] text-zinc-500">
          Outreach-ready = status-verified + EXITED + <span className="font-medium">email or phone</span>. A LinkedIn URL
          isn&rsquo;t a channel a campaign can send to, so those people are counted separately and belong in the
          VA/enrichment queue until they have an email or phone.
        </p>
      </div>

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
          <button
            onClick={exportVaCsv}
            disabled={needsPaid.length === 0}
            className="rounded-lg bg-violet-700 px-3 py-1.5 text-sm font-semibold text-white hover:bg-violet-800 disabled:opacity-40"
            title={`Download the ${needsPaid.length} 'Needs paid' guide${needsPaid.length === 1 ? "" : "s"} in the current view as a VA fill-in CSV (instructions embedded). The VA returns it through Data Intake (/intake) and the found channels fill the linked contacts.`}
          >
            Send to VA ({needsPaid.length})
          </button>
          <button onClick={exportCsv} disabled={rows.length === 0} className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-600 hover:bg-zinc-50">
            CSV ({rows.length})
          </button>
        </span>
      </div>

      <div className="hidden sm:block">
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
                  <FilterDropdown header label="" name="Band"
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
                  <FilterDropdown header label="" name="Industry" options={industryOptions} selected={industriesSel} onChange={setIndustriesSel} />
                </span>
              </th>
              <th className="px-3 py-2">
                <span className="inline-flex items-center gap-1">
                  <SortHeader label="Exit" active={sortKey === "exit"} dir={sortDir} onChange={sortSet("exit")} />
                  <FilterDropdown header label="" name="Exit" options={exitOptions} selected={exitSel} onChange={setExitSel} />
                </span>
              </th>
              <th className="px-3 py-2 text-right">
                <SortHeader label="Score" numeric active={sortKey === "score"} dir={sortDir} onChange={sortSet("score")} />
              </th>
              <th className="px-3 py-2">
                <span className="inline-flex items-center gap-1">
                  <SortHeader label="Email" active={sortKey === "email"} dir={sortDir} onChange={sortSet("email")} />
                  <FilterDropdown header label="" name="Email" options={emailOptions} selected={emailSel} onChange={setEmailSel} />
                </span>
              </th>
              <th className="px-3 py-2">
                <span className="inline-flex items-center gap-1">
                  <SortHeader label="Phone" active={sortKey === "phone"} dir={sortDir} onChange={sortSet("phone")} />
                  <FilterDropdown header label="" name="Phone" options={phoneOptions} selected={phoneSel} onChange={setPhoneSel} />
                </span>
              </th>
              <th className="px-3 py-2">
                <span className="inline-flex items-center gap-1">
                  <SortHeader label="LinkedIn" active={sortKey === "linkedin"} dir={sortDir} onChange={sortSet("linkedin")} />
                  <FilterDropdown header label="" name="LinkedIn" options={linkedinOptions} selected={linkedinSel} onChange={setLinkedinSel} />
                </span>
              </th>
              <th className="px-3 py-2">
                <span className="inline-flex items-center gap-1">
                  <SortHeader label="Status" active={sortKey === "status"} dir={sortDir} onChange={sortSet("status")} />
                  <FilterDropdown header label="" name="Status" options={statusOptions} selected={statusSel} onChange={setStatusSel} />
                </span>
              </th>
              <th className="px-3 py-2">
                <span className="inline-flex items-center gap-1">
                  <SortHeader label="Loc" active={sortKey === "state"} dir={sortDir} onChange={sortSet("state")} />
                  <FilterDropdown header label="" name="State" options={stateOptions} selected={statesSel} onChange={setStatesSel} />
                </span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {guides === null ? (
              <tr><td colSpan={11} className="px-4 py-10 text-center text-sm text-zinc-400">Loading…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={11} className="px-4 py-10 text-center text-sm text-zinc-400">
                {apiDown ? "Couldn't load — use Retry above." : "No river guides match the filters."}
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
                        <span className="flex items-center gap-1">
                          <a href={g.contact.linkedin_url} target="_blank" rel="noreferrer" className="text-emerald-800 hover:underline" title={g.contact.linkedin_url}>
                            profile ↗
                          </a>
                          {/* LinkedIn is the ONLY channel → say so on the row,
                              so it can't be mistaken for sendable */}
                          {cohortOf(g) === "LINKEDIN_ONLY" && (
                            <span className="rounded bg-amber-100 px-1 py-0.5 text-[10px] font-semibold text-amber-900"
                              title={COHORT_HELP.LINKEDIN_ONLY}>
                              only
                            </span>
                          )}
                        </span>
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
      </div>

      {/* <640px: same rows, same filters/sort, card layout (mobile parity
          rule) — selection checkbox, evidence expand and all links survive */}
      <CardList
        emptyText={guides === null ? "Loading…" : apiDown ? "Waiting on the backend — nothing to show yet." : "No river guides match the filters."}
        sort={{
          options: [
            { value: "band", label: "Band" },
            { value: "name", label: "Name" },
            { value: "company", label: "Former company" },
            { value: "industry", label: "Industry" },
            { value: "exit", label: "Exit" },
            { value: "score", label: "Score", numeric: true },
            { value: "email", label: "Email" },
            { value: "phone", label: "Phone" },
            { value: "linkedin", label: "LinkedIn" },
            { value: "status", label: "Status" },
            { value: "state", label: "Location" },
          ],
          sortKey,
          dir: sortDir,
          onChange: (key, d) => {
            if (!d) setSortKey(null);
            else { setSortKey(key); setSortDir(d); }
          },
        }}
        controls={
          <>
            <FilterDropdown label="Reach" name="Reachability"
              options={COHORTS.map((c) => ({ value: c, label: COHORT_LABEL[c], count: cohortCounts[c] ?? 0 }))}
              selected={cohortSel} onChange={setCohortSel} />
            <FilterDropdown label="Band"
              options={BANDS.map((b) => ({ value: b, label: BAND_LABEL[b], count: bandCounts[b] ?? 0 }))}
              selected={bandsSel} onChange={setBandsSel} />
            <FilterDropdown label="Industry" options={industryOptions} selected={industriesSel} onChange={setIndustriesSel} />
            <FilterDropdown label="Exit" options={exitOptions} selected={exitSel} onChange={setExitSel} />
            <FilterDropdown label="Email" options={emailOptions} selected={emailSel} onChange={setEmailSel} />
            <FilterDropdown label="Phone" options={phoneOptions} selected={phoneSel} onChange={setPhoneSel} />
            <FilterDropdown label="LinkedIn" options={linkedinOptions} selected={linkedinSel} onChange={setLinkedinSel} />
            <FilterDropdown label="Status" options={statusOptions} selected={statusSel} onChange={setStatusSel} />
            <FilterDropdown label="State" options={stateOptions} selected={statesSel} onChange={setStatesSel} />
          </>
        }
        cards={rows.map((g) => {
          const href = g.company_id ? `/companies/${g.company_id}` : null;
          return {
            key: g.deal_id,
            title: (
              <span className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={selected.has(g.deal_id)}
                  onChange={() => setSelected((prev) => { const n = new Set(prev); n.has(g.deal_id) ? n.delete(g.deal_id) : n.add(g.deal_id); return n; })}
                  className="accent-emerald-700"
                />
                <span className="min-w-0 flex-1">
                  {g.full_name ?? <span className="italic text-amber-600">TBD</span>}
                  <span className="block text-xs font-normal text-zinc-400">{ARCHETYPE_LABEL[g.archetype] ?? g.archetype}</span>
                </span>
              </span>
            ),
            titleRight: (
              <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${bandChip[g.priority_band]}`}>{BAND_LABEL[g.priority_band]}</span>
            ),
            fields: [
              {
                label: "Company",
                value: (
                  <>
                    {href ? (
                      <Link href={href} className="font-medium text-emerald-800 underline-offset-2 hover:underline">{g.their_company}</Link>
                    ) : (
                      <span className="font-medium">{g.their_company}</span>
                    )}
                    <span className="block text-xs text-zinc-500">
                      → {g.acquirer}{g.acquirer_pe_sponsor ? ` (${g.acquirer_pe_sponsor})` : ""}{g.deal_year ? ` · ${g.deal_year}` : ""}
                    </span>
                  </>
                ),
              },
              { label: "Industry", value: g.industry },
              {
                label: "Exit",
                value: g.notes ? (
                  <button
                    type="button"
                    onClick={() => setEvidenceOpen((prev) => { const n = new Set(prev); n.has(g.deal_id) ? n.delete(g.deal_id) : n.add(g.deal_id); return n; })}
                    className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-medium ring-1 ring-inset ${g.current_status_verified ? "bg-emerald-50 text-emerald-800 ring-emerald-200" : "bg-amber-50 text-amber-700 ring-amber-300"}`}
                    aria-expanded={evidenceOpen.has(g.deal_id)}
                  >
                    {g.exit_status} {g.current_status_verified ? "✓" : "⚠"}
                    <span aria-hidden className="opacity-60">{evidenceOpen.has(g.deal_id) ? "▲" : "🔍"}</span>
                  </button>
                ) : (
                  <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${g.current_status_verified ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-700"}`}>
                    {g.exit_status} {g.current_status_verified ? "✓" : "⚠"}
                  </span>
                ),
              },
              ...(evidenceOpen.has(g.deal_id) && g.notes ? [{
                label: "Evidence",
                value: (
                  <span className="block whitespace-pre-wrap text-xs text-zinc-700">
                    <span className="font-semibold text-amber-800">
                      {g.current_status_verified ? "verified ✓ — " : "as-of-close, UNVERIFIED ⚠ — "}
                    </span>
                    {g.notes}
                  </span>
                ),
              }] : []),
              { label: "Score", value: String(g.fit_score ?? g.screen_score ?? "—") },
              {
                label: "Email",
                value: g.contact?.email ? (
                  <a href={`mailto:${g.contact.email}`} className="text-emerald-800 underline-offset-2 hover:underline">{g.contact.email}</a>
                ) : "—",
              },
              {
                label: "Phone",
                value: g.contact?.phone ? (
                  <a href={`tel:${g.contact.phone}`} className="text-emerald-800 underline-offset-2 hover:underline">{g.contact.phone}</a>
                ) : "—",
              },
              {
                label: "LinkedIn",
                value: g.contact?.linkedin_url ? (
                  <a href={g.contact.linkedin_url} target="_blank" rel="noreferrer" className="text-emerald-800 underline-offset-2 hover:underline">profile ↗</a>
                ) : "—",
              },
              {
                label: "Status",
                value: (
                  <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${STATUS_CHIP[g.enrichment_status] ?? "bg-zinc-100 text-zinc-600"}`}>
                    {STATUS_LABEL[g.enrichment_status] ?? g.enrichment_status}
                  </span>
                ),
              },
              { label: "Location", value: [g.location_city, g.location_state].filter(Boolean).join(", ") || "—" },
            ],
          };
        })}
      />

      <p className="text-[11px] text-zinc-400">
        Bands: Call now (screen ≥70) · Enrich &amp; assess (58–69) · Nurture (&lt;58) · Resolve name (identity TBD, overrides score).
        CSV doubles as the VA handoff for the paid enrichment tier. Outreach eligibility = Call now + verified ✓, drafts only via the rules-gated engine after John approves.
      </p>
    </div>
  );
}
