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
   - **List building:** scrape Google via **Exa** and **Parallel** APIs (~$0.005/page)
     instead of paying ZoomInfo/Apollo/Grata. Assumption: any real company has a
     Google presence. Input industry + geography + lead count → list in ~1 min.
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
