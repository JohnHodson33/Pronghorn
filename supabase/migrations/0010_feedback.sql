-- 0010: In-site feedback → agent pipeline (docs/IMPROVEMENTS-LOOP.md, John
-- 7/12). Feedback typed on the site becomes agent work without John relaying.

create table if not exists feedback (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  author text not null,              -- 'John' | 'Tom'
  type text not null default 'idea', -- bug | idea | change
  page text,                         -- which page it's about
  body text not null,
  status text not null default 'submitted', -- submitted → triaged → building → shipped → verified
  lane text,                         -- assigned lane once triaged (A|B|C|PM)
  task_ref text,                     -- TASK-QUEUE tag / commit
  shipped_ref text,                  -- what shipped (URL/commit)
  updated_at timestamptz not null default now()
);
create index if not exists feedback_status_idx on feedback (status);
create index if not exists feedback_created_idx on feedback (created_at desc);

alter table feedback enable row level security;
create policy "authenticated_full_access" on feedback
  for all to authenticated using (true) with check (true);

-- Vercel Pro planned sub (IMPROVEMENTS-LOOP cost honesty: 2-partner commercial
-- use on Hobby → add Pro as planned so the badge shows the honest floor).
insert into subscriptions (name, monthly_usd, active, planned)
  values ('Vercel Pro', 20, true, true)
on conflict (name) do nothing;
