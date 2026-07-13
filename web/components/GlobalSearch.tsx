"use client";

// Global search (Jake's pattern): one box over everything — companies,
// contacts, deals, listings. Debounced /api/search, grouped dropdown,
// ⌘K / Ctrl+K to focus, Enter opens the first hit, Esc closes.
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Hit = { id: string; label: string; sub: string; href: string };
type Results = { companies: Hit[]; contacts: Hit[]; deals: Hit[]; listings: Hit[]; brokers: Hit[] };

const EMPTY: Results = { companies: [], contacts: [], deals: [], listings: [], brokers: [] };
const GROUPS: { key: keyof Results; label: string }[] = [
  { key: "deals", label: "Deals" },
  { key: "companies", label: "Companies" },
  { key: "contacts", label: "Contacts" },
  { key: "brokers", label: "Brokers" },
  { key: "listings", label: "Listings" },
];

export default function GlobalSearch() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Results>(EMPTY);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const seq = useRef(0);

  // ⌘K / Ctrl+K focuses the box from anywhere.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Close when clicking outside.
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const search = useCallback(async (term: string) => {
    const my = ++seq.current;
    if (term.trim().length < 2) {
      setResults(EMPTY);
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(term.trim())}`);
      if (res.ok && my === seq.current) setResults({ ...EMPTY, ...(await res.json()) });
    } finally {
      if (my === seq.current) setBusy(false);
    }
  }, []);

  // Debounce.
  useEffect(() => {
    const t = setTimeout(() => search(q), 250);
    return () => clearTimeout(t);
  }, [q, search]);

  const firstHit = GROUPS.flatMap((g) => results[g.key])[0];
  const total = GROUPS.reduce((s, g) => s + results[g.key].length, 0);

  function go(href: string) {
    setOpen(false);
    setQ("");
    setResults(EMPTY);
    router.push(href);
  }

  return (
    <div ref={boxRef} className="relative w-full max-w-md">
      <input
        ref={inputRef}
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "Escape") setOpen(false);
          if (e.key === "Enter" && firstHit) go(firstHit.href);
        }}
        placeholder="Search deals, companies, contacts, listings…  (⌘K)"
        className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm outline-none focus:border-emerald-600"
      />
      {open && q.trim().length >= 2 && (
        <div className="absolute z-50 mt-1 max-h-[70vh] w-full overflow-y-auto rounded-xl border border-zinc-200 bg-white shadow-lg">
          {total === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-zinc-400">
              {busy ? "Searching…" : `No matches for “${q.trim()}”`}
            </div>
          ) : (
            GROUPS.filter((g) => results[g.key].length > 0).map((g) => (
              <div key={g.key}>
                <div className="border-b border-zinc-100 bg-zinc-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
                  {g.label}
                </div>
                {results[g.key].map((h) => (
                  <button
                    key={h.id}
                    onClick={() => go(h.href)}
                    className="flex w-full items-baseline justify-between gap-3 px-3 py-2 text-left hover:bg-emerald-50"
                  >
                    <span className="truncate text-sm font-medium">{h.label}</span>
                    <span className="shrink-0 text-xs text-zinc-500">{h.sub}</span>
                  </button>
                ))}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
