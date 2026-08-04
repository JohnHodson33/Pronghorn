-- 0024 — POSSIBLE-DUPLICATE REVIEW (PM 8/4 duplicate-people card, Lane A item c).
--
-- The consolidator sweep was filing a SECOND river_guides row for a deal already
-- in the book (cosmetic name variants: "Cordwin Tree Service" vs "…Services",
-- "Treecology (Portland)" vs "Treecology"), so the same human existed twice with
-- contradictory exit_status — 3 of them inside the outreach-ready set.
--
-- The sweep's insert-time guard now resolves a match one of two ways:
--   exact match  → update the existing row in place (never a second row)
--   fuzzy match  → park HERE for a human, because a near-identical company name
--                  does NOT prove the same deal: the live book contains
--                  "Green Machine Lawn Care" sold by two different owners, and
--                  auto-merging those would silently destroy a real deal.
-- Hence a third `kind`, plus a notes column carrying which row it may duplicate
-- and (when known) the conflicting seller names, so the human can adjudicate
-- without re-deriving the evidence.
alter table discovery_candidates
  drop constraint if exists discovery_candidates_kind_check;

alter table discovery_candidates
  add constraint discovery_candidates_kind_check
  check (kind in ('deal', 'consolidator', 'possible_duplicate'));

alter table discovery_candidates
  add column if not exists notes text;

comment on column discovery_candidates.notes is
  'For kind=possible_duplicate: which river_guides deal_id this may duplicate, and any seller-name conflict. Evidence for the human decision — never auto-applied.';
