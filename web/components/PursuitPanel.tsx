"use client";

// Pursuit panel for a listing (LISTING-PURSUIT-FLOW.md): status stepper,
// "Request info" action, and the pre-drafted broker inquiry. HARD GUARDRAIL:
// nothing here sends anything — the mailto link opens John's own mail client
// and HE clicks send; the co-pilot path only copies text.
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { PURSUIT_LABEL, PURSUIT_STATUSES } from "@/lib/pursuit";

type Profile = { name: string; phone: string; email: string; note: string };

const DEFAULT_PROFILE: Profile = {
  name: "John Hodson",
  phone: "(503) 899-0058",
  email: "jhodson@pronghornequity.com", // NEVER the gmail (John 7/13)
  // John's verbatim inquiry copy (broker-listing outreach overhaul, 7/13)
  note:
    "My name is John Hodson, and I am a Managing Director at Pronghorn Equity Partners. " +
    "We are a lower middle market private equity fund that focuses on business services assets across the US. " +
    "We would love to get some additional information on the below listing. " +
    "Are you able to share the NDA and any initial materials? It would also be helpful to hop on an introductory call to learn more and introduce myself.",
};

const LS_KEY = "pronghorn-inquiry-profile-v1";

type Props = {
  listingId: string;
  listingName: string;
  sourceId: string | null;
  sourceUrl: string | null;
  status: string | null;
  brokerName: string | null;
  brokerEmail: string | null;
  queuedEmail?: { id: string; subject: string } | null;
};

export default function PursuitPanel({
  listingId,
  listingName,
  sourceId,
  sourceUrl,
  status,
  brokerName,
  brokerEmail,
  queuedEmail,
}: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile>(DEFAULT_PROFILE);
  const [dbProfile, setDbProfile] = useState(false);
  const [editProfile, setEditProfile] = useState(false);
  const [copied, setCopied] = useState(false);

  const current = status ?? "new";

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/inquiry-profile");
        const j = await res.json();
        if (j.profile) {
          setProfile({ ...DEFAULT_PROFILE, ...j.profile });
          setDbProfile(true);
          return;
        }
      } catch {}
      const saved = localStorage.getItem(LS_KEY);
      if (saved) setProfile({ ...DEFAULT_PROFILE, ...JSON.parse(saved) });
    })();
  }, []);

  async function saveProfile() {
    localStorage.setItem(LS_KEY, JSON.stringify(profile));
    try {
      const res = await fetch("/api/inquiry-profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile),
      });
      const j = await res.json();
      setDbProfile(!!j.ok);
    } catch {}
    setEditProfile(false);
  }

  async function setStatus(next: string) {
    setBusy(true);
    setErr(null);
    const res = await fetch(`/api/listings/${listingId}/pursue`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    setBusy(false);
    if (res.ok) router.refresh();
    else setErr((await res.json()).error ?? "update failed");
  }

  // Request info — best path first: Claude-drafts + queues in the Outbox
  // (/api/outbox flips the status itself). Falls back to the plain status
  // flip + mailto/co-pilot surface when drafting isn't available (no broker
  // email, no API key, or migration 0006 not applied).
  async function requestInfo() {
    setBusy(true);
    setErr(null);
    setNotice(null);
    try {
      const res = await fetch("/api/outbox", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listingId }),
      });
      if (res.ok) {
        setNotice("Inquiry drafted & queued — review and send it from the Outbox.");
        router.refresh();
        return;
      }
    } catch {}
    setBusy(false);
    await setStatus("info_requested");
  }

  const subject = `Inquiry — ${listingName}`;
  const body = useMemo(
    () =>
      `Hello${brokerName ? ` ${brokerName.split(/\s+/)[0]}` : ""},\n\n` +
      `I'm interested in your listing "${listingName}"${sourceId ? ` (via ${sourceId})` : ""}.\n\n` +
      `${profile.note}\n\n` +
      `${profile.name}${profile.phone ? `\n${profile.phone}` : ""}${profile.email ? `\n${profile.email}` : ""}`,
    [brokerName, listingName, sourceId, profile]
  );
  const mailto = brokerEmail
    ? `mailto:${brokerEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
    : null;

  const requested = ["info_requested", "nda_signed", "cim_received", "promoted"].includes(current);

  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-semibold">Pursuit</h2>
        <div className="flex flex-wrap items-center gap-1">
          {PURSUIT_STATUSES.filter((s) => s !== "promoted").map((s) => (
            <button
              key={s}
              onClick={() => setStatus(s)}
              disabled={busy || s === current}
              title={`Mark ${PURSUIT_LABEL[s]}`}
              className={`rounded-full px-2.5 py-1 text-xs font-semibold transition ${
                s === current
                  ? "bg-emerald-700 text-white"
                  : "border border-zinc-200 bg-white text-zinc-500 hover:border-emerald-600 hover:text-emerald-700"
              }`}
            >
              {PURSUIT_LABEL[s]}
            </button>
          ))}
        </div>
      </div>

      {!requested && (
        <button
          onClick={requestInfo}
          disabled={busy}
          className="rounded-lg bg-emerald-700 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"
        >
          {busy ? "Drafting…" : "Request info →"}
        </button>
      )}
      {err && <div className="text-xs text-red-600">{err}</div>}
      {notice && <div className="rounded-md bg-emerald-50 px-3 py-2 text-xs text-emerald-800">{notice}</div>}

      {queuedEmail && (
        <div className="flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50/60 px-4 py-3">
          <div className="min-w-0 text-sm">
            <span className="font-semibold">Inquiry queued: </span>
            <span className="text-zinc-700">{queuedEmail.subject}</span>
          </div>
          <a
            href="/outbox"
            className="ml-3 shrink-0 rounded-lg bg-emerald-700 px-4 py-1.5 text-sm font-semibold text-white hover:bg-emerald-800"
          >
            Review & send in Outbox →
          </a>
        </div>
      )}

      {requested && !queuedEmail && (
        <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 space-y-3">
          {brokerEmail ? (
            <>
              <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Drafted inquiry → {brokerName ?? "broker"} ({brokerEmail})
              </div>
              <div className="rounded-md border border-zinc-200 bg-white p-3">
                <div className="text-sm font-semibold">{subject}</div>
                <p className="mt-1 whitespace-pre-wrap text-sm text-zinc-700">{body}</p>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={mailto!}
                  className="rounded-lg bg-emerald-700 px-4 py-1.5 text-sm font-semibold text-white hover:bg-emerald-800"
                >
                  Open in your mail app → you click send
                </a>
                <button
                  onClick={async () => {
                    await navigator.clipboard.writeText(`To: ${brokerEmail}\nSubject: ${subject}\n\n${body}`);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 1500);
                  }}
                  className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-600 hover:bg-zinc-100"
                >
                  {copied ? "Copied ✓" : "Copy draft"}
                </button>
              </div>
              <p className="text-[11px] text-zinc-400">
                Nothing is sent automatically — the draft opens in your own mail client.
              </p>
            </>
          ) : (
            <>
              <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                No broker email on this source — co-pilot mode
              </div>
              <p className="text-sm text-zinc-600">
                Open the listing&apos;s inquiry page and paste your contact block (below) into the form.
                {sourceUrl && (
                  <>
                    {" "}
                    <a href={sourceUrl} target="_blank" rel="noopener noreferrer" className="font-medium text-emerald-700 hover:underline">
                      Open inquiry page ↗
                    </a>
                  </>
                )}
              </p>
              <div className="rounded-md border border-zinc-200 bg-white p-3 text-sm text-zinc-700 whitespace-pre-wrap">{body}</div>
              <button
                onClick={async () => {
                  await navigator.clipboard.writeText(body);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1500);
                }}
                className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-600 hover:bg-zinc-100"
              >
                {copied ? "Copied ✓" : "Copy contact block"}
              </button>
            </>
          )}
        </div>
      )}

      <div>
        <button
          onClick={() => setEditProfile((e) => !e)}
          className="text-xs font-medium text-zinc-400 hover:text-emerald-700"
        >
          {editProfile ? "close" : `✎ inquiry profile (${profile.name || "unset"}${dbProfile ? " · shared" : " · this browser"})`}
        </button>
        {editProfile && (
          <div className="mt-2 grid gap-2 md:grid-cols-3">
            <input
              value={profile.name}
              onChange={(e) => setProfile({ ...profile, name: e.target.value })}
              placeholder="Name"
              className="rounded-md border border-zinc-300 px-2.5 py-1.5 text-sm outline-none focus:border-emerald-600"
            />
            <input
              value={profile.phone}
              onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
              placeholder="Phone"
              className="rounded-md border border-zinc-300 px-2.5 py-1.5 text-sm outline-none focus:border-emerald-600"
            />
            <input
              value={profile.email}
              onChange={(e) => setProfile({ ...profile, email: e.target.value })}
              placeholder="Email"
              className="rounded-md border border-zinc-300 px-2.5 py-1.5 text-sm outline-none focus:border-emerald-600"
            />
            <textarea
              value={profile.note}
              onChange={(e) => setProfile({ ...profile, note: e.target.value })}
              rows={3}
              placeholder="Default inquiry note"
              className="md:col-span-3 rounded-md border border-zinc-300 px-2.5 py-1.5 text-sm outline-none focus:border-emerald-600"
            />
            <button
              onClick={saveProfile}
              className="w-fit rounded-lg bg-emerald-700 px-4 py-1.5 text-sm font-semibold text-white hover:bg-emerald-800"
            >
              Save profile
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
