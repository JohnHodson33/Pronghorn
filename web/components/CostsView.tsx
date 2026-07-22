"use client";

// Costs — Month | Year-to-Date side by side (John 7/20: "same breakdown each").
// Reads /api/costs, which returns both windows. Plus "Log a cost" → the Upwork
// VA invoices are real spend that no API meters, so John/Tom type them in and
// they flow through `variable` like any metered service.
//
// Accounting honesty (COST-TRACKING.md): subscriptions ARE the cash cost of the
// services they cover, so a subscription-covered service books $0 marginal and
// shows UNITS against its cap instead of fake per-use dollars.
import { useCallback, useEffect, useState } from "react";

type Window = {
  label: string;
  subscriptions: number;
  variable: number;
  byService: { service: string; cost: number }[];
  byActivity: { activity: string; cost: number }[];
  total: number;
  note?: string | null;
};
type Costs = {
  month: Window | null;
  ytd: Window | null;
  quotas: { service: string; used: number; cap: number }[];
  ownerContactsAcquired: number;
  costPerContact: number | null;
  subscriptions: { name: string; monthly_usd: number; planned: boolean; start_date: string | null }[];
  note?: string;
};
type ManualEntry = {
  id: string; at: string; service: string; activity: string;
  units: number | string | null; cost_usd: number | string;
  meta: { note?: string | null; entered_by?: string | null } | null;
};

const usd = (n: number) =>
  n >= 1000 ? `$${n.toLocaleString("en-US", { maximumFractionDigits: 0 })}` : `$${n.toFixed(2)}`;

const inputCls = "w-full rounded-md border border-zinc-300 px-2.5 py-1.5 text-sm outline-none focus:border-emerald-600";

// One window column — identical shape for Month and YTD so they read as a pair.
function WindowCard({
  w, accent, perContact, perContactNote,
}: {
  w: Window;
  accent: boolean;
  perContact: number | null;
  perContactNote?: string;
}) {
  return (
    <div className={`rounded-xl border bg-white p-5 ${accent ? "border-emerald-700/30" : "border-zinc-200"}`}>
      <div className="flex items-baseline justify-between">
        <h2 className="font-semibold">{w.label}</h2>
        <span className="text-2xl font-bold tabular-nums text-zinc-900">{usd(w.total)}</span>
      </div>

      <dl className="mt-3 space-y-1.5 text-sm">
        <div className="flex items-baseline justify-between">
          <dt className="text-zinc-600">Subscriptions</dt>
          <dd className="tabular-nums font-medium">{usd(w.subscriptions)}</dd>
        </div>
        <div className="flex items-baseline justify-between">
          <dt className="text-zinc-600">Variable (pay-per-use + invoiced)</dt>
          <dd className="tabular-nums font-medium">{usd(w.variable)}</dd>
        </div>
        <div className="flex items-baseline justify-between border-t border-zinc-100 pt-1.5">
          <dt className="font-semibold">Total</dt>
          <dd className="tabular-nums font-bold">{usd(w.total)}</dd>
        </div>
        <div className="flex items-baseline justify-between">
          <dt className="text-zinc-600">Cost per owner contact</dt>
          <dd className="tabular-nums font-medium" title={perContactNote}>
            {perContact !== null ? usd(perContact) : <span className="text-zinc-300">—</span>}
          </dd>
        </div>
      </dl>

      <div className="mt-4">
        <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Variable by service</div>
        {w.byService.length === 0 ? (
          <p className="mt-1 text-xs text-zinc-400">No pay-per-use spend in this window.</p>
        ) : (
          <ul className="mt-1.5 space-y-1 text-sm">
            {w.byService.map((s) => (
              <li key={s.service} className="flex items-baseline justify-between">
                <span className="capitalize text-zinc-700">{s.service}</span>
                <span className="tabular-nums text-zinc-600">{usd(s.cost)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {w.byActivity.length > 0 && (
        <div className="mt-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">By activity</div>
          <ul className="mt-1.5 space-y-1 text-sm">
            {w.byActivity.map((a) => (
              <li key={a.activity} className="flex items-baseline justify-between">
                <span className="text-zinc-700">{a.activity.replace(/_/g, " ")}</span>
                <span className="tabular-nums text-zinc-600">{usd(a.cost)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* the API discloses its YTD subscription assumption — never hide it */}
      {w.note && <p className="mt-3 border-t border-zinc-100 pt-2 text-[11px] text-amber-700">{w.note}</p>}
    </div>
  );
}

export default function CostsView() {
  const [data, setData] = useState<Costs | null>(null);
  const [entries, setEntries] = useState<ManualEntry[]>([]);
  const [err, setErr] = useState<string | null>(null);

  // form state
  const [amount, setAmount] = useState("");
  const [units, setUnits] = useState("");
  const [dated, setDated] = useState("");
  const [note, setNote] = useState("");
  const [enteredBy, setEnteredBy] = useState("John");
  const [service, setService] = useState("upwork");
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState<string | null>(null);
  const [formErr, setFormErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [c, m] = await Promise.all([
        fetch("/api/costs").then((r) => r.json()),
        fetch("/api/costs/manual?limit=10").then((r) => r.json()).catch(() => ({ entries: [] })),
      ]);
      if (c.error) setErr(c.error);
      setData(c);
      setEntries(m.entries ?? []);
    } catch {
      setErr("costs API unreachable");
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function logCost() {
    setBusy(true);
    setFormErr(null);
    setSaved(null);
    const res = await fetch("/api/costs/manual", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        cost_usd: Number(amount),
        units: units === "" ? null : Number(units),
        dated: dated || null,
        note: note || null,
        entered_by: enteredBy,
        service,
      }),
    });
    const j = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { setFormErr(j.error ?? "could not log the cost"); return; }
    setSaved(`Logged ${usd(Number(amount))}${units ? ` for ${units} units` : ""}.`);
    setAmount(""); setUnits(""); setNote(""); setDated("");
    load();
  }

  if (err && !data?.month) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        {err}
      </div>
    );
  }
  if (!data) return <div className="text-sm text-zinc-400">Loading costs…</div>;
  if (data.note && !data.month) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        {data.note}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* the pair — stacks under md so mobile reads Month then YTD */}
      <div className="grid gap-4 md:grid-cols-2">
        {data.month && (
          <WindowCard
            w={data.month}
            accent
            perContact={data.costPerContact}
            perContactNote={`${data.ownerContactsAcquired} owner contacts acquired this month`}
          />
        )}
        {data.ytd && (
          <WindowCard
            w={data.ytd}
            accent={false}
            perContact={null}
            perContactNote="per-contact is month-to-date only — the API doesn't return a YTD contact count, so this stays blank rather than guess"
          />
        )}
      </div>

      {/* subscription detail + quota units (never fake per-use dollars) */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-zinc-200 bg-white p-5">
          <h2 className="font-semibold">Active subscriptions</h2>
          <ul className="mt-2 space-y-1 text-sm">
            {data.subscriptions.map((s) => (
              <li key={s.name} className="flex items-baseline justify-between">
                <span className="text-zinc-700">
                  {s.name}
                  {s.planned && <span className="ml-1.5 rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-semibold text-zinc-500">planned</span>}
                  {!s.start_date && <span className="ml-1.5 text-[10px] text-amber-600" title="no start_date — YTD assumes active since Jan 1">assumed Jan 1</span>}
                </span>
                <span className="tabular-nums text-zinc-600">{usd(Number(s.monthly_usd))}/mo</span>
              </li>
            ))}
            {data.subscriptions.length === 0 && <li className="text-xs text-zinc-400">None recorded.</li>}
          </ul>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-5">
          <h2 className="font-semibold">Subscription quota used (this month)</h2>
          <p className="mt-1 text-xs text-zinc-500">
            Covered by the flat fee — usage books $0 marginal, so we track units, not dollars.
          </p>
          <ul className="mt-2 space-y-2 text-sm">
            {data.quotas.map((q) => (
              <li key={q.service}>
                <div className="flex items-baseline justify-between">
                  <span className="capitalize text-zinc-700">{q.service}</span>
                  <span className="tabular-nums text-zinc-600">{q.used} / {q.cap}</span>
                </div>
                <div className="mt-1 h-1.5 w-full overflow-hidden rounded bg-zinc-100">
                  <div
                    className={`h-1.5 rounded ${q.used / q.cap > 0.9 ? "bg-red-500" : "bg-emerald-600"}`}
                    style={{ width: `${Math.min((q.used / q.cap) * 100, 100)}%` }}
                  />
                </div>
              </li>
            ))}
            {data.quotas.length === 0 && <li className="text-xs text-zinc-400">No quota-metered usage yet this month.</li>}
          </ul>
        </div>
      </div>

      {/* Log a cost — the Upwork VA invoices are the whole point of this form */}
      <div className="rounded-xl border border-zinc-200 bg-white p-5">
        <h2 className="font-semibold">Log a cost</h2>
        <p className="mt-1 text-xs text-zinc-500">
          Invoiced spend no API meters — the Upwork VA above all. It books into Variable for the
          window its date falls in.
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
          <label className="lg:col-span-1">
            <span className="block text-[11px] font-medium uppercase tracking-wide text-zinc-500">Amount (USD) *</span>
            <input value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ""))}
              inputMode="decimal" placeholder="120.00" className={`mt-0.5 ${inputCls}`} />
          </label>
          <label className="lg:col-span-1">
            <span className="block text-[11px] font-medium uppercase tracking-wide text-zinc-500">Units (hrs/contacts)</span>
            <input value={units} onChange={(e) => setUnits(e.target.value.replace(/[^\d.]/g, ""))}
              inputMode="decimal" placeholder="20" className={`mt-0.5 ${inputCls}`} />
          </label>
          <label className="lg:col-span-1">
            <span className="block text-[11px] font-medium uppercase tracking-wide text-zinc-500">Date</span>
            <input type="date" value={dated} onChange={(e) => setDated(e.target.value)} className={`mt-0.5 ${inputCls}`} />
          </label>
          <label className="lg:col-span-1">
            <span className="block text-[11px] font-medium uppercase tracking-wide text-zinc-500">Service</span>
            <select value={service} onChange={(e) => setService(e.target.value)} className={`mt-0.5 ${inputCls}`}>
              <option value="upwork">upwork</option>
              <option value="other">other</option>
            </select>
          </label>
          <label className="lg:col-span-1">
            <span className="block text-[11px] font-medium uppercase tracking-wide text-zinc-500">Entered by *</span>
            <select value={enteredBy} onChange={(e) => setEnteredBy(e.target.value)} className={`mt-0.5 ${inputCls}`}>
              <option>John</option>
              <option>Tom</option>
            </select>
          </label>
          <label className="sm:col-span-2 lg:col-span-1">
            <span className="block text-[11px] font-medium uppercase tracking-wide text-zinc-500">Note</span>
            <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Upwork invoice #123" className={`mt-0.5 ${inputCls}`} />
          </label>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button
            onClick={logCost}
            disabled={busy || !amount || Number(amount) < 0}
            className="rounded-lg bg-emerald-700 px-4 py-1.5 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"
          >
            {busy ? "Logging…" : "Log cost"}
          </button>
          {saved && <span className="text-xs font-medium text-emerald-700">{saved}</span>}
          {formErr && <span className="text-xs text-amber-700">{formErr}</span>}
        </div>

        {entries.length > 0 && (
          <div className="mt-4 border-t border-zinc-100 pt-3">
            <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Recently logged</div>
            <ul className="mt-1.5 space-y-1 text-xs text-zinc-600">
              {entries.map((e) => (
                <li key={e.id} className="flex flex-wrap items-baseline gap-x-2">
                  <span className="tabular-nums text-zinc-500">{String(e.at).slice(0, 10)}</span>
                  <span className="font-medium capitalize">{e.service}</span>
                  <span className="tabular-nums font-semibold">{usd(Number(e.cost_usd))}</span>
                  {e.units != null && <span className="text-zinc-400">{Number(e.units)} units</span>}
                  {e.meta?.entered_by && <span className="text-zinc-400">· {e.meta.entered_by}</span>}
                  {e.meta?.note && <span className="truncate text-zinc-400">· {e.meta.note}</span>}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
