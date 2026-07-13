"use client";

// Global enrichment-job indicator (top bar) — visible from any page while a
// job is queued/running, so John can navigate away and still see progress.
import { useEffect, useState } from "react";

type Job = {
  id: string;
  status: string;
  counts: { total?: number; processed?: number } | null;
};

export default function ActiveJobPill() {
  const [job, setJob] = useState<Job | null>(null);

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
    };
    tick();
    const iv = setInterval(tick, 15000);
    return () => {
      alive = false;
      clearInterval(iv);
    };
  }, []);

  if (!job) return null;
  const c = job.counts ?? {};
  return (
    <a
      href="/enrichment"
      className="flex shrink-0 items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800 hover:bg-emerald-200"
      title="Enrichment job in progress — click for the live view"
    >
      <span className="inline-block animate-spin">⚙</span>
      {job.status === "queued" ? "enrichment queued" : `enriching ${c.processed ?? 0}/${c.total ?? "?"}`}
    </a>
  );
}
