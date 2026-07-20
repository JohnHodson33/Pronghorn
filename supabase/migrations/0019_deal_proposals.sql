-- 0019: DEAL STATE TRACKS OUTLOOK (John 7/16 ~16:00, verbatim: "you should be
-- updating this based on my Outlook traffic"). A real miss — Robert
-- Fahrenhorst replied "anytime Tue works great" on the AAFE thread 7/15 22:56
-- and the CRM still read "IOI due 7/17" a day later.
--
-- The classifier proposes a next_step change from an inbound broker/banker
-- reply; John APPROVES it (his no-guess bar — never silently rewrite a live
-- deal from an email). Pending proposals surface as a Key Actions card.

create table if not exists deal_proposals (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid not null references deals(id) on delete cascade,
  kind text not null default 'next_step',      -- next_step | meeting_scheduled
  proposed_next_step text,
  proposed_next_step_due date,
  evidence text,                               -- the sentence(s) the model keyed on
  meeting_when text,                           -- free-text availability if the reply gave one ("anytime Tue")
  confidence text,                             -- high | medium | low
  source_msg_id text,                          -- Graph internetMessageId (idempotency)
  source_url text,                             -- Outlook webLink
  source_from text,                            -- who sent it
  status text not null default 'pending',      -- pending | approved | dismissed
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);
create index if not exists deal_proposals_status_idx on deal_proposals (status);
create unique index if not exists deal_proposals_msg_uq on deal_proposals (deal_id, source_msg_id) where source_msg_id is not null;
alter table deal_proposals enable row level security;
create policy "authenticated_full_access" on deal_proposals
  for all to authenticated using (true) with check (true);
