-- 0013: outreach draft rules (John 7/13 ~11:15 — paused auto-drafting: "too
-- broad and the content isn't tailored enough. I don't trust to click send.")
-- Drafting is allowlist-only: a lead is drafted ONLY when an enabled rule
-- matches it. Zero rules = zero drafts — and the same holds pre-migration
-- (missing table reads as zero rules), so the drafter is inert until John
-- creates his first rule AND approves the 5-sample gate.

create table if not exists outreach_rules (
  id uuid primary key default gen_random_uuid(),
  name text not null,                         -- "Tree care · AZ+TX · contactable"
  enabled boolean not null default true,
  industries text[] not null default '{}',    -- canonical taxonomy labels; EMPTY = matches nothing (explicit by design)
  states text[] not null default '{}',        -- empty = any state
  min_completeness text not null default 'contactable',  -- contactable | full
  min_size_tier text,                         -- A|B|C once size-proxy tier math ships; null = any
  nightly_cap integer not null default 5,     -- max drafts this rule may generate per run
  created_by text not null default 'John',
  created_at timestamptz not null default now()
);
alter table outreach_rules enable row level security;
create policy "authenticated_full_access" on outreach_rules
  for all to authenticated using (true) with check (true);

-- why-drafted provenance on every draft: {rule_id, rule_name, facts_used[], sample}
alter table outbox_emails add column if not exists draft_meta jsonb;
