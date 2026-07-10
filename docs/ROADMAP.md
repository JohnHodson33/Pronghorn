# Roadmap & Current Status

> **This is the living plan. Every Claude session: read this first, update it last.**

## Current status (2026-07-09)

**Phase 0 in progress.** Repo and docs created. Next: account setup (GitHub,
Supabase, Vercel, Anthropic Console), then push repo to GitHub.

Waiting on:
- [ ] John to create accounts (see checklist below)
- [ ] Call transcript from John's friend (Vercel/Supabase setup lessons) — to be
      uploaded and folded into this plan

## Phase 0 — Foundations

- [x] Project folder + repo (`C:\Users\johnd\Pronghorn`)
- [x] CLAUDE.md, roadmap, architecture, sources docs
- [ ] GitHub account + private repo pushed (John + Tom as collaborators)
- [ ] Supabase account + project created (free tier to start)
- [ ] Vercel account (free Hobby tier to start; Pro ~$20/mo when Tom needs access)
- [ ] Anthropic Console account + API key (for in-app AI features, Phase 3+)
- [ ] Review friend's call transcript for lessons learned

## Phase 1 — Scraper MVP (prove the pipeline)

- [ ] Pick first 5 sources from docs/SOURCES.md
- [ ] Supabase schema v1: sources, listings, brokers, listing_events (see ARCHITECTURE.md)
- [ ] Scraper framework: fetch → parse → normalize → dedupe → upsert
- [ ] First 5 site adapters working
- [ ] Manual run produces clean data in Supabase
- [ ] Basic dedupe (same business listed on multiple sites)

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
- [ ] Outreach tools: email drafting, cold-call prep sheets
- [ ] Deal vetting: CIM analysis, thesis-fit scoring
- [ ] Retire HubSpot

## Session log

- **2026-07-09** — Project kickoff. Architecture chosen (Supabase + Vercel +
  GitHub Actions + Claude API). Decided: custom CRM long-term replaces HubSpot;
  build scraper first. Repo + docs created.
