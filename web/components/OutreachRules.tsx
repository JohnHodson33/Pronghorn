"use client";

// Auto-draft rules editor (John 7/13 — drafting is allowlist-only; zero rules
// = zero drafts). Lives on /outbox above the drafts. Chip patterns match the
// Scrape Criteria page: industries from /api/taxonomy toggle on/off, states
// are typed two-letter chips. Saves to /api/outreach-rules (degrades with an
// honest note until migration 0013 lands).
import { useEffect, useState } from "react";

type Rule = {
  id: string;
  name: string;
  enabled: boolean;
  industries: string[];
  states: string[];
  min_completeness: string;
  min_size_tier: string | null;
  nightly_cap: number;
};

const chip = (on: boolean) =>
  `rounded-full px-2.5 py-1 text-xs font-medium transition ${
    on ? "bg-emerald-700 text-white" : "border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50"
  }`;

export default function OutreachRules() {
  const [rules, setRules] = useState<Rule[] | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [taxonomy, setTaxonomy] = useState<{ label: string; thesis_core?: boolean }[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [industries, setIndustries] = useState<Set<string>>(new Set());
  const [states, setStates] = useState<string[]>([]);
  const [stateInput, setStateInput] = useState("");
  const [minCompleteness, setMinCompleteness] = useState("contactable");
  const [cap, setCap] = useState(5);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    const j = await fetch("/api/outreach-rules", { cache: "no-store" }).then((r) => r.json()).catch(() => ({}));
    setRules(j.rules ?? []);
    setNote(j.note ?? null);
  }
  useEffect(() => {
    load();
    fetch("/api/taxonomy").then((r) => r.json()).then((j) => setTaxonomy(j.industries ?? [])).catch(() => {});
  }, []);

  function addState() {
    const s = stateInput.trim().toUpperCase();
    if (/^[A-Z]{2}$/.test(s) && !states.includes(s)) setStates([...states, s]);
    setStateInput("");
  }

  async function create() {
    setBusy(true);
    setErr(null);
    const res = await fetch("/api/outreach-rules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ industries: [...industries], states, minCompleteness, nightlyCap: cap }),
    });
    const j = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { setErr(j.error ?? "save failed"); return; }
    setIndustries(new Set());
    setStates([]);
    setShowForm(false);
    load();
  }

  async function toggle(r: Rule) {
    await fetch("/api/outreach-rules", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: r.id, enabled: !r.enabled }),
    });
    load();
  }

  async function remove(r: Rule) {
    if (!confirm(`Delete rule "${r.name}"? Auto-drafting under it stops immediately.`)) return;
    await fetch(`/api/outreach-rules?id=${r.id}`, { method: "DELETE" });
    load();
  }

  const active = (rules ?? []).filter((r) => r.enabled).length;

  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-4 space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="font-semibold">Auto-draft rules</h2>
        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${active ? "bg-emerald-100 text-emerald-800" : "bg-zinc-100 text-zinc-500"}`}>
          {active ? `${active} active` : "none — zero rules = zero auto-drafts"}
        </span>
        <button
          onClick={() => setShowForm((s) => !s)}
          className="ml-auto rounded-md border border-zinc-300 px-2.5 py-1 text-xs font-semibold text-zinc-600 hover:bg-zinc-50"
        >
          {showForm ? "close" : "+ New rule"}
        </button>
      </div>
      <p className="text-xs text-zinc-500">
        The nightly drafter writes an owner email ONLY for leads matching an enabled rule — industry allowlist,
        completeness floor, per-rule nightly cap. Drafts land in your Outlook Drafts for review; nothing sends itself.
      </p>
      {note && <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">{note}</div>}

      {(rules ?? []).map((r) => (
        <div key={r.id} className={`flex flex-wrap items-center gap-2 rounded-lg border px-3 py-2 ${r.enabled ? "border-emerald-200 bg-emerald-50/40" : "border-zinc-200 bg-zinc-50 opacity-70"}`}>
          <span className="text-sm font-medium">{r.name}</span>
          <span className="text-xs text-zinc-500">
            {r.industries.join(", ")} · {r.states.length ? r.states.join(", ") : "any state"} · {r.min_completeness}+ · cap {r.nightly_cap}/night
          </span>
          <span className="ml-auto flex items-center gap-2">
            <button onClick={() => toggle(r)} className={`rounded-md px-2 py-0.5 text-xs font-semibold ${r.enabled ? "bg-emerald-700 text-white" : "border border-zinc-300 text-zinc-500"}`}>
              {r.enabled ? "enabled" : "disabled"}
            </button>
            <button onClick={() => remove(r)} aria-label={`Delete ${r.name}`} className="rounded-md px-1.5 py-0.5 text-xs text-zinc-400 hover:bg-zinc-100 hover:text-red-600">✕</button>
          </span>
        </div>
      ))}

      {showForm && (
        <div className="space-y-3 rounded-lg border border-zinc-200 p-3">
          <div>
            <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-zinc-500">Industries (allowlist — pick at least one)</div>
            <div className="flex flex-wrap gap-1.5">
              {taxonomy.map((t) => (
                <button
                  key={t.label}
                  onClick={() => setIndustries((prev) => { const n = new Set(prev); n.has(t.label) ? n.delete(t.label) : n.add(t.label); return n; })}
                  className={chip(industries.has(t.label))}
                  title={t.thesis_core ? "thesis-core industry" : undefined}
                >
                  {t.thesis_core ? "★ " : ""}{t.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">States</div>
            {states.map((s) => (
              <span key={s} className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium">
                {s} <button onClick={() => setStates(states.filter((x) => x !== s))} aria-label={`Remove ${s}`} className="text-zinc-400 hover:text-zinc-600">✕</button>
              </span>
            ))}
            <input
              value={stateInput}
              onChange={(e) => setStateInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addState()}
              onBlur={addState}
              placeholder="AZ ⏎"
              className="w-16 rounded-md border border-zinc-300 px-2 py-1 text-xs uppercase outline-none focus:border-emerald-600"
            />
            <span className="text-[11px] text-zinc-400">empty = any state</span>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <label className="flex items-center gap-2 text-xs">
              <span className="font-semibold uppercase tracking-wide text-zinc-500">Min completeness</span>
              <select value={minCompleteness} onChange={(e) => setMinCompleteness(e.target.value)} className="rounded-md border border-zinc-300 px-2 py-1 text-xs">
                <option value="contactable">◕ contactable</option>
                <option value="full">● full</option>
              </select>
            </label>
            <label className="flex items-center gap-2 text-xs">
              <span className="font-semibold uppercase tracking-wide text-zinc-500">Nightly cap</span>
              <input type="number" min={1} max={50} value={cap} onChange={(e) => setCap(Number(e.target.value))} className="w-16 rounded-md border border-zinc-300 px-2 py-1 text-xs" />
            </label>
            <button
              onClick={create}
              disabled={busy || industries.size === 0}
              className="ml-auto rounded-lg bg-emerald-700 px-4 py-1.5 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"
            >
              {busy ? "Saving…" : "Create rule"}
            </button>
          </div>
          {err && <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">{err}</div>}
        </div>
      )}
    </section>
  );
}
