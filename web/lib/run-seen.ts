// Which finished enrichment runs has this browser acknowledged? Backs the
// "DONE must be unmissable" rule (John 7/31): a completion receipt persists —
// across navigations and sessions — until someone dismisses it, and the
// global top-bar pill flags a run that finished while nobody was watching.
// localStorage (not sessionStorage): "leave, come back tomorrow" still shows
// the receipt. Capped so the key can't grow unbounded.

const KEY = (channel: string) => `pronghorn-runs-seen-${channel}`;
const CAP = 50;

export function seenRunIds(channel: string): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    return new Set(JSON.parse(localStorage.getItem(KEY(channel)) ?? "[]") as string[]);
  } catch {
    return new Set();
  }
}

export function markRunSeen(channel: string, id: string): void {
  if (typeof window === "undefined") return;
  try {
    const ids = [id, ...[...seenRunIds(channel)].filter((x) => x !== id)].slice(0, CAP);
    localStorage.setItem(KEY(channel), JSON.stringify(ids));
  } catch {}
}
