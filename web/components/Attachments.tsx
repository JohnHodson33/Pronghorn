"use client";

// Feedback attachments UI (John 7/13 — Tom attaches analyses/data files).
// Chips render on cards + threads with signed download links; the paperclip
// uploads straight to /api/feedback/[id]/attachments. Thumb-sized targets,
// wrapping chips — mobile parity per the standing rule.
import { useCallback, useEffect, useRef, useState } from "react";

export type Attachment = { name: string; size: number | null; created_at?: string; url: string | null };

export function fmtSize(bytes: number | null): string {
  if (bytes == null) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

const chipClass =
  "inline-flex max-w-full items-center gap-1.5 rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-xs text-zinc-700";

export function AttachmentChip({ a }: { a: Attachment }) {
  const inner = (
    <>
      <span aria-hidden>📎</span>
      <span className="truncate font-medium">{a.name}</span>
      {a.size != null && <span className="shrink-0 text-zinc-400">{fmtSize(a.size)}</span>}
    </>
  );
  return a.url ? (
    <a href={a.url} target="_blank" rel="noreferrer" download={a.name} className={`${chipClass} hover:bg-zinc-100 hover:border-zinc-300`}>
      {inner}
    </a>
  ) : (
    <span className={chipClass}>{inner}</span>
  );
}

export async function uploadAttachment(feedbackId: string, file: File): Promise<string | null> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`/api/feedback/${feedbackId}/attachments`, { method: "POST", body: form });
  if (res.ok) return null;
  return (await res.json().catch(() => ({}))).error ?? "upload failed";
}

// Chip strip for a feedback item, with an optional paperclip that uploads on
// pick. refreshKey lets a parent force a re-list (e.g. after its own upload).
export function AttachmentStrip({
  feedbackId,
  canAttach,
  refreshKey = 0,
}: {
  feedbackId: string;
  canAttach?: boolean;
  refreshKey?: number;
}) {
  const [items, setItems] = useState<Attachment[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/feedback/${feedbackId}/attachments`, { cache: "no-store" });
      const j = await res.json().catch(() => ({}));
      setItems(Array.isArray(j.attachments) ? j.attachments : []);
    } catch {
      setItems([]);
    }
  }, [feedbackId]);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  async function onPick(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true);
    setError(null);
    for (const f of Array.from(files)) {
      const err = await uploadAttachment(feedbackId, f);
      if (err) setError(err);
    }
    setBusy(false);
    if (fileRef.current) fileRef.current.value = "";
    load();
  }

  if (!items.length && !canAttach) return null;
  return (
    <div className="mt-2 flex flex-wrap items-center gap-1.5">
      {items.map((a, i) => (
        <AttachmentChip key={i} a={a} />
      ))}
      {canAttach && (
        <>
          <input ref={fileRef} type="file" multiple hidden onChange={(e) => onPick(e.target.files)} />
          <button
            type="button"
            disabled={busy}
            onClick={() => fileRef.current?.click()}
            title="Attach a file"
            className="rounded-full border border-dashed border-zinc-300 px-2.5 py-1 text-xs text-zinc-500 hover:bg-zinc-50 disabled:opacity-50"
          >
            {busy ? "Uploading…" : "📎 Attach"}
          </button>
        </>
      )}
      {error && <span className="text-xs text-amber-700">{error}</span>}
    </div>
  );
}

// Endpoint-driven attachment panel for record profiles (company / deal
// documents: CIMs, NDAs, LOIs). Same chips + paperclip as the feedback strip
// but points at any `{base}` exposing GET/POST attachments, and renders a
// labeled section so the profile reads as a document area. Mobile: chips wrap.
export function AttachmentPanel({
  endpoint,
  heading = "Documents",
  hint,
}: {
  endpoint: string;
  heading?: string;
  hint?: string;
}) {
  const [items, setItems] = useState<Attachment[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(endpoint, { cache: "no-store" });
      const j = await res.json().catch(() => ({}));
      setItems(Array.isArray(j.attachments) ? j.attachments : []);
    } catch {
      setItems([]);
    }
  }, [endpoint]);

  useEffect(() => {
    load();
  }, [load]);

  async function onPick(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true);
    setError(null);
    for (const f of Array.from(files)) {
      const form = new FormData();
      form.append("file", f);
      const res = await fetch(endpoint, { method: "POST", body: form });
      if (!res.ok) setError((await res.json().catch(() => ({}))).error ?? "upload failed");
    }
    setBusy(false);
    if (fileRef.current) fileRef.current.value = "";
    load();
  }

  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-4">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="font-semibold">{heading}{items.length > 0 && <span className="ml-1.5 text-xs font-normal text-zinc-400">({items.length})</span>}</h2>
        <input ref={fileRef} type="file" multiple hidden onChange={(e) => onPick(e.target.files)} />
        <button
          type="button"
          disabled={busy}
          onClick={() => fileRef.current?.click()}
          className="rounded-md border border-zinc-300 px-2.5 py-1 text-xs font-semibold text-zinc-600 hover:border-emerald-600 hover:text-emerald-700 disabled:opacity-50"
        >
          {busy ? "Uploading…" : "📎 Attach"}
        </button>
      </div>
      {items.length === 0 ? (
        <p className="text-xs text-zinc-400">{hint ?? "No documents yet — attach a CIM, NDA, LOI, or analysis."}</p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {items.map((a, i) => (
            <AttachmentChip key={i} a={a} />
          ))}
        </div>
      )}
      {error && <p className="mt-1.5 text-xs text-amber-700">{error}</p>}
    </section>
  );
}

// Pre-submit staging for the feedback form: the feedback row doesn't exist
// yet, so files wait client-side; the form uploads them after POST returns id.
export function StagedFiles({
  files,
  setFiles,
}: {
  files: File[];
  setFiles: (f: File[]) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {files.map((f, i) => (
        <span key={i} className={chipClass}>
          <span aria-hidden>📎</span>
          <span className="truncate font-medium">{f.name}</span>
          <span className="shrink-0 text-zinc-400">{fmtSize(f.size)}</span>
          <button
            type="button"
            onClick={() => setFiles(files.filter((_, j) => j !== i))}
            aria-label={`Remove ${f.name}`}
            className="ml-0.5 shrink-0 rounded-full px-1 text-zinc-400 hover:bg-zinc-200 hover:text-zinc-600"
          >
            ✕
          </button>
        </span>
      ))}
      <input ref={fileRef} type="file" multiple hidden onChange={(e) => {
        if (e.target.files?.length) setFiles([...files, ...Array.from(e.target.files)]);
        e.target.value = "";
      }} />
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        className="rounded-full border border-dashed border-zinc-300 px-2.5 py-1 text-xs text-zinc-500 hover:bg-zinc-50"
      >
        📎 Attach file
      </button>
    </div>
  );
}
