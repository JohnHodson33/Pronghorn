-- 0018: SIZE MODEL AMENDMENT 4 columns (split from 0017 — the pe-only 0017
-- was applied before the size alters were added; this carries the rest).
alter table size_benchmarks
  add column if not exists ppp_payroll_pct numeric,
  add column if not exists burdened_wage numeric;

update size_benchmarks set ppp_payroll_pct = v.pct, burdened_wage = v.wage
from (values
  ('Tree Care', 0.40, 65000), ('Landscaping', 0.38, 58000), ('Lawn Care', 0.35, 55000),
  ('Pest Control', 0.33, 58000), ('Pool Services', 0.32, 55000), ('Lake/Pond Management', 0.33, 60000),
  ('Irrigation', 0.32, 58000), ('HVAC', 0.30, 70000), ('Plumbing', 0.32, 70000),
  ('Electrical', 0.34, 70000), ('Roofing', 0.25, 62000), ('Windows & Doors', 0.26, 62000),
  ('Cleaning/Janitorial', 0.50, 42000), ('Restoration', 0.32, 62000),
  ('Property Maintenance', 0.40, 52000), ('default', 0.33, 58000)
) as v(industry, pct, wage)
where size_benchmarks.industry = v.industry;

-- Fencing becomes first-class (AAFE-class targets currently hit 'default')
insert into size_benchmarks (industry, revenue_per_employee, ebitda_margin_low, ebitda_margin_high, ppp_payroll_pct, burdened_wage)
values ('Fencing', 150000, 0.12, 0.20, 0.30, 60000)
on conflict (industry) do update set ppp_payroll_pct = excluded.ppp_payroll_pct, burdened_wage = excluded.burdened_wage;

alter table size_thresholds
  add column if not exists ebitda_margin_flat numeric not null default 0.20,
  add column if not exists cpi_2020 numeric not null default 1.25,
  add column if not exists cpi_2021 numeric not null default 1.20;

-- Shared runner config (first use: the Microsoft Graph refresh token, which
-- ROTATES on use — the DB row is the single live copy for local + CI runners;
-- fixes the Outlook Sync CI failures from stale GH-secret tokens).
create table if not exists app_config (
  key text primary key,
  value text,
  updated_at timestamptz not null default now()
);
alter table app_config enable row level security;
create policy "authenticated_full_access" on app_config
  for all to authenticated using (true) with check (true);
