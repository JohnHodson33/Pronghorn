"use client";

// Inline editor for company key fields on the profile page. View mode by
// default; "Edit" flips the stat cards into inputs, Save PATCHes and refreshes.
import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  companyId: string;
  name: string;
  industry: string | null;
  city: string | null;
  state: string | null;
  website: string | null;
  revenue: number | null;
  ebitda: number | null;
  ebitdaType: string;
};

const inputCls =
  "w-full rounded-md border border-zinc-300 px-2.5 py-1.5 text-sm outline-none focus:border-emerald-600";

export default function CompanyEditor(p: Props) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: p.name,
    industry: p.industry ?? "",
    city: p.city ?? "",
    state: p.state ?? "",
    website: p.website ?? "",
    revenue: p.revenue === null ? "" : String(p.revenue),
    ebitda: p.ebitda === null ? "" : String(p.ebitda),
    ebitda_type: p.ebitdaType,
  });

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  async function save() {
    setBusy(true);
    setErr(null);
    const res = await fetch(`/api/companies/${p.companyId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setBusy(false);
    if (res.ok) {
      setEditing(false);
      router.refresh();
    } else setErr((await res.json()).error ?? "save failed");
  }

  if (!editing)
    return (
      <button
        onClick={() => setEditing(true)}
        className="rounded-md border border-zinc-300 px-3 py-1 text-xs font-semibold text-zinc-600 hover:border-emerald-600 hover:text-emerald-700"
      >
        ✎ Edit company
      </button>
    );

  return (
    <div className="w-full rounded-xl border border-emerald-300 bg-emerald-50/40 p-4 space-y-3">
      <div className="grid gap-3 md:grid-cols-3">
        <div className="md:col-span-2">
          <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Name</label>
          <input value={form.name} onChange={set("name")} className={inputCls} />
        </div>
        <div>
          <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Industry</label>
          <input value={form.industry} onChange={set("industry")} placeholder="e.g. Tree Care" className={inputCls} />
        </div>
        <div>
          <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-zinc-500">City</label>
          <input value={form.city} onChange={set("city")} className={inputCls} />
        </div>
        <div>
          <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-zinc-500">State</label>
          <input value={form.state} onChange={set("state")} placeholder="IL" className={inputCls} />
        </div>
        <div>
          <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Website</label>
          <input value={form.website} onChange={set("website")} placeholder="https://…" className={inputCls} />
        </div>
        <div>
          <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Revenue $</label>
          <input value={form.revenue} onChange={set("revenue")} placeholder="4500000" className={inputCls} />
        </div>
        <div>
          <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
            {form.ebitda_type || "EBITDA"} $
          </label>
          <input value={form.ebitda} onChange={set("ebitda")} placeholder="900000" className={inputCls} />
        </div>
        <div>
          <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Cash-flow basis</label>
          <select value={form.ebitda_type} onChange={set("ebitda_type")} className={inputCls}>
            <option value="EBITDA">EBITDA</option>
            <option value="SDE">SDE</option>
            <option value="adj EBITDA">adj EBITDA</option>
          </select>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={save}
          disabled={busy || !form.name.trim()}
          className="rounded-lg bg-emerald-700 px-4 py-1.5 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"
        >
          {busy ? "Saving…" : "Save changes"}
        </button>
        <button
          onClick={() => setEditing(false)}
          disabled={busy}
          className="rounded-lg px-3 py-1.5 text-sm font-medium text-zinc-500 hover:bg-zinc-100"
        >
          Cancel
        </button>
        {err && <span className="text-xs text-red-600">{err}</span>}
      </div>
    </div>
  );
}
