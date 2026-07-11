-- 0004: HubSpot contact-directory sync support (see docs/HUBSPOT-SYNC-DESIGN.md)
-- Adds idempotency breadcrumbs + directory fields the full 130-contact import needs.
-- Importer (scraper/import_hubspot_contacts.js) detects these columns and falls
-- back to notes-embedded breadcrumbs until this is applied.

alter table contacts add column if not exists hubspot_id text;
alter table contacts add column if not exists firm text;      -- employer/brokerage (not the target company)
alter table contacts add column if not exists title text;     -- job title
alter table contacts add column if not exists origin text;    -- hubspot | scrape | manual | outlook

alter table deals add column if not exists hubspot_id text;

-- one CRM row per HubSpot record (nulls exempt)
create unique index if not exists contacts_hubspot_id_key on contacts (hubspot_id) where hubspot_id is not null;
create unique index if not exists deals_hubspot_id_key on deals (hubspot_id) where hubspot_id is not null;
-- email dedupe lookups
create index if not exists contacts_email_idx on contacts (lower(email));
