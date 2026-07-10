-- Pronghorn Platform — schema v1
-- Covers both sourcing prongs (on-market listings, off-market leads) and the
-- CRM core (companies/contacts/deals) so nothing needs a rework later.
-- Apply via Supabase SQL editor or `supabase db push`.

-- =============================================================================
-- SCREEN PROFILES — investment criteria as data, toggleable from the UI
-- (port of scraper config.json `relevance`; default row seeded in 0002)
-- =============================================================================
create table screen_profiles (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  is_default boolean not null default false,
  industry_keywords_include text[] not null default '{}',  -- empty = all pass
  industry_keywords_exclude text[] not null default '{}',
  include_states text[] not null default '{}',             -- empty = national
  exclude_states text[] not null default '{}',
  priority_states text[] not null default '{}',            -- flagged, never filtered
  min_asking_price numeric,
  max_asking_price numeric,
  min_cash_flow numeric,
  max_cash_flow numeric,
  unknown_cash_flow_min_asking_price numeric,               -- proxy when CF undisclosed
  keep_when_unknown boolean not null default true,
  max_multiple_flag numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- =============================================================================
-- ON-MARKET PRONG — broker scraper
-- =============================================================================
create table scrape_sources (
  id text primary key,                    -- 'bizbuysell'
  name text not null,
  url text,
  adapter text,                           -- scraper module name
  enabled boolean not null default true,
  tier text,                              -- aggregator | network | specialist
  last_run_at timestamptz,
  last_run_status text,
  notes text
);

create table brokers (
  id uuid primary key default gen_random_uuid(),
  brokerage text,
  name text,
  email text,
  phone text,
  website text,
  linkedin text,
  states text[] not null default '{}',
  specialties text,
  relationship_notes text,                -- existing relationship? warm/cold
  created_at timestamptz not null default now()
);

create table listings (
  id uuid primary key default gen_random_uuid(),
  source_id text references scrape_sources(id),
  external_id text,                       -- the site's own listing id
  url text,
  name text,
  description text,
  industry_raw text,
  industry text,                          -- normalized by screener
  city text,
  state text,
  asking_price numeric,
  gross_revenue numeric,
  cash_flow numeric,
  cash_flow_type text,                    -- SDE | EBITDA | unknown
  implied_multiple numeric,
  multiple_flag boolean not null default false,
  priority_state boolean not null default false,
  tier smallint,                          -- 1-4 from Claude screener
  tier_reasoning text,
  broker_id uuid references brokers(id),
  duplicate_of uuid references listings(id),
  fingerprint text,                       -- cross-source dedup key
  raw jsonb,                              -- full scraped payload
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  delisted_at timestamptz,
  unique (source_id, external_id)
);
create index listings_state_idx on listings (state);
create index listings_tier_idx on listings (tier);
create index listings_first_seen_idx on listings (first_seen_at desc);

create table listing_events (
  id bigint generated always as identity primary key,
  listing_id uuid not null references listings(id) on delete cascade,
  event_type text not null,               -- new | price_change | relisted | delisted
  detail jsonb,
  created_at timestamptz not null default now()
);

create table listing_reviews (
  listing_id uuid primary key references listings(id) on delete cascade,
  status text not null default 'new',     -- new | reviewed | pursuing | passed | pushed_to_crm
  notes text,
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz
);

-- =============================================================================
-- OFF-MARKET PRONG — proprietary list building
-- =============================================================================
create table lead_lists (
  id uuid primary key default gen_random_uuid(),
  query_industry text not null,           -- "Commercial Fencing"
  query_geography text,                   -- "Tucson, AZ" (null = national)
  radius_miles integer,
  target_count integer not null,
  sources_enabled text[] not null default '{}',
  status text not null default 'pending', -- pending | running | complete | failed
  leads_found integer not null default 0,
  cost_estimate numeric,
  cost_actual numeric,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create table leads (
  id uuid primary key default gen_random_uuid(),
  lead_list_id uuid references lead_lists(id),
  company_id uuid,                        -- fk added after companies exists
  name text not null,
  website text,
  phone text,
  address text,
  city text,
  state text,
  rating numeric,                         -- Google/Yelp rating
  review_count integer,
  source_tags text[] not null default '{}', -- which sources found it (quality analytics)
  bbb_grade text,
  license_ids text[] not null default '{}',
  enrichment jsonb,                       -- Claude-pulled: overview, PE flag, news, age
  owner_name text,                        -- SOS registry / VA
  owner_email text,
  owner_phone text,
  owner_linkedin text,
  status text not null default 'new',     -- new | enriching | enriched | in_sequence | contacted | responded | dead
  created_at timestamptz not null default now()
);
create index leads_state_idx on leads (state);
create index leads_status_idx on leads (status);

-- =============================================================================
-- CRM CORE — companies/contacts/deals (Phase 4, designed now to avoid rework)
-- Firm rule: a deal/company record requires a REAL company name (no blind teasers)
-- =============================================================================
create table companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  website text,
  industry text,
  city text,
  state text,
  revenue numeric,
  ebitda numeric,
  ebitda_type text,                       -- SDE | EBITDA | adj EBITDA
  origin text,                            -- listing | lead | referral | axial_email | manual
  listing_id uuid references listings(id),
  lead_id uuid references leads(id),
  hubspot_id text,                        -- migration breadcrumb
  axial_dedup_id text,                    -- teaser dedup key
  notes text,
  created_at timestamptz not null default now()
);

alter table leads
  add constraint leads_company_fk foreign key (company_id) references companies(id);

create table contacts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references companies(id),
  broker_id uuid references brokers(id),  -- set when this contact IS the broker
  role text,                              -- owner | seller | broker | advisor | other
  name text,
  email text,
  phone text,
  linkedin text,
  notes text,
  created_at timestamptz not null default now()
);

create table deals (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id),
  name text not null,
  stage text not null default 'sourced',  -- stages configurable in app settings
  asking_price numeric,
  our_valuation numeric,
  thesis text,                            -- which numbered thesis folder
  fit_score numeric,                      -- CIM scorecard output
  next_step text,
  next_step_due date,
  owner_user uuid references auth.users(id),
  closed_lost_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table activities (
  id bigint generated always as identity primary key,
  deal_id uuid references deals(id),
  company_id uuid references companies(id),
  contact_id uuid references contacts(id),
  kind text not null,                     -- note | call | email | meeting | task | doc
  body text,
  doc_url text,                           -- CIM in SharePoint etc.
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

-- =============================================================================
-- ROW LEVEL SECURITY — two-person firm: any authenticated user has full access.
-- (Anon key gets nothing; tighten per-role later if the team grows.)
-- =============================================================================
do $$
declare t text;
begin
  foreach t in array array[
    'screen_profiles','scrape_sources','brokers','listings','listing_events',
    'listing_reviews','lead_lists','leads','companies','contacts','deals','activities'
  ] loop
    execute format('alter table %I enable row level security', t);
    execute format(
      'create policy "authenticated_full_access" on %I for all to authenticated using (true) with check (true)', t
    );
  end loop;
end $$;
