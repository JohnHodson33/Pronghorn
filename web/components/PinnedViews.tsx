"use client";

// Pinned views (John approved 7/13, card 5e13d986): daily queries as one-tap
// chips on the dashboard. A pin is a labeled filter-URL — localStorage per
// device (zero data model; promote to a table if John wants cross-device
// sync). Pin any filtered list via the 📌 button on Companies/Contacts.
import Link from "next/link";
import { useEffect, useState } from "react";

export type Pin = { label: string; href: string };

const KEY = "pronghorn-pinned-views";
// first-run seeds — John's stated daily queries; all removable
const SEEDS: Pin[] = [
  { label: "CONTACTABLE Tree Care", href: "/companies?industry=Tree+Care&level=contactable" },
  { label: "Enrichment", href: "/enrichment" },
  { label: "Outbox — awaiting send", href: "/outbox" },
];

export function getPins(): Pin[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw === null) {
      localStorage.setItem(KEY, JSON.stringify(SEEDS));
      return SEEDS;
    }
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function addPin(pin: Pin) {
  const pins = getPins().filter((p) => p.href !== pin.href);
  localStorage.setItem(KEY, JSON.stringify([...pins, pin]));
}

export default function PinnedViews() {
  const [pins, setPins] = useState<Pin[] | null>(null);
  useEffect(() => setPins(getPins()), []);

  function remove(href: string) {
    const next = (pins ?? []).filter((p) => p.href !== href);
    localStorage.setItem(KEY, JSON.stringify(next));
    setPins(next);
  }

  if (!pins?.length) return null;
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-xs font-semibold uppercase tracking-wide text-zinc-400">📌 Pinned</span>
      {pins.map((p) => (
        <span key={p.href} className="group inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 text-xs font-medium text-emerald-800 hover:bg-emerald-100">
          <Link href={p.href} className="py-1 pl-2.5 pr-1">{p.label}</Link>
          <button
            onClick={() => remove(p.href)}
            aria-label={`Unpin ${p.label}`}
            title="Unpin"
            className="pr-1.5 text-emerald-300 hover:text-emerald-700"
          >
            ✕
          </button>
        </span>
      ))}
    </div>
  );
}

// 📌 for list-page toolbars: pins the CURRENT url (path + filter params)
export function PinButton({ defaultLabel }: { defaultLabel: string }) {
  const [pinned, setPinned] = useState(false);
  function pin() {
    const href = window.location.pathname + window.location.search;
    const label = window.prompt("Pin this view as:", defaultLabel);
    if (!label?.trim()) return;
    addPin({ label: label.trim(), href });
    setPinned(true);
    setTimeout(() => setPinned(false), 1800);
  }
  return (
    <button
      onClick={pin}
      title="Pin this filtered view to the dashboard"
      className="rounded-md border border-zinc-300 px-2.5 py-1.5 text-sm text-zinc-500 hover:bg-zinc-50"
    >
      {pinned ? "📌 pinned ✓" : "📌"}
    </button>
  );
}
