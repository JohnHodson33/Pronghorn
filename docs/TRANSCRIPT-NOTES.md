# Lessons from friend's build (call 2026-07-09)

Friend built the same platform for his search fund during HBS. His stack and ours
are identical: Claude Code + Supabase (DB + auth) + Vercel (hosting) + Claude
Console API. Validated takeaways:

## His three tools (maps to our phases)

1. **Custom CRM** (our Phase 4) — replaced HubSpot/Pipedrive after a week of demos:
   too heavyweight, too much manual data entry, multi-contact-per-company schema
   wrong for deal work (they need just broker + seller), hard to show revenue/EBITDA
   as pipeline-card fields. His CRM: pipeline cards showing EBITDA, tasks,
   activities, custom stages. CIM review tool built in — scorecard uploaded once,
   materials attach to the company record. Doesn't do live email tracking (known gap).
   Still splits work with Notion (call notes live there) — expect the same hybrid.
2. **Broker scraper** (our Phases 1–3) — ~50 site adapters, added opportunistically
   ("I think I can scrape that one → add to list"). Front end is "a nice spreadsheet":
   intern reviews weekly, marks status per listing, dashboard shows listings/week and
   which brokers are producing. One-click push of a listing into the CRM.
3. **Enrichment & lead-gen platform** (our Phase 5) — proprietary outreach, off-market:
   - **List building:** input industry/service + lead count (10–150) + geography
     (city with ~70-mile radius, or national) → list in ~1 min. Per-run cost
     estimate shown up front (~$0.03–0.05 per 10-lead build; his whole month: $1).
     Assumption: any real company has a Google presence — skip ZoomInfo/Apollo/Grata.
   - **Contact enrichment:** one manual step — an Upwork VA fills phone, email,
     LinkedIn per lead (cheaper than data vendors).
   - **AI enrichment:** Claude API pulls website overview, PE backing, news articles
     per company. ~$0.20 per 200-lead run.
   - **Outreach library:** email sequences with custom variables + AI-personalized
     lines generated per contact from the enriched row data; one-click export to
     **reply.io** for sending. "Set it and forget it."
   - **Cold-call screen:** mirrors reply.io manual-call tasks via API; shows company
     info + call script on one screen — smile and dial. (Also experimenting with
     **Nooks** parallel dialer.)

## List-building source stack (from screenshot of his tool, 2026-07-09)

His "google-scrape" page runs 10 toggleable sources per list build, each with a
one-line description of when it fires. Replicate this design:

| Source | Type | Role |
|---|---|---|
| Google Local (SerpApi) | paid | Local-pack results — best per-call signal: rating + phone + address |
| Google Maps (SerpApi) | paid | Maps engine — additional places not in the local pack |
| Google Web (SerpApi) | paid | Organic results — broad fan-out for company sites that don't show in Maps |
| Google Places (official API) | rescue | Structured source (replaces Yelp); grid-ties metro for website/phone/rating; fires when core sources fall short of target; runs on Google's free monthly credit, call-capped per run |
| Parallel (AI company search) | paid | Entity search — describe companies in plain language; strongest in thin markets; ~$0.005/search |
| Exa | rescue | Paid Exa.ai search — only fires when other sources come up short |
| OpenStreetMap (Overpass API) | free | Long-tail; best for trades with strong OSM coverage |
| Better Business Bureau | free | BBB category listings — adds A+/A/B grades + accreditation flag |
| State license boards | free | Western US contractor license registries (CA, TX, AZ, OR, WA, CO, NM, UT); fires when state + trade match |
| Industry associations | free | AFA (fencing), ACCA (HVAC), PHTA (pool & spa); fires when trade matches |

Design notes: sources show per-source API-key status badges; "rescue" sources are
fallbacks that only fire when primary sources miss the lead target; the page pulls
official company websites from Google, parses light homepage signals, exports a CSV
for the researcher/VA to enrich — owner contact fields stay blank by design.
Month-to-date spend widget in the header ("$1.00 — 576 Serper · 31 Claude · 0 Exa ·
7 jobs"). Recent scrapes list below with status + leads/target + timestamp + export.

## His app's information architecture (sidebar)

- **Lead Generation:** List Building
- **Lead Enrichment:** Dashboard · Enrichment · Outreach Library · Folders · Copy Analytics
- **Cold Calling:** Dashboard · Call Lists · Scripts
- Global search bar across contacts, companies, campaigns, imports
- Auth: personal account per user (partner permissioned), Settings, hosted on
  a custom domain via Vercel

## Cost reality

- Vercel Pro $20/mo (needed to share with partner). Supabase free. GitHub free.
- Claude Console API usage: pennies (Haiku enrichment/screening is ~$0.05–0.20
  per few hundred items). Exa/Parallel similar.
- **Total platform run cost ≈ $40–50/mo** — less than the Claude Max subscription.

## Process lessons

- Everything is iterative back-and-forth with Claude over months. Screenshot-driven
  UI fixes work great ("this card shows list price, show EBITDA instead").
- Design the workflow steps in your head first; build the UI on top of them.
- Getting cards/UI to "look really good and move nice" is the slow, painful part.
- Supabase auth is how the partner gets permissioned access.
- Next frontier for him: a "brain" tab — one search-bar prompt inside the app that
  can do anything (pull emails from Outlook into the CRM, file CIMs, update cards).
  Today he uses Claude/CoWork as that interface.
- Don't pay AI consultants — build it.

## John's added requirements (from same conversation)

- Investment guardrails (size, geography, industry) must be **UI-toggleable
  filters**, not hard-coded — the scraper front end is a configurable search engine.
- Flow: scrape → catalog permanently into CRM → enrich contacts → plan/execute
  outreach (cold email + cold-call prep for owners and brokers).
- Prior BizBuySell scraper (copied into `scraper/`) is the starting point; its
  config.json investment criteria carry over as the default filter set.
