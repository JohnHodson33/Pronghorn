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

## Existing codebase — Phase 1 seed (`scraper/`)

Copied 2026-07-09 from `C:\Users\johnd\OneDrive\Documents\00. Pronghorn\Claude Code\
BizBuySell Scraper` (original left in place — its Windows Task Scheduler weekly run
still works until we cut over). Already built and working:

- `core/orchestrator.js` — multi-source runner, designed for N sources from day one
- `core/source_base.js` + `sources/bizbuysell.js` — adapter pattern (Puppeteer)
- `core/filters.js` + `config.json` — investment criteria as data: industry keyword
  include/exclude, state include/exclude/priority, size bounds ($300K SDE floor,
  $10M cap, unknown-cash-flow asking-price proxy)
- `core/seen_store.js` — new/seen tracking across runs
- `core/orchestrator.js` dedup — cross-source fuzzy matching (state+price+cash-flow
  key, name-token confirm, flags `duplicate_of`, never drops)
- `screener/claude_screener.js` — Haiku-powered tier classifier (Tier 1–4) with the
  full Pronghorn mandate baked into the system prompt; extracts revenue from
  descriptions; ~$0.001/listing
- `delivery/outlook.js` — emails results via Microsoft Graph

**Port plan (Phase 1):** keep orchestrator/adapter/screener architecture; replace
CSV/JSON + email output with Supabase upserts; replace seen_store with DB
first_seen/last_seen; move config.json `relevance` criteria into DB as editable
"screen profiles" so the frontend can toggle industry/geography/size filters live
(John's requirement: the UI is a configurable search engine — guardrails are
saved filter sets, not code).

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
