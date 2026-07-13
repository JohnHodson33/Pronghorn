-- 0014: storage for the two cards John APPROVED 7/13 (size-proxy 37450f11,
-- rules-based nightly digest 9bb9d925). Code degrades cleanly until applied:
-- benchmarks fall back to the seeded JSON, digest runs receipt-only in-log,
-- and zero auto_enrich_rules = zero auto-spend (the rule John set).

-- Editable per-industry size benchmarks (seeded from web/lib/size-benchmarks.json;
-- tuned by actual-vs-estimate CIM logs over time)
create table if not exists size_benchmarks (
  industry text primary key,                -- canonical taxonomy label; 'default' backstop
  revenue_per_employee numeric not null,
  ebitda_margin_low numeric not null,
  ebitda_margin_high numeric not null,
  updated_at timestamptz not null default now()
);
alter table size_benchmarks enable row level security;
create policy "authenticated_full_access" on size_benchmarks
  for all to authenticated using (true) with check (true);

insert into size_benchmarks (industry, revenue_per_employee, ebitda_margin_low, ebitda_margin_high) values
  ('Tree Care', 130000, 0.15, 0.25), ('Landscaping', 110000, 0.10, 0.18),
  ('Lawn Care', 95000, 0.12, 0.20), ('Pest Control', 120000, 0.18, 0.28),
  ('Pool Services', 100000, 0.12, 0.20), ('Lake/Pond Management', 120000, 0.15, 0.25),
  ('Irrigation', 110000, 0.12, 0.20), ('HVAC', 160000, 0.10, 0.18),
  ('Plumbing', 150000, 0.10, 0.18), ('Electrical', 150000, 0.10, 0.16),
  ('Roofing', 180000, 0.12, 0.22), ('Windows & Doors', 160000, 0.10, 0.18),
  ('Cleaning/Janitorial', 55000, 0.08, 0.15), ('Restoration', 150000, 0.12, 0.20),
  ('Property Maintenance', 90000, 0.10, 0.18), ('default', 110000, 0.10, 0.20)
on conflict (industry) do nothing;

-- Editable tier thresholds (John amendment 3: Platform / Tuck-in / Too small
-- boundaries in revenue AND/OR EBITDA terms — assumptions, not constants).
-- Single row; the Size Estimation tab edits it and the math cascades.
create table if not exists size_thresholds (
  id boolean primary key default true check (id), -- single-row table
  platform_min_ebitda numeric not null default 1000000,
  platform_min_revenue numeric,          -- null = EBITDA-only test
  toosmall_max_ebitda numeric not null default 200000,
  toosmall_max_revenue numeric,
  updated_at timestamptz not null default now()
);
alter table size_thresholds enable row level security;
create policy "authenticated_full_access" on size_thresholds
  for all to authenticated using (true) with check (true);
insert into size_thresholds (id) values (true) on conflict (id) do nothing;

-- Auto-enrich rules: JOHN creates these; nothing auto-enriches outside them.
create table if not exists auto_enrich_rules (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  enabled boolean not null default true,
  industries text[] not null default '{}',   -- canonical labels; EMPTY = matches nothing
  min_size_tier text,                        -- A|B (null = any incl. unsized)
  max_leads_per_night integer not null default 20,
  nightly_dollar_cap numeric not null default 1.00,
  nightly_hunter_cap integer not null default 10,
  created_by text not null default 'John',
  created_at timestamptz not null default now()
);
alter table auto_enrich_rules enable row level security;
create policy "authenticated_full_access" on auto_enrich_rules
  for all to authenticated using (true) with check (true);

-- Nightly digest rows: receipt of what ran + tonight's plan w/ one-tap pause
create table if not exists nightly_digests (
  id uuid primary key default gen_random_uuid(),
  digest_date date not null unique,          -- the morning it's read
  receipt jsonb,                             -- what last night actually did
  plan jsonb,                                -- tonight's plan (rules, leads, est $)
  status text not null default 'planned',    -- planned | paused | ran | skipped
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table nightly_digests enable row level security;
create policy "authenticated_full_access" on nightly_digests
  for all to authenticated using (true) with check (true);
