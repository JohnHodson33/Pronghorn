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
- ⬜ **Notion sync — UNBLOCKED (no token needed): Notion is connected via MCP**
  (mcp__b6bc9fca__notion-*, workspace "Pronghorn Equity"). Build Notion → CRM:
  pull meeting notes + Deal Tracker + Broker Directory into activities/companies/
  contacts. READ-ONLY from Notion.
- ⬜ **HubSpot TWO-WAY sync — APPROVED by John (2026-07-11).** Build it: net-new
  records logged in the CRM push to HubSpot; new HubSpot records import in.
  Respect no-blind-teaser rule + stage mapping (Closed-Lost custom id 3939497680).
  Deprioritize if it blocks other work (HubSpot may sunset later).
- ⬜ Free-source list-building scraper (OSM Overpass, state license boards, SoS,
  BBB, trade assocs) — NO API keys needed; wires List Building to produce leads NOW.
- ⬜ Paid-source list-building workers (Serper/Google Places/Exa/Parallel) — code
  them to read keys from .env; they activate when John adds keys (see
  LISTBUILDING-API-SETUP.md). Serper + Places first.
- ⬜ Full HubSpot contact-directory sync (130 contacts) — role inference; filter
  system/noise (docusign, microsoft, gusto, calendar, etc.).
- ⬜ Outlook email→contact/activity ingestion (Outlook MCP; extract deal correspondents).
- ⬜ Login-network sync (Axial co-pilot + CIM ingestion; SMB.co/SMBmarket/DealForce
  headless-login scrape) — pending John's credentials in .env (CREDENTIALS-INTAKE.md).

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
