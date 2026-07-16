"use client";

// Leads working table (ENRICHMENT-UX rounds 1+2 + completeness levels).
// The primary demarcation is the COMPLETENESS LEVEL (how reachable the owner
// is), not the lifecycle status. Enrich is tier-aware with an honest max-cost
// preview; a queued job shows live progress and a completion summary.
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { EnrichmentLead } from "@/lib/enrichment";
import { completeness, LEVELS, LEVEL_META, type Completeness } from "@/lib/completeness";
import { buildCsv, csvDate, downloadCsv } from "@/lib/csv";
import { TIERS, TIER_LABELS } from "@/lib/size";
import InlineField from "@/components/InlineField";
import FilterDropdown from "@/components/FilterDropdown";

const tierChip: Record<string, string> = {
  platform: "bg-emerald-100 text-emerald-800",
  tuckin: "bg-sky-100 text-sky-800",
  toosmall: "bg-zinc-100 text-zinc-500",
  too_big: "bg-violet-100 text-violet-800",
  unsized: "bg-zinc-50 text-zinc-400 border border-zinc-200",
};
const estShort = (r: [number, number]) => {
  const f = (n: number) => (n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(1)}M` : `$${Math.round(n / 1000)}K`);
  return `~${f(r[0])}–${f(r[1])}`;
};

const statusLabel: Record<string, string> = {
  new: "New",
  enriching: "Enriching",
  enriched: "Enriched",
  in_sequence: "In sequence",
  contacted: "Contacted",
  responded: "Responded",
  dead: "Dead",
};

const levelChip: Record<Completeness, string> = {
  full: "bg-emerald-700 text-white",
  contactable: "bg-emerald-100 text-emerald-800",
  identified: "bg-amber-100 text-amber-800",
  basic: "bg-zinc-100 text-zinc-600",
  raw: "bg-zinc-50 text-zinc-400",
};

type Estimate = { count: number; tier1: number; tier2: number; estimate: number };
type Job = {
  id: string;
  status: string;
  counts: { total?: number; processed?: number; tier1?: number; tier2?: number; found_owner?: number; found_email?: number } | null;
  created_at: string;
  finished_at: string | null;
};

function ContactDots({ filled }: { filled: boolean[] }) {
  return (
    <span className="inline-flex gap-1" title="owner phone · email · LinkedIn (usable channels only)">
      {filled.map((f, i) => (
        <span key={i} className={`h-2 w-2 rounded-full ${f ? "bg-emerald-600" : "bg-zinc-200"}`} />
      ))}
    </span>
  );
}

const inputCls = "rounded-md border border-zinc-300 px-2.5 py-1.5 text-sm outline-none focus:border-emerald-600";

export default function LeadsTable({
  leads,
  heading,
  showListFilter = true,
}: {
  leads: EnrichmentLead[];
  heading: string;
  showListFilter?: boolean;
}) {
  const router = useRouter();
  // Filters survive the open-company → back round trip (nav-fix acceptance:
  // "back → SAME enrichment list, filters intact").
  const FILTER_KEY = "pronghorn-leads-filters-v1";
  const saved: Record<string, string> = (() => {
    if (typeof window === "undefined") return {};
    try {
      return JSON.parse(sessionStorage.getItem(FILTER_KEY) ?? "{}");
    } catch {
      return {};
    }
  })();
  // multi-select filters (7/15 overhaul parity, item e) — tolerate the old
  // single-string saved shape ("all" ⇒ empty set)
  const toSet = (v: string | undefined) => new Set((v && v !== "all" ? v : "").split(",").filter(Boolean));
  const [q, setQ] = useState(saved.q ?? "");
  const [industriesSel, setIndustriesSel] = useState<Set<string>>(toSet(saved.industry));
  const [state, setState] = useState(saved.state ?? "all");
  const [list, setList] = useState(saved.list ?? "all");
  const [levelsSel, setLevelsSel] = useState<Set<string>>(toSet(saved.level));
  const [tiersSel, setTiersSel] = useState<Set<string>>(toSet(saved.tier));
  const [showOffTarget, setShowOffTarget] = useState(saved.offTarget === "1");
  const [hidePe, setHidePe] = useState(saved.hidePe === "1"); // PE-owned aren't targets (John 7/15)
  const isPe = (l: EnrichmentLead) => !!(l.enrichment as { pe_owned?: boolean } | null)?.pe_owned;
  const peOwnerOf = (l: EnrichmentLead) => (l.enrichment as { pe_owner?: string } | null)?.pe_owner ?? null;
  useEffect(() => {
    try {
      sessionStorage.setItem(
        FILTER_KEY,
        JSON.stringify({
          q, industry: [...industriesSel].join(","), state, list,
          level: [...levelsSel].join(","), tier: [...tiersSel].join(","),
          offTarget: showOffTarget ? "1" : "0", hidePe: hidePe ? "1" : "0",
        })
      );
    } catch {}
  }, [q, industriesSel, state, list, levelsSel, tiersSel, showOffTarget, hidePe]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [estimate, setEstimate] = useState<Estimate | null>(null);
  const [job, setJob] = useState<Job | null>(null);
  const [jobDone, setJobDone] = useState<Job | null>(null);

  const effIndustry = (l: EnrichmentLead) => l.industry_verified ?? l.list?.industry ?? null;
  const levelOf = (l: EnrichmentLead) => completeness(l);

  const industryOptions = useMemo(() => {
    const m: Record<string, number> = {};
    for (const l of leads) { const i = effIndustry(l); if (i) m[i] = (m[i] ?? 0) + 1; }
    return Object.entries(m).sort((a, b) => b[1] - a[1]).map(([value, count]) => ({ value, label: value, count }));
  }, [leads]);
  const states = useMemo(() => [...new Set(leads.map((l) => l.state).filter(Boolean))].sort() as string[], [leads]);
  const lists = useMemo(
    () => [...new Set(leads.map((l) => (l.list ? `${l.list.industry}${l.list.geography ? ` — ${l.list.geography}` : ""}` : null)).filter(Boolean))].sort() as string[],
    [leads]
  );

  const levelCounts = useMemo(() => {
    const c: Record<Completeness, number> = { full: 0, contactable: 0, identified: 0, basic: 0, raw: 0 };
    for (const l of leads) if (!l.off_target) c[levelOf(l)]++;
    return c;
  }, [leads]);

  const tierCounts = useMemo(() => {
    const c: Record<string, number> = { platform: 0, tuckin: 0, toosmall: 0, too_big: 0, unsized: 0 };
    for (const l of leads) if (!l.off_target) c[l.size?.tier ?? "unsized"]++;
    return c;
  }, [leads]);

  const rows = useMemo(() => {
    const filtered = leads.filter((l) => {
      if (!showOffTarget && l.off_target) return false;
      if (hidePe && isPe(l)) return false;
      if (levelsSel.size && !levelsSel.has(levelOf(l))) return false;
      if (tiersSel.size && !tiersSel.has(l.size?.tier ?? "unsized")) return false;
      if (industriesSel.size && !industriesSel.has(effIndustry(l) ?? "")) return false;
      if (state !== "all" && l.state !== state) return false;
      if (list !== "all" && `${l.list?.industry}${l.list?.geography ? ` — ${l.list.geography}` : ""}` !== list) return false;
      if (
        q &&
        !`${l.name} ${l.city ?? ""} ${l.state ?? ""} ${l.owner_name ?? ""} ${effIndustry(l) ?? ""}`
          .toLowerCase()
          .includes(q.toLowerCase())
      )
        return false;
      return true;
    });
    // Default sort: most complete first (results float to the top), then newest.
    return filtered.sort((a, b) => {
      const d = LEVELS.indexOf(levelOf(a)) - LEVELS.indexOf(levelOf(b));
      return d !== 0 ? d : b.created_at.localeCompare(a.created_at);
    });
  }, [leads, q, industriesSel, state, list, levelsSel, tiersSel, showOffTarget, hidePe]);

  const enrichingCount = useMemo(() => leads.filter((l) => l.status === "enriching").length, [leads]);

  // Tier-aware cost preview whenever the selection changes.
  useEffect(() => {
    if (selected.size === 0) {
      setEstimate(null);
      return;
    }
    const ids = [...selected];
    const t = setTimeout(async () => {
      try {
        const res = await fetch("/api/enrich", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ leadIds: ids, estimateOnly: true }),
        });
        if (res.ok) setEstimate(await res.json());
      } catch {}
    }, 400);
    return () => clearTimeout(t);
  }, [selected]);

  // Poll the active job + refresh rows while anything is enriching.
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    const active = job !== null || enrichingCount > 0;
    if (active && !pollRef.current) {
      pollRef.current = setInterval(async () => {
        router.refresh();
        if (job) {
          try {
            const res = await fetch(`/api/enrich?job=${job.id}`);
            const j = await res.json();
            const cur: Job | undefined = (j.jobs ?? [])[0];
            if (cur) {
              if (["done", "failed"].includes(cur.status)) {
                setJobDone(cur);
                setJob(null);
              } else setJob(cur);
            }
          } catch {}
        }
      }, 4000);
    }
    if (!active && pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      pollRef.current = null;
    };
  }, [job, enrichingCount, router]);

  async function enrichSelected() {
    const ids = [...selected];
    if (ids.length === 0) return;
    setBusy("enrich");
    setNotice(null);
    setJobDone(null);
    try {
      const res = await fetch("/api/enrich", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadIds: ids }),
      });
      const j = await res.json();
      if (res.ok) {
        setJob({ id: j.jobId, status: "queued", counts: { total: j.count, processed: 0, tier1: j.tier1, tier2: j.tier2 }, created_at: new Date().toISOString(), finished_at: null });
        setSelected(new Set());
        router.refresh();
      } else {
        setNotice(j.error ?? `Enrichment failed (${res.status})`);
      }
    } catch {
      setNotice("Enrichment API unreachable — selection kept.");
    }
    setBusy(null);
  }

  async function promote(leadId: string) {
    setBusy(leadId);
    setNotice(null);
    const res = await fetch("/api/leads/promote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ leadId }),
    });
    setBusy(null);
    if (res.ok) {
      const { companyId } = await res.json();
      router.push(`/companies/${companyId}`);
    } else setNotice((await res.json()).error ?? "promote failed");
  }

  async function discard(leadId: string) {
    setBusy(leadId);
    await fetch(`/api/leads/${leadId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "dead" }),
    });
    setBusy(null);
    router.refresh();
  }

  function exportCsv() {
    downloadCsv(
      `pronghorn-leads-${csvDate()}.csv`,
      buildCsv(
        ["name", "completeness", "size_tier", "industry_verified", "list", "website", "phone", "city", "state",
         "owner_name", "owner_email", "owner_phone", "owner_linkedin", "status", "off_target"],
        rows.map((l) => [
          l.name, levelOf(l), TIER_LABELS[l.size?.tier ?? "unsized"], effIndustry(l), l.list ? `${l.list.industry}${l.list.geography ? ` — ${l.list.geography}` : ""}` : null,
          l.website, l.phone, l.city, l.state,
          l.owner_name, l.owner_email, l.owner_phone, l.owner_linkedin, l.status, l.off_target ? "yes" : "no",
        ])
      )
    );
  }

  const offTargetCount = useMemo(() => leads.filter((l) => l.off_target).length, [leads]);
  const jc = job?.counts ?? {};
  const jobAgeSec = job ? (Date.now() - new Date(job.created_at).getTime()) / 1000 : 0;
  const enrichLabel =
    estimate === null
      ? "Enrich selected"
      : estimate.count === 0
        ? "Selection fully enriched"
        : `Enrich ${estimate.count}${estimate.tier2 > 0 ? ` (t1×${estimate.tier1} + t2×${estimate.tier2})` : ""} — est. $${estimate.estimate.toFixed(2)}`;

  return (
    <section className="rounded-xl border border-zinc-200 bg-white">
      {/* completeness counts header — the demarcation that matters */}
      <div className="flex flex-wrap items-center gap-1.5 border-b border-zinc-100 px-5 py-2 text-xs">
        <span className="font-semibold text-zinc-700">
          {leads.filter((l) => !l.off_target).length} leads:
        </span>
        {LEVELS.map((lv) => (
          <button
            key={lv}
            onClick={() => setLevelsSel((prev) => { const n = new Set(prev); n.has(lv) ? n.delete(lv) : n.add(lv); return n; })}
            className={`rounded-full px-2.5 py-0.5 font-semibold transition ${levelsSel.has(lv) ? "ring-2 ring-emerald-600 " : ""}${levelChip[lv]}`}
            title={LEVEL_META[lv].label}
          >
            {LEVEL_META[lv].dot} {levelCounts[lv]} {lv}
          </button>
        ))}
        {offTargetCount > 0 && (
          <button
            onClick={() => setShowOffTarget((v) => !v)}
            className={`ml-1 rounded-full px-2.5 py-0.5 font-semibold transition ${
              showOffTarget ? "bg-red-100 text-red-700 ring-2 ring-red-300" : "bg-red-50 text-red-600 hover:bg-red-100"
            }`}
          >
            off-target · {offTargetCount}
          </button>
        )}
        {leads.some(isPe) && (
          <button
            onClick={() => setHidePe((v) => !v)}
            className={`ml-1 rounded-full px-2.5 py-0.5 font-semibold transition ${
              hidePe ? "bg-rose-100 text-rose-700 ring-2 ring-rose-300" : "bg-rose-50 text-rose-600 hover:bg-rose-100"
            }`}
            title="PE-backed companies aren't acquisition targets"
          >
            {hidePe ? "PE hidden" : "hide PE"} · {leads.filter(isPe).length}
          </button>
        )}
        <span className="mx-1 text-zinc-300">|</span>
        <span className="font-semibold text-zinc-500">size:</span>
        {TIERS.map((t) => (
          <button
            key={t}
            onClick={() => setTiersSel((prev) => { const n = new Set(prev); n.has(t) ? n.delete(t) : n.add(t); return n; })}
            className={`rounded-full px-2.5 py-0.5 font-semibold transition ${tiersSel.has(t) ? "ring-2 ring-emerald-600 " : ""}${tierChip[t]}`}
            title={t === "unsized" ? "no usable size signal yet — enrichment adds them" : `estimated ${TIER_LABELS[t]}`}
          >
            {TIER_LABELS[t]} · {tierCounts[t]}
          </button>
        ))}
      </div>

      {/* live job progress — clicking Enrich must never feel like nothing happened */}
      {job && (
        <div className="sticky top-0 z-30 border-b border-emerald-200 bg-emerald-50 px-5 py-2.5 text-sm text-emerald-900">
          <span className="mr-2 inline-block animate-pulse">⚙</span>
          {job.status === "queued" && jobAgeSec > 60 ? (
            <>Queued — the runner picks this up within ~15 min. {jc.total ?? "?"} leads waiting (t1×{jc.tier1 ?? 0} + t2×{jc.tier2 ?? 0}).</>
          ) : (
            <>
              Enriching {jc.processed ?? 0}/{jc.total ?? "?"}
              {jc.found_owner !== undefined && <> — {jc.found_owner} owners</>}
              {jc.found_email !== undefined && <>, {jc.found_email} emails found</>}…
            </>
          )}
          <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded bg-emerald-100">
            <div
              className="h-1.5 rounded bg-emerald-600 transition-all"
              style={{ width: `${jc.total ? Math.round(((jc.processed ?? 0) / jc.total) * 100) : 4}%` }}
            />
          </div>
        </div>
      )}
      {jobDone && (
        <div className="flex flex-wrap items-center gap-2 border-b border-emerald-200 bg-emerald-100/70 px-5 py-2.5 text-sm text-emerald-900">
          <span>
            ✅ Done: {jobDone.counts?.processed ?? jobDone.counts?.total ?? "?"} processed
            {jobDone.counts?.found_owner !== undefined && <> — {jobDone.counts.found_owner} owners</>}
            {jobDone.counts?.found_email !== undefined && <>, {jobDone.counts.found_email} emails</>}
            {jobDone.status === "failed" && <span className="font-semibold text-red-700"> (job failed — see runner logs)</span>}
          </span>
          <button
            onClick={() => {
              setLevelsSel(new Set());
              setJobDone(null);
              router.refresh();
            }}
            className="rounded-md bg-emerald-700 px-2.5 py-1 text-xs font-semibold text-white hover:bg-emerald-800"
          >
            View results
          </button>
          <button onClick={() => setJobDone(null)} className="text-xs text-emerald-700 hover:underline">
            dismiss
          </button>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3 border-b border-zinc-200 px-5 py-3">
        <span className="text-sm font-semibold">
          {heading} <span className="font-normal text-zinc-400">({rows.length})</span>
        </span>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…" className={`w-40 ${inputCls}`} />
        <FilterDropdown
          label="Industry"
          options={industryOptions}
          selected={industriesSel}
          onChange={setIndustriesSel}
        />
        <select value={state} onChange={(e) => setState(e.target.value)} className={inputCls}>
          <option value="all">All states</option>
          {states.map((s) => <option key={s}>{s}</option>)}
        </select>
        {showListFilter && lists.length > 1 && (
          <select value={list} onChange={(e) => setList(e.target.value)} className={`max-w-48 ${inputCls}`}>
            <option value="all">All lists</option>
            {lists.map((s) => <option key={s}>{s}</option>)}
          </select>
        )}
        <span className="ml-auto flex items-center gap-2">
          <button
            onClick={enrichSelected}
            disabled={selected.size === 0 || busy === "enrich" || (estimate !== null && estimate.count === 0)}
            className="rounded-lg bg-emerald-700 px-4 py-1.5 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-40"
            title="Cascading enrichment: free pass → tier 1 (~$0.01/lead) → tier 2 email/LinkedIn hunt (~$0.01/lead marginal; Hunter uses sub quota, not cash), early exit when complete"
          >
            {busy === "enrich" ? "Queuing…" : enrichLabel}
          </button>
          <button
            onClick={exportCsv}
            disabled={rows.length === 0}
            className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-600 hover:bg-zinc-50"
          >
            CSV ({rows.length})
          </button>
        </span>
      </div>

      {notice && <div className="border-b border-zinc-100 bg-amber-50 px-5 py-2 text-sm text-amber-800">{notice}</div>}

      {rows.length === 0 ? (
        <div className="px-5 py-14 text-center text-sm text-zinc-400">
          {leads.length === 0 ? "No leads here yet." : "No leads match the filters."}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-200 text-left text-xs uppercase tracking-wide text-zinc-500">
                <th className="px-4 py-2">
                  <input
                    type="checkbox"
                    checked={rows.length > 0 && rows.every((l) => selected.has(l.id))}
                    onChange={() =>
                      setSelected(
                        rows.every((l) => selected.has(l.id)) ? new Set() : new Set(rows.map((l) => l.id))
                      )
                    }
                    className="accent-emerald-700"
                    title="Select all visible"
                  />
                </th>
                <th className="px-2 py-2 font-medium">
                  <FilterDropdown header label="Level"
                    options={LEVELS.map((lv) => ({ value: lv, label: `${LEVEL_META[lv].dot} ${lv}`, count: levelCounts[lv] }))}
                    selected={levelsSel} onChange={setLevelsSel} />
                </th>
                <th className="px-2 py-2 font-medium">Company</th>
                <th className="px-2 py-2 font-medium">
                  <FilterDropdown header label="Size"
                    options={TIERS.map((t) => ({ value: t, label: TIER_LABELS[t], count: tierCounts[t] }))}
                    selected={tiersSel} onChange={setTiersSel} />
                </th>
                <th className="px-3 py-2 font-medium">
                  <FilterDropdown header label="Industry" options={industryOptions}
                    selected={industriesSel} onChange={setIndustriesSel} />
                </th>
                <th className="px-3 py-2 font-medium">Location</th>
                <th className="px-3 py-2 font-medium">Owner</th>
                <th className="px-3 py-2 font-medium">Channels</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-4 py-2 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {rows.map((l) => {
                const lv = levelOf(l);
                const ready = !!l.owner_name && (!!l.owner_email || !!l.owner_phone);
                const clickable = !!l.company_id;
                return (
                  <tr
                    key={l.id}
                    onClick={() => clickable && router.push(`/companies/${l.company_id}?from=enrichment`)}
                    className={`${clickable ? "cursor-pointer " : ""}hover:bg-zinc-50 ${l.off_target ? "opacity-60" : ""}`}
                    title={clickable ? "Open the CRM company profile (back returns here)" : undefined}
                  >
                    <td className="px-4 py-2.5" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selected.has(l.id)}
                        onChange={() =>
                          setSelected((prev) => {
                            const n = new Set(prev);
                            if (n.has(l.id)) n.delete(l.id);
                            else n.add(l.id);
                            return n;
                          })
                        }
                        className="accent-emerald-700"
                      />
                    </td>
                    <td className="whitespace-nowrap px-2 py-2.5">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${levelChip[lv]}`} title={LEVEL_META[lv].label}>
                        {LEVEL_META[lv].dot} {lv}
                      </span>
                    </td>
                    <td className="max-w-52 px-2 py-2.5">
                      <div className="flex items-center gap-1">
                        <span className={`truncate font-medium ${clickable ? "text-emerald-800" : ""}`}>{l.name}</span>
                        {isPe(l) && (
                          <span
                            className="shrink-0 rounded bg-rose-100 px-1 py-0.5 text-[10px] font-bold text-rose-700"
                            title={peOwnerOf(l) ? `PE-owned: ${peOwnerOf(l)} — not a target` : "PE-owned — not a target"}
                          >
                            PE
                          </span>
                        )}
                        {l.website && (
                          <a
                            href={l.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="shrink-0 text-xs text-zinc-400 hover:text-emerald-700"
                            title="Company website"
                          >
                            ↗
                          </a>
                        )}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-2 py-2.5">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-semibold ${tierChip[l.size?.tier ?? "unsized"]}`}
                        title={l.size
                          ? `${l.size.employees ? `~${l.size.employees[0]}–${l.size.employees[1]} employees` : "sized"} (${l.size.basis}) → ${estShort(l.size.revenue)} rev → ${estShort(l.size.ebitda)} EBITDA · ${l.size.confidence} confidence`
                          : "no usable size signal yet — enrichment adds them"}
                      >
                        {TIER_LABELS[l.size?.tier ?? "unsized"]}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5">
                      {effIndustry(l) ? (
                        <span
                          className={`rounded px-1.5 py-0.5 text-xs font-medium ${
                            l.industry_verified ? "bg-emerald-50 text-emerald-800" : "bg-zinc-100 text-zinc-500"
                          }`}
                          title={l.industry_verified ? "Verified by enrichment" : "Inherited from the list — unverified"}
                        >
                          {effIndustry(l)}
                          {!l.industry_verified && "?"}
                        </span>
                      ) : (
                        <span className="text-xs text-zinc-300">—</span>
                      )}
                      {l.off_target && (
                        <span className="ml-1 rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-semibold text-red-700">off-target</span>
                      )}
                    </td>
                    <td className="max-w-36 truncate whitespace-nowrap px-3 py-2.5 text-zinc-600" title={[l.city, l.state].filter(Boolean).join(", ")}>
                      {[l.city, l.state].filter(Boolean).join(", ") || "—"}
                    </td>
                    {/* inline-editable owner fields (John 7/15 — type the datum you found) */}
                    <td className="max-w-44 px-3 py-2.5 text-zinc-700" onClick={(e) => e.stopPropagation()}>
                      <InlineField endpoint={`/api/leads/${l.id}`} field="owner_name" value={l.owner_name} placeholder="owner…" className="font-medium" />
                      <div className="mt-0.5 flex flex-wrap gap-x-2 text-xs text-zinc-500">
                        <InlineField endpoint={`/api/leads/${l.id}`} field="owner_phone" value={l.owner_phone} type="tel" placeholder="phone…" />
                        <InlineField endpoint={`/api/leads/${l.id}`} field="owner_email" value={l.owner_email} type="email" placeholder="email…" />
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      <ContactDots filled={[!!l.owner_phone, !!l.owner_email, !!l.owner_linkedin]} />
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-xs text-zinc-500">
                      {statusLabel[l.status] ?? l.status}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-right" onClick={(e) => e.stopPropagation()}>
                      {l.company_id ? (
                        // no second click target — the row itself opens the profile (nav-fix directive)
                        <span className="text-xs font-semibold text-emerald-700">in CRM ✓</span>
                      ) : ready ? (
                        <button
                          onClick={() => promote(l.id)}
                          disabled={busy === l.id}
                          className="rounded-md bg-emerald-700 px-2.5 py-1 text-xs font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"
                        >
                          {busy === l.id ? "…" : "+ Companies"}
                        </button>
                      ) : (
                        <span className="text-[11px] text-zinc-300" title="Needs owner name + email/phone — enrich first">
                          not ready
                        </span>
                      )}
                      {l.off_target && l.status !== "dead" && (
                        <button
                          onClick={() => discard(l.id)}
                          disabled={busy === l.id}
                          className="ml-2 rounded-md px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
                        >
                          discard
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <div className="border-t border-zinc-100 px-5 py-2 text-[11px] text-zinc-400">
        Levels: ● full · ◕ contactable · ◑ identified · ◔ basic · ○ raw — most complete sorts first.
        Enrich cascades free → tier 1 → tier 2 with early exit; the estimate is the max. Channel dots =
        usable owner channels only.
      </div>
    </section>
  );
}
