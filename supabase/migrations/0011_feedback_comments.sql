-- 0011: Feedback threads (John 7/12 ~23:45 — "I wanna have a dialogue with the
-- agent before I click approve, and see status + completion summaries in that
-- same conversation"). Each feedback/suggestion becomes a thread; the comments
-- ARE the audit trail (status changes, build plans, completion summaries all
-- land here).

create table if not exists feedback_comments (
  id uuid primary key default gen_random_uuid(),
  feedback_id uuid not null references feedback(id) on delete cascade,
  author text not null,               -- 'John' | 'Tom' | 'Agent — <lane>' | 'PM'
  body text not null,
  kind text not null default 'comment', -- comment | status_change | build_plan | completion_summary
  created_at timestamptz not null default now()
);
create index if not exists feedback_comments_fid_idx on feedback_comments (feedback_id, created_at);

alter table feedback_comments enable row level security;
create policy "authenticated_full_access" on feedback_comments
  for all to authenticated using (true) with check (true);

-- "agent reply pending" flag lives on feedback: true when the latest comment is
-- from a human and no agent has answered since. Maintained by the API, but a
-- default column keeps the shape stable.
alter table feedback add column if not exists reply_pending boolean not null default false;
