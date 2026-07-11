"use client";

// Outreach Library — email sequences with custom variables + an AI-personalized
// line per contact (Jake's pattern; see TRANSCRIPT-NOTES). Scaffold: sequences
// persist to localStorage so John can draft and react to the design now;
// a proper outreach_sequences table + reply.io export are flagged to the PM.

import { useEffect, useMemo, useState } from "react";

type Step = { subject: string; body: string; delayDays: number };
type Sequence = { id: string; name: string; steps: Step[]; updatedAt: string };

const VARIABLES = [
  { tag: "{{first_name}}", desc: "Owner first name (VA/SOS fill)" },
  { tag: "{{company}}", desc: "Company name" },
  { tag: "{{city}}", desc: "Company city" },
  { tag: "{{industry}}", desc: "Vertical (landscape, tree care, pest…)" },
  { tag: "{{personalized_line}}", desc: "AI line from enriched data (reviews, news, services)" },
  { tag: "{{sender_name}}", desc: "John or Tom" },
];

// Sample values used by the live preview.
const SAMPLE: Record<string, string> = {
  "{{first_name}}": "Dave",
  "{{company}}": "Desert Green Landscaping",
  "{{city}}": "Phoenix",
  "{{industry}}": "commercial landscaping",
  "{{personalized_line}}":
    "Saw your team just wrapped the Scottsdale Quarter refresh — 480 five-star reviews is no accident.",
  "{{sender_name}}": "John",
};

const STARTER: Sequence[] = [
  {
    id: "seq-owner-v1",
    name: "Owner cold outreach v1",
    updatedAt: new Date().toISOString(),
    steps: [
      {
        delayDays: 0,
        subject: "Question about {{company}}",
        body: "Hi {{first_name}},\n\n{{personalized_line}}\n\nI'm a private investor focused on {{industry}} businesses in the {{city}} area — not a broker, and this isn't a mass email. If you've ever thought about what a transition could look like (now or a few years out), I'd welcome 15 minutes to introduce myself.\n\nEither way — impressive business.\n\n{{sender_name}}",
      },
      {
        delayDays: 4,
        subject: "Re: Question about {{company}}",
        body: "Hi {{first_name}},\n\nFollowing up on my note — I know running {{company}} keeps you busy.\n\nFor context: we're two partners acquiring one great {{industry}} business to own and operate for the long term. No fund pressure, no flip.\n\nOpen to a short call this week?\n\n{{sender_name}}",
      },
      {
        delayDays: 7,
        subject: "Last note — {{company}}",
        body: "{{first_name}} —\n\nLast note from me. If the timing's ever right, my line is always open.\n\n{{sender_name}}",
      },
    ],
  },
];

const STORAGE_KEY = "pronghorn-outreach-sequences-v1";

const inputCls =
  "w-full rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-emerald-600";

function render(text: string) {
  return Object.entries(SAMPLE).reduce((t, [k, v]) => t.split(k).join(v), text);
}

export default function OutreachLibrary() {
  const [seqs, setSeqs] = useState<Sequence[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [preview, setPreview] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const parsed: Sequence[] = raw ? JSON.parse(raw) : STARTER;
      setSeqs(parsed.length ? parsed : STARTER);
      setSelectedId((parsed.length ? parsed : STARTER)[0]?.id ?? null);
    } catch {
      setSeqs(STARTER);
      setSelectedId(STARTER[0].id);
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (loaded) localStorage.setItem(STORAGE_KEY, JSON.stringify(seqs));
  }, [seqs, loaded]);

  const sel = useMemo(() => seqs.find((s) => s.id === selectedId) ?? null, [seqs, selectedId]);

  function mutate(fn: (s: Sequence) => Sequence) {
    setSeqs((prev) => prev.map((s) => (s.id === selectedId ? { ...fn(s), updatedAt: new Date().toISOString() } : s)));
  }

  function addSequence() {
    const id = `seq-${Date.now()}`;
    setSeqs((prev) => [
      ...prev,
      { id, name: "New sequence", steps: [{ subject: "", body: "", delayDays: 0 }], updatedAt: new Date().toISOString() },
    ]);
    setSelectedId(id);
  }

  if (!loaded) return <div className="p-8 text-sm text-zinc-400">Loading…</div>;

  return (
    <div className="max-w-6xl p-4 md:p-8 space-y-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Outreach Library</h1>
          <p className="text-sm text-zinc-500">
            Email sequences for owner outreach. Variables fill from each enriched lead;{" "}
            <code className="rounded bg-zinc-100 px-1">{"{{personalized_line}}"}</code> is AI-written per
            contact from the enrichment data. Sequences export to the sender (reply.io or similar) when connected.
          </p>
        </div>
        <button
          disabled
          title="reply.io (or similar) API key not connected yet"
          className="shrink-0 cursor-not-allowed rounded-lg bg-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-500"
        >
          Export to reply.io
        </button>
      </header>

      <div className="grid gap-6 md:grid-cols-[240px_1fr]">
        <aside className="space-y-2">
          {seqs.map((s) => (
            <button
              key={s.id}
              onClick={() => setSelectedId(s.id)}
              className={`w-full rounded-xl border p-3 text-left transition ${
                s.id === selectedId ? "border-emerald-600 bg-emerald-50" : "border-zinc-200 bg-white hover:bg-zinc-50"
              }`}
            >
              <div className="truncate text-sm font-semibold">{s.name}</div>
              <div className="text-xs text-zinc-500">
                {s.steps.length} step{s.steps.length === 1 ? "" : "s"} · {s.updatedAt.slice(0, 10)}
              </div>
            </button>
          ))}
          <button
            onClick={addSequence}
            className="w-full rounded-xl border border-dashed border-zinc-300 p-3 text-sm font-medium text-zinc-500 hover:border-emerald-600 hover:text-emerald-700"
          >
            + New sequence
          </button>

          <div className="rounded-xl border border-zinc-200 bg-white p-3">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">Variables</div>
            <ul className="space-y-1.5">
              {VARIABLES.map((v) => (
                <li key={v.tag}>
                  <code className="rounded bg-zinc-100 px-1 py-0.5 text-[11px] text-emerald-800">{v.tag}</code>
                  <div className="text-[11px] leading-tight text-zinc-500">{v.desc}</div>
                </li>
              ))}
            </ul>
          </div>
        </aside>

        {sel ? (
          <section className="space-y-4">
            <div className="flex items-center gap-3">
              <input
                value={sel.name}
                onChange={(e) => mutate((s) => ({ ...s, name: e.target.value }))}
                className={`${inputCls} max-w-sm font-semibold`}
              />
              <label className="ml-auto flex items-center gap-2 text-sm text-zinc-600">
                <input
                  type="checkbox"
                  checked={preview}
                  onChange={(e) => setPreview(e.target.checked)}
                  className="accent-emerald-700"
                />
                Preview with sample lead
              </label>
              <button
                onClick={() => {
                  setSeqs((prev) => prev.filter((s) => s.id !== sel.id));
                  setSelectedId(seqs.find((s) => s.id !== sel.id)?.id ?? null);
                }}
                className="rounded-md px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
              >
                Delete
              </button>
            </div>

            {sel.steps.map((step, i) => (
              <div key={i} className="rounded-xl border border-zinc-200 bg-white p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold">
                    Email {i + 1}
                    {i > 0 && (
                      <span className="ml-2 font-normal text-zinc-500">
                        after{" "}
                        <input
                          type="number"
                          min={1}
                          max={30}
                          value={step.delayDays}
                          onChange={(e) =>
                            mutate((s) => ({
                              ...s,
                              steps: s.steps.map((st, j) => (j === i ? { ...st, delayDays: Number(e.target.value) } : st)),
                            }))
                          }
                          className="w-14 rounded border border-zinc-300 px-1.5 py-0.5 text-center text-xs"
                        />{" "}
                        days
                      </span>
                    )}
                  </span>
                  {sel.steps.length > 1 && (
                    <button
                      onClick={() => mutate((s) => ({ ...s, steps: s.steps.filter((_, j) => j !== i) }))}
                      className="text-xs text-zinc-400 hover:text-red-600"
                    >
                      remove
                    </button>
                  )}
                </div>
                {preview ? (
                  <div className="rounded-md bg-zinc-50 p-3">
                    <div className="mb-2 text-sm font-semibold">{render(step.subject) || <span className="text-zinc-400">— no subject —</span>}</div>
                    <p className="whitespace-pre-wrap text-sm text-zinc-700">{render(step.body)}</p>
                  </div>
                ) : (
                  <>
                    <input
                      value={step.subject}
                      onChange={(e) =>
                        mutate((s) => ({
                          ...s,
                          steps: s.steps.map((st, j) => (j === i ? { ...st, subject: e.target.value } : st)),
                        }))
                      }
                      placeholder="Subject — e.g. Question about {{company}}"
                      className={inputCls}
                    />
                    <textarea
                      value={step.body}
                      onChange={(e) =>
                        mutate((s) => ({
                          ...s,
                          steps: s.steps.map((st, j) => (j === i ? { ...st, body: e.target.value } : st)),
                        }))
                      }
                      rows={7}
                      placeholder="Body — use variables from the left panel…"
                      className={`${inputCls} font-mono text-[13px]`}
                    />
                  </>
                )}
              </div>
            ))}

            <button
              onClick={() =>
                mutate((s) => ({ ...s, steps: [...s.steps, { subject: "", body: "", delayDays: 4 }] }))
              }
              className="w-full rounded-xl border border-dashed border-zinc-300 py-3 text-sm font-medium text-zinc-500 hover:border-emerald-600 hover:text-emerald-700"
            >
              + Add follow-up email
            </button>
          </section>
        ) : (
          <div className="rounded-xl border border-dashed border-zinc-300 px-4 py-16 text-center text-sm text-zinc-400">
            Create a sequence to start drafting.
          </div>
        )}
      </div>

      <p className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800">
        Scaffold: sequences save in this browser only (localStorage) so the design can be reacted to now.
        Shared persistence needs an <code>outreach_sequences</code> table (flagged to PM), and sending needs
        a reply.io (or similar) account + API key — bubbled to John&apos;s decision list.
      </p>
    </div>
  );
}
