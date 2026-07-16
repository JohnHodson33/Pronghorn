-- 0016: River Guides — third sourcing channel (John 7/16).
-- Exited operators recruited as equity advisors/board members. Spec:
-- River-Guide-Archetype-Profiles.md §4 (local research folder) +
-- docs/RIVER-GUIDES-INTEGRATION.md. Seed = 433-row CSV, ingested by
-- scraper/ingest_river_guides.js (data itself never enters the repo).

create table if not exists river_guides (
  deal_id text primary key,                       -- RG-<industry>-<seq>, minted by research
  full_name text,                                 -- null while name_status='TBD'
  name_status text not null default 'TBD'
    check (name_status in ('RESOLVED','TBD')),
  archetype text not null default 'A_EXITED_OPERATOR'
    check (archetype in ('A_EXITED_OPERATOR','B_EX_CONSOLIDATOR_DEALMAKER','C_OPERATING_BROKER','EXCLUDED')),
  archetype_subtype text
    check (archetype_subtype is null or archetype_subtype in
      ('FULLY_EXITED','ROLLED_EQUITY_EMPLOYED','SECOND_TIME_SELLER','CORP_DEV','INTEGRATION')),
  industry text not null,                         -- spec enum: LANDSCAPE|LAWN_CARE|TREE_CARE|POOL_SERVICES|FENCING|COMMERCIAL_KITCHEN_SERVICE|PEST|OTHER
  industry_group text,                            -- research grouping (e.g. GREEN)
  vertical_raw text,                              -- research vertical as-written (Lawn/Tree/Both…)
  their_company text not null,                    -- the business they sold/ran
  role text,
  acquirer text,
  acquirer_pe_sponsor text,
  acquirer_website text,
  deal_year int,
  location_city text,
  location_state text,
  company_website text,                           -- anchor for enrichment routing
  company_website_status text
    check (company_website_status is null or company_website_status in ('LIVE','REDIRECTS','DEFUNCT','NOT_FOUND')),
  exit_status text not null default 'UNKNOWN'
    check (exit_status in ('EXITED','EMPLOYED','UNKNOWN')),  -- ⚠ at-close, not current
  current_status_verified boolean not null default false,     -- fresh LinkedIn/public check done
  source text,                                    -- provenance (publication/page)
  source_url text,
  source_confidence text
    check (source_confidence is null or source_confidence in ('HIGH','MEDIUM','LOW')),
  score_components jsonb,
  screen_score int,
  fit_score int,
  priority_band text
    check (priority_band is null or priority_band in ('CALL_NOW','ENRICH_THEN_ASSESS','NURTURE','RESOLVE_NAME_FIRST')),
  enrichment_status text not null default 'NEEDS_NAME'
    check (enrichment_status in ('NEEDS_NAME','PENDING_T1','T1_DONE','NEEDS_PAID','ENRICHED','VERIFIED')),
  contact jsonb,                                  -- {email, phone, linkedin_url} — enrichment only, never guesses
  notes text,
  contact_id uuid references contacts(id) on delete set null,   -- CRM link once promoted
  company_id uuid references companies(id) on delete set null,  -- their former company in CRM
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists river_guides_band_idx on river_guides (priority_band);
create index if not exists river_guides_industry_idx on river_guides (industry);
create index if not exists river_guides_enrich_idx on river_guides (enrichment_status);
create index if not exists river_guides_state_idx on river_guides (location_state);
-- dedupe key = (person, company) per spec §6.4 — only enforceable once named
create unique index if not exists river_guides_person_company_uq
  on river_guides (lower(full_name), lower(their_company)) where full_name is not null;
