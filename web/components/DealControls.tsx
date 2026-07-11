"use client";

// Stage dropdown + next-step editor for the deal detail page. PATCHes
// /api/deals/[id] and refreshes the server-rendered page.
import { useState } from "react";
import { useRouter } from "next/navigation";
import { STAGES } from "@/lib/mock";

type Props = {
  dealId: string;
  stage: string;
  nextStep: string | null;
  nextStepDue: string | null;
  closedLostReason: string | null;
};

export default function DealControls({ dealId, stage, nextStep, nextStepDue, closedLostReason }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [step, setStep] = useState(nextStep ?? "");
  const [due, setDue] = useState(nextStepDue ?? "");
  const [reason, setReason] = useState(closedLostReason ?? "");
  const [showClosed, setShowClosed] = useState(stage === "Closed");
  const [passing, setPassing] = useState(false);
  const [passReason, setPassReason] = useState("");

  async function patch(body: Record<string, unknown>) {
    setBusy(true);
    setErr(null);
    const res = await fetch(`/api/deals/${dealId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setBusy(false);
    if (res.ok) router.refresh();
    else setErr((await res.json()).error ?? "update failed");
    return res.ok;
  }

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <label className="text-xs font-medium uppercase tracking-wide text-zinc-500">Stage</label>
        <select
          value={stage}
          disabled={busy}
          onChange={async (e) => {
            const next = e.target.value;
            setShowClosed(next === "Closed");
            await patch({ stage: next });
          }}
          className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm font-semibold outline-none focus:border-emerald-600"
        >
          {/* keep a legacy/unknown stage selectable rather than silently remapping it */}
          {![...STAGES, "Passed"].includes(stage) && <option value={stage}>{stage}</option>}
          {STAGES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
          {/* selectable so a Passed deal can be re-activated by picking a stage */}
          <option value="Passed">Passed</option>
        </select>
        {busy && <span className="text-xs text-zinc-400">Saving…</span>}
        {stage !== "Passed" && !passing && (
          <button
            onClick={() => setPassing(true)}
            disabled={busy}
            className="ml-auto rounded-md px-2.5 py-1 text-xs font-semibold text-zinc-400 hover:bg-red-50 hover:text-red-700"
            title="Pass on this deal — removes it from the pipeline board (stays on /deals)"
          >
            Pass on deal
          </button>
        )}
      </div>

      {stage === "Passed" && (
        <div className="rounded-md bg-zinc-100 px-3 py-2 text-sm text-zinc-600">
          <span className="font-semibold">Passed.</span> Off the pipeline board, still searchable in Deals.
          {closedLostReason && <span> Reason: {closedLostReason}</span>}
          <span className="ml-1 text-xs text-zinc-400">(pick a stage above to re-activate)</span>
        </div>
      )}

      {passing && (
        <div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50/50 p-2">
          <input
            value={passReason}
            onChange={(e) => setPassReason(e.target.value)}
            autoFocus
            placeholder="Pass reason (price, financials, geography, seller went dark…)"
            className="flex-1 rounded-md border border-zinc-300 px-3 py-1.5 text-sm outline-none focus:border-red-400"
          />
          <button
            onClick={async () => {
              const ok = await patch({ stage: "Passed", closedLostReason: passReason });
              if (ok) setPassing(false);
            }}
            disabled={busy}
            className="rounded-lg bg-red-700 px-4 py-1.5 text-sm font-semibold text-white hover:bg-red-800 disabled:opacity-50"
          >
            Pass
          </button>
          <button
            onClick={() => setPassing(false)}
            disabled={busy}
            className="rounded-lg px-2.5 py-1.5 text-sm font-medium text-zinc-500 hover:bg-zinc-100"
          >
            Cancel
          </button>
        </div>
      )}

      {showClosed && (
        <div className="flex items-center gap-2">
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Closed-lost reason (price, financials, seller went dark…)"
            className="flex-1 rounded-md border border-zinc-300 px-3 py-1.5 text-sm outline-none focus:border-emerald-600"
          />
          <button
            onClick={() => patch({ closedLostReason: reason })}
            disabled={busy}
            className="rounded-lg bg-zinc-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-zinc-800 disabled:opacity-50"
          >
            Save reason
          </button>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <input
          value={step}
          onChange={(e) => setStep(e.target.value)}
          placeholder="Next step (e.g. Follow up with broker on Q2 financials)"
          className="min-w-64 flex-1 rounded-md border border-zinc-300 px-3 py-1.5 text-sm outline-none focus:border-emerald-600"
        />
        <input
          type="date"
          value={due}
          onChange={(e) => setDue(e.target.value)}
          className="rounded-md border border-zinc-300 px-2 py-1.5 text-sm text-zinc-600 outline-none focus:border-emerald-600"
        />
        <button
          onClick={() => patch({ nextStep: step, nextStepDue: due || null })}
          disabled={busy}
          className="rounded-lg bg-emerald-700 px-4 py-1.5 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"
        >
          Save next step
        </button>
      </div>

      {err && <div className="text-xs text-red-600">{err}</div>}
    </div>
  );
}
