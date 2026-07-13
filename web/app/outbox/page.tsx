"use client";

// Outbox — John's one-click send surface (LISTING-PURSUIT-FLOW §1 + ADDENDUM).
// Lists Claude-drafted broker inquiries queued by "Request info". John can
// edit, cancel, or send. Send stays disabled-with-explanation until the Graph
// send route + env vars are provisioned (guardrail: nothing auto-sends).
import { useEffect, useState } from "react";
import Link from "next/link";
import OutreachRules from "@/components/OutreachRules";

type OutboxEmail = {
  id: string;
  listing_id: string | null;
  to_email: string;
  to_name: string | null;
  subject: string;
  body: string;
  status: "queued" | "sent" | "cancelled";
  created_at: string;
  sent_at: string | null;
  // why-drafted provenance (0013): which rule matched + the enrichment facts
  // the email was anchored on
  draft_meta?: { rule_name?: string; facts_used?: string[] } | null;
};

const statusStyle: Record<OutboxEmail["status"], string> = {
  queued: "bg-amber-50 text-amber-800 border-amber-200",
  sent: "bg-emerald-50 text-emerald-800 border-emerald-200",
  cancelled: "bg-zinc-100 text-zinc-500 border-zinc-200",
};

function Draft({ email, onChanged }: { email: OutboxEmail; onChanged: () => void }) {
  const [subject, setSubject] = useState(email.subject);
  const [body, setBody] = useState(email.body);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const queued = email.status === "queued";
  const dirty = subject !== email.subject || body !== email.body;

  async function act(fn: () => Promise<Response>) {
    setBusy(true);
    setNotice(null);
    const res = await fn();
    const data = await res.json().catch(() => ({}));
    if (!res.ok) setNotice(data.error ?? `Request failed (${res.status})`);
    else onChanged();
    setBusy(false);
  }

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 space-y-3">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className={`rounded border px-1.5 py-0.5 text-[11px] font-medium uppercase tracking-wide ${statusStyle[email.status]}`}>
          {email.status}
        </span>
        <span className="font-medium">{email.to_name ?? email.to_email}</span>
        <span className="text-zinc-400">&lt;{email.to_email}&gt;</span>
        {email.listing_id && (
          <Link href={`/listings/${email.listing_id}`} className="text-emerald-700 hover:underline">
            view listing →
          </Link>
        )}
        <span className="ml-auto text-xs text-zinc-400">
          {new Date(email.sent_at ?? email.created_at).toLocaleString()}
        </span>
      </div>
      {email.draft_meta && (email.draft_meta.rule_name || email.draft_meta.facts_used?.length) && (
        <div className="rounded-md bg-sky-50 px-2.5 py-1.5 text-xs text-sky-800">
          🎯 {email.draft_meta.rule_name && <>drafted under rule <span className="font-semibold">{email.draft_meta.rule_name}</span></>}
          {email.draft_meta.facts_used?.length ? <> · anchored on: {email.draft_meta.facts_used.join(" · ")}</> : null}
        </div>
      )}
      {queued ? (
        <>
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="w-full rounded-md border border-zinc-200 px-2 py-1.5 text-sm font-medium"
          />
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={Math.min(12, Math.max(5, body.split("\n").length + 1))}
            className="w-full rounded-md border border-zinc-200 px-2 py-1.5 text-sm leading-relaxed"
          />
          <div className="flex flex-wrap items-center gap-2">
            <button
              disabled={busy}
              onClick={() =>
                act(() =>
                  fetch(`/api/outbox/${email.id}`, { method: "POST", body: JSON.stringify({ action: "send" }) })
                )
              }
              className="rounded-md bg-emerald-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-800 disabled:opacity-50"
            >
              Send now
            </button>
            {dirty && (
              <button
                disabled={busy}
                onClick={() =>
                  act(() => fetch(`/api/outbox/${email.id}`, { method: "PATCH", body: JSON.stringify({ subject, body }) }))
                }
                className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-50 disabled:opacity-50"
              >
                Save edits
              </button>
            )}
            <button
              disabled={busy}
              onClick={() => {
                if (confirm("Cancel this queued inquiry?"))
                  act(() =>
                    fetch(`/api/outbox/${email.id}`, { method: "POST", body: JSON.stringify({ action: "cancel" }) })
                  );
              }}
              className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm text-zinc-600 hover:bg-zinc-50 disabled:opacity-50"
            >
              Cancel draft
            </button>
          </div>
          {notice && (
            <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              {notice}
            </div>
          )}
        </>
      ) : (
        <div className="space-y-1">
          <div className="text-sm font-medium">{email.subject}</div>
          <div className="whitespace-pre-wrap text-sm text-zinc-600">{email.body}</div>
        </div>
      )}
    </div>
  );
}

export default function Outbox() {
  const [emails, setEmails] = useState<OutboxEmail[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/outbox", { cache: "no-store" });
    const data = await res.json().catch(() => ({}));
    setError(data.error ?? null);
    setEmails(data.emails ?? []);
  }
  useEffect(() => {
    load();
  }, []);

  const queued = (emails ?? []).filter((e) => e.status === "queued");
  const rest = (emails ?? []).filter((e) => e.status !== "queued");

  return (
    <div className="max-w-4xl p-4 md:p-8 space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Outbox</h1>
        <p className="text-sm text-zinc-500">
          Broker inquiries drafted by &quot;Request info&quot; queue here for YOUR one-click send —
          nothing ever sends itself. Edit freely; the draft is yours until you hit send.
        </p>
      </header>

      {error && (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">{error}</div>
      )}

      <OutreachRules />

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
          Queued — awaiting your send ({queued.length})
        </h2>
        {emails === null ? (
          <div className="text-sm text-zinc-400">Loading…</div>
        ) : queued.length === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-200 p-6 text-center text-sm text-zinc-400">
            Nothing queued. Hit &quot;Request info&quot; on a listing with a known broker email to draft one.
          </div>
        ) : (
          queued.map((e) => <Draft key={e.id} email={e} onChanged={load} />)
        )}
      </section>

      {rest.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">History</h2>
          {rest.map((e) => (
            <Draft key={e.id} email={e} onChanged={load} />
          ))}
        </section>
      )}
    </div>
  );
}
