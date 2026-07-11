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
- 🔥🔥 **DASHBOARD V3 — John's overnight directive 7/11; read docs/DASHBOARD-VISION.md
  FIRST.** Rebuild `/` as a VISUAL command center, not a listing: (a) total-
  pipeline funnel across all stages, broker AND proprietary prongs side by side;
  (b) **Key Actions widget on top** — the human-attention queue for John/Tom
  (NDAs awaiting countersign, queued inquiry emails awaiting one-click send,
  ready-to-promote listings, stale pursuits, pending decisions); (c) **deal
  funnel BY INDUSTRY SUBSECTOR** (landscape / tree care / pest / other-green):
  per subsector, broker-pipeline deal count vs proprietary targets fully
  enriched & outreach-ready; (d) visual — bars/funnels/stage columns, not rows.
  Use Lane C's aggregate views once they land; interim compute from tables.
- 🔥🔥 **PURSUIT AUTOMATION ROUND 2** (John re-hit the gap live 7/11 overnight —
  read the ADDENDUM in docs/LISTING-PURSUIT-FLOW.md): (a) **one-click send
  surface**: queued inquiry emails visible + sendable in ONE click from listing
  detail AND the Dashboard Key Actions widget (Outlook send fires only on
  John's click); (b) **Claude-drafted per-listing inquiry note** — reference
  listing specifics + 2–3 smart diligence questions, editable before queue;
  (c) **NDA action queue**: NDA-required sources surface as a Key Action with
  the NDA link, auto-advance via existing Outlook detector. Lane C owns the
  send API + drafting; Lane B owns the surfaces.
- 🔥 **Inquiry Co-pilot for form-based sources** (Lane C w/ Lane B surface, see
  ADDENDUM): BizBuySell-style listings where inquiry = a login+form. Build the
  co-pilot path — "Request info" opens the listing's inquiry page with a
  copy-ready pre-filled contact block + note from inquiry_profiles (and, where
  possible, a browser-automation prefill John triggers from his own machine).
  John reviews + clicks submit; status flips to info_requested on click.
- 🔥 **Unified Screening Criteria UX** (DASHBOARD-VISION §2.1): ONE criteria set
  with sliding-scale controls (EBITDA/revenue range, geography, subsector
  toggles) consumed by BOTH funnels — listings filtering AND list-building
  targeting read the same server-persisted criteria.
- 🔥🔥 **LISTING PURSUIT FLOW** (see docs/LISTING-PURSUIT-FLOW.md — John's core ask):
  On listing detail/rows add **"Request info"** → sets listing_reviews.status
  `info_requested`, logs activity, and (if broker email known) pre-drafts an
  inquiry email QUEUED for John's one-click send (NEVER auto-send). Add a
  **"Prospecting" lane to the pipeline** showing listings in info_requested /
  nda_signed / cim_received (pre-company). Promote form pre-fills all known
  listing data + blanks for post-NDA name/financials. Coordinate the status
  enum + migration with Lane C.
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
- 🔥🔥 **DASHBOARD AGGREGATES for Dashboard V3** (John's overnight directive 7/11;
  read docs/DASHBOARD-VISION.md): build the data layer Lane B's new dashboard
  needs — (a) funnel counts by stage × industry-subsector × prong
  (broker/proprietary), (b) a **key-actions feed** (NDA countersign pending,
  queued emails awaiting send, ready_to_promote rows, pursuits with no activity
  >7d), (c) enrichment-coverage stats per subsector (targets outreach-ready =
  owner name + email/phone present). Prefer SQL views (add to a migration) +
  thin `/api/dashboard` route; document the shapes for Lane B in this file.
- 🔨 LANE C — 🔥🔥 **PURSUIT AUTO-DETECT from Outlook** — SHIPPED + BACKFILLED.
  `scraper/ingest_pursuit.js`: NDA-in-process → info_requested (+countersign-pending
  note), executed-NDA/DocuSign-complete → nda_signed, CIM/data-room → cim_received
  (+doc link). Sender-domain → source narrowing, exact-name match w/ short-name
  ref-anchor guard, forward-only, idempotent per message id, listing_events audit.
  BACKFILL RAN: John's two FCBB NDAs from TODAY detected & advanced (Aquatic
  contractor 226-24809 + Tree Service 327-24860 → info_requested; auto-flips to
  nda_signed when the countersigned copies arrive). DETECTION ONLY — never sends.
  LANE B CONTRACT: `supabase/migrations/0005_pursuit_flow.sql` = status values +
  requested_at/nda_signed_at/cim_received_at/doc_url + inquiry_profiles table +
  ready_to_promote view. **PM ACTION: apply 0005 (and 0004) in SQL editor** —
  detector works pre-migration via notes fallback.
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
- ✅ Email-finder (Hunter) — `scraper/enrich/find_emails.js`: verified owner emails
  from owner_name+domain, score≥70, one attempt/lead ever (25/mo free quota
  protected, default cap 5/run), license-board "LAST, FIRST" names normalized,
  generic mailboxes preserved. LIVE: 2/3 verified at score 95–97 first run.
- ✅ SELF-ITERATE website-discovery — shipped inside run_enrichment.js: Exa finds
  the company site for website-less license-board leads (name/domain token match,
  directory junk filtered), persists to leads.website, then normal enrichment.
  `--retry-skipped` flag re-runs prior no-context leads (4/12 recovered on test).
- ✅ Serper + Google Places LIVE (keys arrived) — verified on Pest Control/Tucson:
  50 Serper + 20 Places candidates → 28 unique leads. Fixed maps pagination (GPS
  ll anchor from geocoder).
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
- ✅ Serper, Google Places, Hunter, Exa keys all LIVE in `scraper/.env` (verified 7/11).
- ⏳ Parallel key — John setting up.
- ⏳ **Apply `supabase/migrations/0004_contact_directory.sql` AND
  `0005_pursuit_flow.sql` in the Supabase SQL editor** — PM verified 0005 is NOT
  applied (inquiry_profiles missing); no exec path exists via service key, so
  this needs you. Everything degrades gracefully until then.
- 🆕 PM judgment call (reversible): sidebar restructured per your overnight
  guidance — Overview (Dashboard / Market Multiples / Screening Criteria), then
  Broker Sourcing, then Proprietary Sourcing (List Building relabeled
  **"Proprietary Deal Flow"**, route unchanged), then CRM, then Outreach. Say
  the word if you want different names/grouping.
- ⏳ Outlook re-auth with `Mail.Read` scope (for scheduled email ingestion).
- ⏳ HubSpot Private App token in `.env` (to activate live two-way push).
- ✅ Notion connected via MCP. ✅ HubSpot two-way approved. ✅ Exa key added.
