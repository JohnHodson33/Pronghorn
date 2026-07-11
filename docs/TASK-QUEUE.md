# Task Queue — parallel-session backlog

## 🎯 END-STATE GOAL (every session aligns to this)
A searchable, filterable, executable deal-sourcing + CRM system whose purpose is:
**scrape every broker + build proprietary lists → enrich to OWNER contact info
(name, email, phone, LinkedIn) → run automated cold-email + cold-call outreach →
capture notes, tag brokers/owners/deals, and manage the pipeline** — so Tom &
John reach owners directly and close off-market deals priced below what the
official broker pipelines yield.

## ⚙️ STANDING DIRECTIVE — SELF-ITERATE, NEVER STOP (John, 2026-07-11)
When your lane's list is empty, **you are NOT done.** Open the live site
(pronghorn-green.vercel.app) + your lane's code, critique it objectively against
the END-STATE GOAL, and **append new tasks to your lane below**, then do them.
Every list page should be searchable + filterable + exportable. Every record
should be clickable, editable, and linked to its related records. Run `/loop` so
you stay continuous. Only stop for the real guardrails (paid/login creds you
don't have, SENDING outreach, destructive actions). Bias hard to shipping.

Status: ⬜ open · 🔨 in-progress (tag your lane) · ✅ done (PM verified)

---

## Lane A — Brokers  (`scraper/sources/*`, `scraper/config.json`)
- ⬜ Keep hunting + building NEW broker sources (regional, niche green-industry
  intermediaries, more bizmls org codes for state associations). Never "done."
- ⬜ Broker-contact enrichment: scrape broker phone/email/office from source
  broker pages → brokers table (brokers are outreach targets too).
- ⬜ Delisting/freshness: mark listings delisted after 2 missed full scrapes;
  emit price-change events (feeds Market Multiples time-series).
- ⬜ Source-quality analytics: track thesis-fit yield per source; drop low-value.
- ⬜ SELF-ITERATE: audit every live source for coverage gaps + broken parses.

## Lane B — Frontend  (new `web/app/*`, `web/lib/*`, `web/components/*`; NOT Sidebar.tsx)
- 🔥 Listing detail `/listings/[id]`: tier reasoning, event history, promote action.
- 🔥 Global search bar (companies+contacts+listings+deals).
- 🔥 Contacts editable/linkable (role, attach to company + deal).
- 🔥 **Broker page: add the SAME search + filters as Broker Listings** (John
  called this out). Make Brokers a searchable/filterable/exportable table.
- 🔥 **Every list page consistent**: search + column filters + CSV export on
  Listings, Companies, Contacts, Brokers, Leads. One shared table pattern.
- ⬜ Mobile-responsive pass (collapsible sidebar, scrollable tables) — John reviews on mobile.
- ⬜ Deal detail: market-multiple comparison widget (deal vs industry×size peers).
- ⬜ Lead-list detail page: view a built list's leads + enrichment status; export CSV.
- ⬜ Enrichment tab → functional: per-lead enrichment status, trigger enrichment.
- ⬜ Outreach Library → functional: sequence builder, variables, one-click export.
- ⬜ Cold Calling → functional: call queue + script + company card, mark dispositions.
- ⬜ SELF-ITERATE: critique each page vs end-state; fix dead ends, add missing links.

## Lane C — CRM & Data / Integrations  (`scraper/` scripts, `web/app/api/*`)
- 🔥 **Enrichment worker** (see ENRICHMENT-STRATEGY.md): per lead/company, scrape
  website + Google + LinkedIn snippet, Claude-extract owner name/email/signals.
  ~Free. Write to leads/companies + activities. This is the core of the vision.
- 🔥 **Exa is LIVE (key in .env)** — wire Exa into the list-building rescue path now.
- 🔥 HubSpot TWO-WAY push (approved) — `sync_hubspot.js --push` for net-new CRM records.
- ⬜ Email-finder integration (Hunter free tier to start) for verified owner emails.
- ⬜ Upwork VA loop: CSV export of shortlist (blank owner cell/LinkedIn) → re-import.
- ⬜ More state license boards (AZ OPM, GA, NC, SC, TN, FL).
- ⬜ Notion Deal Tracker + Broker Directory sync (not just meeting notes).
- ⬜ Login-network sync — Axial (co-pilot + CIM ingest) + DealForce (creds in .env).
- ⬜ SELF-ITERATE: what contact data are we still missing per company? Close the gap.

## PM / Integrator  (branch `main`; owns Sidebar.tsx, shared docs, deploys)
- Merge lane branches → main; build + deploy; wire new routes into Sidebar.
- Refill lane lists toward the END-STATE GOAL before they empty. Never let a lane idle.
- Data-quality passes (classification, dedup, delisting); run enrichment jobs.
- Surface John decisions below; keep DECISION-LOG.md current.

---

## Decisions bubbled to John (non-blocking)
- ⏳ **Serper + Google Places keys NOT yet in `scraper/.env`** (only Exa is). Add them
  (see LISTBUILDING-API-SETUP.md) — Serper is the core signal.
- ⏳ Parallel key — John setting up.
- ⏳ Email-finder (Hunter vs Prospeo) for owner emails — PM recommends Hunter free tier first.
- ⏳ Apply `supabase/migrations/0004_contact_directory.sql` in Supabase SQL editor.
- ⏳ Outlook re-auth with `Mail.Read` scope (for scheduled email ingestion).
- ⏳ HubSpot Private App token in `.env` (to activate live two-way push).
- ✅ Notion connected via MCP. ✅ HubSpot two-way approved. ✅ Exa key added.
