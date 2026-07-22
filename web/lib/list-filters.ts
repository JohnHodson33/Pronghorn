// Shared list-filter helpers so every table filters IDENTICALLY (John 7/21,
// 5th time asking: the lists must behave the same everywhere).
//
// presenceOptions/presenceMatch give a column its own has/missing filter —
// Email, Phone and LinkedIn each own one rather than sharing a single combined
// "reachability" control, so "has phone" is one click on the Phone column.

export type PresenceOption = { value: string; label: string; count: number };

export function presenceOptions<T>(rows: T[], pick: (r: T) => unknown, noun: string): PresenceOption[] {
  const has = rows.reduce((n, r) => n + (pick(r) ? 1 : 0), 0);
  return [
    { value: "has", label: `Has ${noun}`, count: has },
    { value: "missing", label: `No ${noun}`, count: rows.length - has },
  ];
}

// Empty selection = no constraint. Selecting both reads as "either", which is
// the same as no filter — harmless and matches multi-select expectations.
export function presenceMatch(sel: Set<string>, value: unknown): boolean {
  if (!sel.size) return true;
  return (sel.has("has") && !!value) || (sel.has("missing") && !value);
}

// Text compare with blanks sorted last in BOTH directions (a blank is never
// "the biggest name"); mirrors the numeric nulls-last rule used across tables.
export function cmpText(a: string | null | undefined, b: string | null | undefined): number {
  const av = (a ?? "").trim(), bv = (b ?? "").trim();
  if (!av && !bv) return 0;
  if (!av) return 1;
  if (!bv) return -1;
  return av.toLowerCase().localeCompare(bv.toLowerCase());
}

// Numeric compare, nulls last in both directions. `dir` is applied by the
// caller to the non-null case only — so callers use: nullsLast(av,bv) ?? (dir…)
export function nullsLast(av: number | null, bv: number | null): number | null {
  if (av === null && bv === null) return 0;
  if (av === null) return 1;
  if (bv === null) return -1;
  return null; // both present — caller applies direction
}
