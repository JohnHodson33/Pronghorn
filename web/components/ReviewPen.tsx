"use client";

// Discovery review pen (John 7/31 discovery card (b); Lane C 8/4 API):
// MEDIUM-confidence sweep candidates + auto-discovered NEW consolidators wait
// for a one-click keep/reject — never silently filed, never silently dropped.
// keep(deal) files the river_guides row; keep(consolidator) seeds a
// NEEDS_NAME marker so future sweeps include the acquirer. Degrades to a
// one-line "apply 0023" note until John runs the migration.
import { useCallback, useEffect, useState } from "react";

type Candidate = {
  id: string;
  kind: "deal" | "consolidator";
  acquirer: string;
  company: string;
  seller_name: string | null;
  deal_year: number | null;
  city: string | null;
  state: string | null;
  industry: string | null;
  acquirer_pe_sponsor: string | null;
  source_url: string | null;
  confidence: "HIGH" | "MEDIUM" | "LOW" | null;
  created_at: string;
};

const confChip: Record<string, string> = {
  HIGH: "bg-emerald-100 text-emerald-800",
  MEDIUM: "bg-amber-100 text-amber-800",
  LOW: "bg-zinc-100 text-zinc-500",
};

export default function ReviewPen({ onFiled }: { onFiled?: () => void }) {
  const [pending, setPending] = useState<Candidate[] | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [who, setWho] = useState("John");
  const [busy, setBusy] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/river-guides/review", { cache: "no-store" });
      const j = await res.json();
      setPending(j.pending ?? []);
      setNote(j.note ?? null);
    } catch {
      setPending([]);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  async function decide(c: Candidate, action: "keep" | "reject") {
    setBusy(c.id);
    setFlash(null);
    try {
      const res = await fetch("/api/river-guides/review", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: c.id, action, decided_by: who }),
      });
      const j = await res.json().catch(() => ({}));
      if (res.ok) {
        setPending((prev) => (prev ?? []).filter((x) => x.id !== c.id));
        setFlash(action === "keep"
          ? `Kept — filed as a river guide${j.filed ? ` (${j.filed})` : ""}; it enters the normal resolve→verify→enrich lifecycle.`
          : "Rejected — kept for audit, won't resurface.");
        onFiled?.();
      } else {
        setFlash(j.error ?? "action failed");
      }
    } catch {
      setFlash("review API unreachable — nothing changed");
    }
    setBusy(null);
  }

  if (pending === null) return null; // still loading — don't flash an empty box
  if (note && pending.length === 0) {
    return (
      <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
        Discovery review pen: {note}. New sweep candidates queue here once it lands.
      </div>
    );
  }
  if (pending.length === 0) return null; // pen empty — nothing to review, no box

  const deals = pending.filter((c) => c.kind === "deal").length;
  const consolidators = pending.length - deals;

  return (
    <section className="rounded-xl border border-violet-200 bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <span className="font-semibold">Discovery review pen</span>
          <span className="ml-2 rounded-full bg-violet-100 px-2 py-0.5 text-xs font-semibold text-violet-800 tabular-nums">
            {deals} deal{deals === 1 ? "" : "s"}{consolidators ? ` + ${consolidators} new consolidator${consolidators === 1 ? "" : "s"}` : ""} awaiting confirm
          </span>
        </div>
        <label className="flex items-center gap-1.5 text-xs text-zinc-600">
          deciding as
          <select value={who} onChange={(e) => setWho(e.target.value)}
            className="rounded-md border border-zinc-300 px-2 py-1 text-xs outline-none focus:border-emerald-600">
            <option>John</option>
            <option>Tom</option>
          </select>
        </label>
      </div>
      <p className="mt-1 text-xs text-zinc-500">
        Below-HIGH sweep finds — keep files the guide (deals) or adds the acquirer to future sweeps
        (consolidators); reject is kept for audit and never resurfaces.
      </p>
      {flash && <p className="mt-2 rounded-md bg-emerald-50 px-3 py-1.5 text-xs text-emerald-800">{flash}</p>}
      <ul className="mt-3 divide-y divide-zinc-100">
        {pending.map((c) => (
          <li key={c.id} className="flex flex-wrap items-center gap-x-3 gap-y-1.5 py-2.5">
            <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${c.kind === "deal" ? "bg-sky-100 text-sky-800" : "bg-violet-100 text-violet-800"}`}>
              {c.kind === "deal" ? "deal" : "new consolidator"}
            </span>
            <span className="min-w-0 flex-1 text-sm">
              {c.kind === "deal" ? (
                <>
                  <span className="font-medium">{c.company}</span>
                  <span className="text-zinc-500"> → {c.acquirer}{c.acquirer_pe_sponsor ? ` (${c.acquirer_pe_sponsor})` : ""}</span>
                  {c.seller_name && <span className="text-zinc-600"> · seller {c.seller_name}</span>}
                  <span className="text-xs text-zinc-400">
                    {[c.deal_year, [c.city, c.state].filter(Boolean).join(", "), c.industry].filter(Boolean).map((p) => ` · ${p}`).join("")}
                  </span>
                </>
              ) : (
                <>
                  <span className="font-medium">{c.acquirer}</span>
                  <span className="text-zinc-500"> — auto-discovered acquirer{c.industry ? ` (${c.industry})` : ""}</span>
                </>
              )}
              {c.source_url && (
                <a href={c.source_url} target="_blank" rel="noopener noreferrer"
                  className="ml-1.5 text-xs text-emerald-700 hover:underline">source ↗</a>
              )}
            </span>
            {c.confidence && (
              <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${confChip[c.confidence]}`}>{c.confidence}</span>
            )}
            <span className="flex shrink-0 gap-1.5">
              <button
                onClick={() => decide(c, "keep")}
                disabled={busy === c.id}
                className="rounded-md bg-emerald-700 px-3 py-1 text-xs font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"
              >
                {busy === c.id ? "…" : "Keep"}
              </button>
              <button
                onClick={() => decide(c, "reject")}
                disabled={busy === c.id}
                className="rounded-md border border-zinc-300 px-3 py-1 text-xs font-medium text-zinc-600 hover:border-red-400 hover:text-red-600 disabled:opacity-50"
              >
                Reject
              </button>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
