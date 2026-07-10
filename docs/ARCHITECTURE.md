# Architecture

## System overview

```
[~50 listing/broker sites]
        │  scheduled scrape (GitHub Actions, daily)
        ▼
[Scraper: fetch → parse → normalize → dedupe]
        │  upsert via Supabase API
        ▼
[Supabase Postgres]  ◄──── auth (John, Tom)
        │
        ▼
[Next.js frontend on Vercel]  ── Claude API (scoring, drafting, enrichment)
```

## Why this stack

- **Supabase**: hosted Postgres = real relational database (listings relate to
  brokers relate to deals), plus built-in auth and auto-generated REST API. Free
  tier is fine for a long time. Both partners share one source of truth.
- **Vercel**: zero-ops hosting for Next.js; deploys automatically from GitHub.
- **GitHub Actions**: free scheduled job runner — no server to maintain for scrapers.
- **Claude API**: called from the backend for listing scoring, dedup judgment,
  outreach drafting.

## Schema v1 (draft — finalize in Phase 1)

- **sources** — one row per scraped site (name, url, adapter name, last_run,
  status, quirks/notes)
- **listings** — one row per unique business-for-sale listing: title, description,
  industry (raw + normalized), location, revenue, cash_flow/SDE/EBITDA (as listed),
  asking_price, source_id, source_url, external_id (site's own listing id),
  broker_contact_id, first_seen, last_seen, delisted_at, raw JSONB (full scraped
  payload), fingerprint (dedup hash)
- **listing_events** — append-only change history (new, price change, delisted)
- **brokers** — brokerage + individual agent contact info scraped/enriched
- **listing_reviews** — John/Tom workflow state: status (new/reviewed/pursuing/
  passed), fit_score, notes, reviewed_by, reviewed_at

Design so CRM tables (companies, contacts, deals, activities) can join in
later without rework — listings become the top of the deal funnel.

## Dedup strategy

Same business often appears on 2–4 sites (broker's own site + BizBuySell +
BizQuest etc.). Fingerprint on normalized (location + revenue + asking price +
industry) buckets, then Claude API judgment call for near-matches. Never
auto-merge destructively — link records via a `duplicate_of` reference.

## Scraper design

- One thin **adapter per site** (parse this site's HTML → common Listing shape);
  shared core handles fetching, retries, rate-limiting, normalizing, upserting.
- Be a polite scraper: identify caching, throttle requests, respect robots.txt
  where feasible; scrape during off-hours.
- Site tiers (expect all three):
  1. **Static HTML** — simple fetch + parse (most broker sites)
  2. **JS-rendered / anti-bot** — headless browser (Playwright), maybe residential
     delays (BizBuySell likely here)
  3. **Unscrapeable** — Axial (email-ingest only), anything login-walled → co-pilot
     browser pulls or email parsing instead
