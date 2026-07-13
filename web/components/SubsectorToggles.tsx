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
  onAddExclude,
}: {
  keywords: string[]; // current include keywords (lowercased or not)
  onChange: (next: string[]) => void;
  onAddExclude?: (terms: string[]) => void; // generated exclude keywords for a new industry
}) {
  const [taxonomy, setTaxonomy] = useState<Taxon[] | null>(null);
  const [newIndustry, setNewIndustry] = useState("");
  const [adding, setAdding] = useState(false);
  const [addErr, setAddErr] = useState<string | null>(null);

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

  // John 7/13: type ONE industry name; Claude brainstorms the keyword set
  // (POST /api/criteria/keywords), the industry persists as a chip
  // (POST /api/taxonomy) toggled ON, and its keywords land in include/exclude.
  async function addIndustry() {
    const name = newIndustry.trim();
    if (!name || adding) return;
    setAdding(true);
    setAddErr(null);
    try {
      const kwRes = await fetch("/api/criteria/keywords", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ industry: name }),
      });
      if (!kwRes.ok) throw new Error((await kwRes.json()).error ?? "keyword generation failed");
      const kw: { include?: string[]; exclude?: string[] } = await kwRes.json();
      const include = (kw.include ?? []).map((s) => s.toLowerCase());

      // persist as a real subsector chip (survives reloads; classifier can snap to it)
      const label = name.replace(/\w\S*/g, (w) => w[0].toUpperCase() + w.slice(1));
      const taxRes = await fetch("/api/taxonomy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label, aliases: include }),
      });
      const tax = taxRes.ok ? (await taxRes.json()).industry : { id: label.toLowerCase().replace(/[^a-z0-9]+/g, "-"), label, aliases: include, thesis_core: false };

      setTaxonomy((prev) => {
        const rest = (prev ?? []).filter((t) => t.id !== tax.id);
        return [...rest, tax];
      });
      // toggle the new industry ON: label + generated keywords into include
      const existing = new Set(keywords.map((k) => k.toLowerCase()));
      onChange([...keywords, ...[tax.label, ...tax.aliases].filter((x: string) => !existing.has(x.toLowerCase()))]);
      if (kw.exclude?.length && onAddExclude) onAddExclude(kw.exclude.map((s) => s.toLowerCase()));
      setNewIndustry("");
    } catch (e) {
      setAddErr(e instanceof Error ? e.message : "failed to add industry");
    } finally {
      setAdding(false);
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
      <div className="flex flex-wrap items-center gap-2 pt-1">
        <input
          value={newIndustry}
          onChange={(e) => setNewIndustry(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addIndustry(); } }}
          placeholder='Add an industry — e.g. "hydraulic services" — keywords generate automatically'
          className="w-full max-w-md rounded-md border border-zinc-300 px-3 py-1.5 text-sm outline-none focus:border-emerald-600"
          disabled={adding}
        />
        <button
          onClick={addIndustry}
          disabled={adding || !newIndustry.trim()}
          className="rounded-lg bg-emerald-700 px-4 py-1.5 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-40"
        >
          {adding ? "Brainstorming keywords…" : "+ Add industry"}
        </button>
        {addErr && <span className="text-xs text-red-600">{addErr}</span>}
      </div>
      <p className="text-[11px] text-zinc-400">
        ★ = thesis-core. Toggling writes the canonical keyword + aliases into the include list below —
        hand-typed keywords are never touched. Adding an industry above lets Claude brainstorm the
        keyword set for you and saves it as a new chip, toggled on.
      </p>
    </div>
  );
}
