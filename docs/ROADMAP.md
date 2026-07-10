# Roadmap & Current Status

> **This is the living plan. Every Claude session: read this first, update it last.**

## Current status (2026-07-09)

**Phase 0 DONE. Infrastructure live.** All accounts created (GitHub, Supabase,
Vercel). Repo pushed to github.com/JohnHodson33/Pronghorn. Supabase project
`hjkqdcufigiolwmsxpiu` live with all 3 migrations applied and verified via
`scraper/check_db.js`: 12 tables, Green Industry Default screen profile, 37-source
roster, identity-resolution columns. Scraper connects to Supabase (`core/db.js`).

**PHASE 1 COMPLETE (overnight 07-09→10). See docs/OVERNIGHT-NOTES.md for the
full report + questions awaiting John's morning answers.**
- [x] `core/db_output.js` — Supabase upserts, events, screener writeback
- [x] Criteria load from screen_profiles (UI-editable, pipeline obeys)
- [x] DB first/last-seen replaces seen_store; listing_events live
- [x] BizBuySell: 2-page test verified → full 30-page pull (1,592 listings, 0 errors)
- [x] Frontend live: listings page (LIVE badge, tier sort, outbound links,
      thesis-fit toggle), dashboard stats, **Screen Criteria editor page**
- [x] BONUS — Adapter #2: BusinessBroker.net (independent inventory, targeted
      keyword pages, 61% relevance rate). BizQuest probed → deprioritized (mirror
      of BizBuySell). Reusable `scraper/probe.js` for future sources.

**Open security TODO:** rotate the Supabase secret key (was shared in chat) —
Supabase Settings → API → roll key, then update `scraper/.env` AND
`web/.env.local`.

**John's morning answers (2026-07-10) — now driving the build:**
1. Old weekly email run: keep in parallel as a check; retire when build trusted ✔ (both scheduled tasks active)
2. Delisting: mark delisted but KEEP data. NEW REQUIREMENT: market-multiples
   database by industry × EBITDA band from ALL listings (incl. delisted/unnamed)
   → **/analytics page built**; industry backfill classifier run. Note: partial
   crawls (30-page BizBuySell) can't prove delisting by absence — planned
   URL-checker job will verify stale listings directly (docs/DECISIONS.md)
3. Daily cadence approved → **"Pronghorn Supabase Daily" task, 6:00 AM** ✔
4. Tom = tberman@pronghornequity.com; auth built but access flipped on later
   today after more improvements — NEEDS: publishable key from John
5. HubSpot: TWO-WAY net-new sync until sunset → docs/HUBSPOT-SYNC-DESIGN.md;
   NEEDS: HubSpot Private App token from John
6. BizQuest: build despite mirror, with dedup → adapter + mirror-dedup built,
   full run executed
7. Key rotation: John doing now
(9–12 from overnight notes still open: Notion token, Granola, promote-flow
broker fields, Tier 1 alerting)

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

## Phase 6 — River Guides / advisor sourcing (people channel)

Third sourcing channel (John considers it equal in importance to Phase 5's
company list-building). Source industry advisors/operators — "river guides" —
who diligence assets & unlock proprietary flow in exchange for equity + a board
seat. Same LinkedIn-scraping engine also sources sellers/owners for Phase 5.

- [ ] LinkedIn sourcing engine (Sales Navigator base; work within guardrails)
- [ ] Target profiles: recent exits in the vertical, ex-corp-dev at consolidators,
      retired owner-operators
- [ ] People schema: advisors/executives as contacts w/ background, exit history,
      relationship stage (identified → contacted → engaged → on a deal)
- [ ] Enrich (contact info) → outreach to recruit as advisors
- [ ] Reuse for seller/owner contact discovery (feeds Phase 5 outreach)

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
- **2026-07-09 (later still)** — Working mode set: Claude acts as proactive product
  partner, improves on secondhand specs. Built ahead of accounts: Supabase schema
  v1 + seed migrations (both prongs + CRM core + RLS), SETUP-CHECKLIST (John's
  exact signup list), LEADGEN-SOURCES (Jake's stack + Sun Belt license boards,
  green-industry associations, SOS registries, Serper-over-SerpApi swap). Next.js
  scaffold started in `web/`.
- **2026-07-09 (session end)** — First UI built (dashboard/listings/pipeline on
  mock data w/ real deals) + iterated on John's feedback (Closed stage, passed-as-
  status, per-stage $ totals, financial-statement cards, chart dashboard, listings
  reordered w/ margin + entry-multiple). INFRASTRUCTURE STOOD UP: all accounts,
  repo pushed, Supabase live w/ 3 migrations verified. Expanded source roster to
  37 (added state broker-association MLS portals). Designed cross-prong identity
  resolution (one company, many discoveries). Scraper now connects to Supabase.
- **2026-07-09→10 (overnight, autonomous)** — PHASE 1 SHIPPED: full Supabase port
  (db_output + run_supabase), DB-driven criteria, live frontend + criteria editor,
  BizBuySell full pull (1,592), BizQuest killed via probe (BizBuySell mirror),
  BusinessBroker.net adapter built + full pull (672, 61% relevance), BBF recon.
  **DB: 2,264 listings, 37 Tier 1, 113 Tier 2, ~$0.48 API.** 8 questions await
  John in OVERNIGHT-NOTES.md.
