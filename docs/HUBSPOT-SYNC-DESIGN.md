# HubSpot ↔ Platform two-way sync (approved 2026-07-10, Q5)

**John's directive:** net-new records in either system reflect in both. Goal is
to sunset HubSpot once the platform's output is trusted — until then, parity.

## Scope of sync

| Object | HubSpot | Platform | Match key |
|---|---|---|---|
| Deals | Deal Sourcing pipeline | `deals` (+`companies`) | company name (normalized) + hubspot_id breadcrumb |
| Companies | companies | `companies` | domain > name+state; store `hubspot_id` |
| Contacts (brokers/sellers) | contacts | `contacts`/`brokers` | email > name+firm |

## Direction rules

- **Platform → HubSpot:** new promoted deals/companies/contacts push to HubSpot
  (respecting the real-name rule — nothing anonymized goes either way).
- **HubSpot → Platform:** new HubSpot deals/companies/contacts (e.g. created by
  the existing 7am crm-deal-contact-sync agent from SharePoint/Outlook/Notion)
  import into `companies`/`deals`/`contacts` with `origin='hubspot'`.
- **Stage mapping:** HubSpot Deal Sourcing stages ↔ platform stages. CAUTION:
  known HubSpot quirk — stage labels are mislabeled vs internal IDs; use internal
  stage IDs, and Closed-Lost is custom stage id 3939497680.
- **Updates (v2):** start with net-new only (John's ask). Field-level two-way
  update sync comes later — conflict rules TBD (probably last-write-wins with an
  audit row in `activities`).
- **Known HubSpot data issues to defend against:** auto-created bare email-only
  duplicate contacts (e.g. Ron Edmonds dup) — dedupe on email before import.

## Mechanics

- Scheduled script (`scraper/sync_hubspot.js`, runs after the daily scrape or on
  its own cadence) using HubSpot's REST API.
- **BLOCKER — needs from John:** a HubSpot **Private App token** (HubSpot →
  Settings → Integrations → Private Apps → Create: scopes crm.objects.deals
  read/write, crm.objects.companies read/write, crm.objects.contacts read/write).
  Token goes in `scraper/.env` as `HUBSPOT_TOKEN` (local file, not chat).
- Idempotency: `hubspot_id` column on companies (exists) + add on deals/contacts
  (migration 0004); HubSpot side gets a `pronghorn_id` custom property.
