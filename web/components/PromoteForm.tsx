"use client";

// Promote a broker listing into the CRM (company + deal). Pre-fills
// everything we already know from the listing; blanks are the post-NDA
// reveal: REAL company name (required, firm rule), true financials, owner.
// Pursuit history + broker carry over server-side.
import { useState } from "react";
import { useRouter } from "next/navigation";
import { money } from "@/lib/mock";

export type PromoteKnown = {
  listingName: string;
  industry: string | null;
  city: string | null;
  state: string | null;
  asking: number | null;
  revenue: number | null;
  cashFlow: number | null;
  cashFlowType: string | null;
  brokerName: string | null;
};

const inputCls =
  "w-full rounded-md border border-zinc-300 px-2.5 py-1.5 text-sm outline-none focus:border-emerald-600";

export default function PromoteForm({ listingId, known }: { listingId: string; known?: PromoteKnown }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [f, setF] = useState({
    companyName: "",
    revenue: "",
    ebitda: "",
    ownerName: "",
    ownerEmail: "",
    ownerPhone: "",
  });

  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setF((prev) => ({ ...prev, [k]: e.target.value }));

  async function promote() {
    if (f.companyName.trim().length < 2) return;
    setBusy(true);
    setErr(null);
    const res = await fetch("/api/promote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        listingId,
        companyName: f.companyName.trim(),
        realRevenue: f.revenue.trim() || null,
        realEbitda: f.ebitda.trim() || null,
        ownerName: f.ownerName.trim() || null,
        ownerEmail: f.ownerEmail.trim() || null,
        ownerPhone: f.ownerPhone.trim() || null,
      }),
    });
    setBusy(false);
    if (res.ok) {
      const { companyId } = await res.json();
      router.push(`/companies/${companyId}`);
    } else setErr((await res.json()).error ?? "promote failed");
  }

  return (
    <div className="rounded-xl border border-emerald-300 bg-emerald-50/50 p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="text-sm font-semibold">Promote to CRM</div>
          <p className="mt-0.5 text-xs text-zinc-600">
            Creates the company + a Sourced deal, carrying the broker and pursuit history over. Needs the{" "}
            <span className="font-semibold">real company name</span> from the CIM/NDA — anonymized teasers
            never become CRM records.
          </p>
        </div>
        {!open && (
          <button
            onClick={() => setOpen(true)}
            className="rounded-lg bg-emerald-700 px-4 py-1.5 text-sm font-semibold text-white hover:bg-emerald-800"
          >
            Promote…
          </button>
        )}
      </div>

      {open && (
        <>
          {known && (
            <div className="rounded-md border border-emerald-200 bg-white px-3 py-2 text-xs text-zinc-600">
              <span className="font-semibold text-zinc-500">Carried from the listing: </span>
              {[
                known.industry,
                [known.city, known.state].filter(Boolean).join(", "),
                known.asking !== null ? `ask ${money(known.asking)}` : null,
                known.revenue !== null ? `rev ${money(known.revenue)}` : null,
                known.cashFlow !== null ? `${known.cashFlowType && known.cashFlowType !== "unknown" ? known.cashFlowType : "CF"} ${money(known.cashFlow)}` : null,
                known.brokerName ? `broker ${known.brokerName}` : null,
              ]
                .filter(Boolean)
                .join(" · ")}
            </div>
          )}
          <div className="grid gap-2 md:grid-cols-3">
            <div className="md:col-span-3">
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                Real company name * (post-NDA)
              </label>
              <input
                value={f.companyName}
                onChange={set("companyName")}
                onKeyDown={(e) => e.key === "Enter" && promote()}
                placeholder={`The business behind "${known?.listingName ?? "this listing"}"`}
                className={inputCls}
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                True revenue $ <span className="normal-case text-zinc-400">(else listing&apos;s)</span>
              </label>
              <input value={f.revenue} onChange={set("revenue")} placeholder={known?.revenue !== null && known !== undefined ? String(known.revenue) : "from CIM"} className={inputCls} />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                True EBITDA/SDE $ <span className="normal-case text-zinc-400">(else listing&apos;s)</span>
              </label>
              <input value={f.ebitda} onChange={set("ebitda")} placeholder={known?.cashFlow !== null && known !== undefined ? String(known.cashFlow) : "from CIM"} className={inputCls} />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Owner name</label>
              <input value={f.ownerName} onChange={set("ownerName")} placeholder="revealed post-NDA" className={inputCls} />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Owner email</label>
              <input value={f.ownerEmail} onChange={set("ownerEmail")} className={inputCls} />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Owner phone</label>
              <input value={f.ownerPhone} onChange={set("ownerPhone")} className={inputCls} />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={promote}
              disabled={busy || f.companyName.trim().length < 2}
              className="rounded-lg bg-emerald-700 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"
            >
              {busy ? "Promoting…" : "Create company + deal"}
            </button>
            <button
              onClick={() => setOpen(false)}
              disabled={busy}
              className="rounded-lg px-3 py-1.5 text-sm font-medium text-zinc-500 hover:bg-zinc-100"
            >
              Cancel
            </button>
            {err && <span className="text-xs text-red-600">{err}</span>}
          </div>
        </>
      )}
    </div>
  );
}
