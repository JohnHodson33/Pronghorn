"use client";

// CardList — the mobile half of the LIST-UX STANDARD (item 6: "tables
// collapse to card layouts under ~640px instead of tiny columns").
//
// Usage: the table keeps its markup inside a `hidden sm:block` wrapper and the
// page ALSO renders <CardList> (which is `sm:hidden`) from the SAME
// filtered+sorted rows. Filter/sort parity on the phone is a standing rule —
// the column-header controls disappear with the table, so the page passes its
// FilterDropdowns (labeled, non-header mode) via `controls` and its sortable
// columns via `sort`; both render in a thumb-scrollable strip above the cards.
import { useEffect, useRef, useState } from "react";

export type CardField = {
  label: string;
  value: React.ReactNode; // pass "—" (or skip the field) when empty
};

export type CardSpec = {
  key: string;
  title: React.ReactNode; // bold first line — the row's identity
  titleRight?: React.ReactNode; // chip/badge pinned right of the title
  fields: CardField[];
  onClick?: () => void;
  href?: string;
};

export type SortOption = { value: string; label: string; numeric?: boolean };

function MobileSort({
  options,
  sortKey,
  dir,
  onChange,
}: {
  options: SortOption[];
  sortKey: string | null;
  dir: "asc" | "desc";
  onChange: (key: string, dir: "asc" | "desc" | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  const activeOpt = options.find((o) => o.value === sortKey) ?? null;
  // same cycle as SortHeader: first-direction → other-direction → off
  function tap(o: SortOption) {
    const first: "asc" | "desc" = o.numeric ? "desc" : "asc";
    const second: "asc" | "desc" = o.numeric ? "asc" : "desc";
    if (sortKey !== o.value) onChange(o.value, first);
    else if (dir === first) onChange(o.value, second);
    else onChange(o.value, null);
  }
  return (
    <div ref={ref} className="relative inline-block shrink-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm ${
          activeOpt ? "border-emerald-600 bg-emerald-50 font-medium text-emerald-800" : "border-zinc-300 text-zinc-700"
        }`}
      >
        {activeOpt ? (
          <>
            {activeOpt.label} <span aria-hidden>{dir === "desc" ? "▼" : "▲"}</span>
          </>
        ) : (
          "Sort"
        )}
        <span aria-hidden className="text-[9px] opacity-60">▼</span>
      </button>
      {open && (
        <div className="absolute left-0 z-30 mt-1 max-h-72 w-48 overflow-y-auto rounded-lg border border-zinc-200 bg-white py-1 shadow-lg">
          {options.map((o) => {
            const active = o.value === sortKey;
            return (
              <button
                key={o.value}
                onClick={() => tap(o)}
                className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-zinc-50 ${
                  active ? "font-semibold text-emerald-800" : "text-zinc-800"
                }`}
              >
                {o.label}
                {active && <span aria-hidden>{dir === "desc" ? "▼" : "▲"}</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function CardList({
  cards,
  controls,
  sort,
  emptyText = "Nothing matches the current filters.",
}: {
  cards: CardSpec[];
  controls?: React.ReactNode;
  sort?: {
    options: SortOption[];
    sortKey: string | null;
    dir: "asc" | "desc";
    onChange: (key: string, dir: "asc" | "desc" | null) => void;
  };
  emptyText?: string;
}) {
  return (
    <div className="space-y-3 sm:hidden">
      {(sort || controls) && (
        // overflow-x keeps every control reachable by thumb; visible panels
        // need overflow-y room, hence the generous bottom padding trick is
        // avoided — dropdown panels are absolute+z-30 so they escape fine on
        // top of the card stack below.
        <div className="flex items-center gap-2 overflow-x-auto pb-1 [-webkit-overflow-scrolling:touch]">
          {sort && <MobileSort options={sort.options} sortKey={sort.sortKey} dir={sort.dir} onChange={sort.onChange} />}
          {controls}
        </div>
      )}
      {cards.map((c) => {
        const body = (
          <>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1 text-sm font-semibold text-zinc-900">{c.title}</div>
              {c.titleRight && <div className="shrink-0">{c.titleRight}</div>}
            </div>
            {c.fields.length > 0 && (
              <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
                {c.fields.map((f, i) => (
                  <FieldRow key={i} label={f.label} value={f.value} />
                ))}
              </dl>
            )}
          </>
        );
        const cls = "block w-full rounded-xl border border-zinc-200 bg-white p-3 text-left";
        if (c.href)
          return (
            <a key={c.key} href={c.href} className={`${cls} active:bg-zinc-50`}>
              {body}
            </a>
          );
        if (c.onClick)
          return (
            // div, not <button>: field values often carry mailto:/tel: anchors,
            // and interactive content inside a button is invalid HTML
            <div key={c.key} role="button" tabIndex={0} onClick={c.onClick}
              onKeyDown={(e) => { if (e.key === "Enter") c.onClick!(); }}
              className={`${cls} cursor-pointer active:bg-zinc-50`}>
              {body}
            </div>
          );
        return (
          <div key={c.key} className={cls}>
            {body}
          </div>
        );
      })}
      {cards.length === 0 && (
        <div className="rounded-xl border border-zinc-200 bg-white px-4 py-10 text-center text-sm text-zinc-400">{emptyText}</div>
      )}
    </div>
  );
}

function FieldRow({ label, value }: CardField) {
  return (
    <>
      <dt className="text-[10px] font-medium uppercase leading-5 tracking-wide text-zinc-400">{label}</dt>
      <dd className="min-w-0 truncate text-sm leading-5 text-zinc-700">{value}</dd>
    </>
  );
}
