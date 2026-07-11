"use client";

// The smile-and-dial screen: call list on the left, the selected company's
// info + the script (filled with that company's real data) on the right.
// Script drafts persist to localStorage; call outcomes are a later build
// (needs a call-log table / reply.io task sync — flagged in the lane log).
import { useEffect, useMemo, useState } from "react";
import type { CallLead } from "@/lib/call-list";

const DEFAULT_SCRIPT = `Hi, is this {{first_name}}? — This is {{sender_name}}.

I know I'm calling out of the blue. I'm not a broker and I'm not selling anything — I'm a private investor, and {{company}} kept coming up when I looked at the best {{industry}} operators around {{city}}.

{{personalized_line}}

The reason I'm calling: my partner and I are looking to buy and personally run one great business like yours. If you've ever wondered what a sale could look like — this year or three years from now — I'd love to buy you a coffee and introduce myself.

[IF INTERESTED] → Great, what does your calendar look like this week?
[IF NOT NOW] → Totally understand. Can I send you a short note so you have my number if timing changes?
[IF HOSTILE] → No problem at all — appreciate the minute. Great business, by the way.`;

const STORAGE_KEY = "pronghorn-call-script-v1";

function firstName(l: CallLead) {
  return l.owner_name?.split(/\s+/)[0] ?? "there";
}

function fill(script: string, l: CallLead) {
  const e = l.enrichment ?? {};
  const vars: Record<string, string> = {
    "{{first_name}}": firstName(l),
    "{{company}}": l.name,
    "{{city}}": l.city ?? "your area",
    "{{industry}}": l.list?.industry?.toLowerCase() ?? "home services",
    "{{sender_name}}": "John",
    "{{personalized_line}}":
      typeof e.personalized_line === "string"
        ? e.personalized_line
        : l.rating !== null && l.review_count
          ? `${l.rating.toFixed(1)} stars across ${l.review_count} reviews — customers clearly love what you've built.`
          : "",
  };
  return Object.entries(vars).reduce((t, [k, v]) => t.split(k).join(v), script);
}

export default function CallScreen({ leads }: { leads: CallLead[] }) {
  const [selectedId, setSelectedId] = useState<string | null>(leads[0]?.id ?? null);
  const [editing, setEditing] = useState(false);
  const [script, setScript] = useState(DEFAULT_SCRIPT);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) setScript(saved);
    setLoaded(true);
  }, []);
  useEffect(() => {
    if (loaded) localStorage.setItem(STORAGE_KEY, script);
  }, [script, loaded]);

  const sel = useMemo(() => leads.find((l) => l.id === selectedId) ?? null, [leads, selectedId]);
  const overview = sel && typeof sel.enrichment?.overview === "string" ? (sel.enrichment.overview as string) : null;

  return (
    <div className="grid gap-6 md:grid-cols-[280px_1fr]">
      <aside className="max-h-[70vh] space-y-2 overflow-y-auto pr-1">
        {leads.map((l) => (
          <button
            key={l.id}
            onClick={() => setSelectedId(l.id)}
            className={`w-full rounded-xl border p-3 text-left transition ${
              l.id === selectedId ? "border-emerald-600 bg-emerald-50" : "border-zinc-200 bg-white hover:bg-zinc-50"
            }`}
          >
            <div className="truncate text-sm font-semibold">{l.name}</div>
            <div className="text-xs text-zinc-500">
              {[l.city, l.state].filter(Boolean).join(", ") || "—"}
              {l.owner_name ? ` · ${l.owner_name}` : ""}
            </div>
          </button>
        ))}
        {leads.length === 0 && (
          <div className="rounded-xl border border-dashed border-zinc-300 px-3 py-10 text-center text-xs text-zinc-400">
            No dialable leads yet — leads need a phone number (VA/enrichment step) to appear here.
          </div>
        )}
      </aside>

      {sel ? (
        <section className="space-y-4">
          <div className="rounded-xl border border-zinc-200 bg-white p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold">
                  {sel.website ? (
                    <a href={sel.website} target="_blank" rel="noopener noreferrer" className="hover:text-emerald-700 hover:underline">
                      {sel.name} ↗
                    </a>
                  ) : (
                    sel.name
                  )}
                </h2>
                <p className="text-sm text-zinc-500">
                  {[sel.list?.industry, [sel.city, sel.state].filter(Boolean).join(", ")].filter(Boolean).join(" · ")}
                </p>
              </div>
              <div className="text-right text-sm">
                {sel.owner_name && <div className="font-semibold">{sel.owner_name}</div>}
                {(sel.owner_phone ?? sel.phone) && (
                  <a href={`tel:${sel.owner_phone ?? sel.phone}`} className="text-lg font-bold text-emerald-700 tabular-nums hover:underline">
                    📞 {sel.owner_phone ?? sel.phone}
                  </a>
                )}
                {!sel.owner_phone && sel.phone && <div className="text-[11px] text-zinc-400">office line — owner not confirmed</div>}
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              {sel.rating !== null && (
                <span className="rounded bg-amber-100 px-2 py-0.5 font-semibold text-amber-800">
                  {sel.rating.toFixed(1)}★ {sel.review_count ? `(${sel.review_count})` : ""}
                </span>
              )}
              {sel.bbb_grade && <span className="rounded bg-emerald-100 px-2 py-0.5 font-semibold text-emerald-800">BBB {sel.bbb_grade}</span>}
              <span className="rounded bg-zinc-100 px-2 py-0.5 font-medium capitalize text-zinc-600">{sel.status.replace("_", " ")}</span>
            </div>
            {overview && <p className="mt-3 border-t border-zinc-100 pt-3 text-sm text-zinc-700">{overview}</p>}
          </div>

          <div className="rounded-xl border border-zinc-200 bg-white p-5">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-semibold">Script</h3>
              <button
                onClick={() => setEditing((e) => !e)}
                className="rounded-md px-2.5 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-50"
              >
                {editing ? "Done editing" : "Edit script"}
              </button>
            </div>
            {editing ? (
              <textarea
                value={script}
                onChange={(e) => setScript(e.target.value)}
                rows={16}
                className="w-full rounded-md border border-zinc-300 px-3 py-2 font-mono text-[13px] outline-none focus:border-emerald-600"
              />
            ) : (
              <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-zinc-800">{fill(script, sel)}</p>
            )}
          </div>
        </section>
      ) : (
        <div className="rounded-xl border border-dashed border-zinc-300 px-4 py-16 text-center text-sm text-zinc-400">
          Select a lead to load their info and script.
        </div>
      )}
    </div>
  );
}
