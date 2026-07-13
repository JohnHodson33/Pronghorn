"use client";

// Improvements — the continuous-improvement surface (IMPROVEMENTS-LOOP.md).
// Tom/John submit feedback here; agents poll it every loop and triage into
// TASK-QUEUE; statuses flow back so ideas visibly move submitted → shipped.
import { useEffect, useState } from "react";

type Item = {
  id: string;
  created_at: string;
  author: string;
  type: "bug" | "idea" | "change";
  page: string | null;
  body: string;
  status: "submitted" | "triaged" | "building" | "shipped" | "verified";
  lane: string | null;
  shipped_ref: string | null;
};

const STATUS_STYLE: Record<Item["status"], string> = {
  submitted: "bg-zinc-100 text-zinc-600",
  triaged: "bg-blue-50 text-blue-700",
  building: "bg-amber-50 text-amber-700",
  shipped: "bg-emerald-50 text-emerald-700",
  verified: "bg-emerald-600 text-white",
};
const TYPE_ICON: Record<Item["type"], string> = { bug: "🐛", idea: "💡", change: "✏️" };
const PAGES = ["Dashboard", "Broker Listings", "Scrape Criteria", "Proprietary Outreach", "Enrichment", "Pipeline", "Deals", "Companies", "Contacts", "Broker Directory", "Outbox", "Outreach", "Cold Calling", "Other"];

export default function Improvements() {
  const [items, setItems] = useState<Item[] | null>(null);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [error, setError] = useState<string | null>(null);
  const [author, setAuthor] = useState("John");
  const [type, setType] = useState<Item["type"]>("idea");
  const [page, setPage] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function load() {
    const res = await fetch("/api/feedback", { cache: "no-store" });
    const data = await res.json().catch(() => ({}));
    setError(data.error ?? null);
    setItems(data.items ?? []);
    setCounts(data.counts ?? {});
  }
  useEffect(() => { load(); const t = setInterval(load, 30_000); return () => clearInterval(t); }, []);

  async function submit() {
    if (!body.trim()) return;
    setBusy(true);
    const res = await fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ author, type, page: page || null, body: body.trim() }),
    });
    setBusy(false);
    if (res.ok) { setBody(""); setDone(true); setTimeout(() => setDone(false), 2500); load(); }
    else setError((await res.json().catch(() => ({}))).error ?? "submit failed");
  }

  return (
    <div className="max-w-4xl p-4 md:p-8 space-y-8">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Improvements</h1>
        <p className="text-sm text-zinc-500">
          Bugs, ideas, and change requests go straight to the build agents — no relay needed. They
          triage every submission within their work cycles and the status here updates as your idea
          moves from <span className="font-medium">submitted → triaged → building → shipped</span>.
        </p>
      </header>

      <section className="rounded-xl border border-zinc-200 bg-white p-5 space-y-3">
        <h2 className="font-semibold">Submit feedback</h2>
        <div className="grid gap-2 md:grid-cols-3">
          <select value={author} onChange={(e) => setAuthor(e.target.value)}
            className="rounded-md border border-zinc-300 px-2.5 py-1.5 text-sm">
            <option>John</option><option>Tom</option>
          </select>
          <select value={type} onChange={(e) => setType(e.target.value as Item["type"])}
            className="rounded-md border border-zinc-300 px-2.5 py-1.5 text-sm">
            <option value="bug">🐛 Bug</option><option value="idea">💡 Idea</option><option value="change">✏️ Change request</option>
          </select>
          <select value={page} onChange={(e) => setPage(e.target.value)}
            className="rounded-md border border-zinc-300 px-2.5 py-1.5 text-sm">
            <option value="">Which page? (optional)</option>
            {PAGES.map((p) => <option key={p}>{p}</option>)}
          </select>
        </div>
        <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={3}
          placeholder="What's wrong, or what should exist? The more specific, the faster it ships."
          className="w-full rounded-md border border-zinc-300 px-2.5 py-1.5 text-sm" />
        <div className="flex items-center gap-3">
          <button onClick={submit} disabled={busy || !body.trim()}
            className="rounded-lg bg-emerald-700 px-4 py-1.5 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50">
            {busy ? "Submitting…" : "Submit to the agents"}
          </button>
          {done && <span className="text-sm font-medium text-emerald-700">Submitted ✓ — agents pick it up on their next cycle</span>}
        </div>
        {error && <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">{error}</div>}
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="font-semibold">Status board</h2>
          <div className="ml-auto flex flex-wrap gap-1.5 text-[11px]">
            {Object.entries(counts).map(([s, n]) => (
              <span key={s} className={`rounded-full px-2 py-0.5 font-medium ${STATUS_STYLE[s as Item["status"]] ?? "bg-zinc-100"}`}>{s} · {n}</span>
            ))}
          </div>
        </div>
        {items === null ? (
          <div className="text-sm text-zinc-400">Loading…</div>
        ) : items.length === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-200 p-6 text-center text-sm text-zinc-400">
            Nothing submitted yet — be the first.
          </div>
        ) : (
          items.map((it) => (
            <div key={it.id} className="rounded-xl border border-zinc-200 bg-white p-4">
              <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500">
                <span>{TYPE_ICON[it.type]}</span>
                <span className="font-medium text-zinc-700">{it.author}</span>
                {it.page && <span className="rounded bg-zinc-100 px-1.5 py-0.5">{it.page}</span>}
                <span>{new Date(it.created_at).toLocaleString()}</span>
                <span className={`ml-auto rounded-full px-2 py-0.5 font-semibold ${STATUS_STYLE[it.status]}`}>{it.status}</span>
                {it.lane && <span className="rounded bg-zinc-100 px-1.5 py-0.5">lane {it.lane}</span>}
              </div>
              <p className="mt-2 whitespace-pre-wrap text-sm text-zinc-800">{it.body}</p>
              {it.shipped_ref && <p className="mt-1 text-xs text-emerald-700">shipped: {it.shipped_ref}</p>}
            </div>
          ))
        )}
      </section>
    </div>
  );
}
