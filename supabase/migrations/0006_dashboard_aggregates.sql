-- 0006: Dashboard V3 data layer (docs/DASHBOARD-VISION.md) + outreach outbox
-- Views mirror the /api/dashboard route's computed shapes; once applied, the
-- route can switch to selecting from these directly.

-- Outbox: pre-drafted outreach queued for John's ONE-CLICK send. Nothing in
-- this table is ever sent automatically — sending is an explicit human click
-- (LISTING-PURSUIT-FLOW guardrail).
create table if not exists outbox_emails (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid references listings(id),
  company_id uuid references companies(id),
  lead_id uuid references leads(id),
  to_email text not null,
  to_name text,
  subject text not null,
  body text not null,                      -- Claude-drafted, editable in UI
  status text not null default 'queued',   -- queued | sent | cancelled
  created_at timestamptz not null default now(),
  sent_at timestamptz,
  sent_by text                             -- who clicked send
);
alter table outbox_emails enable row level security;
create policy "authenticated_full_access" on outbox_emails
  for all to authenticated using (true) with check (true);

-- Funnel: both prongs, stage × subsector. Broker prong = screened listings +
-- pursuit states + brokered deals; proprietary prong = leads by status + deals
-- originating from leads.
create or replace view dashboard_funnel as
-- broker prong: screened thesis-fit listings not yet pursued
select 'broker'::text as prong, coalesce(l.industry, 'Other') as subsector,
       'screened_tier_' || l.tier as stage, count(*)::int as n
from listings l
left join listing_reviews r on r.listing_id = l.id
where l.tier in (1, 2) and r.listing_id is null
group by l.industry, l.tier
union all
-- broker prong: active pursuits
select 'broker', coalesce(l.industry, 'Other'), r.status, count(*)::int
from listing_reviews r join listings l on l.id = r.listing_id
where r.status not in ('promoted', 'passed', 'pushed_to_crm')
group by l.industry, r.status
union all
-- CRM deals (both prongs; prong from company origin)
select case when c.origin in ('lead', 'referral') then 'proprietary' else 'broker' end,
       coalesce(c.industry, 'Other'), 'deal_' || d.stage, count(*)::int
from deals d join companies c on c.id = d.company_id
group by 1, c.industry, d.stage
union all
-- proprietary prong: leads by status
select 'proprietary', coalesce(ll.query_industry, 'Other'), 'lead_' || ld.status, count(*)::int
from leads ld left join lead_lists ll on ll.id = ld.lead_list_id
group by ll.query_industry, ld.status;

-- Key actions: the human-attention queue
create or replace view dashboard_key_actions as
select 'nda_countersign_pending' as kind, l.name as title, l.source_id as detail,
       r.listing_id as ref_id, r.reviewed_at as at
from listing_reviews r join listings l on l.id = r.listing_id
where r.status = 'info_requested' and r.notes ilike '%countersign pending%'
union all
select 'ready_to_promote', l.name, l.source_id, r.listing_id, r.cim_received_at
from listing_reviews r join listings l on l.id = r.listing_id
where r.status = 'cim_received'
union all
select 'queued_email', o.subject, o.to_email, o.id, o.created_at
from outbox_emails o where o.status = 'queued'
union all
select 'stale_pursuit', l.name, r.status, r.listing_id, r.reviewed_at
from listing_reviews r join listings l on l.id = r.listing_id
where r.status in ('info_requested', 'nda_signed')
  and r.reviewed_at < now() - interval '7 days'
union all
select 'next_step_due', d.name, d.next_step, d.id, d.next_step_due::timestamptz
from deals d
where d.next_step_due is not null and d.next_step_due <= current_date + 1
  and d.stage not in ('Closed');

-- Enrichment coverage per subsector: outreach-ready = owner name + a channel
create or replace view dashboard_enrichment_coverage as
select coalesce(ll.query_industry, 'Other') as subsector,
       count(*)::int as total,
       count(*) filter (where ld.status = 'enriched')::int as enriched,
       count(*) filter (where ld.owner_name is not null
                          and (ld.owner_email is not null or ld.owner_phone is not null))::int as outreach_ready
from leads ld left join lead_lists ll on ll.id = ld.lead_list_id
group by ll.query_industry;
