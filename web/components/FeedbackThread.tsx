"use client";

// Feedback thread — John's dialogue-before-approve (7/12 ~23:45): every
// suggestion/feedback card opens a conversation. Comments come from Lane C's
// /api/feedback/[id]/comments (migration 0011); until that lands, the
// body-append "— X adds:" segments render as a pseudo-thread so existing
// amendments already read as dialogue. Approve names the revision it
// approves (the last agent reply = the build contract).
import { useCallback, useEffect, useState } from "react";
import { AttachmentStrip } from "@/components/Attachments";

export type ThreadItem = {
  id: string;
  author: string;
  body: string;
  status: string;
  created_at: string;
  shipped_ref: string | null;
};

type Comment = {
  id?: string;
  author: string;
  body: string;
  kind?: "comment" | "status_change" | "build_plan" | "summary";
  created_at?: string;
};

const HUMANS = ["John", "Tom"];

// Interim: split the appended "— X adds:" segments out of the body.
function pseudoThread(item: ThreadItem): Comment[] {
  const parts = item.body.split(/\n?—\s*(\w+)\s+adds:\s*/);
  const out: Comment[] = [{ author: item.author, body: parts[0].trim(), kind: "comment", created_at: item.created_at }];
  for (let i = 1; i < parts.length - 1; i += 2) {
    out.push({ author: parts[i], body: parts[i + 1].trim(), kind: "comment" });
  }
  return out.filter((c) => c.body);
}

const kindStyle: Record<string, string> = {
  status_change: "border-l-2 border-zinc-300 bg-zinc-50 text-zinc-500 italic",
  build_plan: "border-l-2 border-sky-400 bg-sky-50/60",
  summary: "border-l-2 border-emerald-500 bg-emerald-50/70",
  comment: "",
};

export default function FeedbackThread({
  item,
  onChanged,
  micButton,
}: {
  item: ThreadItem;
  onChanged: () => void;
  micButton?: (onText: (t: string) => void) => React.ReactNode;
}) {
  const [comments, setComments] = useState<Comment[] | null>(null);
  const [apiLive, setApiLive] = useState(false);
  const [reply, setReply] = useState("");
  const [author, setAuthor] = useState("John");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/feedback/${item.id}/comments`);
      if (res.ok) {
        const j = await res.json();
        if (Array.isArray(j.comments)) {
          setApiLive(true);
          // The original body is the thread root; API comments follow.
          setComments([
            { author: item.author, body: pseudoThread(item)[0]?.body ?? item.body, kind: "comment", created_at: item.created_at },
            ...j.comments,
          ]);
          return;
        }
      }
    } catch {}
    setApiLive(false);
    setComments(pseudoThread(item));
  }, [item]);

  useEffect(() => {
    load();
  }, [load]);

  async function postReply() {
    if (!reply.trim()) return;
    setBusy(true);
    let ok = false;
    if (apiLive) {
      const res = await fetch(`/api/feedback/${item.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ author, body: reply.trim() }),
      });
      ok = res.ok;
    }
    if (!ok) {
      // interim path: body-append via the existing PATCH detail mechanism
      const res = await fetch("/api/feedback", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item.id, detail: `— ${author} adds: ${reply.trim()}` }),
      });
      ok = res.ok;
    }
    setBusy(false);
    if (ok) {
      setReply("");
      await load();
      onChanged();
    }
  }

  async function approve() {
    setBusy(true);
    await fetch("/api/feedback", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: item.id, status: "approved" }),
    });
    setBusy(false);
    onChanged();
  }

  const thread = comments ?? [];
  const lastAgent = [...thread].reverse().find((c) => !HUMANS.includes(c.author) && (c.kind ?? "comment") === "comment");
  const lastIsHuman = thread.length > 0 && HUMANS.includes(thread[thread.length - 1].author) && thread.length > 1;

  return (
    <div className="mt-3 space-y-2">
      {thread.map((c, i) => {
        const human = HUMANS.includes(c.author);
        const kind = c.kind ?? "comment";
        return (
          <div key={c.id ?? i} className={`rounded-lg p-2.5 text-sm ${kindStyle[kind]} ${kind === "comment" ? (human ? "bg-zinc-50" : "bg-purple-50/50") : ""}`}>
            <div className="mb-0.5 flex items-center gap-2 text-[11px] text-zinc-400">
              <span className={`font-semibold ${human ? "text-zinc-600" : "text-purple-700"}`}>
                {human ? c.author : `🤖 ${c.author}`}
              </span>
              {kind === "build_plan" && <span className="rounded bg-sky-100 px-1.5 py-0.5 font-semibold text-sky-700">build plan</span>}
              {kind === "summary" && <span className="rounded bg-emerald-100 px-1.5 py-0.5 font-semibold text-emerald-700">what was actually done</span>}
              {c.created_at && <span>{new Date(c.created_at).toLocaleString()}</span>}
            </div>
            <p className="whitespace-pre-wrap text-zinc-800">{c.body}</p>
          </div>
        );
      })}

      <AttachmentStrip feedbackId={item.id} canAttach />

      {lastIsHuman && item.status !== "shipped" && (
        <div className="rounded-md bg-amber-50 px-2.5 py-1.5 text-[11px] font-medium text-amber-700">
          ⏳ agent reply pending — the owning lane answers on its next cycle
        </div>
      )}

      <div className="flex items-start gap-2 pt-1">
        <select value={author} onChange={(e) => setAuthor(e.target.value)} className="rounded-md border border-zinc-300 px-2 py-1.5 text-xs">
          <option>John</option>
          <option>Tom</option>
        </select>
        <textarea
          value={reply}
          onChange={(e) => setReply(e.target.value)}
          rows={2}
          placeholder="Reply — ask questions, add constraints, push back before approving…"
          className="w-full rounded-md border border-zinc-300 px-2.5 py-1.5 text-sm"
        />
        {micButton?.((t) => setReply((r) => (r ? r + " " : "") + t))}
        <button
          onClick={postReply}
          disabled={busy || !reply.trim()}
          className="rounded-md bg-zinc-800 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
        >
          Reply
        </button>
      </div>

      {["suggested", "submitted", "triaged"].includes(item.status) && (
        <div className="flex flex-wrap items-center gap-2 border-t border-zinc-100 pt-2">
          <button
            onClick={approve}
            disabled={busy}
            className="rounded-md bg-emerald-700 px-3 py-1 text-xs font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"
          >
            ✓ Approve latest spec
          </button>
          <span className="text-[11px] text-zinc-400">
            {lastAgent
              ? `approves the ${lastAgent.created_at ? new Date(lastAgent.created_at).toLocaleString() : "latest"} agent revision — that reply is the build contract`
              : "approves the original text above"}
          </span>
        </div>
      )}
    </div>
  );
}
