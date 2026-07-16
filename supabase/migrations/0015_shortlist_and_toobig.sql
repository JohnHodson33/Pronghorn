-- 0015: company shortlist (John 7/15 ~11:45 — "flag or heart companies I've
-- looked at that might be good potential targets… so I'm not scrolling
-- annually and forgetting what I did"; explicitly NOT a deal stage) + the
-- TOO BIG tier threshold (John 7/15 ~11:55 — Irrigation Excellence exemplar:
-- a 12-company multinational read as an attractive Platform because we
-- couldn't size it).

create table if not exists company_shortlist (
  company_id uuid not null references companies(id) on delete cascade,
  person text not null check (person in ('John', 'Tom')),
  note text,
  created_at timestamptz not null default now(),
  primary key (company_id, person)
);
alter table company_shortlist enable row level security;
create policy "authenticated_full_access" on company_shortlist
  for all to authenticated using (true) with check (true);

-- TOO BIG boundary joins the editable thresholds (seed: est. EBITDA > $10M).
-- Qualitative conglomerate signals (multi-continent, 'group of companies',
-- franchise networks) mark too_big even with no numeric estimate.
alter table size_thresholds
  add column if not exists toobig_min_ebitda numeric not null default 10000000;
