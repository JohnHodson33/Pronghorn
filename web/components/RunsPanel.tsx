"use client";

// Enrichment RUNS surface — John 7/31 NEW #1: "who gained what, take me back
// there". One uniform panel for BOTH channels (/river-guides and /enrichment):
// always visible (never hides during an active run), every run is one line —
// timestamp · human label · live progress or receipt — and clicking a run
// filters the page's table to exactly that run's rows. When Lane C's per-row
// results land, outcome quick-chips ([Gained contact] [Nothing new] [→ Paid])
// let "show me the 31 that gained an email from MY run" be one click; until
// then the panel degrades to counts-only. A finished run stays flagged (here
// and in the top-bar pill) until someone dismisses it — run-seen.ts.
import { useEffect, useState } from "react";
import { markRunSeen, seenRunIds } from "@/lib/run-seen";

// Lane C's per-row outcome shape (data half of the 7/31 card); every field
// optional so partial results never break the chips.
export type RunOutcome = {
  gained_email?: boolean;
  gained_phone?: boolean;
  gained_linkedin?: boolean;
  escalated_paid?: boolean;
  nothing_new?: boolean;
};

export type RunRow = {
  id: string;
  state: "queued" | "running" | "done" | "failed";
  label: string | null; // queue-time filter summary, e.g. "Tree Care · Call now · 80 selected"
  note: string | null; // server's honest one-liner (queued/progress/receipt)
  stale?: boolean;
  counts: Record<string, number | string | undefined> | null;
  ids: string[] | null; // the rows this run touched (deal_ids / lead_ids)
  results?: Record<string, RunOutcome> | null; // id → outcome (Lane C, may be absent)
  created_at?: string | null;
  finished_at: string | null;
};

const when = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "—";

function outcomeIds(run: RunRow, pick: (o: RunOutcome) => boolean): string[] {
  if (!run.results) return [];
  return Object.entries(run.results).filter(([, o]) => pick(o)).map(([id]) => id);
}

export default function RunsPanel({
  channel,
  runs,
  openRunId,
  onOpenRun,
  title = "Enrichment runs",
}: {
  channel: string; // seen-tracking namespace: "river-guides" | "leads"
  runs: RunRow[];
  openRunId: string | null;
  // ids = the subset to show (an outcome chip passes fewer than the full run)
  onOpenRun: (run: RunRow | null, ids: string[] | null) => void;
  title?: string;
}) {
  // hydrate seen-state after mount so SSR markup is stable
  const [seen, setSeen] = useState<Set<string>>(new Set());
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    setSeen(seenRunIds(channel));
    setHydrated(true);
  }, [channel]);

  const active = runs.filter((r) => r.state === "queued" || r.state === "running");
  const finished = runs.filter((r) => r.state === "done" || r.state === "failed");
  // "finished unseen" receipts — unmissable until dismissed. 48h cutoff so
  // pre-feature history doesn't nag as a wall of stale receipts.
  const fresh = (r: RunRow) => r.finished_at && Date.now() - new Date(r.finished_at).getTime() < 48 * 3600_000;
  const unseen = hydrated ? finished.filter((r) => !seen.has(r.id) && fresh(r)) : [];

  const dismiss = (id: string) => {
    markRunSeen(channel, id);
    setSeen(seenRunIds(channel));
  };

  if (!runs.length) return null;

  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-3">
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
          {title} — click one to see exactly who was in it
        </span>
        {openRunId && (
          <button onClick={() => onOpenRun(null, null)} className="text-xs font-semibold text-emerald-800 hover:underline">
            ← clear run filter
          </button>
        )}
      </div>

      {/* completion receipts that nobody has acknowledged yet */}
      {unseen.map((r) => (
        <div key={`unseen-${r.id}`}
          className={`mb-2 flex flex-wrap items-center gap-2 rounded-md border px-3 py-2 text-sm ${
            r.state === "failed" ? "border-red-200 bg-red-50 text-red-900" : "border-emerald-300 bg-emerald-50 text-emerald-900"
          }`}>
          <span className="font-semibold">{r.state === "failed" ? "⚠ Run failed" : "✅ Run finished"}</span>
          <span className="min-w-0 flex-1">{r.label ? `${r.label} — ` : ""}{r.note}</span>
          <button
            onClick={() => { onOpenRun(r, r.ids); dismiss(r.id); }}
            className="rounded-md bg-emerald-700 px-2.5 py-1 text-xs font-semibold text-white hover:bg-emerald-800"
          >
            View results
          </button>
          <button onClick={() => dismiss(r.id)} className="text-xs font-medium hover:underline">dismiss</button>
        </div>
      ))}

      <div className="space-y-1.5">
        {[...active, ...finished].map((r) => {
          const isOpen = openRunId === r.id;
          const c = r.counts ?? {};
          const total = Number(c.total ?? r.ids?.length ?? 0);
          const running = r.state === "queued" || r.state === "running";
          const gained = outcomeIds(r, (o) => !!(o.gained_email || o.gained_phone || o.gained_linkedin));
          const nothing = outcomeIds(r, (o) => !!o.nothing_new);
          const paid = outcomeIds(r, (o) => !!o.escalated_paid);
          const chip = (label: string, ids: string[], cls: string) =>
            ids.length > 0 && (
              <button
                onClick={() => { onOpenRun(r, ids); dismiss(r.id); }}
                className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${cls} hover:brightness-95`}
                title={`Filter the table to these ${ids.length} rows from this run`}
              >
                {label} {ids.length}
              </button>
            );
          return (
            <div key={r.id} className="flex flex-wrap items-center gap-2 text-sm">
              <button
                onClick={() => { if (isOpen) onOpenRun(null, null); else { onOpenRun(r, r.ids); dismiss(r.id); } }}
                disabled={!r.ids?.length}
                className={`rounded border px-2 py-0.5 text-xs font-semibold disabled:cursor-default disabled:opacity-50 ${
                  isOpen
                    ? "border-emerald-700 bg-emerald-700 text-white"
                    : "border-zinc-300 text-zinc-600 hover:border-emerald-600 hover:text-emerald-700"
                }`}
              >
                {isOpen ? "showing this run ✓" : `show these ${total || "—"}`}
              </button>
              {running && <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-sky-600" title="run in flight" />}
              <span className="text-zinc-400">{when(r.finished_at ?? r.created_at)}</span>
              {r.label && <span className="font-medium text-zinc-700">{r.label}</span>}
              <span className={`min-w-0 flex-1 ${r.state === "failed" ? "text-red-700" : r.stale ? "font-semibold text-amber-800" : "text-zinc-600"}`}>
                {r.note}
              </span>
              {/* outcome quick-chips — appear when Lane C's per-row results exist */}
              {chip("Gained contact", gained, "bg-emerald-100 text-emerald-800")}
              {chip("→ Paid", paid, "bg-violet-100 text-violet-800")}
              {chip("Nothing new", nothing, "bg-zinc-100 text-zinc-600")}
            </div>
          );
        })}
      </div>
    </section>
  );
}
