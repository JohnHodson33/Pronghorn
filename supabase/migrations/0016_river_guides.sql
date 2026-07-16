-- 0016: RIVER GUIDES — the third sourcing channel (John 7/16: exited operators
-- recruited as deal advisors/board members for EQUITY, not fees; sequenced
-- ahead of company outreach). Spec: river-guides/River-Guide-Archetype-
-- Profiles.md §4; seed: river-guides-seed-all.csv (433 rows).
--
-- Design (per John): NOT a parallel scraping section — this table is the
-- channel's workstream state (lifecycle, scoring, provenance); people with
-- RESOLVED names ALSO become CRM contacts (role 'river_guide') tagged to the
-- company they used to run, so the whole CRM (filters, enrichment selection,
-- outreach) works on them like anyone else.

create table if not exists river_guides (
  deal_id text primary key,                 -- minted by research (RG-<group>-<seq>)
  full_name text,                           -- null while name_status = TBD
  name_status text not null default 'TBD',  -- RESOLVED | TBD
  archetype text not null default 'A_EXITED_OPERATOR',
    -- A_EXITED_OPERATOR | B_EX_CONSOLIDATOR_DEALMAKER | C_OPERATING_BROKER | EXCLUDED
  archetype_subtype text,                   -- FULLY_EXITED | ROLLED_EQUITY_EMPLOYED | SECOND_TIME_SELLER | CORP_DEV | INTEGRATION
  industry text not null,                   -- LANDSCAPE | LAWN_CARE | TREE_CARE | POOL_SERVICES | FENCING | COMMERCIAL_KITCHEN_SERVICE | PEST | OTHER
  vertical text,                            -- raw research vertical (Lawn/Tree/Both…)
  their_company text not null,              -- the business they sold/ran
  role text,                                -- Founder/CEO etc.
  acquirer text,
  acquirer_pe_sponsor text,
  acquirer_website text,
  deal_year integer,
  location_city text,
  location_state text,                      -- split fields — state drives geo/M&A-density analytics
  company_website text,                     -- the ANCHOR for enrichment (ties person to the business)
  company_website_status text,              -- LIVE | REDIRECTS | DEFUNCT | NOT_FOUND
  exit_status text not null default 'UNKNOWN', -- EXITED | EMPLOYED | UNKNOWN (⚠ point-in-time at deal close)
  current_status_verified boolean not null default false, -- fresh LinkedIn/public check done
  status_verified_at timestamptz,
  source_url text,                          -- provenance (mandatory on ingest rows)
  source_confidence text,                   -- HIGH | MEDIUM | LOW
  score_components jsonb,
  screen_score integer,
  fit_score integer,
  priority_band text,                       -- CALL_NOW | ENRICH_THEN_ASSESS | NURTURE | RESOLVE_NAME_FIRST
  enrichment_status text not null default 'NEEDS_NAME',
    -- NEEDS_NAME → PENDING_T1 → T1_DONE | NEEDS_PAID → ENRICHED → VERIFIED
  email text,
  phone text,
  linkedin_url text,
  contact_id uuid references contacts(id),  -- CRM contact once name is RESOLVED
  company_id uuid references companies(id), -- their former company in the CRM
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
-- PE-ownership becomes first-class on companies (PM architecture decision):
-- the 433 consolidator acquisitions are ground truth, and Lane C's
-- enrichment-detected flags graduate from lead jsonb to queryable columns.
alter table companies
  add column if not exists pe_owned boolean,
  add column if not exists pe_owner text;

create index if not exists river_guides_band_idx on river_guides (priority_band);
create index if not exists river_guides_status_idx on river_guides (enrichment_status);
create index if not exists river_guides_state_idx on river_guides (location_state);
alter table river_guides enable row level security;
create policy "authenticated_full_access" on river_guides
  for all to authenticated using (true) with check (true);
