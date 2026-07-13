"use client";

// Key Actions card for an untagged meeting note (John 7/13 — sweep leftovers
// are "a human decision, never silently dropped"). Tap-to-resolve in place:
// open the source note, pick the company/deal/contact it belongs to, done —
// the activity gets its target and leaves the queue on refresh.
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { KeyAction } from "@/lib/dashboard-v3";

type Hit = { kind: "company" | "contact" | "deal"; id: string; label: string; sub: string };
const KIND_ICON: Record<Hit["kind"], string> = { company: "🏢", contact: "👤", deal: "🤝" };

export default function TagNoteCard({ action }: { action: KeyAction }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!open || q.trim().length < 2) { setHits([]); return; }
    const t = setTimeout(async () => {
      const j = await fetch(`/api/search?q=${encodeURIComponent(q.trim())}`).then((r) => r.json()).catch(() => ({}));
      const out: Hit[] = [];
      for (const [group, kind] of [["companies", "company"], ["contacts", "contact"], ["deals", "deal"]] as const) {
        for (const h of j[group] ?? []) out.push({ kind, id: h.id, label: h.label, sub: h.sub });
      }
      setHits(out.slice(0, 6));
    }, 250);
    return () => clearTimeout(t);
  }, [open, q]);

  async function tag(h: Hit) {
    setBusy(true);
    setErr(null);
    const res = await fetch("/api/activities", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: action.refId,
        [h.kind === "company" ? "companyId" : h.kind === "contact" ? "contactId" : "dealId"]: h.id,
      }),
    });
    setBusy(false);
    if (!res.ok) { setErr((await res.json().catch(() => ({}))).error ?? "tag failed"); return; }
    router.refresh();
  }

  return (
    <div className="px-5 py-3">
      <div className="flex items-center gap-3">
        <span className="text-lg">🏷️</span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium">{action.label}</span>
          <span className="block truncate text-xs text-zinc-500">{action.detail}</span>
        </span>
        {action.docUrl && (
          <a href={action.docUrl} target="_blank" rel="noreferrer" className="shrink-0 text-xs font-medium text-emerald-700 hover:underline">
            open note ↗
          </a>
        )}
        <button
          onClick={() => setOpen((o) => !o)}
          className="shrink-0 rounded-md bg-emerald-700 px-2.5 py-1 text-xs font-semibold text-white hover:bg-emerald-800"
        >
          {open ? "close" : "Tag it"}
        </button>
      </div>
      {open && (
        <div className="relative mt-2 pl-8">
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Type the company / contact / deal this note belongs to…"
            className="w-full rounded-md border border-zinc-300 px-2.5 py-1.5 text-sm outline-none focus:border-emerald-600"
          />
          {hits.length > 0 && (
            <div className="absolute z-10 mt-1 w-full rounded-md border border-zinc-200 bg-white shadow-lg">
              {hits.map((h) => (
                <button
                  key={`${h.kind}-${h.id}`}
                  disabled={busy}
                  onClick={() => tag(h)}
                  className="flex w-full items-center gap-2 px-2.5 py-2 text-left text-xs hover:bg-emerald-50 disabled:opacity-50"
                >
                  <span aria-hidden>{KIND_ICON[h.kind]}</span>
                  <span className="font-medium">{h.label}</span>
                  <span className="truncate text-zinc-400">{h.sub}</span>
                </button>
              ))}
            </div>
          )}
          {err && <div className="mt-1 text-xs text-amber-700">{err}</div>}
        </div>
      )}
    </div>
  );
}
