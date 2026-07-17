"use client";

// Editable contacts grid — used on the company profile and deal detail.
// Add a contact inline, edit any card (role/name/reach fields), all attached
// to the company (deals reach contacts through their company).
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CONTACT_ROLES, type ContactRole } from "@/lib/contact-roles";
import type { RiverGuideLink } from "@/lib/company-detail";
import { BAND_LABEL, BAND_CHIP, exitDisplay } from "@/lib/river-guide-display";

export type ContactItem = {
  id: string;
  role: string | null;
  name: string | null;
  email: string | null;
  phone: string | null;
  linkedin: string | null;
  notes: string | null;
  riverGuide?: RiverGuideLink | null;
};

const roleBadge: Record<string, string> = {
  owner: "bg-emerald-100 text-emerald-800",
  seller: "bg-emerald-100 text-emerald-800",
  broker: "bg-sky-100 text-sky-800",
  advisor: "bg-violet-100 text-violet-800",
  river_guide: "bg-amber-100 text-amber-800",
};

// Human-readable role — the ingest tags river guides role='river_guide'
// (outside CONTACT_ROLES), so spell it out rather than show the raw enum.
const roleLabel = (role: string) => (role === "river_guide" ? "river guide" : role);

// Compact river-guide panel on a contact card (item c): band, exit status
// ⚠/✓, former company + acquirer/sponsor, verification state — everything a
// caller needs before dialing an exited operator.
function RiverGuidePanel({ rg }: { rg: RiverGuideLink }) {
  const ex = exitDisplay(rg.exitStatus, rg.verified);
  return (
    <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-900">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="font-semibold">River Guide</span>
        {rg.band && (
          <span className={`rounded-full px-1.5 py-0.5 font-semibold ${BAND_CHIP[rg.band] ?? "bg-zinc-100 text-zinc-600"}`}>
            {BAND_LABEL[rg.band] ?? rg.band}
          </span>
        )}
        <span title={ex.title} className={rg.verified ? "text-amber-700" : "font-semibold text-amber-800"}>
          {ex.label} {ex.glyph}
        </span>
      </div>
      <p className="mt-1">
        Sold {rg.theirCompany}
        {rg.acquirer ? <> to <span className="font-medium">{rg.acquirer}</span></> : " (acquirer unknown)"}
        {rg.sponsor && <span className="text-amber-700"> · sponsor {rg.sponsor}</span>}
        {rg.dealYear ? `, ${rg.dealYear}` : ""}
      </p>
      {!rg.verified && (
        <p className="mt-0.5 text-amber-700">⚠ status is as-of-close — verify current role before outreach</p>
      )}
      <Link href={`/river-guides?q=${encodeURIComponent(rg.fullName || rg.theirCompany)}`} className="mt-1 inline-block font-semibold text-amber-800 hover:underline">
        Open in River Guides →
      </Link>
    </div>
  );
}

const inputCls =
  "w-full rounded-md border border-zinc-300 px-2.5 py-1.5 text-sm outline-none focus:border-emerald-600";

type FormState = {
  name: string;
  role: ContactRole;
  email: string;
  phone: string;
  linkedin: string;
  notes: string;
};

const emptyForm: FormState = { name: "", role: "owner", email: "", phone: "", linkedin: "", notes: "" };

function ContactForm({
  initial,
  busy,
  onSave,
  onCancel,
}: {
  initial: FormState;
  busy: boolean;
  onSave: (f: FormState) => void;
  onCancel: () => void;
}) {
  const [f, setF] = useState(initial);
  const set = (k: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setF((prev) => ({ ...prev, [k]: e.target.value }));
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <input value={f.name} onChange={set("name")} placeholder="Name *" className={inputCls} />
        <select value={f.role} onChange={set("role")} className={inputCls}>
          {CONTACT_ROLES.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
        <input value={f.phone} onChange={set("phone")} placeholder="Phone" className={inputCls} />
        <input value={f.email} onChange={set("email")} placeholder="Email" className={inputCls} />
        <input value={f.linkedin} onChange={set("linkedin")} placeholder="LinkedIn URL" className={`${inputCls} col-span-2`} />
        <input value={f.notes} onChange={set("notes")} placeholder="Notes" className={`${inputCls} col-span-2`} />
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onSave(f)}
          disabled={busy || !f.name.trim()}
          className="rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"
        >
          {busy ? "Saving…" : "Save"}
        </button>
        <button onClick={onCancel} disabled={busy} className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-zinc-500 hover:bg-zinc-100">
          Cancel
        </button>
      </div>
    </div>
  );
}

export default function ContactsSection({
  companyId,
  contacts,
}: {
  companyId: string;
  contacts: ContactItem[];
}) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(url: string, method: "POST" | "PATCH", body: Record<string, unknown>) {
    setBusy(true);
    setErr(null);
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setBusy(false);
    if (res.ok) {
      setAdding(false);
      setEditingId(null);
      router.refresh();
    } else setErr((await res.json()).error ?? "save failed");
  }

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Contacts</h2>
        {!adding && (
          <button
            onClick={() => setAdding(true)}
            className="rounded-md border border-zinc-300 px-2.5 py-1 text-xs font-semibold text-zinc-600 hover:border-emerald-600 hover:text-emerald-700"
          >
            + Add contact
          </button>
        )}
      </div>
      {err && <div className="text-xs text-red-600">{err}</div>}
      <div className="grid gap-3 md:grid-cols-2">
        {adding && (
          <div className="rounded-xl border border-emerald-300 bg-emerald-50/40 p-4">
            <ContactForm
              initial={emptyForm}
              busy={busy}
              onCancel={() => setAdding(false)}
              onSave={(f) => submit("/api/contacts", "POST", { companyId, ...f })}
            />
          </div>
        )}
        {contacts.map((p) =>
          editingId === p.id ? (
            <div key={p.id} className="rounded-xl border border-emerald-300 bg-emerald-50/40 p-4">
              <ContactForm
                initial={{
                  name: p.name ?? "",
                  role: (CONTACT_ROLES as readonly string[]).includes(p.role ?? "") ? (p.role as ContactRole) : "other",
                  email: p.email ?? "",
                  phone: p.phone ?? "",
                  linkedin: p.linkedin ?? "",
                  notes: p.notes ?? "",
                }}
                busy={busy}
                onCancel={() => setEditingId(null)}
                onSave={(f) => submit(`/api/contacts/${p.id}`, "PATCH", f)}
              />
            </div>
          ) : (
            <div key={p.id} className="group rounded-xl border border-zinc-200 bg-white p-4">
              <div className="flex items-center justify-between">
                <span className="font-semibold">{p.name ?? "Unnamed"}</span>
                <span className="flex items-center gap-2">
                  {p.role && (
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${roleBadge[p.role] ?? "bg-zinc-100 text-zinc-600"}`}>
                      {roleLabel(p.role)}
                    </span>
                  )}
                  <button
                    onClick={() => setEditingId(p.id)}
                    className="text-xs text-zinc-300 hover:text-emerald-700 group-hover:text-zinc-500"
                    title="Edit contact"
                  >
                    ✎
                  </button>
                </span>
              </div>
              <div className="mt-2 space-y-0.5 text-sm">
                {p.phone && <div>📞 {p.phone}</div>}
                {p.email && (
                  <div>
                    ✉️ <a href={`mailto:${p.email}`} className="text-emerald-700 hover:underline">{p.email}</a>
                  </div>
                )}
                {p.linkedin && (
                  <div>
                    <a href={p.linkedin} target="_blank" rel="noopener noreferrer" className="text-emerald-700 hover:underline">LinkedIn ↗</a>
                  </div>
                )}
                {p.notes && <p className="pt-1 text-xs text-zinc-500">{p.notes}</p>}
              </div>
              {p.riverGuide && <RiverGuidePanel rg={p.riverGuide} />}
            </div>
          )
        )}
        {contacts.length === 0 && !adding && (
          <div className="rounded-xl border border-dashed border-zinc-300 px-4 py-8 text-center text-xs text-zinc-400 md:col-span-2">
            No contacts on record — add the owner or broker.
          </div>
        )}
      </div>
    </section>
  );
}
