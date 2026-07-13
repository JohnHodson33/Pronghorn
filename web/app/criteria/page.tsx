"use client";

// Criteria Editor — the investment guardrails as a live, editable form.
// Saves to screen_profiles; the scraper pipeline reads this profile on every
// run, so edits here change what the next scrape keeps and screens.

import { useEffect, useState } from "react";
import RangeSlider from "@/components/RangeSlider";
import SubsectorToggles from "@/components/SubsectorToggles";
import { US_STATES } from "@/lib/geo-suggest";

type Profile = {
  id: string;
  name: string;
  industry_keywords_include: string[];
  industry_keywords_exclude: string[];
  include_states: string[];
  exclude_states: string[];
  priority_states: string[];
  min_asking_price: number | null;
  max_asking_price: number | null;
  min_cash_flow: number | null;
  max_cash_flow: number | null;
  unknown_cash_flow_min_asking_price: number | null;
  keep_when_unknown: boolean;
  max_multiple_flag: number | null;
  updated_at: string;
};

const toList = (s: string): string[] => s.split(/[\n,]/).map((x) => x.trim()).filter(Boolean);
const toNum = (s: string): number | null => (s.trim() === "" ? null : Number(s.replace(/[^0-9.]/g, "")));
const fromNum = (n: number | null): string => (n === null ? "" : String(n));

export default function CriteriaPage() {
  const [p, setP] = useState<Profile | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // form state (strings for easy editing)
  const [inc, setInc] = useState("");
  const [exc, setExc] = useState("");
  const [incStates, setIncStates] = useState("");
  const [excStates, setExcStates] = useState("");
  const [priStates, setPriStates] = useState("");
  const [minAsk, setMinAsk] = useState("");
  const [maxAsk, setMaxAsk] = useState("");
  const [minCF, setMinCF] = useState("");
  const [maxCF, setMaxCF] = useState("");
  const [proxyAsk, setProxyAsk] = useState("");
  const [keepUnknown, setKeepUnknown] = useState(true);
  const [maxMult, setMaxMult] = useState("");

  useEffect(() => {
    fetch("/api/criteria")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("Database not connected"))))
      .then((d: Profile) => {
        setP(d);
        setInc(d.industry_keywords_include.join("\n"));
        setExc(d.industry_keywords_exclude.join("\n"));
        setIncStates(d.include_states.join(", "));
        setExcStates(d.exclude_states.join(", "));
        setPriStates(d.priority_states.join(", "));
        setMinAsk(fromNum(d.min_asking_price));
        setMaxAsk(fromNum(d.max_asking_price));
        setMinCF(fromNum(d.min_cash_flow));
        setMaxCF(fromNum(d.max_cash_flow));
        setProxyAsk(fromNum(d.unknown_cash_flow_min_asking_price));
        setKeepUnknown(d.keep_when_unknown);
        setMaxMult(fromNum(d.max_multiple_flag));
      })
      .catch((e: Error) => setErr(e.message));
  }, []);

  async function save() {
    if (!p) return;
    setSaving(true);
    setSaved(null);
    const res = await fetch("/api/criteria", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: p.id,
        industry_keywords_include: toList(inc),
        industry_keywords_exclude: toList(exc),
        include_states: toList(incStates).map((s) => s.toUpperCase()),
        exclude_states: toList(excStates).map((s) => s.toUpperCase()),
        priority_states: toList(priStates).map((s) => s.toUpperCase()),
        min_asking_price: toNum(minAsk),
        max_asking_price: toNum(maxAsk),
        min_cash_flow: toNum(minCF),
        max_cash_flow: toNum(maxCF),
        unknown_cash_flow_min_asking_price: toNum(proxyAsk),
        keep_when_unknown: keepUnknown,
        max_multiple_flag: toNum(maxMult),
      }),
    });
    setSaving(false);
    if (res.ok) setSaved(`Saved ${new Date().toLocaleTimeString()} — applies to the next scrape run`);
    else setErr((await res.json()).error ?? "Save failed");
  }

  if (err) return <div className="p-8 text-sm text-red-600">Criteria editor unavailable: {err}</div>;
  if (!p) return <div className="p-8 text-sm text-zinc-400">Loading criteria…</div>;

  const label = "block text-xs font-semibold uppercase tracking-wide text-zinc-500 mb-1.5";
  const input = "w-full rounded-md border border-zinc-300 px-3 py-1.5 text-sm outline-none focus:border-emerald-600";

  return (
    <div className="max-w-4xl p-4 md:p-8 space-y-6">
      <header className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Screen Criteria</h1>
          <p className="text-sm text-zinc-500">
            Profile: <span className="font-medium">{p.name}</span> — the scraper reads this on every run.
            Change anything, save, and the next pull obeys it.
          </p>
        </div>
        <button
          onClick={save}
          disabled={saving}
          className="rounded-lg bg-emerald-700 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save criteria"}
        </button>
      </header>
      {saved && <div className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{saved}</div>}

      <section className="rounded-xl border border-zinc-200 bg-white p-5">
        <h2 className="mb-3 font-semibold">Subsectors <span className="text-sm font-normal text-zinc-500">— one criteria set, both funnels (listings screening + proprietary list-building)</span></h2>
        <SubsectorToggles keywords={toList(inc)} onChange={(next) => setInc(next.join("\n"))} />
      </section>

      <section className="grid gap-6 md:grid-cols-2">
        <div className="rounded-xl border border-zinc-200 bg-white p-5">
          <label className={label}>Industry keywords — INCLUDE (one per line; empty = all industries)</label>
          <textarea value={inc} onChange={(e) => setInc(e.target.value)} rows={14} className={`${input} font-mono text-xs`} />
        </div>
        <div className="space-y-6">
          <div className="rounded-xl border border-zinc-200 bg-white p-5">
            <label className={label}>Industry keywords — EXCLUDE</label>
            <textarea value={exc} onChange={(e) => setExc(e.target.value)} rows={4} className={`${input} font-mono text-xs`} />
          </div>
          <div className="rounded-xl border border-zinc-200 bg-white p-5 space-y-4">
            <div>
              <label className={label}>Priority states (flagged ★, never filtered)</label>
              <div className="mb-2 flex flex-wrap gap-1">
                {US_STATES.map((s) => {
                  const list = toList(priStates).map((x) => x.toUpperCase());
                  const on = list.includes(s);
                  return (
                    <button
                      key={s}
                      onClick={() =>
                        setPriStates((on ? list.filter((x) => x !== s) : [...list, s]).join(", "))
                      }
                      className={`rounded px-1.5 py-0.5 text-[11px] font-semibold transition ${
                        on ? "bg-emerald-700 text-white" : "bg-zinc-100 text-zinc-500 hover:bg-zinc-200"
                      }`}
                    >
                      {s}
                    </button>
                  );
                })}
              </div>
              <input value={priStates} onChange={(e) => setPriStates(e.target.value)} className={input} />
            </div>
            <div>
              <label className={label}>Include states (empty = national)</label>
              <input value={incStates} onChange={(e) => setIncStates(e.target.value)} className={input} />
            </div>
            <div>
              <label className={label}>Exclude states</label>
              <input value={excStates} onChange={(e) => setExcStates(e.target.value)} className={input} />
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-zinc-200 bg-white p-5">
        <h2 className="mb-4 font-semibold">Size guardrails ($)</h2>
        <div className="mb-6 grid gap-6 md:grid-cols-2">
          <RangeSlider
            label="Cash flow (SDE/EBITDA) range"
            floor={0}
            ceil={10_000_000}
            min={toNum(minCF)}
            max={toNum(maxCF)}
            onChange={(lo, hi) => {
              setMinCF(fromNum(lo));
              setMaxCF(fromNum(hi));
            }}
          />
          <RangeSlider
            label="Asking price range"
            floor={0}
            ceil={30_000_000}
            min={toNum(minAsk)}
            max={toNum(maxAsk)}
            onChange={(lo, hi) => {
              setMinAsk(fromNum(lo));
              setMaxAsk(fromNum(hi));
            }}
          />
        </div>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
          <div>
            <label className={label}>Min cash flow (SDE/EBITDA floor)</label>
            <input value={minCF} onChange={(e) => setMinCF(e.target.value)} className={input} placeholder="e.g. 300000" />
          </div>
          <div>
            <label className={label}>Max cash flow (cap)</label>
            <input value={maxCF} onChange={(e) => setMaxCF(e.target.value)} className={input} placeholder="e.g. 10000000" />
          </div>
          <div>
            <label className={label}>Unknown-CF asking-price proxy floor</label>
            <input value={proxyAsk} onChange={(e) => setProxyAsk(e.target.value)} className={input} placeholder="e.g. 750000" />
          </div>
          <div>
            <label className={label}>Min asking price</label>
            <input value={minAsk} onChange={(e) => setMinAsk(e.target.value)} className={input} placeholder="none" />
          </div>
          <div>
            <label className={label}>Max asking price</label>
            <input value={maxAsk} onChange={(e) => setMaxAsk(e.target.value)} className={input} placeholder="none" />
          </div>
          <div>
            <label className={label}>Flag multiples above (×)</label>
            <input value={maxMult} onChange={(e) => setMaxMult(e.target.value)} className={input} placeholder="e.g. 5" />
          </div>
        </div>
        <label className="mt-4 flex cursor-pointer items-center gap-2 text-sm text-zinc-700">
          <input type="checkbox" checked={keepUnknown} onChange={(e) => setKeepUnknown(e.target.checked)} className="accent-emerald-700" />
          Keep listings with unknown state / undisclosed financials (recommended — the Claude screener judges them)
        </label>
      </section>
    </div>
  );
}
