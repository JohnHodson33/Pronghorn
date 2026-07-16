"use client";

// Filters/sort ↔ URL params (John 7/15 — every list keeps its filter + sort
// through click-into-a-record-and-back; he steps through matching records one
// by one). URL params make the state survive back-nav AND stay pinnable/
// shareable (PinnedViews). Read once on mount so SSR markup matches the first
// client render; replaceState on change so history isn't spammed.
import { useEffect, useRef } from "react";

export function useUrlFilterSync(
  // current state → params (null/"" values are omitted from the URL)
  serialize: () => Record<string, string | null | undefined>,
  // params → setState calls, run once on mount
  hydrate: (p: URLSearchParams) => void,
  // state values that should push into the URL when they change
  deps: unknown[],
) {
  const hydrated = useRef(false);

  useEffect(() => {
    hydrate(new URLSearchParams(window.location.search));
    hydrated.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!hydrated.current) return;
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries(serialize())) {
      if (v !== null && v !== undefined && v !== "") p.set(k, v);
    }
    const qs = p.toString();
    window.history.replaceState(null, "", qs ? `?${qs}` : window.location.pathname);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
