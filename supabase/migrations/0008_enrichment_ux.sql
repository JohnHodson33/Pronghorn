-- 0008: Enrichment UX backend (docs/ENRICHMENT-UX.md — John's top priority)

-- Verified industry: what the company ACTUALLY does (Claude-classified),
-- vs. the list it was found on. off_target = doesn't belong on its list.
alter table leads add column if not exists industry_verified text;
alter table leads add column if not exists off_target boolean not null default false;
create index if not exists leads_industry_verified_idx on leads (industry_verified);
create index if not exists leads_off_target_idx on leads (off_target);

-- Enrichment job queue: the UI button POSTs here; runners drain it.
create table if not exists enrichment_jobs (
  id uuid primary key default gen_random_uuid(),
  lead_list_id uuid references lead_lists(id),
  lead_ids uuid[] not null default '{}',    -- explicit selection (empty = whole list)
  status text not null default 'queued',    -- queued | running | complete | failed
  cost_estimate numeric,
  cost_actual numeric,
  counts jsonb,                             -- {enriched, skipped}
  created_at timestamptz not null default now(),
  started_at timestamptz,
  finished_at timestamptz
);
create index if not exists enrichment_jobs_status_idx on enrichment_jobs (status);
alter table enrichment_jobs enable row level security;
create policy "authenticated_full_access" on enrichment_jobs
  for all to authenticated using (true) with check (true);

-- Canonical industry taxonomy for the list-build typeahead (Lane B).
create table if not exists industry_taxonomy (
  id text primary key,                      -- kebab slug
  label text not null,
  aliases text[] not null default '{}',     -- match-as-you-type synonyms
  thesis_core boolean not null default false
);
alter table industry_taxonomy enable row level security;
create policy "authenticated_full_access" on industry_taxonomy
  for all to authenticated using (true) with check (true);

insert into industry_taxonomy (id, label, aliases, thesis_core) values
  ('pest-control', 'Pest Control', '{pest,exterminator,termite,wildlife control}', true),
  ('tree-care', 'Tree Care', '{tree service,arborist,tree removal,tree surgery}', true),
  ('landscaping', 'Landscaping', '{landscape,landscaping services,hardscape}', true),
  ('lawn-care', 'Lawn Care', '{chemical lawn,lawn maintenance,fertilization,mowing}', true),
  ('lake-pond-management', 'Lake/Pond Management', '{lake management,pond,aquatic,water management}', true),
  ('pool-services', 'Pool Services', '{pool,pool cleaning,pool maintenance,pool repair}', true),
  ('irrigation', 'Irrigation', '{sprinkler,irrigation systems}', true),
  ('hvac', 'HVAC', '{heating,cooling,air conditioning,ac repair,a/c}', false),
  ('plumbing', 'Plumbing', '{plumber,drain,water heater}', false),
  ('electrical', 'Electrical', '{electrician,electrical contractor}', false),
  ('roofing', 'Roofing', '{roofer,roof repair,roof replacement}', false),
  ('windows-doors', 'Windows & Doors', '{window replacement,door installation}', false),
  ('cleaning-janitorial', 'Cleaning/Janitorial', '{janitorial,commercial cleaning,maid}', false),
  ('restoration', 'Restoration', '{water damage,fire damage,mold remediation}', false),
  ('property-maintenance', 'Property Maintenance', '{handyman,facilities,building maintenance}', false)
on conflict (id) do nothing;
