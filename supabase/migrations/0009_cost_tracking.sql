-- 0009: Cost tracking (docs/COST-TRACKING.md, John 7/12) — every paid call
-- site records a usage event; /api/costs aggregates for the Sidebar badge.

create table if not exists usage_events (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  service text not null,     -- claude | exa | serper | hunter | places | parallel
  activity text not null,    -- enrichment | list_building | classification | drafting | email_finding
  units numeric not null default 1,   -- tokens/searches/credits
  cost_usd numeric not null default 0,
  meta jsonb
);
create index if not exists usage_events_at_idx on usage_events (at);
create index if not exists usage_events_service_idx on usage_events (service);

create table if not exists subscriptions (
  name text primary key,
  monthly_usd numeric not null,
  active boolean not null default true
);
-- seed empty on purpose: all current tooling is usage-based or free tier

alter table usage_events enable row level security;
alter table subscriptions enable row level security;
create policy "authenticated_full_access" on usage_events
  for all to authenticated using (true) with check (true);
create policy "authenticated_full_access" on subscriptions
  for all to authenticated using (true) with check (true);
