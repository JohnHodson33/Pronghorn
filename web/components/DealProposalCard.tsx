"use client";

// Key Actions card for a deal next-step change proposed from an Outlook reply
// (0019, John 7/16: "you should be updating this based on my Outlook traffic"
// — but NEVER silently: the classifier proposes, John approves). The card
// shows the proposed step (editable before approving), the source email +
// the exact sentence the model keyed on as evidence, and approve/dismiss.
// Approve writes the deal's next_step/due; dismiss drops it. Both leave the
// queue on refresh.
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { KeyAction } from "@/lib/dashboard-v3";

const confChip: Record<string, string> = {
  high: "bg-emerald-100 text-emerald-800",
  medium: "bg-amber-100 text-amber-800",
  low: "bg-zinc-100 text-zinc-500",
};

export default function DealProposalCard({ action }: { action: KeyAction }) {
  const router = useRouter();
  const p = action.proposal!;
  const [open, setOpen] = useState(false);
  const [nextStep, setNextStep] = useState(p.nextStep ?? "");
  const [nextDue, setNextDue] = useState(p.nextStepDue ?? "");
  const [busy, setBusy] = useState<null | "approve" | "dismiss">(null);
  const [err, setErr] = useState<string | null>(null);

  async function act(mode: "approve" | "dismiss") {
    setBusy(mode);
    setErr(null);
    const res = await fetch("/api/deals/proposals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        mode === "approve"
          ? { id: p.id, action: "approve", next_step: nextStep, next_step_due: nextDue || null }
          : { id: p.id, action: "dismiss" }
      ),
    });
    if (!res.ok) {
      setErr((await res.json().catch(() => ({}))).error ?? `${mode} failed`);
      setBusy(null);
      return;
    }
    router.refresh();
  }

  return (
    <div className="px-5 py-3">
      <div className="flex items-center gap-3">
        <span className="text-lg">📥</span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium">{action.label}</span>
          <span className="block truncate text-xs text-zinc-500">{action.detail}</span>
        </span>
        {p.confidence && (
          <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${confChip[p.confidence] ?? "bg-zinc-100 text-zinc-500"}`}>
            {p.confidence}
          </span>
        )}
        <button
          onClick={() => setOpen((o) => !o)}
          className="shrink-0 rounded-md bg-emerald-700 px-2.5 py-1 text-xs font-semibold text-white hover:bg-emerald-800"
        >
          {open ? "close" : "Review"}
        </button>
      </div>

      {open && (
        <div className="mt-2 space-y-2 pl-8">
          {/* the evidence: the sentence(s) the classifier keyed on — John
              adjudicates against the real words, never a black-box guess */}
          {p.evidence && (
            <div className="rounded-md border border-sky-200 bg-sky-50 px-3 py-2 text-xs text-sky-900">
              <span className="font-semibold">From the email{p.sourceFrom ? ` · ${p.sourceFrom}` : ""}:</span>{" "}
              <span className="italic">“{p.evidence}”</span>
              {p.meetingWhen && <span className="mt-1 block text-sky-700">Availability offered: {p.meetingWhen}</span>}
            </div>
          )}
          {p.sourceUrl && (
            <a href={p.sourceUrl} target="_blank" rel="noreferrer" className="inline-block text-xs font-medium text-emerald-700 hover:underline">
              open the email in Outlook ↗
            </a>
          )}

          {/* editable before approving — John can fix the wording/date */}
          <div className="flex flex-wrap items-end gap-2">
            <label className="flex-1 min-w-48">
              <span className="block text-[11px] font-medium uppercase tracking-wide text-zinc-500">Next step</span>
              <input
                value={nextStep}
                onChange={(e) => setNextStep(e.target.value)}
                className="mt-0.5 w-full rounded-md border border-zinc-300 px-2.5 py-1.5 text-sm outline-none focus:border-emerald-600"
              />
            </label>
            <label>
              <span className="block text-[11px] font-medium uppercase tracking-wide text-zinc-500">Due</span>
              <input
                type="date"
                value={nextDue}
                onChange={(e) => setNextDue(e.target.value)}
                className="mt-0.5 rounded-md border border-zinc-300 px-2.5 py-1.5 text-sm outline-none focus:border-emerald-600"
              />
            </label>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => act("approve")}
              disabled={busy !== null || !nextStep.trim()}
              className="rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"
            >
              {busy === "approve" ? "Applying…" : "Approve → update deal"}
            </button>
            <button
              onClick={() => act("dismiss")}
              disabled={busy !== null}
              className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-zinc-500 hover:bg-zinc-100 disabled:opacity-50"
            >
              {busy === "dismiss" ? "Dismissing…" : "Dismiss"}
            </button>
            <span className="text-[11px] text-zinc-400">nothing changes until you approve</span>
          </div>
          {err && <div className="text-xs text-amber-700">{err}</div>}
        </div>
      )}
    </div>
  );
}
