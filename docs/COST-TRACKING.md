# Cost tracking — John's 7/12 directive

John wants platform spend visible at all times: a month-to-date dollar figure
pinned on every page, expandable into subscriptions vs variable usage, so we
always know we're cost-effective vs simply buying enriched data.

## Design
- **Badge (PM, in Sidebar — visible on every tab):** "This month: $X.XX".
  Click → breakdown panel:
  - **Subscriptions** (flat, same every month): list + monthly total.
    Currently $0/mo (Kumo declined; Supabase/Vercel on free tiers; Claude/
    Exa/Serper/Hunter are usage-based).
  - **Variable usage** (the number that matters): month-to-date by service
    (Claude, Exa, Serper, Hunter, Places) and by activity (enrichment,
    list-building, drafting, classification).
  - **Unit economics:** cost per owner-contact acquired this month — the
    direct comparison against buying data (ZoomInfo-style ~$1+/contact).
- **PM recommendation on John's question (headline variable-only vs total):**
  headline the TOTAL (it's what he asked to see and what hits the card), but
  the breakdown leads with VARIABLE — that's the behavioral signal, since
  subscriptions don't change with usage. While subs = $0 they're identical
  anyway. Revisit if subs grow.

## Implementation
- **Lane C:** (a) `usage_events` table (at, service, activity, units,
  cost_usd, meta) + migration 0007; (b) instrument every paid call site —
  scraper enrich/leadgen/draft_inquiry, web outbox drafting route — to insert
  an event with computed cost (we already compute per-run cost in logs);
  (c) `subscriptions` table (name, monthly_usd, active) — seed empty;
  (d) **GET /api/costs** → { monthTotal, subsMonthly, variableTotal,
  byService[], byActivity[], ownerContactsAcquired, costPerContact };
  (e) best-effort July backfill from enrichment jsonb + known run logs.
- **PM:** CostBadge in Sidebar (fetches /api/costs, hidden until the endpoint
  exists, expandable breakdown). SHIPPED as a stub that lights up when the
  API lands.
