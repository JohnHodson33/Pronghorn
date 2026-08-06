"use client";

// The shared-criteria strip on the list-building form — makes "ONE criteria
// set, both funnels" visible: shows the active subsectors + priority states
// from screen_profiles; clicking one fills the build form.
import { useEffect, useState } from "react";

type Taxon = { label: string; aliases: string[] };

// The focus list holds canonical STEMS ("PEST", "LANDSCAPE", "TREE_CARE") while
// the taxonomy carries human labels ("Pest Control", "Landscaping", "Tree
// Care"), so an exact match wrongly flags Pest Control and Landscaping as
// off-focus — worse than not flagging at all, since it claims the workers skip
// something they process. Match on a shared prefix instead: the whole shorter
// token (min 4 chars) must line up, which pairs PEST/PEST_CONTROL and
// LANDSCAPE/LANDSCAPING while keeping PLUMBING and ROOFING out.
const canon = (s: string) => s.toUpperCase().replace(/[^A-Z0-9]+/g, "_");
export function inFocus(label: string, focus: string[]): boolean {
  const key = canon(label);
  return focus.some((f) => {
    const t = canon(f);
    const need = Math.min(6, Math.min(t.length, key.length));
    if (need < 4) return t === key;
    let i = 0;
    while (i < t.length && i < key.length && t[i] === key[i]) i++;
    return i >= need;
  });
}

export default function CriteriaStrip({
  onPickIndustry,
  onPickGeography,
}: {
  onPickIndustry: (v: string) => void;
  onPickGeography: (v: string) => void;
}) {
  const [subsectors, setSubsectors] = useState<string[]>([]);
  const [states, setStates] = useState<string[]>([]);
  const [sizeLine, setSizeLine] = useState<string | null>(null);
  // FOCUS GATE (John 8/4: tree care primary; landscape/irrigation/lawn/pest
  // ancillary). The scraper workers already SKIP out-of-focus rows, but this
  // form still offers every screened subsector — so building a Pool Services
  // list silently spends Serper credits the gate exists to protect. Flag it,
  // never block it (John's rule) — the chip still works if he wants it.
  const [focus, setFocus] = useState<string[] | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [cRes, tRes] = await Promise.all([fetch("/api/criteria"), fetch("/api/taxonomy")]);
        if (!cRes.ok) return;
        const c = await cRes.json();
        const kw = new Set(((c.industry_keywords_include ?? []) as string[]).map((k) => k.toLowerCase()));
        if (tRes.ok) {
          const t = await tRes.json();
          const tax: Taxon[] = (t.industries ?? []).map((i: Partial<Taxon>) => ({
            label: i.label ?? "",
            aliases: i.aliases ?? [],
          }));
          setSubsectors(
            tax
              .filter((x) => kw.has(x.label.toLowerCase()) || x.aliases.some((a) => kw.has(a.toLowerCase())))
              .map((x) => x.label)
          );
        }
        setStates((c.priority_states ?? []) as string[]);
        // same source of truth the gate reads (app_config focus_industries),
        // surfaced by /api/costs — absent field just means "don't flag"
        try {
          const f = await fetch("/api/costs").then((r) => (r.ok ? r.json() : null));
          if (Array.isArray(f?.serperBurn?.focusList)) setFocus(f.serperBurn.focusList as string[]);
        } catch {}
        const money = (n: number | null) =>
          n === null ? null : n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(1)}M` : `$${Math.round(n / 1000)}K`;
        const lo = money(c.min_cash_flow === null ? null : Number(c.min_cash_flow));
        const hi = money(c.max_cash_flow === null ? null : Number(c.max_cash_flow));
        if (lo || hi) setSizeLine(`${lo ?? "no floor"} — ${hi ?? "no cap"} cash flow`);
      } catch {}
    })();
  }, []);

  if (subsectors.length === 0 && states.length === 0) return null;

  return (
    <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 px-4 py-3">
      <div className="flex flex-wrap items-center gap-1.5 text-xs">
        <a href="/criteria" className="mr-1 font-semibold text-emerald-800 hover:underline">
          Screening criteria →
        </a>
        {subsectors.map((s) => {
          const off = focus !== null && !inFocus(s, focus);
          return (
            <button
              key={s}
              onClick={() => onPickIndustry(s)}
              className={`rounded-full border px-2.5 py-0.5 font-medium ${
                off
                  ? "border-amber-300 bg-white text-amber-800 hover:bg-amber-50"
                  : "border-emerald-300 bg-white text-emerald-800 hover:bg-emerald-100"
              }`}
              title={off
                ? `Outside the current thesis focus — the nightly workers skip ${s} rows, so a list built here won't get enriched or verified until the focus list changes. Still clickable if you want it.`
                : "Fill the industry field"}
            >
              {s}{off && <span className="ml-1 opacity-70">off-focus</span>}
            </button>
          );
        })}
        {states.map((s) => (
          <button
            key={s}
            onClick={() => onPickGeography(s)}
            className="rounded-full border border-zinc-300 bg-white px-2 py-0.5 font-semibold text-zinc-600 hover:bg-zinc-100"
            title="Fill the geography field"
          >
            {s}★
          </button>
        ))}
        {sizeLine && <span className="ml-1 text-zinc-500">{sizeLine}</span>}
        <span className="ml-auto text-[11px] text-zinc-400">one criteria set — both funnels read it</span>
      </div>
    </div>
  );
}
