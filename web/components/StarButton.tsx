"use client";

// Company shortlist ★ (John 7/15 — "flag or heart companies I've looked at…
// so I'm not scrolling annually and forgetting what I did"; NOT a deal stage).
// One tap = toggle (optimistic) against /api/companies/[id]/shortlist.
// Compact mode (table rows) toggles for the default person (John); the full
// mode (profile header) shows both John's and Tom's stars with who/when.
import { useState } from "react";
import { useRouter } from "next/navigation";

export type ShortlistEntry = { person: string; note?: string | null; created_at?: string };

export default function StarButton({
  companyId,
  shortlist,
  person = "John",
  compact = false,
}: {
  companyId: string;
  shortlist: ShortlistEntry[];
  person?: "John" | "Tom";
  compact?: boolean;
}) {
  const router = useRouter();
  const [local, setLocal] = useState<ShortlistEntry[]>(shortlist);
  const [busy, setBusy] = useState<string | null>(null);

  async function toggle(p: "John" | "Tom") {
    const starred = local.some((s) => s.person === p);
    const prev = local;
    setLocal(starred ? local.filter((s) => s.person !== p) : [...local, { person: p, created_at: new Date().toISOString() }]);
    setBusy(p);
    const res = starred
      ? await fetch(`/api/companies/${companyId}/shortlist?person=${p}`, { method: "DELETE" })
      : await fetch(`/api/companies/${companyId}/shortlist`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ person: p }),
        });
    setBusy(null);
    if (!res.ok) setLocal(prev); // revert; the apply-0015 note surfaces via title on retry
    else router.refresh();
  }

  const who = (p: string) => local.find((s) => s.person === p);

  if (compact) {
    const any = local.length > 0;
    const title = any
      ? `Shortlisted by ${local.map((s) => `${s.person}${s.created_at ? ` ${s.created_at.slice(0, 10)}` : ""}`).join(", ")} — click to toggle yours`
      : "Add to shortlist (marks it as reviewed + promising)";
    return (
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); toggle(person); }}
        disabled={busy !== null}
        title={title}
        className={`px-1 text-lg leading-none ${any ? "text-amber-500" : "text-zinc-200 hover:text-amber-400"}`}
      >
        ★
      </button>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5">
      {(["John", "Tom"] as const).map((p) => {
        const entry = who(p);
        return (
          <button
            key={p}
            type="button"
            onClick={() => toggle(p)}
            disabled={busy === p}
            title={entry ? `Shortlisted by ${p}${entry.created_at ? ` on ${entry.created_at.slice(0, 10)}` : ""} — click to remove` : `Shortlist as ${p}`}
            className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${
              entry ? "border-amber-300 bg-amber-50 text-amber-700" : "border-zinc-200 text-zinc-400 hover:border-amber-300 hover:text-amber-600"
            }`}
          >
            ★ {p}
          </button>
        );
      })}
    </span>
  );
}
