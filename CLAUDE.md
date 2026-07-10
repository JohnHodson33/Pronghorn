# Pronghorn Platform

Deal-sourcing and CRM platform for Pronghorn Equity Partners (John Hodson, Tom Berman).
Thesis: green / home-services roll-up — residential & commercial landscape maintenance,
tree care, pest control. Hub-and-spoke: $1–5M EBITDA anchors + sub-threshold tuck-ins.

## What this project is

1. **Broker scraper** — pulls business-for-sale listings from ~50 public broker/listing
   sites on a schedule into a master database, deduped and normalized.
2. **Web frontend** — dashboard hosted on Vercel where John and Tom review, filter,
   and act on listings. Grows into the full CRM UI.
3. **Custom CRM** — long-term this REPLACES HubSpot (HubSpot stays live in the
   meantime; qualified deals may sync there during transition).
4. **Sourcing/outreach/vetting tools** — cold-call prep, outreach drafting, deal
   scoring against thesis, built on the Claude API.

## Stack

- **Supabase** (Postgres + auth + API) — single source of truth for all data
- **Vercel + Next.js** — frontend hosting
- **GitHub Actions** — scheduled scraper runs
- **Claude API** — in-app intelligence (scoring, dedup, enrichment, drafting)

## Repo layout

- `docs/ROADMAP.md` — living plan and current status. **Read this first every session.
  Update it before ending any session.**
- `docs/ARCHITECTURE.md` — system design and schema decisions
- `docs/SOURCES.md` — target scrape sites and their status/quirks
- `docs/DECISIONS.md` — decision log (why we chose what we chose)
- `docs/WORKING-WITH-CLAUDE.md` — session workflow guide for John
- `scraper/` — scraper code (Phase 1)
- `web/` — Next.js frontend (Phase 2)
- `supabase/` — schema migrations

## Conventions

- John is new to this level of technical work: explain what things are and why,
  in plain language, when introducing new tools or concepts.
- Never log anonymized teasers (Axial blind teasers, blind BizBuySell listings) as
  deals — firm data-quality rule. A deal record requires a real company name.
- Axial cannot be scraped (no API, SPA blocks automation) — it flows in via teaser
  emails only.
- Secrets (API keys, DB passwords) go in `.env` files, never committed. `.env.example`
  documents what's needed.
- Update `docs/ROADMAP.md` status section at the end of every working session.
