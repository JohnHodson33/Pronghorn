// Merged-away river-guide rows must never appear in a list or a denominator.
//
// Lane C's 8/4 dedupe merged 20 duplicate people (rows KEPT for provenance,
// flagged not deleted). The flag lives in TWO places on purpose: the real
// `merged_into` COLUMN arrives with migration 0025, and until John runs it the
// dedupe tool also writes `contact.merged_into` in the existing jsonb — so a
// consumer can hide dupes today. PostgREST filters the jsonb path fine.
//
// This helper applies the column filter when it exists and falls back to the
// jsonb path, so the same call is correct before AND after 0025 and nobody has
// to remember to swap it. Verified live: 529 of 549 (the 20 dupes hidden).
import type { PostgrestFilterBuilder } from "@supabase/postgrest-js";

/* eslint-disable @typescript-eslint/no-explicit-any */
type AnyQuery = PostgrestFilterBuilder<any, any, any, any, any>;

/** jsonb-path filter — works pre-0025. */
export function excludeMergedJsonb<Q extends AnyQuery>(q: Q): Q {
  return q.is("contact->>merged_into", null) as Q;
}

/** real-column filter — works post-0025. */
export function excludeMergedColumn<Q extends AnyQuery>(q: Q): Q {
  return q.is("merged_into", null) as Q;
}

/**
 * Run `build` with the post-0025 column filter, retrying with the pre-0025
 * jsonb path if the column doesn't exist yet, and finally unfiltered if the
 * dedupe hasn't run at all. Returns the first shape that works — never a
 * silently-unfiltered result when a filter WAS available.
 */
export async function selectLiveGuides<T>(
  build: (variant: "column" | "jsonb" | "none") => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
): Promise<{ data: T[] | null; error: { message: string } | null; variant: "column" | "jsonb" | "none" }> {
  const column = await build("column");
  if (!column.error) return { ...column, variant: "column" };
  const jsonb = await build("jsonb");
  if (!jsonb.error) return { ...jsonb, variant: "jsonb" };
  const none = await build("none");
  return { ...none, variant: "none" };
}
