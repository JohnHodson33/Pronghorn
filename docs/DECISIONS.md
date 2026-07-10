# Decision Log

| Date | Decision | Why |
|---|---|---|
| 2026-07-09 | Stack: Supabase + Vercel/Next.js + GitHub Actions + Claude API | Proven combo (friend's working setup); zero-ops; free tiers to start; shared access for Tom |
| 2026-07-09 | Custom CRM will long-term REPLACE HubSpot; HubSpot runs in the meantime | John wants a system tailored to search-fund/roll-up deal work; HubSpot generic-CRM fit is poor (stage mislabels, auto-created duplicate contacts) |
| 2026-07-09 | Build scraper first, CRM later; schema designed for both from day one | Scraper delivers standalone value fast; listings are the top of the deal funnel |
| 2026-07-09 | Phase 1 = 5 sites, not 50 | Prove fetch→parse→dedupe→display end to end before scaling breadth |
| 2026-07-09 | Single repo at C:\Users\johnd\Pronghorn | One home for scraper + web + docs; sessions self-orient from CLAUDE.md + ROADMAP.md |
| 2026-07-09 | Reuse existing BizBuySell scraper as Phase 1 seed (copied to `scraper/`) | Orchestrator, adapter pattern, criteria-as-config, fuzzy dedup, Claude tier screener already built and running weekly |
| 2026-07-09 | Investment guardrails = editable screen profiles in DB, toggleable in UI | John's requirement: frontend is a configurable search engine, not hard-coded criteria |
| 2026-07-09 | Lead-gen via Exa + Parallel Google-scrape APIs, not ZoomInfo/Apollo/Grata | Friend's proven approach; ~$0.005/page vs heavy vendor subscriptions; assumption: every real company is on Google |
| 2026-07-09 | Outreach sending via reply.io-style sequencer fed by our enrichment; we generate personalized copy in-app | Friend's proven pattern: one-click export with AI-personalized lines beats hand-building campaigns |
