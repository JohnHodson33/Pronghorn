"use client";

// Data intake portal — Tom drops a spreadsheet in and gets it into the CRM with
// ZERO agent involvement (John 7/20). Three steps, mirroring Lane C's engine:
//   1. upload  — signed URL, browser PUTs straight to storage (no 4.5MB cap)
//   2. preview — Claude maps the columns, dedupes, builds a PLAN. Writes nothing.
//   3. confirm — executes that exact plan, returns a receipt.
// The preview is the whole safety story: you see what WOULD happen (and why a
// row would be skipped) before anything is written.
import { useCallback, useRef, useState } from "react";

type Counts = { rows: number; create: number; update: number; skip: number; conflicts: number };
type PlannedRow = {
  i: number;
  action: "create" | "update" | "skip";
  values: Record<string, string | number | boolean>;
  matchId?: string | number;
  conflicts: { field: string; existing: unknown; uploaded: unknown }[];
  skipReason?: string;
};
type Preview = {
  job_id: string | null;
  record_type: RecordType;
  base_table: string;
  fill_only?: boolean;
  mapping: Record<string, string | null>;
  method: "claude" | "heuristic";
  confidence: "high" | "medium" | "low";
  counts: Counts;
  sample: PlannedRow[];
  conflicts: { row: number; field: string; existing: unknown; uploaded: unknown }[];
  unmapped_headers: string[];
  warnings: string[];
  error?: string;
};
type Receipt = {
  created: number; updated: number; skipped: number; errors: number;
  errorSamples: string[]; record_type: string; base_table: string;
  confirmed_by: string; at: string;
};

type RecordType = "contact" | "company" | "river_guide" | "enrichment_fill";

const TYPE_LABEL: Record<RecordType, string> = {
  contact: "Contacts",
  company: "Companies",
  river_guide: "River Guides",
  enrichment_fill: "Enrichment fill (fill blanks on existing rows)",
};
const TABLE_HREF: Record<string, string> = {
  contacts: "/contacts",
  companies: "/companies",
  river_guides: "/river-guides",
};
const ACCEPT = ".csv,.tsv,.xlsx,.xls";

const actionChip: Record<string, string> = {
  create: "bg-emerald-100 text-emerald-800",
  update: "bg-sky-100 text-sky-800",
  skip: "bg-zinc-100 text-zinc-500",
};

export default function IntakePortal() {
  const [who, setWho] = useState("Tom");
  const [file, setFile] = useState<File | null>(null);
  const [phase, setPhase] = useState<"idle" | "uploading" | "previewing" | "ready" | "confirming" | "done">("idle");
  const [uploaded, setUploaded] = useState<{ path: string; filename: string } | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [override, setOverride] = useState<RecordType | "">("");
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setFile(null); setUploaded(null); setPreview(null); setReceipt(null);
    setErr(null); setOverride(""); setPhase("idle");
    if (inputRef.current) inputRef.current.value = "";
  };

  // upload → preview. `type` re-runs the preview with a manual type override;
  // `knownPath` reuses an already-uploaded file (passed explicitly rather than
  // read from state, so a re-pick of a same-named file can't reuse a stale path).
  const run = useCallback(async (f: File, type?: RecordType, knownPath?: string) => {
    setErr(null);
    setReceipt(null);
    let path = knownPath;
    if (!path) {
      setPhase("uploading");
      const up = await fetch("/api/intake/upload", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: f.name, uploaded_by: who }),
      });
      const uj = await up.json().catch(() => ({}));
      if (!up.ok || !uj.signedUrl) { setErr(uj.error ?? "could not start the upload"); setPhase("idle"); return; }
      const put = await fetch(uj.signedUrl, {
        method: "PUT",
        headers: { "content-type": f.type || "application/octet-stream" },
        body: f,
      });
      if (!put.ok) { setErr(`storage upload failed (${put.status})`); setPhase("idle"); return; }
      path = uj.path;
      setUploaded({ path: uj.path, filename: f.name });
    }

    setPhase("previewing");
    const pv = await fetch("/api/intake/preview", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path, filename: f.name, uploaded_by: who, ...(type ? { record_type: type } : {}) }),
    });
    const pj: Preview = await pv.json().catch(() => ({}) as Preview);
    if (!pv.ok) { setErr(pj.error ?? "preview failed"); setPhase("idle"); return; }
    setPreview(pj);
    setPhase("ready");
  }, [who]);

  function pick(f: File | null) {
    if (!f) return;
    setFile(f);
    setPreview(null);
    setUploaded(null);
    setOverride("");
    run(f);
  }

  async function confirm() {
    if (!preview?.job_id) return;
    setPhase("confirming");
    setErr(null);
    const res = await fetch("/api/intake/confirm", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ job_id: preview.job_id, confirmed_by: who }),
    });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) { setErr(j.error ?? "import failed"); setPhase("ready"); return; }
    setReceipt(j.receipt);
    setPhase("done");
  }

  const busy = phase === "uploading" || phase === "previewing" || phase === "confirming";
  const c = preview?.counts;

  return (
    <div className="space-y-4">
      {/* who + reset */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-zinc-200 bg-white p-4">
        <label className="flex items-center gap-2 text-sm">
          <span className="font-medium text-zinc-600">Uploading as</span>
          <select value={who} onChange={(e) => setWho(e.target.value)} disabled={busy}
            className="rounded-md border border-zinc-300 px-2.5 py-1.5 text-sm outline-none focus:border-emerald-600">
            <option>Tom</option>
            <option>John</option>
          </select>
        </label>
        {file && (
          <span className="text-sm text-zinc-500">
            <span className="font-medium text-zinc-700">{file.name}</span>{" "}
            ({(file.size / 1024).toFixed(0)} KB)
          </span>
        )}
        {(file || preview) && (
          <button onClick={reset} disabled={busy}
            className="ml-auto rounded-md px-2.5 py-1 text-xs font-medium text-zinc-500 hover:bg-zinc-100 disabled:opacity-50">
            Start over
          </button>
        )}
      </div>

      {/* live progress — same shape as the enrichment run banner so a long
          Claude mapping pass never feels like nothing happened */}
      {busy && (
        <div className="sticky top-0 z-30 rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-2.5 text-sm text-emerald-900">
          <span className="mr-2 inline-block animate-pulse">⚙</span>
          {phase === "uploading" && "Uploading the file…"}
          {phase === "previewing" && "Reading the columns and checking for duplicates — nothing is written yet…"}
          {phase === "confirming" && "Importing…"}
        </div>
      )}

      {err && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">{err}</div>
      )}

      {/* drop zone */}
      {!preview && !receipt && (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => { e.preventDefault(); setDragging(false); pick(e.dataTransfer.files?.[0] ?? null); }}
          onClick={() => inputRef.current?.click()}
          className={`cursor-pointer rounded-xl border-2 border-dashed px-6 py-14 text-center transition ${
            dragging ? "border-emerald-600 bg-emerald-50" : "border-zinc-300 bg-white hover:border-emerald-400"
          }`}
        >
          <div className="text-3xl">📄</div>
          <p className="mt-2 text-sm font-medium text-zinc-700">
            Drop a spreadsheet here, or click to choose
          </p>
          <p className="mt-1 text-xs text-zinc-500">CSV, TSV, XLSX or XLS — up to 5,000 rows</p>
          <input ref={inputRef} type="file" accept={ACCEPT} className="hidden"
            onChange={(e) => pick(e.target.files?.[0] ?? null)} />
        </div>
      )}

      {/* ---- PREVIEW: what WOULD happen ---- */}
      {preview && !receipt && (
        <div className="space-y-4">
          <div className="rounded-xl border border-zinc-200 bg-white p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-semibold">Detected: {TYPE_LABEL[preview.record_type]}</h2>
                <p className="text-xs text-zinc-500">
                  columns mapped by {preview.method === "claude" ? "Claude" : "the heuristic fallback"} ·{" "}
                  {preview.confidence} confidence
                  {preview.base_table && <> · writes to <span className="font-mono">{preview.base_table}</span></>}
                </p>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <span className="text-zinc-600">Wrong? Set it:</span>
                <select
                  value={override || preview.record_type}
                  onChange={(e) => { const t = e.target.value as RecordType; setOverride(t); if (file) run(file, t, uploaded?.path); }}
                  disabled={busy}
                  className="rounded-md border border-zinc-300 px-2.5 py-1.5 text-sm outline-none focus:border-emerald-600"
                >
                  {(Object.keys(TYPE_LABEL) as RecordType[]).map((t) => (
                    <option key={t} value={t}>{TYPE_LABEL[t]}</option>
                  ))}
                </select>
              </label>
            </div>

            {/* the headline: rows → what happens to them */}
            {c && (
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  { label: "Rows read", n: c.rows, cls: "text-zinc-900" },
                  { label: "Will create", n: c.create, cls: "text-emerald-700" },
                  { label: "Will update", n: c.update, cls: "text-sky-700" },
                  { label: "Will skip", n: c.skip, cls: "text-zinc-500" },
                ].map((s) => (
                  <div key={s.label} className="rounded-lg border border-zinc-200 p-3">
                    <div className="text-xs font-medium uppercase tracking-wide text-zinc-500">{s.label}</div>
                    <div className={`mt-0.5 text-2xl font-bold tabular-nums ${s.cls}`}>{s.n}</div>
                  </div>
                ))}
              </div>
            )}

            {preview.warnings.length > 0 && (
              <ul className="mt-3 space-y-1">
                {preview.warnings.map((w, i) => (
                  <li key={i} className="rounded-md bg-amber-50 px-3 py-1.5 text-xs text-amber-800">⚠ {w}</li>
                ))}
              </ul>
            )}

            {/* column mapping — Tom can see exactly which of his columns landed where */}
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Column mapping</div>
                <ul className="mt-1.5 space-y-0.5 text-xs">
                  {Object.entries(preview.mapping).filter(([, src]) => src).map(([field, src]) => (
                    <li key={field} className="flex items-baseline gap-2">
                      <span className="truncate text-zinc-500">{src}</span>
                      <span className="text-zinc-300">→</span>
                      <span className="font-medium text-zinc-800">{field}</span>
                    </li>
                  ))}
                </ul>
              </div>
              {preview.unmapped_headers.length > 0 && (
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                    Ignored columns ({preview.unmapped_headers.length})
                  </div>
                  <p className="mt-1.5 text-xs text-zinc-500">{preview.unmapped_headers.join(", ")}</p>
                </div>
              )}
            </div>
          </div>

          {/* why rows would be skipped + value conflicts — the "why" John asked for */}
          {preview.sample.some((r) => r.action === "skip" && r.skipReason) && (
            <div className="rounded-xl border border-zinc-200 bg-white p-5">
              <h3 className="text-sm font-semibold">Why rows would be skipped</h3>
              <ul className="mt-2 space-y-1 text-xs text-zinc-600">
                {preview.sample.filter((r) => r.action === "skip" && r.skipReason).slice(0, 12).map((r) => (
                  <li key={r.i}><span className="tabular-nums text-zinc-400">row {r.i + 1}</span> — {r.skipReason}</li>
                ))}
              </ul>
            </div>
          )}

          {preview.conflicts.length > 0 && (
            <div className="rounded-xl border border-amber-200 bg-white p-5">
              <h3 className="text-sm font-semibold text-amber-900">
                Value conflicts ({preview.conflicts.length}) — existing values are kept
              </h3>
              <ul className="mt-2 space-y-1 text-xs text-zinc-600">
                {preview.conflicts.slice(0, 12).map((k, i) => (
                  <li key={i}>
                    <span className="tabular-nums text-zinc-400">row {k.row}</span> · <span className="font-medium">{k.field}</span>:{" "}
                    existing <span className="font-mono">{String(k.existing)}</span> vs uploaded{" "}
                    <span className="font-mono">{String(k.uploaded)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* sample of the planned rows */}
          {preview.sample.length > 0 && (
            <div className="rounded-xl border border-zinc-200 bg-white">
              <h3 className="border-b border-zinc-100 px-5 py-3 text-sm font-semibold">
                First {Math.min(preview.sample.length, 20)} rows as planned
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-zinc-200 text-left uppercase tracking-wide text-zinc-500">
                      <th className="px-4 py-2">Row</th>
                      <th className="px-4 py-2">Action</th>
                      <th className="px-4 py-2">Values</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {preview.sample.slice(0, 20).map((r) => (
                      <tr key={r.i}>
                        <td className="px-4 py-2 tabular-nums text-zinc-400">{r.i + 1}</td>
                        <td className="px-4 py-2">
                          <span className={`rounded-full px-2 py-0.5 font-semibold ${actionChip[r.action]}`}>{r.action}</span>
                        </td>
                        <td className="max-w-xl truncate px-4 py-2 text-zinc-700">
                          {Object.entries(r.values).map(([k, v]) => `${k}: ${v}`).join(" · ") || (r.skipReason ?? "—")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3 rounded-xl border border-emerald-700/30 bg-white p-4">
            <button
              onClick={confirm}
              disabled={busy || !preview.job_id || !c || c.create + c.update === 0}
              className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"
            >
              {phase === "confirming" ? "Importing…" : `Confirm import (${(c?.create ?? 0) + (c?.update ?? 0)} rows)`}
            </button>
            <span className="text-xs text-zinc-500">Nothing has been written yet — this is the first write.</span>
            {!preview.job_id && (
              <span className="text-xs text-amber-700">Preview couldn&apos;t be saved, so import is disabled (see the warning above).</span>
            )}
          </div>
        </div>
      )}

      {/* ---- RECEIPT ---- */}
      {receipt && (
        <div className="rounded-xl border border-emerald-700/30 bg-white p-5">
          <h2 className="font-semibold text-emerald-900">✅ Import complete</h2>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: "Created", n: receipt.created, cls: "text-emerald-700" },
              { label: "Updated", n: receipt.updated, cls: "text-sky-700" },
              { label: "Skipped", n: receipt.skipped, cls: "text-zinc-500" },
              { label: "Errors", n: receipt.errors, cls: receipt.errors ? "text-red-600" : "text-zinc-400" },
            ].map((s) => (
              <div key={s.label} className="rounded-lg border border-zinc-200 p-3">
                <div className="text-xs font-medium uppercase tracking-wide text-zinc-500">{s.label}</div>
                <div className={`mt-0.5 text-2xl font-bold tabular-nums ${s.cls}`}>{s.n}</div>
              </div>
            ))}
          </div>
          {receipt.errorSamples?.length > 0 && (
            <ul className="mt-3 space-y-1 text-xs text-red-700">
              {receipt.errorSamples.slice(0, 5).map((e, i) => <li key={i}>{e}</li>)}
            </ul>
          )}
          <div className="mt-4 flex flex-wrap items-center gap-3">
            {TABLE_HREF[receipt.base_table] && (
              <a href={TABLE_HREF[receipt.base_table]}
                className="rounded-lg bg-emerald-700 px-3 py-1.5 text-sm font-semibold text-white hover:bg-emerald-800">
                Spot-check in {receipt.base_table.replace("_", " ")} →
              </a>
            )}
            <button onClick={reset} className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-600 hover:bg-zinc-50">
              Import another file
            </button>
            <span className="text-xs text-zinc-400">
              imported by {receipt.confirmed_by} · {String(receipt.at).slice(0, 16).replace("T", " ")}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
