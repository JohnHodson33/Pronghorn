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
- 🔨 LANE C — **Enrichment worker** — SHIPPED & RUNNING. `scraper/enrich/run_enrichment.js`:
  website scrape (home/about/contact) + Exa web/LinkedIn snippets → Claude Haiku
  extracts owner name/title/email/phone/LinkedIn + signals → leads.owner_* (fill-
  blanks-only; license-board names are ground truth) + enrichment jsonb, status→
  enriched. Live: owner names at HIGH confidence on most Dallas HVAC leads
  (~$0.01/lead incl. Exa). `--limit/--list` flags; ready for the daily schedule.
- ✅ **Exa wired into rescue path** — verified live: Lake Mgmt/Tucson list produced
  20 real companies (SOLitude, Johnson Lake Mgmt…) where free sources had 0.
- 🔨 LANE C — HubSpot TWO-WAY push — built + gated; fires once John sets
  HUBSPOT_TOKEN + HUBSPOT_PUSH_ENABLED=true in scraper/.env.
- ✅ Notion Deal Tracker + Broker Directory sync — `scraper/ingest_notion_tracker.js`.
  Ran: 14 nail companies got revenue/EBITDA/employees/listing URLs + LOI prices
  (post-mortem gold), 6 brokers got phones/full names, 2 OWNER contacts added
  (Thomas Trujilo; Jason Ly w/ cell). Idempotent.
- ⬜ Email-finder integration (Hunter free tier to start) for verified owner emails.
- ✅ Upwork VA loop — `scraper/va_export.js` (shortlist CSV: enrichment-skipped +
  fewest-known-fields first) + `va_import.js` (fill-blanks-only, --overwrite flag,
  va audit trail in enrichment jsonb). Round-trip tested. PM: draft the VA job post
  when John's ready — the CSV spec is the export header.
- ⬜ SELF-ITERATE ADD (from live enrichment run): **website-discovery step** — 34/50
  skipped leads are TDLR rows w/ owner NAME but no website; an Exa/search
  website-finder pass before enrichment would unlock them (owner coverage 112/227,
  email coverage only 5/227 — email-finder key is the other lever).
- ⬜ More state license boards (AZ OPM, GA, NC, SC, TN, FL) — recon logged in
  DECISION-LOG-integrations (GA Kelly blocked, FL = Power BI, TN empty).
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
