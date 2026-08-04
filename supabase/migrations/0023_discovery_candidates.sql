-- 0023 — DISCOVERY REVIEW PEN (John 7/31 discovery-at-scale card (b)):
-- MEDIUM-confidence sweep candidates and auto-discovered NEW consolidators
-- wait here for a one-click keep/reject on the river-guides page — never
-- silently filed into a table John reads, never silently dropped either.
create table if not exists discovery_candidates (
  id uuid primary key default gen_random_uuid(),
  kind text not null default 'deal' check (kind in ('deal', 'consolidator')),
  acquirer text not null,
  company text not null default '', -- the add-on target ('' for kind=consolidator, so the pair stays unique)
  seller_name text,
  deal_year int,
  city text,
  state text,
  industry text,
  acquirer_pe_sponsor text,
  source_url text,
  confidence text check (confidence is null or confidence in ('HIGH','MEDIUM','LOW')),
  status text not null default 'pending' check (status in ('pending','kept','rejected')),
  decided_by text,
  decided_at timestamptz,
  created_at timestamptz not null default now()
);
-- one candidate per (acquirer, company) pair — re-sweeps refresh, not duplicate
-- (plain columns, not expressions: PostgREST upsert can target this)
create unique index if not exists discovery_candidates_pair_uq
  on discovery_candidates (acquirer, company);
create index if not exists discovery_candidates_status_idx on discovery_candidates (status);
alter table discovery_candidates enable row level security;
create policy "authenticated_full_access" on discovery_candidates
  for all to authenticated using (true) with check (true);
