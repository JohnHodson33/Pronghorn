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
- 🔨 LANE C — Full HubSpot contact-directory sync (130 contacts) — proper importer with
  role inference; filter system/noise (docusign, microsoft, gusto, etc.).
  STATUS: imported & verified — 109 contacts live (15 noise + 3 internal filtered,
  dupes merged, idempotent re-run). Importer: `scraper/import_hubspot_contacts.js`.
  PM ACTION: apply `supabase/migrations/0004_contact_directory.sql` via dashboard SQL
  editor (importer uses notes breadcrumbs until then).
- 🔨 LANE C — Free-source list-building scraper (OSM Overpass, state license boards, SoS) — NO
  API keys needed; wires the List Building tab to actually produce leads.
  STATUS: shipped & verified. `scraper/leadgen/run_leadgen.js` processes pending
  lead_lists (OSM bbox-tag queries + TX TDLR license registry w/ owner names;
  cross-source merge + dedupe + target cap). Test runs live: HVAC/Dallas 150 leads,
  Tree Care/Phoenix 3. New data route `web/app/api/leads` (GET ?list=). PM ACTION:
  add `node leadgen/run_leadgen.js` to the daily scheduled run so UI-created lists
  get processed. Other state boards (AZ OPM, GA, NC…) are follow-on adapters.
- ⬜ Notion meeting-notes ingestion (per MEETING-NOTES-DESIGN.md; needs John's token —
  bubble to PM if blocked).
- 🔨 LANE C — HubSpot one-way deal/company refresh (keep imported deals current); design the
  two-way push but DO NOT enable it (loop-in guardrail).
  STATUS: shipped & run. `scraper/sync_hubspot.js` — internal-stage-ID map (labels are
  booby-trapped: `closedlost` is labeled "Closed - Won"), refreshes stage/amount/
  closed-lost reasons. Ran via MCP dump: 14 nail deals got their REAL closed-lost
  reasons. `--push` hard-refuses (guardrail). Live REST mode activates when John
  drops HUBSPOT_TOKEN into scraper/.env.
- ⬜ Outlook email→contact/activity ingestion (Outlook MCP; extract deal correspondents).

## PM / Integrator  (this/primary session; branch `main`; owns Sidebar.tsx, shared docs, deploys)
- Merge lane branches → main; run `npm run build` + `vercel deploy --prod`.
- Add new routes to Sidebar.tsx as workers report them.
- Keep classification current; run data-quality passes.
- Maintain DECISION-LOG.md; surface John's decision points.
- Re-prioritize this queue.

---

## Bubbled-up decisions for John (PM keeps current — see DECISION-LOG.md too)
- Which login/paid deal networks to join (Axial/PrivSource/SMB.co/…) — see BROKER-SOURCE-LIST.md.
- Notion integration token (for meeting-notes sync).
- Data-source API keys for paid list-building (Serper/Google Places/Parallel/Exa).
- Approve enabling HubSpot two-way push (currently import-only).
