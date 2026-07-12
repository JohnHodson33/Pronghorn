-- 0007: Outreach tracking (John 7/11 — cold outreach needs its own state,
-- beyond the pipeline's Prospecting column). One row per company being
-- worked; channel history stays in activities (kind=email|call|note).
-- Designed w/ Lane B: Outreach + Cold Calling tabs read/write this; the
-- Dashboard Key Actions feed surfaces rows with next_followup_due <= tomorrow.

create table if not exists outreach_tracks (
  company_id uuid primary key references companies(id) on delete cascade,
  state text not null default 'not_started',
    -- not_started | contacted | replied | meeting | nurture | dead
  channel_last text,                       -- email | call | linkedin
  last_touch_at timestamptz,
  next_followup_due date,
  owner_contact_id uuid references contacts(id),
  notes text,
  updated_at timestamptz not null default now()
);
create index if not exists outreach_tracks_due_idx on outreach_tracks (next_followup_due);
create index if not exists outreach_tracks_state_idx on outreach_tracks (state);

alter table outreach_tracks enable row level security;
create policy "authenticated_full_access" on outreach_tracks
  for all to authenticated using (true) with check (true);
