"use client";

// Multi-select filter dropdown (John 7/15 companies-table overhaul: "chips
// won't scale as industries grow" + column-header dropdown filters). Button
// shows the label + active-selection count; the panel lists checkbox options
// with per-option counts. Used in toolbars AND table headers (stopPropagation
// so header sort clicks don't fire). Mobile: panel is fixed-width but capped
// to viewport, options are thumb-sized.
import { useEffect, useLayoutEffect, useRef, useState } from "react";

export type FilterOption = { value: string; label: string; count?: number };

const PANEL_W = 224; // must track the w-56 on the panel below

export default function FilterDropdown({
  label,
  options,
  selected,
  onChange,
  header = false,
}: {
  label: string;
  options: FilterOption[];
  selected: Set<string>;
  onChange: (next: Set<string>) => void;
  header?: boolean; // compact style for table headers
}) {
  const [open, setOpen] = useState(false);
  // Header dropdowns live inside the table's horizontal scroller, so a
  // left-aligned panel on a right-hand column runs off the screen (mobile:
  // the counts were cut off). Flip to right-aligned when there isn't room.
  const [alignRight, setAlignRight] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!open || !ref.current) return;
    const { left } = ref.current.getBoundingClientRect();
    setAlignRight(left + PANEL_W > window.innerWidth - 8);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  function toggle(value: string) {
    const next = new Set(selected);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    onChange(next);
  }

  const active = selected.size > 0;
  return (
    <div ref={ref} className="relative inline-block" onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={
          header
            ? `inline-flex items-center gap-1 rounded px-1 py-0.5 text-xs uppercase tracking-wide ${
                active ? "bg-emerald-100 font-bold text-emerald-800" : "font-medium text-zinc-500 hover:bg-zinc-100"
              }`
            : `inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm ${
                active ? "border-emerald-600 bg-emerald-50 font-medium text-emerald-800" : "border-zinc-300 text-zinc-700 hover:bg-zinc-50"
              }`
        }
      >
        {label}
        {active && <span className={header ? "" : "rounded-full bg-emerald-700 px-1.5 text-xs font-semibold text-white"}>{header ? `(${selected.size})` : selected.size}</span>}
        <span aria-hidden className="text-[9px] opacity-60">▼</span>
      </button>
      {open && (
        <div className={`absolute z-30 mt-1 max-h-72 w-56 max-w-[85vw] overflow-y-auto rounded-lg border border-zinc-200 bg-white py-1 shadow-lg ${alignRight ? "right-0" : "left-0"}`}>
          {active && (
            <button
              onClick={() => onChange(new Set())}
              className="block w-full px-3 py-1.5 text-left text-xs font-medium text-emerald-700 hover:bg-zinc-50"
            >
              Clear ({selected.size})
            </button>
          )}
          {options.map((o) => (
            <label key={o.value} className="flex cursor-pointer items-center gap-2 px-3 py-1.5 text-sm normal-case tracking-normal hover:bg-zinc-50">
              <input
                type="checkbox"
                checked={selected.has(o.value)}
                onChange={() => toggle(o.value)}
                className="accent-emerald-700"
              />
              <span className="min-w-0 flex-1 truncate font-normal text-zinc-800">{o.label}</span>
              {o.count !== undefined && <span className="shrink-0 text-xs tabular-nums text-zinc-400">{o.count}</span>}
            </label>
          ))}
          {options.length === 0 && <div className="px-3 py-2 text-xs text-zinc-400">no options</div>}
        </div>
      )}
    </div>
  );
}
