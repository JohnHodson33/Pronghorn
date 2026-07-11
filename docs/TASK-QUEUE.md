# Task Queue — parallel-session backlog

The PM/Integrator session maintains this. Worker sessions PULL from their lane,
claim a task (change ⬜ → �localhost claiming initials + status), do it on their
branch, push, and the PM merges + deploys + re-prioritizes. Newest priorities on
top of each lane. See PARALLEL-SESSIONS.md for lane rules.

Status keys: ⬜ open · 🔨 in-progress (add your lane) · ✅ done (PM verified)

---

## 🔥 TOP PRIORITY — John's live CRM feedback (2026-07-11) — Lane B + Lane C

**The data model John wants (get the SQL relationships right):**
- **Pipeline shows DEALS** (not bare company squares). A deal has ONE company;
  a company has contacts; contact roles: **owner → company**, **broker →
  deal+company**, so owner is reachable from the deal via its company.
- Clicking a pipeline card → **deal detail** showing the company, the broker, the
  owner, and all deal notes/activities; from there, links into the company and
  the owner/broker contacts.

**Lane B (Frontend) — do these first:**
- 🔥 Pipeline cards must LINK to `/deals/[id]` (the detail page already exists).
  Make each card a click-through; show broker on the card.
- 🔥 Deal detail: ensure it shows company + broker + owner + notes, each linking
  out; stage is editable there (DealControls exists — verify it's on the page).
- 🔥 Companies tab: add **Industry as its own column** (not "—" in the name cell),
  a **search bar**, and an **industry filter** (toggle e.g. Nail Salon / Tree Care)
  + other filters. Rows link to the company profile.
- 🔥 Company profile: make it **editable** — stage (via its deal), key fields.
  John needs to move a company/deal between phases manually from the profile.

**Lane C (Data) — do these first:**
- 🔥 Ingest John's RECENT Outlook mail NOW (`ingest_outlook.js` on latest): he
  submitted the **Landmark Pest IOI today** — auto-move Landmark to "IOI Submitted"
  and log the broker correspondence as activities. Wire recent-mail → stage updates.
- 🔥 Verify/repair the contact relationships: owner↔company, broker↔deal+company
  for the 4 active deals; make sure the frontend can read them.

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
✅ DONE (merged+deployed): deal detail w/ stage edit, Enrichment/Outreach/Cold-Calling
tabs, CSV export + ListingsTableV2, Dashboard v2 (now at /), Company detail v2 +
editable CompanyEditor, Companies table (industry col/search/filters), pipeline→deal links.

### Lane B — next (REFILLED 2026-07-11)
- 🔥 **Listing detail page** `/listings/[id]`: click any broker listing → in-app
  detail (financials, tier + screener reasoning, price/event history from
  listing_events, source link) + a "Promote to company/deal" action (real name
  required). Make listing names in ListingsTableV2 link here.
- 🔥 **Global search** (top bar, like Jake's): search companies + contacts +
  listings + deals from one box → jump to the record. New `web/app/api/search`.
- 🔥 **Contacts editable + linkable**: add/edit a contact inline, set role
  (owner/broker/advisor), attach to a company AND a deal; add contacts from the
  company profile. New PATCH/POST `web/app/api/contacts`.
- ⬜ **Mobile-responsive pass** — John reviews on mobile a lot; make sidebar
  collapsible, tables horizontally scrollable, cards stack. High impact.
- ⬜ **Deal detail: market-multiple comparison widget** — show this deal's implied
  multiple vs. its industry × size-band peers from /analytics data ("priced at
  4.0× EBITDA; industry median 3.2× → rich").
- ⬜ **Broker detail page** `/brokers/[id]`: a broker's listings + deals + coverage.
- ⬜ **Pipeline drag-and-drop** stage moves (nice-to-have over the dropdown).
- ⬜ **Enrichment/Outreach/Cold-Calling**: wire to real data as list-building leads
  flow (coordinate with Lane C's /api/leads).

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
- 🔥 Login-network sync — **Axial + DealForce credentials ARE NOW in scraper/.env**
  (AXIAL_EMAIL/PASSWORD, DEALFORCE_EMAIL/PASSWORD). Build: (1) Axial — probe behind
  login; SPA blocks headless, so likely co-pilot (browser MCP against John's logged-in
  Chrome) to pull ACTIVE/NDA'd deals + download CIMs → activities/companies. (2)
  DealForce — probe behind login, headless scrape if possible. SMB.co/SMBmarket/
  PrivSource pending John's accounts. READ-ONLY.

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
