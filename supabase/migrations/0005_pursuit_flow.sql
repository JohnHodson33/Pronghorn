-- 0005: Listing pursuit flow (docs/LISTING-PURSUIT-FLOW.md, John 2026-07-11)
-- listing_reviews.status is already free text; canonical pursuit values are:
--   new → interested → info_requested → nda_signed → cim_received → promoted → passed
-- (legacy values reviewed/pursuing/pushed_to_crm remain readable; UI maps them)

alter table listing_reviews add column if not exists requested_at timestamptz;    -- info_requested
alter table listing_reviews add column if not exists nda_signed_at timestamptz;
alter table listing_reviews add column if not exists cim_received_at timestamptz;
alter table listing_reviews add column if not exists doc_url text;               -- CIM / data-room link

-- John's reusable inquiry block for "Request info" pre-drafts (Lane B consumes)
create table if not exists inquiry_profiles (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text,
  phone text,
  default_note text,                       -- std intro blurb, merge-fielded
  created_at timestamptz not null default now()
);
alter table inquiry_profiles enable row level security;
create policy "authenticated_full_access" on inquiry_profiles
  for all to authenticated using (true) with check (true);

-- "Ready to promote" queue: CIM in hand, not yet a company/deal
create or replace view ready_to_promote as
select l.id as listing_id, l.name, l.source_id, l.industry, l.city, l.state,
       l.asking_price, l.cash_flow, l.cash_flow_type, l.url,
       r.status, r.nda_signed_at, r.cim_received_at, r.doc_url, r.notes
from listing_reviews r
join listings l on l.id = r.listing_id
where r.status = 'cim_received';
