# Roadmap & Current Status

> **This is the living plan. Every Claude session: read this first, update it last.**

## Current status (2026-07-09)

**Phase 0 nearly done.** Repo + docs created; friend's call transcript reviewed
(see TRANSCRIPT-NOTES.md); existing BizBuySell scraper found and copied into
`scraper/` — Phase 1 is a **port to Supabase**, not a rebuild. Anthropic Console
account already exists (key in old scraper's .env).

Waiting on:
- [ ] John: GitHub, Supabase, Vercel accounts (see checklist below)

## Phase 0 — Foundations

- [x] Project folder + repo (`C:\Users\johnd\Pronghorn`)
- [x] CLAUDE.md, roadmap, architecture, sources docs
- [x] Review friend's call transcript → docs/TRANSCRIPT-NOTES.md
- [x] Anthropic Console account + API key (already existed for old scraper)
- [x] Locate prior BizBuySell scraper work; copy into repo (`scraper/`)
- [ ] GitHub account + private repo pushed (John + Tom as collaborators)
- [ ] Supabase account + project created (free tier to start)
- [ ] Vercel account (free Hobby tier to start; Pro ~$20/mo when Tom needs access)

## Phase 1 — Scraper port + Supabase (prove the pipeline)

- [ ] Supabase schema v1: sources, listings, listing_events, brokers,
      listing_reviews, screen_profiles (see ARCHITECTURE.md)
- [ ] Port `scraper/` output from CSV/JSON+email → Supabase upserts
- [ ] Move config.json investment criteria → `screen_profiles` table (default
      profile = current green-industry criteria) so UI can toggle them later
- [ ] Replace seen_store with DB first_seen/last_seen; wire listing_events
- [ ] Verify BizBuySell adapter still works end-to-end into Supabase
- [ ] Add 3–4 more site adapters (pick from SOURCES.md Tier 2)
- [ ] Keep Claude screener (tiering) in the pipeline; store tier + reasoning per listing
- [ ] Cut over the weekly scheduled run; retire old OneDrive copy + Outlook email delivery

## Phase 2 — Frontend v1

- [ ] Next.js app on Vercel, Supabase auth (John + Tom logins)
- [ ] Listings dashboard: filter by industry / geography / revenue / EBITDA / source
- [ ] Listing detail view with status (new / reviewed / pursuing / passed) + notes
- [ ] "New since last visit" view

## Phase 3 — Scale & automate

- [ ] GitHub Actions scheduled runs (daily)
- [ ] Scale toward 50 sources
- [ ] Change detection: new / price-changed / delisted
- [ ] Claude API: auto-score listings against green-industry thesis
- [ ] Alerting (email/notification when high-fit listing appears)

## Phase 4 — CRM (HubSpot replacement, long-term)

- [ ] Schema: companies, contacts (brokers/owners), deals, activities, documents
- [ ] Deal pipeline UI (mirror current HubSpot Deal Sourcing stages, tailored)
- [ ] Migrate HubSpot history (14 nail-salon Closed-Lost + live green deals)
- [ ] Deal vetting: CIM review tool (scorecard-based, attaches to company record)
- [ ] Retire HubSpot

## Phase 5 — Enrichment, lead-gen & outreach (friend's tool 3 as blueprint)

- [ ] Off-market list building: multi-source engine per TRANSCRIPT-NOTES source
      stack — SerpApi (Google Local/Maps/Web), Google Places official (rescue),
      Parallel, Exa (rescue), OSM, BBB, state license boards, industry
      associations. Toggleable sources, per-run cost estimate, month-to-date
      spend widget, recent-scrapes history with CSV export
- [ ] Contact enrichment: Upwork VA step (phone/email/LinkedIn) or vendor
- [ ] Claude API enrichment per company: website overview, PE backing, news
- [ ] Outreach library: email sequences, custom variables, AI-personalized
      lines per contact; export to reply.io (or similar) for sending
- [ ] Cold-call screen: call list + company info + script on one screen;
      evaluate Nooks parallel dialer
- [ ] "Brain" search bar (long-term): one prompt box in the app that can pull
      Outlook emails, file CIMs, update records

## Session log

- **2026-07-09** — Project kickoff. Architecture chosen (Supabase + Vercel +
  GitHub Actions + Claude API). Decided: custom CRM long-term replaces HubSpot;
  build scraper first. Repo + docs created.
- **2026-07-09 (later)** — Friend's call transcript reviewed → TRANSCRIPT-NOTES.md;
  Phase 5 scoped from his enrichment/outreach tool. Found prior BizBuySell scraper
  (OneDrive), copied to `scraper/`. Phase 1 reframed as port-to-Supabase. Key
  requirement logged: filter guardrails must be UI-toggleable screen profiles.
