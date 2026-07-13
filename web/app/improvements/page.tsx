"use client";

// Improvements — the continuous-improvement surface (IMPROVEMENTS-LOOP.md).
// Tom/John submit feedback here; agents poll it every loop and triage into
// TASK-QUEUE; statuses flow back so ideas visibly move submitted → shipped.
import { useEffect, useState } from "react";
import FeedbackThread from "@/components/FeedbackThread";
import { StagedFiles, uploadAttachment } from "@/components/Attachments";
import MicButton from "@/components/MicButton";

type Item = {
  id: string;
  created_at: string;
  author: string;
  type: "bug" | "idea" | "change" | "suggestion";
  page: string | null;
  body: string;
  status: "submitted" | "triaged" | "building" | "shipped" | "verified" | "suggested" | "approved" | "declined";
  lane: string | null;
  shipped_ref: string | null;
  reply_pending?: boolean;
  feedback_comments?: { count: number }[];
};

// 💬 count badge + reply-pending, shown on collapsed cards. Comment counts
// come from 0011 when applied; until then the body-append segments count.
function ThreadBadge({ it }: { it: Item }) {
  const n = it.feedback_comments?.[0]?.count ?? Math.max(it.body.split(/—\s*\w+\s+adds:/).length - 1, 0);
  return (
    <span className="flex items-center gap-1.5">
      {n > 0 && <span className="rounded-full bg-zinc-100 px-1.5 py-0.5 text-[10px] font-semibold text-zinc-600">💬 {n}</span>}
      {it.reply_pending && (
        <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">⏳ agent reply pending</span>
      )}
    </span>
  );
}

const STATUS_STYLE: Record<string, string> = {
  submitted: "bg-zinc-100 text-zinc-600",
  triaged: "bg-blue-50 text-blue-700",
  building: "bg-amber-50 text-amber-700",
  shipped: "bg-emerald-50 text-emerald-700",
  verified: "bg-emerald-600 text-white",
  suggested: "bg-purple-50 text-purple-700",
  approved: "bg-emerald-50 text-emerald-800",
  declined: "bg-zinc-100 text-zinc-400",
};

const TYPE_ICON: Record<string, string> = { bug: "🐛", idea: "💡", change: "✏️", suggestion: "🧠" };

// The "brain": agent-generated improvement ideas. John/Tom approve (build it),
// decline, or add detail — dictation supported.
function SuggestionsSection({ items, onChanged }: { items: Item[] | null; onChanged: () => void }) {
  const [openFor, setOpenFor] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const suggestions = (items ?? []).filter((i) => i.type === "suggestion" && i.status !== "declined");

  async function decline(id: string) {
    setBusy(true);
    await fetch("/api/feedback", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, status: "declined" }) });
    setBusy(false);
    onChanged();
  }

  return (
    <section className="space-y-3">
      <div>
        <h2 className="font-semibold">🧠 Improvement Suggestions <span className="text-xs font-normal text-zinc-400">— talk it through, then approve; the last agent reply is the build contract</span></h2>
      </div>
      {suggestions.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-200 p-6 text-center text-sm text-zinc-400">
          The agents post improvement ideas here each work cycle — open the thread, push back, approve.
        </div>
      ) : (
        suggestions.map((s) => (
          <div key={s.id} className="rounded-xl border border-purple-100 bg-purple-50/30 p-4">
            <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500">
              <span>🧠</span>
              <span className="font-medium text-zinc-700">{s.author}</span>
              {s.page && <span className="rounded bg-zinc-100 px-1.5 py-0.5">{s.page}</span>}
              <ThreadBadge it={s} />
              <span className={`ml-auto rounded-full px-2 py-0.5 font-semibold ${STATUS_STYLE[s.status]}`}>{s.status}</span>
            </div>
            {openFor === s.id ? (
              <FeedbackThread
                item={s}
                onChanged={onChanged}
                micButton={(onText) => <MicButton onText={onText} />}
              />
            ) : (
              <>
                <p className="mt-2 line-clamp-3 whitespace-pre-wrap text-sm text-zinc-800">{s.body}</p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <button onClick={() => setOpenFor(s.id)}
                    className="rounded-md bg-zinc-800 px-3 py-1 text-xs font-semibold text-white hover:bg-zinc-900">
                    💬 Open thread
                  </button>
                  {s.status === "suggested" && (
                    <button disabled={busy} onClick={() => decline(s.id)}
                      className="rounded-md border border-zinc-200 px-3 py-1 text-xs text-zinc-400 hover:bg-zinc-50">
                      Decline
                    </button>
                  )}
                </div>
              </>
            )}
            {openFor === s.id && (
              <button onClick={() => setOpenFor(null)} className="mt-2 text-xs text-zinc-400 hover:underline">
                collapse
              </button>
            )}
          </div>
        ))
      )}
    </section>
  );
}
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
  const [files, setFiles] = useState<File[]>([]);
  const [threadFor, setThreadFor] = useState<string | null>(null);

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
    if (res.ok) {
      // upload staged files against the new row's id; surface any failure
      const { id } = await res.json().catch(() => ({}));
      let uploadErr: string | null = null;
      if (id) for (const f of files) uploadErr = (await uploadAttachment(id, f)) ?? uploadErr;
      setBusy(false);
      setBody(""); setFiles([]); setDone(true); setTimeout(() => setDone(false), 2500); load();
      setError(uploadErr && `submitted, but an attachment failed: ${uploadErr}`);
    } else {
      setBusy(false);
      setError((await res.json().catch(() => ({}))).error ?? "submit failed");
    }
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
        <div className="flex items-start gap-2">
          <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={3}
            placeholder="What's wrong, or what should exist? Type or tap the mic and talk."
            className="w-full rounded-md border border-zinc-300 px-2.5 py-1.5 text-sm" />
          <MicButton onText={(t) => setBody((b) => (b ? b + " " : "") + t)} />
        </div>
        <StagedFiles files={files} setFiles={setFiles} />
        <div className="flex items-center gap-3">
          <button onClick={submit} disabled={busy || !body.trim()}
            className="rounded-lg bg-emerald-700 px-4 py-1.5 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50">
            {busy ? "Submitting…" : "Submit to the agents"}
          </button>
          {done && <span className="text-sm font-medium text-emerald-700">Submitted ✓ — agents pick it up on their next cycle</span>}
        </div>
        {error && <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">{error}</div>}
      </section>

      <SuggestionsSection items={items} onChanged={load} />

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
        ) : items.filter((i) => i.type !== "suggestion").length === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-200 p-6 text-center text-sm text-zinc-400">
            Nothing submitted yet — be the first.
          </div>
        ) : (
          items.filter((i) => i.type !== "suggestion").map((it) => (
            <div key={it.id} className="rounded-xl border border-zinc-200 bg-white p-4">
              <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500">
                <span>{TYPE_ICON[it.type]}</span>
                <span className="font-medium text-zinc-700">{it.author}</span>
                {it.page && <span className="rounded bg-zinc-100 px-1.5 py-0.5">{it.page}</span>}
                <span>{new Date(it.created_at).toLocaleString()}</span>
                <ThreadBadge it={it} />
                <span className={`ml-auto rounded-full px-2 py-0.5 font-semibold ${STATUS_STYLE[it.status]}`}>{it.status}</span>
                {it.lane && <span className="rounded bg-zinc-100 px-1.5 py-0.5">lane {it.lane}</span>}
              </div>
              {threadFor === it.id ? (
                <>
                  <FeedbackThread item={it} onChanged={load} micButton={(onText) => <MicButton onText={onText} />} />
                  <button onClick={() => setThreadFor(null)} className="mt-2 text-xs text-zinc-400 hover:underline">
                    collapse
                  </button>
                </>
              ) : (
                <>
                  <p className="mt-2 line-clamp-3 whitespace-pre-wrap text-sm text-zinc-800">{it.body}</p>
                  <button
                    onClick={() => setThreadFor(it.id)}
                    className="mt-2 rounded-md border border-zinc-300 px-2.5 py-1 text-xs font-medium text-zinc-600 hover:bg-zinc-50"
                  >
                    💬 Open thread
                  </button>
                </>
              )}
              {it.shipped_ref && <p className="mt-1 text-xs text-emerald-700">shipped: {it.shipped_ref}</p>}
            </div>
          ))
        )}
      </section>
    </div>
  );
}
