"use client";

// The shared-criteria strip on the list-building form — makes "ONE criteria
// set, both funnels" visible: shows the active subsectors + priority states
// from screen_profiles; clicking one fills the build form.
import { useEffect, useState } from "react";

type Taxon = { label: string; aliases: string[] };

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
        {subsectors.map((s) => (
          <button
            key={s}
            onClick={() => onPickIndustry(s)}
            className="rounded-full border border-emerald-300 bg-white px-2.5 py-0.5 font-medium text-emerald-800 hover:bg-emerald-100"
            title="Fill the industry field"
          >
            {s}
          </button>
        ))}
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
