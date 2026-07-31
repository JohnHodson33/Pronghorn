-- 0021: Self-serve data intake (John 7/20 — Tom can upload files). Each upload
-- becomes an intake_jobs row: preview builds a resolved PLAN (no writes),
-- confirm executes it and stores the RECEIPT. The row IS the provenance +
-- audit trail (who uploaded what file, when, and what it did). No silent bulk
-- import — nothing writes to contacts/companies/river_guides without a confirm.
create table if not exists intake_jobs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  uploaded_by text not null,            -- John | Tom
  filename text not null,
  storage_path text not null,           -- intake bucket path
  record_type text,                     -- contact | company | river_guide | enrichment_fill
  status text not null default 'preview', -- preview | committed | discarded | error
  mapping jsonb,                        -- { ourField: sourceHeader | null }
  plan jsonb,                           -- resolved rows + per-row action (create/update/skip) + conflicts
  counts jsonb,                         -- { create, update, skip, conflicts, rows }
  receipt jsonb,                        -- what actually happened on confirm
  committed_at timestamptz,
  note text
);
create index if not exists intake_jobs_status_idx on intake_jobs (status);
create index if not exists intake_jobs_created_idx on intake_jobs (created_at desc);

alter table intake_jobs enable row level security;
create policy "authenticated_full_access" on intake_jobs
  for all to authenticated using (true) with check (true);
