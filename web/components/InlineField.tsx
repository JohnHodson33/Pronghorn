"use client";

// Inline edit everywhere (John 7/15 — "when I find a datum myself I add it
// directly instead of asking an agent"). Click any wrapped field → input →
// Enter/blur saves via PATCH {[field]: value} to the given endpoint; Escape
// cancels. Optimistic with revert-on-error. Human-entered values WIN over
// future enrichment — the PATCH routes record provenance where cheap and the
// fill-blanks write paths never overwrite non-null values.
// Mobile: native tap target, 16px input font (no iOS zoom), full-width input.
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

const fmtMoney = (v: string | number): string => {
  const n = Number(v);
  if (!Number.isFinite(n)) return String(v);
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `$${Math.round(n / 1000)}K`;
  return `$${n}`;
};

export default function InlineField({
  endpoint,
  field,
  value,
  type = "text",
  placeholder = "add…",
  className = "",
  format,
  refreshOnSave = true,
}: {
  endpoint: string;          // e.g. /api/companies/abc123
  field: string;             // PATCH body key, e.g. "city"
  value: string | number | null;
  type?: "text" | "email" | "tel" | "url" | "number";
  placeholder?: string;      // shown when the value is blank
  className?: string;        // styles for the display state
  // declarative formatter (server components can't pass functions to client
  // components): "money" renders $1.2M / $850K style
  format?: "money";
  refreshOnSave?: boolean;   // router.refresh() so server components recompute
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [local, setLocal] = useState(value); // optimistic display value
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => setLocal(value), [value]);
  useEffect(() => {
    if (editing) inputRef.current?.select();
  }, [editing]);

  function begin(e: React.MouseEvent) {
    e.stopPropagation();
    e.preventDefault();
    setDraft(local === null || local === undefined ? "" : String(local));
    setErr(null);
    setEditing(true);
  }

  async function save() {
    const next = draft.trim();
    const prev = local;
    setEditing(false);
    if (next === (prev === null || prev === undefined ? "" : String(prev))) return;
    setLocal(next || null);
    setBusy(true);
    const res = await fetch(endpoint, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: next || null }),
    });
    setBusy(false);
    if (!res.ok) {
      setLocal(prev); // revert
      setErr((await res.json().catch(() => ({}))).error ?? "save failed");
      setTimeout(() => setErr(null), 4000);
    } else if (refreshOnSave) {
      router.refresh();
    }
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        type={type}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={save}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
          if (e.key === "Escape") { setDraft(String(local ?? "")); setEditing(false); }
        }}
        onClick={(e) => e.stopPropagation()}
        className="w-full min-w-24 max-w-full rounded-md border border-emerald-500 bg-white px-1.5 py-0.5 text-[16px] leading-tight outline-none sm:text-sm"
        placeholder={placeholder}
      />
    );
  }

  const empty = local === null || local === undefined || local === "";
  return (
    <span className="group/inline inline-flex max-w-full items-center gap-1">
      <button
        type="button"
        onClick={begin}
        title="Click to edit"
        className={`min-w-0 cursor-text truncate rounded px-0.5 text-left hover:bg-emerald-50 hover:ring-1 hover:ring-emerald-200 ${
          empty ? "italic text-zinc-300" : ""
        } ${className}`}
      >
        {empty ? placeholder : format === "money" ? fmtMoney(local!) : String(local)}
        {busy && <span className="ml-1 animate-pulse text-emerald-600">·</span>}
      </button>
      <span aria-hidden className="hidden shrink-0 text-[10px] text-zinc-300 group-hover/inline:inline">✎</span>
      {err && <span className="shrink-0 text-xs text-red-600">{err}</span>}
    </span>
  );
}
