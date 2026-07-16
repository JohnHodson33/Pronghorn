-- 0017: River Guides reconcile — merges Lane C's backend schema with the
-- PM-authored 0016 that John already ran (7/16). Additive only; safe re-run.
-- Adds the columns Lane C's workers write (flat contact channels, verification
-- timestamp, vertical), graduates PE-ownership to first-class companies
-- columns, and enables RLS matching the shortlist pattern.

alter table river_guides
  add column if not exists email text,
  add column if not exists phone text,
  add column if not exists linkedin_url text,
  add column if not exists vertical text,             -- raw research vertical (Lawn/Tree/Both…)
  add column if not exists status_verified_at timestamptz;

-- 0016 stored the raw vertical as vertical_raw; workers read `vertical`
update river_guides set vertical = vertical_raw where vertical is null and vertical_raw is not null;

-- PE-ownership becomes first-class on companies: the 433 consolidator
-- acquisitions are ground truth, and enrichment-detected flags graduate
-- from lead jsonb to queryable columns.
alter table companies
  add column if not exists pe_owned boolean,
  add column if not exists pe_owner text;

alter table river_guides enable row level security;
drop policy if exists "authenticated_full_access" on river_guides;
create policy "authenticated_full_access" on river_guides
  for all to authenticated using (true) with check (true);
