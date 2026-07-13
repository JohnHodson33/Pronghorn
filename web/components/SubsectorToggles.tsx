"use client";

// Subsector toggle chips for the screening criteria — one click turns a
// canonical industry (from /api/taxonomy) on/off. Toggling ON adds the
// taxonomy label + its aliases to the include-keywords set; OFF removes
// them. The keyword list stays the source of truth (the scraper reads it),
// so free-text keywords typed by hand are preserved untouched.
import { useEffect, useState } from "react";

export type Taxon = { id: string; label: string; aliases: string[]; thesis_core: boolean };

export default function SubsectorToggles({
  keywords,
  onChange,
}: {
  keywords: string[]; // current include keywords (lowercased or not)
  onChange: (next: string[]) => void;
}) {
  const [taxonomy, setTaxonomy] = useState<Taxon[] | null>(null);

  useEffect(() => {
    fetch("/api/taxonomy")
      .then((r) => (r.ok ? r.json() : null))
      .then((j) =>
        setTaxonomy(
          (j?.industries ?? []).map((i: Partial<Taxon>) => ({
            id: i.id ?? i.label,
            label: i.label ?? "",
            aliases: i.aliases ?? [],
            thesis_core: !!i.thesis_core,
          }))
        )
      )
      .catch(() => setTaxonomy([]));
  }, []);

  if (taxonomy === null) return <div className="text-xs text-zinc-400">Loading subsectors…</div>;
  if (taxonomy.length === 0) return null;

  const kwSet = new Set(keywords.map((k) => k.toLowerCase()));
  const isOn = (t: Taxon) => kwSet.has(t.label.toLowerCase()) || t.aliases.some((a) => kwSet.has(a.toLowerCase()));

  function toggle(t: Taxon) {
    const terms = [t.label, ...t.aliases].map((x) => x.toLowerCase());
    if (isOn(t)) {
      onChange(keywords.filter((k) => !terms.includes(k.toLowerCase())));
    } else {
      const existing = new Set(keywords.map((k) => k.toLowerCase()));
      onChange([...keywords, ...[t.label, ...t.aliases].filter((x) => !existing.has(x.toLowerCase()))]);
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {taxonomy.map((t) => {
          const on = isOn(t);
          return (
            <button
              key={t.id}
              onClick={() => toggle(t)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                on
                  ? "bg-emerald-700 text-white"
                  : "border border-zinc-200 bg-white text-zinc-500 hover:border-emerald-600 hover:text-emerald-700"
              } ${t.thesis_core && !on ? "border-emerald-300" : ""}`}
              title={t.aliases.length ? `Also matches: ${t.aliases.join(", ")}` : undefined}
            >
              {on ? "✓ " : ""}
              {t.label}
              {t.thesis_core && <span className="ml-1 opacity-70">★</span>}
            </button>
          );
        })}
      </div>
      <p className="text-[11px] text-zinc-400">
        ★ = thesis-core. Toggling writes the canonical keyword + aliases into the include list below —
        hand-typed keywords are never touched.
      </p>
    </div>
  );
}
