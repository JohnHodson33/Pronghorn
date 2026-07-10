"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const kinds = ["meeting", "call", "email", "note"] as const;

export default function ActivityForm({ companyId }: { companyId: string }) {
  const router = useRouter();
  const [kind, setKind] = useState<(typeof kinds)[number]>("meeting");
  const [body, setBody] = useState("");
  const [docUrl, setDocUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit() {
    if (!body.trim()) return;
    setBusy(true);
    setErr(null);
    const res = await fetch("/api/activities", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ companyId, kind, body, docUrl: docUrl.trim() || null }),
    });
    setBusy(false);
    if (res.ok) {
      setBody("");
      setDocUrl("");
      router.refresh();
    } else setErr((await res.json()).error ?? "save failed");
  }

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 space-y-3">
      <div className="flex items-center gap-2">
        {kinds.map((k) => (
          <button
            key={k}
            onClick={() => setKind(k)}
            className={`rounded-md px-2.5 py-1 text-xs font-semibold capitalize ${
              kind === k ? "bg-emerald-100 text-emerald-800" : "bg-zinc-50 text-zinc-500 hover:bg-zinc-100"
            }`}
          >
            {k}
          </button>
        ))}
      </div>
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={4}
        placeholder="Paste meeting notes (Notion/Granola) or type an update — it attaches to this company for both of you…"
        className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-emerald-600"
      />
      <div className="flex items-center gap-3">
        <input
          value={docUrl}
          onChange={(e) => setDocUrl(e.target.value)}
          placeholder="Link to Notion page / CIM (optional)"
          className="flex-1 rounded-md border border-zinc-300 px-3 py-1.5 text-sm outline-none focus:border-emerald-600"
        />
        <button
          onClick={submit}
          disabled={busy || !body.trim()}
          className="rounded-lg bg-emerald-700 px-4 py-1.5 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"
        >
          {busy ? "Saving…" : `Log ${kind}`}
        </button>
      </div>
      {err && <div className="text-xs text-red-600">{err}</div>}
    </div>
  );
}
