"use client";

// Global attention pills (top bar) — enrichment jobs in flight, inquiry
// drafts awaiting John's one-click send, pending deal proposals, and
// enrichment runs that finished while nobody was watching (John 7/31:
// "DONE must be unmissable") — visible from any page.
import { useEffect, useState } from "react";
import { seenRunIds } from "@/lib/run-seen";

type Job = {
  id: string;
  status: string;
  counts: { total?: number; processed?: number } | null;
};

export default function ActiveJobPill() {
  const [job, setJob] = useState<Job | null>(null);
  const [queuedMail, setQueuedMail] = useState(0);
  const [pendingProposals, setPendingProposals] = useState(0);
  // finished-unseen runs per channel; cleared when the run is dismissed/opened
  // on its page (run-seen localStorage — RunsPanel writes it, we read it)
  const [unseenDone, setUnseenDone] = useState<{ href: string; n: number }[]>([]);

  useEffect(() => {
    let alive = true;
    const tick = async () => {
      try {
        const res = await fetch("/api/enrich");
        const j = await res.json();
        const active: Job | undefined = (j.jobs ?? []).find((x: Job) => ["queued", "running"].includes(x.status));
        if (alive) setJob(active ?? null);
      } catch {
        if (alive) setJob(null);
      }
      try {
        const res = await fetch("/api/outbox");
        const j = await res.json();
        const n = (j.emails ?? []).filter((e: { status: string }) => e.status === "queued").length;
        if (alive) setQueuedMail(n);
      } catch {
        if (alive) setQueuedMail(0);
      }
      // Outlook-detected deal next-steps awaiting approve/dismiss (0019) —
      // they were only visible on the dashboard, so they sat unseen (7/31)
      try {
        const res = await fetch("/api/deals/proposals");
        const j = await res.json();
        if (alive) setPendingProposals((j.proposals ?? []).length);
      } catch {
        if (alive) setPendingProposals(0);
      }
      // runs that finished while nobody was on the page (7/31 item f) —
      // the pill clears once the run is opened/dismissed on its page
      try {
        const done: { href: string; n: number }[] = [];
        // 48h cutoff — matches RunsPanel; pre-feature history must not nag
        const fresh = (at: string | null) => !!at && Date.now() - new Date(at).getTime() < 48 * 3600_000;
        const rgRes = await fetch("/api/river-guides/runs");
        const rg = await rgRes.json();
        const rgSeen = seenRunIds("river-guides");
        const rgUnseen = (rg.recent ?? [])
          .filter((r: { id: string; finished_at: string | null }) => !rgSeen.has(String(r.id)) && fresh(r.finished_at)).length;
        if (rgUnseen) done.push({ href: "/river-guides", n: rgUnseen });
        const enRes = await fetch("/api/enrich");
        const en = await enRes.json();
        const enSeen = seenRunIds("leads");
        const enUnseen = (en.jobs ?? [])
          .filter((x: { status: string; id: string; finished_at: string | null }) =>
            ["done", "failed"].includes(x.status) && !enSeen.has(String(x.id)) && fresh(x.finished_at)).length;
        if (enUnseen) done.push({ href: "/enrichment", n: enUnseen });
        if (alive) setUnseenDone(done);
      } catch {
        if (alive) setUnseenDone([]);
      }
    };
    tick();
    const iv = setInterval(tick, 15000);
    return () => {
      alive = false;
      clearInterval(iv);
    };
  }, []);

  const c = job?.counts ?? {};
  return (
    <span className="flex shrink-0 items-center gap-1.5">
      {job && (
        <a
          href="/enrichment"
          className="flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800 hover:bg-emerald-200"
          title="Enrichment job in progress — click for the live view"
        >
          <span className="inline-block animate-spin">⚙</span>
          {job.status === "queued" ? "enrichment queued" : `enriching ${c.processed ?? 0}/${c.total ?? "?"}`}
        </a>
      )}
      {queuedMail > 0 && (
        <a
          href="/outbox"
          className="flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800 hover:bg-amber-200"
          title="Inquiry drafts awaiting your one-click send"
        >
          📮 {queuedMail} to send
        </a>
      )}
      {unseenDone.map((d) => (
        <a
          key={d.href}
          href={d.href}
          className="flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800 hover:bg-emerald-200"
          title="An enrichment run finished while you were away — click to see who gained what"
        >
          ✅ {d.n} run{d.n === 1 ? "" : "s"} done
        </a>
      ))}
      {pendingProposals > 0 && (
        <a
          href="/#key-actions"
          className="flex items-center gap-1 rounded-full bg-violet-100 px-3 py-1 text-xs font-semibold text-violet-800 hover:bg-violet-200"
          title="Deal next-step updates detected in Outlook replies — approve or dismiss on Key Actions"
        >
          📩 {pendingProposals} deal update{pendingProposals === 1 ? "" : "s"}
        </a>
      )}
    </span>
  );
}
