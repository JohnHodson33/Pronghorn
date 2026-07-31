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
import SortHeader from "@/components/SortHeader";
import ScrollShell from "@/components/ScrollShell";
import { presenceOptions, presenceMatch } from "@/lib/list-filters";

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

type SortKey = "level" | "company" | "size" | "revenue" | "ebitda" | "industry" | "location" | "owner" | "status" | "email" | "phone" | "linkedin";

// The lead list a row came from ("Tree Care — Phoenix") — provenance, not a
// column; it filters from the toolbar since there's no header to hang it on.
const listNameOf = (l: EnrichmentLead) =>
  l.list ? `${l.list.industry}${l.list.geography ? ` — ${l.list.geography}` : ""}` : null;

type Estimate = { count: number; tier1: number; tier2: number; estimate: number };
type Job = {
  id: string;
  status: string;
  counts: { total?: number; processed?: number; tier1?: number; tier2?: number; found_owner?: number; found_email?: number } | null;
  created_at: string;
  finished_at: string | null;
};

// The dots are RETIRED platform-wide (John 7/16: "I'd rather just have the
// actual contacts — phone, email, LinkedIn — and see if they're filled").
// The VALUE stays an InlineField so John can still type a datum he found;
// the icon beside it is the real mailto:/tel:/profile link, so one cell does
// both jobs without the click fighting itself.
function ChannelCell({
  leadId, field, value, type, placeholder, href, icon, iconTitle,
}: {
  leadId: string;
  field: "owner_email" | "owner_phone" | "owner_linkedin";
  value: string | null;
  type: "email" | "tel" | "url";
  placeholder: string;
  href: string | null;
  icon: string;
  iconTitle: string;
}) {
  return (
    <span className="flex items-center gap-1">
      <InlineField
        endpoint={`/api/leads/${leadId}`}
        field={field}
        value={value}
        type={type}
        placeholder={placeholder}
        emptyLabel="—"
        className="min-w-0 truncate text-xs"
      />
      {href && (
        <a
          href={href}
          target={type === "url" ? "_blank" : undefined}
          rel={type === "url" ? "noopener noreferrer" : undefined}
          onClick={(e) => e.stopPropagation()}
          className="shrink-0 text-xs text-zinc-400 hover:text-emerald-700"
          title={iconTitle}
        >
          {icon}
        </a>
      )}
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
  // LIST-UX STANDARD: the state/list <select>s are retired for multi-select
  // dropdowns; the old single-value saved shape still hydrates via toSet.
  const [statesSel, setStatesSel] = useState<Set<string>>(toSet(saved.state));
  const [listsSel, setListsSel] = useState<Set<string>>(toSet(saved.list));
  const [statusSel, setStatusSel] = useState<Set<string>>(toSet(saved.status));
  // one combined "reach" control became three — John wants "has phone" on the
  // Phone column, not buried in a shared dropdown on Email
  const [emailSel, setEmailSel] = useState<Set<string>>(toSet(saved.email));
  const [phoneSel, setPhoneSel] = useState<Set<string>>(toSet(saved.phone));
  const [linkedinSel, setLinkedinSel] = useState<Set<string>>(toSet(saved.linkedin));
  const [levelsSel, setLevelsSel] = useState<Set<string>>(toSet(saved.level));
  const [tiersSel, setTiersSel] = useState<Set<string>>(toSet(saved.tier));
  const [sortKey, setSortKey] = useState<SortKey | null>((saved.sort as SortKey) || null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">(saved.dir === "asc" ? "asc" : "desc");
  const [showOffTarget, setShowOffTarget] = useState(saved.offTarget === "1");
  const [hidePe, setHidePe] = useState(saved.hidePe === "1"); // PE-owned aren't targets (John 7/15)
  const isPe = (l: EnrichmentLead) => !!(l.enrichment as { pe_owned?: boolean } | null)?.pe_owned;
  const peOwnerOf = (l: EnrichmentLead) => (l.enrichment as { pe_owner?: string } | null)?.pe_owner ?? null;
  useEffect(() => {
    try {
      sessionStorage.setItem(
        FILTER_KEY,
        JSON.stringify({
          q, industry: [...industriesSel].join(","),
          state: [...statesSel].join(","), list: [...listsSel].join(","),
          status: [...statusSel].join(","),
          email: [...emailSel].join(","), phone: [...phoneSel].join(","),
          linkedin: [...linkedinSel].join(","),
          level: [...levelsSel].join(","), tier: [...tiersSel].join(","),
          offTarget: showOffTarget ? "1" : "0", hidePe: hidePe ? "1" : "0",
          sort: sortKey ?? "", dir: sortDir,
        })
      );
    } catch {}
  }, [q, industriesSel, statesSel, listsSel, statusSel, emailSel, phoneSel, linkedinSel, levelsSel, tiersSel, showOffTarget, hidePe, sortKey, sortDir]);
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
  const countBy = (pick: (l: EnrichmentLead) => string | null) => {
    const m: Record<string, number> = {};
    for (const l of leads) { const v = pick(l); if (v) m[v] = (m[v] ?? 0) + 1; }
    return m;
  };
  const stateOptions = useMemo(() => {
    const m = countBy((l) => l.state);
    return Object.keys(m).sort().map((value) => ({ value, label: value, count: m[value] }));
  }, [leads]);
  const listOptions = useMemo(() => {
    const m = countBy(listNameOf);
    return Object.keys(m).sort().map((value) => ({ value, label: value, count: m[value] }));
  }, [leads]);
  const onTarget = useMemo(() => leads.filter((l) => !l.off_target), [leads]);
  const emailOptions = useMemo(() => presenceOptions(onTarget, (l) => l.owner_email, "email"), [onTarget]);
  const phoneOptions = useMemo(() => presenceOptions(onTarget, (l) => l.owner_phone, "phone"), [onTarget]);
  const linkedinOptions = useMemo(() => presenceOptions(onTarget, (l) => l.owner_linkedin, "LinkedIn"), [onTarget]);
  const statusOptions = useMemo(() => {
    const m = countBy((l) => l.status);
    return Object.keys(m)
      .sort((a, b) => m[b] - m[a])
      .map((value) => ({ value, label: statusLabel[value] ?? value, count: m[value] }));
  }, [leads]);

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
      if (statesSel.size && !statesSel.has(l.state ?? "")) return false;
      if (listsSel.size && !listsSel.has(listNameOf(l) ?? "")) return false;
      if (statusSel.size && !statusSel.has(l.status)) return false;
      if (!presenceMatch(emailSel, l.owner_email)) return false;
      if (!presenceMatch(phoneSel, l.owner_phone)) return false;
      if (!presenceMatch(linkedinSel, l.owner_linkedin)) return false;
      if (
        q &&
        !`${l.name} ${l.city ?? ""} ${l.state ?? ""} ${l.owner_name ?? ""} ${effIndustry(l) ?? ""}`
          .toLowerCase()
          .includes(q.toLowerCase())
      )
        return false;
      return true;
    });
    // Default (no explicit column sort): most complete first — results float
    // to the top — then newest. An explicit SortHeader click wins.
    const byDefault = (a: EnrichmentLead, b: EnrichmentLead) => {
      const d = LEVELS.indexOf(levelOf(a)) - LEVELS.indexOf(levelOf(b));
      return d !== 0 ? d : b.created_at.localeCompare(a.created_at);
    };
    if (!sortKey) return filtered.sort(byDefault);
    const text = (v: string | null | undefined) => String(v ?? "zzz").toLowerCase();
    return filtered.sort((a, b) => {
      let cmp: number;
      switch (sortKey) {
        case "level": cmp = LEVELS.indexOf(levelOf(a)) - LEVELS.indexOf(levelOf(b)); break;
        case "size": cmp = TIERS.indexOf(a.size?.tier ?? "unsized") - TIERS.indexOf(b.size?.tier ?? "unsized"); break;
        // ~Rev / ~EBITDA: sort by estimate midpoint; unsized (null) sorts last
        case "revenue": { const av = a.size ? (a.size.revenue[0]+a.size.revenue[1])/2 : -1, bv = b.size ? (b.size.revenue[0]+b.size.revenue[1])/2 : -1; cmp = av - bv; break; }
        case "ebitda": { const av = a.size ? (a.size.ebitda[0]+a.size.ebitda[1])/2 : -1, bv = b.size ? (b.size.ebitda[0]+b.size.ebitda[1])/2 : -1; cmp = av - bv; break; }
        case "company": cmp = text(a.name).localeCompare(text(b.name)); break;
        case "industry": cmp = text(effIndustry(a)).localeCompare(text(effIndustry(b))); break;
        case "location": cmp = text([a.state, a.city].filter(Boolean).join(" ")).localeCompare(text([b.state, b.city].filter(Boolean).join(" "))); break;
        case "owner": cmp = text(a.owner_name).localeCompare(text(b.owner_name)); break;
        // channel columns sort filled-before-empty, then by value — the point
        // is seeing who gained a channel, not alphabetising addresses
        case "email": cmp = text(a.owner_email).localeCompare(text(b.owner_email)); break;
        case "phone": cmp = text(a.owner_phone).localeCompare(text(b.owner_phone)); break;
        case "linkedin": cmp = text(a.owner_linkedin).localeCompare(text(b.owner_linkedin)); break;
        default: cmp = text(statusLabel[a.status] ?? a.status).localeCompare(text(statusLabel[b.status] ?? b.status));
      }
      return cmp !== 0 ? (sortDir === "asc" ? cmp : -cmp) : byDefault(a, b);
    });
  }, [leads, q, industriesSel, statesSel, listsSel, statusSel, emailSel, phoneSel, linkedinSel, levelsSel, tiersSel, showOffTarget, hidePe, sortKey, sortDir]);

  const sortSet = (key: SortKey) => (d: "asc" | "desc" | null) => {
    if (!d) setSortKey(null);
    else { setSortKey(key); setSortDir(d); }
  };

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
        ["name", "completeness", "size_tier", "est_revenue", "est_ebitda", "industry_verified", "list", "website", "phone", "city", "state",
         "owner_name", "owner_email", "owner_phone", "owner_linkedin", "status", "off_target"],
        rows.map((l) => [
          l.name, levelOf(l), TIER_LABELS[l.size?.tier ?? "unsized"],
          l.size ? Math.round((l.size.revenue[0]+l.size.revenue[1])/2) : null,
          l.size ? Math.round((l.size.ebitda[0]+l.size.ebitda[1])/2) : null,
          effIndustry(l), l.list ? `${l.list.industry}${l.list.geography ? ` — ${l.list.geography}` : ""}` : null,
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
        {/* LIST-UX STANDARD: industry/state/status filter from their own column
            headers now — the toolbar keeps only search, the source-list filter
            (no column to hang it on), and the actions. */}
        {showListFilter && listOptions.length > 1 && (
          <FilterDropdown label="Source list" options={listOptions} selected={listsSel} onChange={setListsSel} />
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
        <ScrollShell>
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
                  <span className="inline-flex items-center gap-1">
                    <SortHeader label="Level" active={sortKey === "level"} dir={sortDir} onChange={sortSet("level")} />
                    <FilterDropdown header label="" name="Level"
                      options={LEVELS.map((lv) => ({ value: lv, label: `${LEVEL_META[lv].dot} ${lv}`, count: levelCounts[lv] }))}
                      selected={levelsSel} onChange={setLevelsSel} />
                  </span>
                </th>
                <th className="px-2 py-2 font-medium">
                  <SortHeader label="Company" active={sortKey === "company"} dir={sortDir} onChange={sortSet("company")} />
                </th>
                <th className="px-2 py-2 font-medium">
                  <span className="inline-flex items-center gap-1">
                    <SortHeader label="Size" active={sortKey === "size"} dir={sortDir} onChange={sortSet("size")} />
                    <FilterDropdown header label="" name="Size"
                      options={TIERS.map((t) => ({ value: t, label: TIER_LABELS[t], count: tierCounts[t] }))}
                      selected={tiersSel} onChange={setTiersSel} />
                  </span>
                </th>
                {/* est. Revenue/EBITDA on EVERY row (John 7/20 — show the numbers, not just the tier) */}
                <th className="px-2 py-2 text-right font-medium">
                  <SortHeader label="~Rev" numeric active={sortKey === "revenue"} dir={sortDir} onChange={sortSet("revenue")} />
                </th>
                <th className="px-2 py-2 text-right font-medium">
                  <SortHeader label="~EBITDA" numeric active={sortKey === "ebitda"} dir={sortDir} onChange={sortSet("ebitda")} />
                </th>
                <th className="px-3 py-2 font-medium">
                  <span className="inline-flex items-center gap-1">
                    <SortHeader label="Industry" active={sortKey === "industry"} dir={sortDir} onChange={sortSet("industry")} />
                    <FilterDropdown header label="" name="Industry" options={industryOptions}
                      selected={industriesSel} onChange={setIndustriesSel} />
                  </span>
                </th>
                <th className="px-3 py-2 font-medium">
                  <span className="inline-flex items-center gap-1">
                    <SortHeader label="Location" active={sortKey === "location"} dir={sortDir} onChange={sortSet("location")} />
                    <FilterDropdown header label="" name="State" options={stateOptions}
                      selected={statesSel} onChange={setStatesSel} />
                  </span>
                </th>
                <th className="px-3 py-2 font-medium">
                  <SortHeader label="Owner" active={sortKey === "owner"} dir={sortDir} onChange={sortSet("owner")} />
                </th>
                {/* dots → labeled columns with the actual values (John 7/16);
                    each channel owns its OWN has/missing filter (John 7/21) */}
                <th className="px-3 py-2 font-medium">
                  <span className="inline-flex items-center gap-1">
                    <SortHeader label="Email" active={sortKey === "email"} dir={sortDir} onChange={sortSet("email")} />
                    <FilterDropdown header label="" name="Email" options={emailOptions} selected={emailSel} onChange={setEmailSel} />
                  </span>
                </th>
                <th className="px-3 py-2 font-medium">
                  <span className="inline-flex items-center gap-1">
                    <SortHeader label="Phone" active={sortKey === "phone"} dir={sortDir} onChange={sortSet("phone")} />
                    <FilterDropdown header label="" name="Phone" options={phoneOptions} selected={phoneSel} onChange={setPhoneSel} />
                  </span>
                </th>
                <th className="px-3 py-2 font-medium">
                  <span className="inline-flex items-center gap-1">
                    <SortHeader label="LinkedIn" active={sortKey === "linkedin"} dir={sortDir} onChange={sortSet("linkedin")} />
                    <FilterDropdown header label="" name="LinkedIn" options={linkedinOptions} selected={linkedinSel} onChange={setLinkedinSel} />
                  </span>
                </th>
                <th className="px-3 py-2 font-medium">
                  <span className="inline-flex items-center gap-1">
                    <SortHeader label="Status" active={sortKey === "status"} dir={sortDir} onChange={sortSet("status")} />
                    <FilterDropdown header label="" name="Status" options={statusOptions}
                      selected={statusSel} onChange={setStatusSel} />
                  </span>
                </th>
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
                    <td className="whitespace-nowrap px-2 py-2.5 text-right text-xs text-zinc-600 tabular-nums"
                        title={l.size ? `estimate via ${l.size.basis} · ${l.size.confidence} confidence` : "no size signal yet"}>
                      {l.size ? estShort(l.size.revenue) : <span className="text-zinc-300">—</span>}
                    </td>
                    <td className="whitespace-nowrap px-2 py-2.5 text-right text-xs text-zinc-600 tabular-nums"
                        title={l.size ? `est. revenue × industry margin` : "no size signal yet"}>
                      {l.size ? estShort(l.size.ebitda) : <span className="text-zinc-300">—</span>}
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
                    </td>
                    <td className="max-w-52 px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                      <ChannelCell leadId={l.id} field="owner_email" value={l.owner_email} type="email"
                        placeholder="email…" href={l.owner_email ? `mailto:${l.owner_email}` : null}
                        icon="✉" iconTitle={`Email ${l.owner_email}`} />
                    </td>
                    <td className="max-w-40 px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                      <ChannelCell leadId={l.id} field="owner_phone" value={l.owner_phone} type="tel"
                        placeholder="phone…" href={l.owner_phone ? `tel:${l.owner_phone}` : null}
                        icon="☎" iconTitle={`Call ${l.owner_phone}`} />
                    </td>
                    <td className="max-w-40 px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                      <ChannelCell leadId={l.id} field="owner_linkedin" value={l.owner_linkedin} type="url"
                        placeholder="linkedin…" href={l.owner_linkedin} icon="↗" iconTitle="Open LinkedIn profile" />
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
        </ScrollShell>
      )}
      <div className="border-t border-zinc-100 px-5 py-2 text-[11px] text-zinc-400">
        Levels: ● full · ◕ contactable · ◑ identified · ◔ basic · ○ raw — most complete sorts first.
        Enrich cascades free → tier 1 → tier 2 with early exit; the estimate is the max. Email/Phone/
        LinkedIn show the actual owner channel — click a value to edit it, or the icon to use it.
      </div>
    </section>
  );
}
