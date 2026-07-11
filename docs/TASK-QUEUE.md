# Task Queue — parallel-session backlog

The PM/Integrator session maintains this. Worker sessions PULL from their lane,
claim a task (change ⬜ → �localhost claiming initials + status), do it on their
branch, push, and the PM merges + deploys + re-prioritizes. Newest priorities on
top of each lane. See PARALLEL-SESSIONS.md for lane rules.

Status keys: ⬜ open · 🔨 in-progress (add your lane) · ✅ done (PM verified)

---

## Lane A — Brokers  (branch `lane/brokers`; owns `scraper/sources/*`, `scraper/config.json`)
- ⬜ Apply the bizmls crack (`sources/bbf.js`) to other state associations — find
  their bizmls org/folder codes (many broker assocs use bizmls). Start: try common
  orgs; probe each `bizmls.com/<org>/businesses`.
- ⬜ Build Murphy Business adapter (listings load via embedded widget — find the
  widget/iframe data source with `probe_net_full.js`).
- ⬜ Build Sun Acquisitions adapter (SSR WordPress; find full listings URL + card parse).
- ⬜ Build BizBen adapter (CA; find the listing URL pattern / search POST).
- ⬜ Build First Choice Business Brokers (Duda CMS; headless DOM scrape).
- ⬜ Hunt for NEW sources beyond the roster (regional broker sites, niche green-industry
  intermediaries). Add each to `scrape_sources` + build.
- ⬜ Add per-source detail-page enrichment where broker names live (Transworld detail).

## Lane B — Frontend / Tabs  (branch `lane/frontend`; owns new dirs in `web/app/*`, `web/lib/*`, new `web/components/*`; DO NOT edit Sidebar.tsx — tell PM the new route)
- ⬜ Deal detail page `/pipeline/[id]` or `/deals/[id]`: financials, stage dropdown
  (PATCH deal), activity log (reuse ActivityForm), broker/owner contacts.
- ⬜ Enrichment tab scaffold (per LEADGEN-SOURCES; per-company enrichment status).
- ⬜ Outreach Library tab scaffold (email sequences + variables, per TRANSCRIPT-NOTES).
- ⬜ Cold Calling tab scaffold (call list + script + company info on one screen).
- ⬜ Listings: CSV export button; saved filter views.
- ⬜ Dashboard v2: real Tier-1 feed, source health, multiples snapshot, next deadlines.
- ⬜ Company detail: add contacts section, listing history, market-multiple comparison.

## Lane C — CRM & Data / Integrations  (branch `lane/integrations`; owns `scraper/` integration scripts, `web/app/api/*` for data)
### Shipped by Lane C (PM: verify + action items below)
- ✅ HubSpot 130-contact directory sync — 109 live (noise/internal filtered, deduped,
  idempotent). `scraper/import_hubspot_contacts.js`. **PM ACTION: apply
  `supabase/migrations/0004_contact_directory.sql` via Supabase SQL editor.**
- ✅ Free-source list-building — `scraper/leadgen/run_leadgen.js` (OSM Overpass + TX
  TDLR licenses w/ owner names; merge+dedupe+cap). Live: HVAC/Dallas 150 leads.
  Route `web/app/api/leads`. **PM ACTION: add `node leadgen/run_leadgen.js` to daily run.**
- ✅ Notion meeting-notes ingestion — `scraper/ingest_notion_meetings.js` (MCP, no
  token for manual runs). Ran Landmark/Oliver + Gage/Ron calls onto company feeds.
  Token needed only for UNATTENDED scheduled sync.
- ✅ HubSpot one-way refresh — `scraper/sync_hubspot.js` (real stage IDs; labels are
  booby-trapped). `--push` hard-refuses. Live REST mode needs HUBSPOT_TOKEN in .env.
- ✅ Outlook email→activity ingestion — `scraper/ingest_outlook.js`. 10 activities
  logged; Dan Mello captured as a tree-care river-guide advisor. **BLOCKER: Graph
  token is Mail.Send-only — John must re-auth with Mail.Read for scheduling.**

### Lane C — next
- ⬜ **HubSpot TWO-WAY push — APPROVED by John (2026-07-11).** Wire `sync_hubspot.js
  --push` to write net-new CRM records to HubSpot (needs HUBSPOT_TOKEN). Respect
  no-blind-teaser + real stage IDs. Deprioritize if it blocks (HubSpot may sunset).
- ⬜ Paid list-building workers (Serper first, then Google Places; Exa/Parallel
  rescue) — read keys from .env, activate on key arrival. See LISTBUILDING-API-SETUP.md.
- ⬜ More state license boards (AZ OPM, GA, NC, SC, TN, FL) for list-building.
- ⬜ Login-network sync (Axial co-pilot + CIM ingestion; SMB.co/SMBmarket/DealForce
  headless login) — pending John's credentials in .env (CREDENTIALS-INTAKE.md).

## PM / Integrator  (this/primary session; branch `main`; owns Sidebar.tsx, shared docs, deploys)
- Merge lane branches → main; run `npm run build` + `vercel deploy --prod`.
- Add new routes to Sidebar.tsx as workers report them.
- Keep classification current; run data-quality passes.
- Maintain DECISION-LOG.md; surface John's decision points.
- Re-prioritize this queue.

---

## Bubbled-up decisions for John (PM keeps current — see DECISION-LOG.md too)
- ✅ Notion — RESOLVED: already connected via MCP, no token needed.
- ✅ HubSpot two-way push — APPROVED (2026-07-11). Building.
- ⏳ List-building API keys — John setting up per LISTBUILDING-API-SETUP.md
  (free sources build now; Serper+Places first for paid). Put keys in scraper/.env.
- ⏳ Login deal networks — John providing credentials per CREDENTIALS-INTAKE.md
  (Axial = co-pilot + CIM ingestion; others = headless login once creds arrive).
