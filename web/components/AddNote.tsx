"use client";

// "+ Add note" (John 7/13 — meeting-notes input): paste a Notion link or raw
// text → /api/notes/suggest proposes company/contact/deal tag chips with
// confidence → John prunes/extends (search-add via /api/search) → Save writes
// one kind='meeting' activity per tagged record. Global header button; full
// mobile parity (bottom-sheet panel, thumb targets).
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import MicButton from "@/components/MicButton";

type Tag = {
  kind: "company" | "contact" | "deal";
  id: string;
  label: string;
  sub?: string;
  confidence?: "high" | "medium";
  reason?: string;
};

const KIND_ICON: Record<Tag["kind"], string> = { company: "🏢", contact: "👤", deal: "🤝" };
const CONF_STYLE: Record<string, string> = {
  high: "border-emerald-300 bg-emerald-50 text-emerald-800",
  medium: "border-amber-200 bg-amber-50 text-amber-800",
  picked: "border-zinc-300 bg-zinc-100 text-zinc-700",
};

function TagChip({ t, onRemove }: { t: Tag; onRemove: () => void }) {
  return (
    <span
      title={t.reason}
      className={`inline-flex max-w-full items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs ${CONF_STYLE[t.confidence ?? "picked"]}`}
    >
      <span aria-hidden>{KIND_ICON[t.kind]}</span>
      <span className="truncate font-medium">{t.label}</span>
      {t.sub && <span className="hidden truncate opacity-60 sm:inline">{t.sub}</span>}
      {t.confidence && <span className="shrink-0 rounded bg-white/60 px-1 text-[10px] font-semibold uppercase">{t.confidence}</span>}
      <button onClick={onRemove} aria-label={`Remove ${t.label}`} className="ml-0.5 shrink-0 rounded-full px-1 opacity-60 hover:bg-white/70 hover:opacity-100">
        ✕
      </button>
    </span>
  );
}

// search-add: reuses /api/search's grouped hits to extend the tag set
function TagSearch({ add }: { add: (t: Tag) => void }) {
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<Tag[]>([]);
  useEffect(() => {
    if (q.trim().length < 2) { setHits([]); return; }
    const t = setTimeout(async () => {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q.trim())}`);
      const j = await res.json().catch(() => ({}));
      const out: Tag[] = [];
      for (const [group, kind] of [["companies", "company"], ["contacts", "contact"], ["deals", "deal"]] as const) {
        for (const h of j[group] ?? []) out.push({ kind, id: h.id, label: h.label, sub: h.sub });
      }
      setHits(out.slice(0, 6));
    }, 250);
    return () => clearTimeout(t);
  }, [q]);
  return (
    <div className="relative">
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="+ tag another company / contact / deal…"
        className="w-full rounded-md border border-dashed border-zinc-300 px-2.5 py-1.5 text-xs outline-none focus:border-emerald-600"
      />
      {hits.length > 0 && (
        <div className="absolute z-10 mt-1 w-full rounded-md border border-zinc-200 bg-white shadow-lg">
          {hits.map((h) => (
            <button
              key={`${h.kind}-${h.id}`}
              onClick={() => { add(h); setQ(""); setHits([]); }}
              className="flex w-full items-center gap-2 px-2.5 py-2 text-left text-xs hover:bg-zinc-50"
            >
              <span aria-hidden>{KIND_ICON[h.kind]}</span>
              <span className="font-medium">{h.label}</span>
              <span className="truncate text-zinc-400">{h.sub}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function AddNote() {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [link, setLink] = useState("");
  const [tags, setTags] = useState<Tag[]>([]);
  const [suggested, setSuggested] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  function reset() {
    setText(""); setLink(""); setTags([]); setSuggested(false); setMsg(null); setDone(null);
  }

  async function suggest() {
    setBusy(true); setMsg(null);
    const res = await fetch("/api/notes/suggest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: text.trim() || undefined, notionUrl: link.trim() || undefined }),
    });
    const j = await res.json().catch(() => ({}));
    setBusy(false);
    if (j.error) { setMsg(j.error); return; }
    if (j.source === "notion" && j.text) setText(j.text);
    const existing = new Set(tags.map((t) => `${t.kind}-${t.id}`));
    setTags([...tags, ...(j.suggestions ?? []).filter((s: Tag) => !existing.has(`${s.kind}-${s.id}`))]);
    setSuggested(true);
    if (!(j.suggestions ?? []).length) setMsg("No records matched — tag manually below.");
  }

  async function save() {
    if (!text.trim() || !tags.length) return;
    setBusy(true); setMsg(null);
    let failed = 0;
    for (const t of tags) {
      const res = await fetch("/api/activities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          [t.kind === "company" ? "companyId" : t.kind === "contact" ? "contactId" : "dealId"]: t.id,
          kind: "meeting",
          body: text.trim(),
          docUrl: link.trim() || null,
        }),
      });
      if (!res.ok) failed++;
    }
    setBusy(false);
    if (failed) setMsg(`${failed} of ${tags.length} saves failed — try again`);
    else {
      setDone(`Note saved to ${tags.length} record${tags.length > 1 ? "s" : ""} ✓`);
      setTimeout(() => { setOpen(false); reset(); }, 1400);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        title="Add a meeting note"
        className="shrink-0 rounded-lg border border-zinc-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-zinc-600 hover:bg-zinc-100"
      >
        + Note
      </button>

      {/* portal: the header's backdrop-blur creates a containing block that
          would trap a fixed overlay inside the 50px bar */}
      {open && createPortal(
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 sm:items-center" onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}>
          <div ref={panelRef} className="max-h-[90vh] w-full overflow-y-auto rounded-t-2xl bg-white p-4 shadow-xl sm:max-w-lg sm:rounded-2xl">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="font-semibold">Add meeting note</h2>
              <button onClick={() => { setOpen(false); reset(); }} aria-label="Close" className="rounded-full px-2 py-1 text-zinc-400 hover:bg-zinc-100">✕</button>
            </div>

            <input
              value={link}
              onChange={(e) => setLink(e.target.value)}
              placeholder="Paste a Notion link (optional)…"
              className="mb-2 w-full rounded-md border border-zinc-300 px-2.5 py-2 text-sm outline-none focus:border-emerald-600"
            />
            <div className="flex items-start gap-2">
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={5}
                placeholder="…or paste / type the note text — or tap the mic and talk"
                className="w-full rounded-md border border-zinc-300 px-2.5 py-2 text-sm outline-none focus:border-emerald-600"
              />
              <MicButton onText={(t) => setText((x) => (x ? x + " " : "") + t)} />
            </div>

            <div className="mt-2 space-y-2">
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {tags.map((t, i) => (
                    <TagChip key={`${t.kind}-${t.id}`} t={t} onRemove={() => setTags(tags.filter((_, j) => j !== i))} />
                  ))}
                </div>
              )}
              {suggested && <TagSearch add={(t) => { if (!tags.some((x) => x.kind === t.kind && x.id === t.id)) setTags([...tags, t]); }} />}
              {msg && <div className="rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-xs text-amber-800">{msg}</div>}
              {done && <div className="rounded-md bg-emerald-50 px-2.5 py-1.5 text-sm font-medium text-emerald-700">{done}</div>}
            </div>

            <div className="mt-3 flex items-center gap-2">
              {!suggested ? (
                <button
                  onClick={suggest}
                  disabled={busy || (!text.trim() && !link.trim())}
                  className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"
                >
                  {busy ? "Matching…" : "Suggest tags"}
                </button>
              ) : (
                <>
                  <button
                    onClick={save}
                    disabled={busy || !text.trim() || !tags.length}
                    className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"
                  >
                    {busy ? "Saving…" : `Save to ${tags.length || "…"} record${tags.length === 1 ? "" : "s"}`}
                  </button>
                  <button onClick={suggest} disabled={busy} className="rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-600 hover:bg-zinc-50 disabled:opacity-50">
                    Re-suggest
                  </button>
                </>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
