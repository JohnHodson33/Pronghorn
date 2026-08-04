-- 0024 — DUPLICATE PEOPLE + CONTRADICTORY STATUS (PM 8/4, urgent: 3 of the
-- outreach-ready cohort had a conflicting twin — we would have emailed someone
-- as a fresh exit while our own data said they still work for the acquirer).
--
-- merged_into: the surviving deal_id when two rows were the SAME deal. The row
-- is KEPT (never deleted — provenance and both source_urls survive); lists
-- filter on `merged_into is null`.
--
-- status_conflict: when two rows about the same PERSON disagree on exit_status,
-- we do NOT pick a winner. Both claims are recorded here, exit_status drops to
-- UNKNOWN, and the person goes back in the verify queue.
--   {detected_at, claims:[{deal_id, exit_status, verified, source_url}]}
alter table river_guides add column if not exists merged_into text;
alter table river_guides add column if not exists status_conflict jsonb;

create index if not exists river_guides_merged_idx on river_guides (merged_into);

-- the review pen also carries status conflicts for a human decision
alter table discovery_candidates drop constraint if exists discovery_candidates_kind_check;
alter table discovery_candidates add constraint discovery_candidates_kind_check
  check (kind in ('deal', 'consolidator', 'status_conflict'));
