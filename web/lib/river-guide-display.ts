// River-guide display helpers — band labels/chips + the exit-status glyph,
// shared by the /river-guides table and the CRM profile surfaces (company
// former-owner banner + contact panel) so the two never drift. Mirrors the
// inline maps in app/river-guides/page.tsx (John's terms, not the raw enum).

export const BAND_LABEL: Record<string, string> = {
  CALL_NOW: "Call now",
  ENRICH_THEN_ASSESS: "Enrich & assess",
  NURTURE: "Nurture",
  RESOLVE_NAME_FIRST: "Resolve name",
};

export const BAND_CHIP: Record<string, string> = {
  CALL_NOW: "bg-emerald-700 text-white",
  ENRICH_THEN_ASSESS: "bg-sky-100 text-sky-800",
  NURTURE: "bg-zinc-100 text-zinc-600",
  RESOLVE_NAME_FIRST: "bg-amber-100 text-amber-800",
};

// Exit status is captured AT CLOSE, not today (schema comment: "⚠ at-close").
// ✓ only once the verify worker has done a fresh public check; otherwise ⚠ so
// nobody cold-calls an "exited" owner who actually rolled equity and still runs
// the business under the acquirer.
export function exitDisplay(status: string, verified: boolean): {
  label: string; glyph: "✓" | "⚠"; title: string;
} {
  const label = status === "EXITED" ? "Exited" : status === "EMPLOYED" ? "Employed" : "Unknown";
  return {
    label,
    glyph: verified ? "✓" : "⚠",
    title: verified
      ? "Current status verified by a fresh public/LinkedIn check"
      : "Status is as-of-close and UNVERIFIED — confirm before outreach",
  };
}
