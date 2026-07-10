# Setup Checklist — who does what

## JOHN — only you can do these (account creation / payment)

### Now (unblocks Phases 1–3) — all free, ~15 minutes

1. **GitHub** — github.com → Sign up (use johndouglashodson@gmail.com).
   Tell Claude your username afterward. Free.
2. **Supabase** — supabase.com → "Sign in with GitHub". Stop there — Claude
   drives project creation with you (there's a database password to generate
   and save). Free tier.
3. **Vercel** — vercel.com → "Sign in with GitHub". Free Hobby tier to start.
   *Note: Hobby is for non-commercial use and single-user; when Tom needs a
   login and this is running the business, upgrade to Pro ($20/mo) — Jake pays
   this. Budget for it; start free.*

### Later (Phase 5 — lead-gen/outreach), when Claude flags them

- **Serper.dev or SerpApi** (Google search results API) — Serper is the cheap
  one (~$0.30–1.00 per 1,000 searches, pay as you go; Jake's counter says
  "Serper"). Expect ~$5–20/mo at our volume.
- **Google Cloud** (Places API) — free $200/mo credit covers "rescue" usage.
- **Parallel.ai** and **Exa.ai** — AI company search, pay-as-you-go pennies.
- **Yelp Fusion API** — free tier (500 calls/day).
- **reply.io** (or similar sequencer) — ~$60–90/mo when outreach starts.
- **Upwork** — VA for phone/email/LinkedIn enrichment (per-task cost).

### Already done ✓

- Anthropic Console + API key (exists from BizBuySell scraper).

## CLAUDE — in progress without waiting on accounts

- [x] Supabase schema v1 written as SQL migration (`supabase/migrations/`) —
      applies the moment the project exists
- [ ] Next.js frontend scaffold with mock data — preview locally before Vercel
- [ ] Scraper port: swap CSV/email output for Supabase upserts (code ready,
      connects when project exists)
- [x] Lead-gen source research beyond Jake's stack (`docs/LEADGEN-SOURCES.md`)
- [ ] After GitHub account: install GitHub CLI, push repo, add Tom as collaborator
- [ ] After Supabase account: create project together, apply schema, load
      current criteria as the default screen profile
- [ ] After Vercel account: connect repo, first deploy
