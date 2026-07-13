"use client";

// Per-company outreach tracker (Lane C's /api/outreach-tracks, migration
// 0007). Pure bookkeeping — state, last touch, next follow-up. No sending:
// the sending workflow is gated on John + Tom's go (OUTREACH-STRATEGY.md).
import { useCallback, useEffect, useState } from "react";

type Track = {
  company_id: string;
  state: string;
  channel_last: string | null;
  last_touch_at: string | null;
  next_followup_due: string | null;
  notes: string | null;
  companies: { name: string; industry: string | null; city: string | null; state: string | null } | null;
  contacts: { name: string | null; email: string | null; phone: string | null } | null;
};

const STATES = ["not_started", "contacted", "replied", "meeting", "nurture", "dead"] as const;

const stateChip: Record<string, string> = {
  not_started: "bg-zinc-100 text-zinc-600",
  contacted: "bg-amber-100 text-amber-800",
  replied: "bg-emerald-100 text-emerald-800",
  meeting: "bg-violet-100 text-violet-800",
  nurture: "bg-sky-100 text-sky-800",
  dead: "bg-zinc-100 text-zinc-400",
};

export default function OutreachTracker() {
  const [tracks, setTracks] = useState<Track[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [filter, setFilter] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/outreach-tracks");
      const j = await res.json();
      if (j.error) setErr(j.error);
      setTracks(j.tracks ?? []);
    } catch {
      setErr("outreach-tracks unreachable");
      setTracks([]);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function update(companyId: string, patch: Record<string, unknown>) {
    setBusy(companyId);
    await fetch("/api/outreach-tracks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ companyId, ...patch }),
    });
    setBusy(null);
    load();
  }

  const today = new Date().toISOString().slice(0, 10);
  const rows = (tracks ?? []).filter((t) => !filter || t.state === filter);

  if (tracks === null) return <div className="rounded-xl border border-zinc-200 bg-white p-5 text-sm text-zinc-400">Loading tracker…</div>;

  return (
    <section className="rounded-xl border border-zinc-200 bg-white">
      <div className="flex flex-wrap items-center gap-2 border-b border-zinc-200 px-5 py-3">
        <h2 className="font-semibold">Outreach tracker</h2>
        <span className="text-xs text-zinc-400">per-owner state + follow-ups (tracking only — sending is gated on John+Tom&apos;s go)</span>
        <span className="ml-auto flex flex-wrap gap-1.5">
          <button
            onClick={() => setFilter(null)}
            className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${filter === null ? "bg-emerald-700 text-white" : "border border-zinc-200 bg-white text-zinc-600"}`}
          >
            all · {(tracks ?? []).length}
          </button>
          {STATES.filter((s) => (tracks ?? []).some((t) => t.state === s)).map((s) => (
            <button
              key={s}
              onClick={() => setFilter(filter === s ? null : s)}
              className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${filter === s ? "ring-2 ring-emerald-600 " : ""}${stateChip[s]}`}
            >
              {s.replace("_", " ")} · {(tracks ?? []).filter((t) => t.state === s).length}
            </button>
          ))}
        </span>
      </div>

      {err && <div className="border-b border-zinc-100 bg-amber-50 px-5 py-2 text-xs text-amber-800">{err}</div>}

      {rows.length === 0 ? (
        <div className="px-5 py-10 text-center text-sm text-zinc-400">
          No companies being worked yet — tracks appear when leads are promoted and outreach starts.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-200 text-left text-xs uppercase tracking-wide text-zinc-500">
                <th className="px-5 py-2 font-medium">Company</th>
                <th className="px-3 py-2 font-medium">Owner</th>
                <th className="px-3 py-2 font-medium">State</th>
                <th className="px-3 py-2 font-medium">Last touch</th>
                <th className="px-3 py-2 font-medium">Next follow-up</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {rows.map((t) => {
                const overdue = t.next_followup_due && t.next_followup_due <= today && !["dead"].includes(t.state);
                return (
                  <tr key={t.company_id} className="hover:bg-zinc-50">
                    <td className="max-w-56 px-5 py-2.5">
                      <a href={`/companies/${t.company_id}`} className="block truncate font-medium hover:text-emerald-700 hover:underline">
                        {t.companies?.name ?? "(company)"}
                      </a>
                      <span className="text-xs text-zinc-500">
                        {[t.companies?.industry, [t.companies?.city, t.companies?.state].filter(Boolean).join(", ")].filter(Boolean).join(" · ")}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-zinc-700">
                      {t.contacts?.name ?? <span className="text-xs text-zinc-300">—</span>}
                      {t.contacts?.phone && <div className="text-xs text-zinc-500">📞 {t.contacts.phone}</div>}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5">
                      <select
                        value={t.state}
                        disabled={busy === t.company_id}
                        onChange={(e) => update(t.company_id, { state: e.target.value })}
                        className={`rounded-full border-0 px-2 py-0.5 text-xs font-semibold outline-none ${stateChip[t.state]}`}
                      >
                        {STATES.map((s) => (
                          <option key={s} value={s}>{s.replace("_", " ")}</option>
                        ))}
                      </select>
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-xs text-zinc-500">
                      {t.last_touch_at ? `${t.last_touch_at.slice(0, 10)}${t.channel_last ? ` · ${t.channel_last}` : ""}` : "—"}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5">
                      <input
                        type="date"
                        value={t.next_followup_due ?? ""}
                        disabled={busy === t.company_id}
                        onChange={(e) => update(t.company_id, { nextFollowupDue: e.target.value || null })}
                        className={`rounded-md border px-2 py-0.5 text-xs outline-none ${
                          overdue ? "border-red-300 bg-red-50 font-semibold text-red-700" : "border-zinc-200 text-zinc-600"
                        }`}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
