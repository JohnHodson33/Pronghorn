"use client";

// Generic typeahead input: suggest-as-you-type from an async source; pick
// with click or arrows+Enter; free text always allowed.
import { useEffect, useRef, useState } from "react";

type Props = {
  value: string;
  onChange: (v: string) => void;
  suggest: (q: string) => Promise<string[]> | string[];
  placeholder?: string;
  className?: string;
  disabled?: boolean;
};

export default function TypeaheadInput({ value, onChange, suggest, placeholder, className, disabled }: Props) {
  const [items, setItems] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [hi, setHi] = useState(-1);
  const boxRef = useRef<HTMLDivElement>(null);
  const seq = useRef(0);

  useEffect(() => {
    const my = ++seq.current;
    const t = setTimeout(async () => {
      const res = await suggest(value);
      if (my === seq.current) {
        setItems(res);
        setHi(-1);
      }
    }, 150);
    return () => clearTimeout(t);
  }, [value, suggest]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  function pick(v: string) {
    onChange(v);
    setOpen(false);
  }

  return (
    <div ref={boxRef} className="relative">
      <input
        value={value}
        disabled={disabled}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (!open || items.length === 0) return;
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setHi((h) => Math.min(h + 1, items.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setHi((h) => Math.max(h - 1, -1));
          } else if (e.key === "Enter" && hi >= 0) {
            e.preventDefault();
            pick(items[hi]);
          } else if (e.key === "Escape") setOpen(false);
        }}
        placeholder={placeholder}
        className={className}
      />
      {open && items.length > 0 && (
        <ul className="absolute z-40 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-zinc-200 bg-white py-1 shadow-lg">
          {items.map((it, i) => (
            <li key={it}>
              <button
                onMouseDown={(e) => {
                  e.preventDefault();
                  pick(it);
                }}
                className={`block w-full px-3 py-1.5 text-left text-sm ${
                  i === hi ? "bg-emerald-50 text-emerald-900" : "hover:bg-zinc-50"
                }`}
              >
                {it}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
