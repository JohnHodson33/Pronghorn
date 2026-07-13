"use client";

// Dual-thumb log-scale money slider (min/max pair) — the "sliding scale"
// criteria control John asked for. Two overlapped native range inputs;
// values snap to sensible increments and sync with the text fields.
import { useMemo } from "react";

const money = (n: number | null) =>
  n === null
    ? "—"
    : n >= 1_000_000
      ? `$${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)}M`
      : `$${Math.round(n / 1000)}K`;

type Props = {
  label: string;
  floor: number; // slider minimum (e.g. 0)
  ceil: number; // slider maximum (e.g. 10_000_000)
  min: number | null;
  max: number | null;
  onChange: (min: number | null, max: number | null) => void;
};

// log scale position 0..1000
const toPos = (v: number, floor: number, ceil: number) => {
  const lo = Math.log10(Math.max(floor, 10_000));
  const hi = Math.log10(ceil);
  return Math.round(((Math.log10(Math.max(v, 10_000)) - lo) / (hi - lo)) * 1000);
};
const fromPos = (p: number, floor: number, ceil: number) => {
  const lo = Math.log10(Math.max(floor, 10_000));
  const hi = Math.log10(ceil);
  const v = Math.pow(10, lo + (p / 1000) * (hi - lo));
  // snap: 10K below 1M, 100K below 3M, 250K above
  const snap = v < 1_000_000 ? 10_000 : v < 3_000_000 ? 100_000 : 250_000;
  return Math.round(v / snap) * snap;
};

export default function RangeSlider({ label, floor, ceil, min, max, onChange }: Props) {
  const lo = min ?? floor;
  const hi = max ?? ceil;
  const loPos = useMemo(() => toPos(Math.max(lo, floor), floor, ceil), [lo, floor, ceil]);
  const hiPos = useMemo(() => toPos(Math.min(hi, ceil), floor, ceil), [hi, floor, ceil]);

  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{label}</span>
        <span className="text-sm font-bold tabular-nums text-emerald-800">
          {min === null ? "no floor" : money(min)} — {max === null ? "no cap" : money(max)}
        </span>
      </div>
      <div className="relative h-6">
        <div className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 rounded bg-zinc-200" />
        <div
          className="absolute top-1/2 h-1 -translate-y-1/2 rounded bg-emerald-600"
          style={{ left: `${loPos / 10}%`, right: `${100 - hiPos / 10}%` }}
        />
        <input
          type="range"
          min={0}
          max={1000}
          value={loPos}
          onChange={(e) => {
            const v = fromPos(Math.min(Number(e.target.value), hiPos - 10), floor, ceil);
            onChange(v <= floor ? null : v, max);
          }}
          className="pointer-events-none absolute inset-0 h-6 w-full appearance-none bg-transparent [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:bg-emerald-700 [&::-webkit-slider-thumb]:shadow"
        />
        <input
          type="range"
          min={0}
          max={1000}
          value={hiPos}
          onChange={(e) => {
            const v = fromPos(Math.max(Number(e.target.value), loPos + 10), floor, ceil);
            onChange(min, v >= ceil ? null : v);
          }}
          className="pointer-events-none absolute inset-0 h-6 w-full appearance-none bg-transparent [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:bg-emerald-700 [&::-webkit-slider-thumb]:shadow"
        />
      </div>
      <div className="mt-0.5 flex justify-between text-[10px] text-zinc-400">
        <span>{money(floor) === "$10K" ? "$0" : money(floor)}</span>
        <span>{money(ceil)}+</span>
      </div>
    </div>
  );
}
