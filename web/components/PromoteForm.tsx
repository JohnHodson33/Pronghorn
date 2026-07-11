"use client";

// Promote a broker listing into the CRM (company + deal). Firm rule enforced
// upstream too: requires the REAL company name from the CIM/NDA/broker call.
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function PromoteForm({ listingId }: { listingId: string }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function promote() {
    if (name.trim().length < 2) return;
    setBusy(true);
    setErr(null);
    const res = await fetch("/api/promote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ listingId, companyName: name.trim() }),
    });
    setBusy(false);
    if (res.ok) {
      const { companyId } = await res.json();
      router.push(`/companies/${companyId}`);
    } else setErr((await res.json()).error ?? "promote failed");
  }

  return (
    <div className="rounded-xl border border-emerald-300 bg-emerald-50/50 p-4">
      <div className="text-sm font-semibold">Promote to CRM</div>
      <p className="mt-1 text-xs text-zinc-600">
        Creates the company + a Sourced deal. Needs the <span className="font-semibold">real company name</span>{" "}
        (from the CIM/NDA/broker) — anonymized teasers never become CRM records.
      </p>
      <div className="mt-3 flex items-center gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && promote()}
          placeholder="Real company name…"
          className="flex-1 rounded-md border border-zinc-300 px-3 py-1.5 text-sm outline-none focus:border-emerald-600"
        />
        <button
          onClick={promote}
          disabled={busy || name.trim().length < 2}
          className="rounded-lg bg-emerald-700 px-4 py-1.5 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"
        >
          {busy ? "Promoting…" : "Promote"}
        </button>
      </div>
      {err && <div className="mt-2 text-xs text-red-600">{err}</div>}
    </div>
  );
}
