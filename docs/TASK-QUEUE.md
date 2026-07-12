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

**⚙️ HANDOFF READINESS (PM rule, 7/12):** every worker keeps a short
"HANDOFF" section current at the TOP of its DECISION-LOG-<lane>.md (current
task, next 2, gotchas). Sessions die at context limits — a replacement session
must resume from one paste. PM watches lane commit recency and flags stalls
in MORNING-BRIEF.

---

## Lane A — Brokers  (`scraper/sources/*`, `scraper/config.json`)
- 🔥 **OPS AUTOMATION (PM refill 7/11 — Lane A's own recon says free-source
  discovery is saturated; shift to keeping the machine running itself):**
  GitHub Actions workflows (`.github/workflows/`, Lane A owns) for (a) nightly
  scrape-all + mirror dedup, (b) delisting/freshness pass, (c) source_quality
  report artifact, (d) pursuit ingest + enrichment ticks. Needs SUPABASE/API
  secrets as GH repo secrets — LIST the exact names for John in Decisions; he
  adds them in GitHub settings. Until then, workflows land dormant
  (workflow_dispatch only).
- ⬜ Keep hunting + building NEW broker sources (regional, niche green-industry
  intermediaries, more bizmls org codes for state associations) — per 7/11 recon
  this is now opportunistic, not primary.
- ⬜ Broker-contact enrichment: scrape broker phone/email/office from source
  broker pages → brokers table (brokers are outreach targets too).
- ⬜ Delisting/freshness: mark listings delisted after 2 missed full scrapes;
  emit price-change events (feeds Market Multiples time-series).
- ⬜ Source-quality analytics: track thesis-fit yield per source; drop low-value.
- ⬜ SELF-ITERATE: audit every live source for coverage gaps + broken parses.

## Lane B — Frontend  (new `web/app/*`, `web/lib/*`, `web/components/*`; NOT Sidebar.tsx)
- 🔥🔥 **IMPROVEMENTS PAGE (John 7/12 ~13:15 — Tom joins TODAY; read
  docs/IMPROVEMENTS-LOOP.md):** /improvements page: submit form (bug/idea/
  change, page, author John|Tom) → POST /api/feedback; status board
  (submitted→triaged→building→shipped) so Tom sees ideas move; agent
  self-review + roadmap panel (PM curates). PM wires sidebar entry on merge.
  Ship the basic version TODAY — the Haiku refine-chat step is v2.
- 🔥🔥🔥 **ENRICHMENT COMPLETENESS LEVELS replace binary "enriched" (John 7/12
  ~16:05 — "enriched next to a lead with no owner info feels like nothing
  happened"):** status stays lifecycle-only (new/enriching/…); ADD a computed
  **completeness level** shown as the primary demarcation on every lead:
  ● FULL = owner name + email + phone/LinkedIn · ◕ CONTACTABLE = owner name
  + ≥1 channel · ◑ IDENTIFIED = owner name, no channel · ◔ BASIC = website/
  location only · ○ RAW = nothing yet. (Lane B) level chips column w/ filter
  + counts header ("80 leads: 12 full · 18 contactable · 25 identified…");
  **default sort = most-complete first**, and after a run finishes the list
  re-sorts so results float to the top; (Lane C) compute level server-side
  (single source of truth, reuse for the dots + KPI). The run receipt (below)
  reports in these terms: "80 processed → 45 now contactable or better."
- 🔥🔥🔥 **ENRICHMENT PROGRESS VISIBILITY (John 7/12 ~15:50 — "needs to be a
  really well baked process"):** clicking Enrich must NEVER feel like nothing
  happened. (Lane C) enrichment_jobs gets progress fields — total, processed,
  found_owner/found_email counts, per-job state queued|running|done — updated
  as the runner works; GET /api/enrich/jobs/[id] (or extend /api/enrich)
  serves it. (Lane B) UI: (a) sticky **progress bar/banner** on the
  Enrichment tab the moment a job queues ("Enriching 34/80 — 12 owners, 7
  emails found…"), live via the existing polling; (b) a small global
  indicator (sidebar, near the cost badge) while any job runs so you can
  navigate away and still see it; (c) **completion summary toast/banner**:
  "Done: 80 processed — 22 owners, 15 emails, 43 queued for tier 2" with a
  'view results' filter link; (d) if the runner hasn't picked the job up in
  60s, say so honestly ("queued — runner picks this up within 15 min") rather
  than showing silence. Acceptance: John clicks Enrich, watches numbers move,
  and is TOLD when to come back and what he got. owner
  contacts must show their company's verified industry beside the company
  name, with filter chips on top ("show me every Tree Care owner we have a
  contact for") + counts per industry. Pull industry through the
  contact→company join; blanks show grey.
- 🔥🔥 **LISTINGS TABLE REGRESSION (John 7/12 ~15:20):** (a) price, implied
  MULTIPLE, and margin columns are missing/crowded out — restore them on
  every listing row (blank when no price; fill wherever computable);
  (b) location column blown wide by polluted city values — truncate display
  (ellipsis + tooltip) so columns stay usable even before the data fix.
- 🔥🔥🔥 **ENRICHMENT ROUND 2 (John 7/12 ~12:15 — ENRICHMENT-UX.md "ROUND 2"
  section is the contract):** (a) row click on promoted leads → CRM company
  profile (/companies/[id]), website demoted to a ↗ icon; (b) contact-dots
  honesty: dots = usable owner channels only, and the company profile must
  show orphaned channels ("owner phone — name unknown"); (c) surface
  enrichment TIER on each lead + "Enrich (tier 2, est. $X)" labeling.
  Acceptance: click row → profile → owner contact + channels visible →
  Enrich escalates. This outranks Contacts↔Brokers.
- 🔥🔥🔥 **ENRICHMENT UX (John 7/11 23:40 — "the most important part"; read
  docs/ENRICHMENT-UX.md FIRST, it's the design contract):** (a) typeahead on
  industry + geography in the list-build form (suggest-as-you-type, select
  from suggestions); (b) **checkbox selection + "Enrich selected (est. $X)"
  button** on the Enrichment tab and list detail → POST /api/enrich; (c)
  replace the List column with a verified **Industry column** (list becomes a
  filter); (d) off-target flag chip + filter + discard action; (e) live
  enriching→enriched status updates. John currently CANNOT operate this flow
  at all — this outranks everything else in your lane.
- 🔥🔥 **PASSED STAGE + DEALS TAB (John live feedback 7/11 ~11:45).** (a) Add a
  **"Passed"** deal stage: the deals now sitting in the pipeline's "Closed"
  column are deals we PASSED on (we have closed zero) — move them to Passed
  (coordinate data fix w/ Lane C). Passing a deal REMOVES it from the pipeline
  board (Passed is not a column) via a quick "Pass" action + pass-reason
  (reuse closed_lost_reason). Keep "Closed" for future actual closes. (b) Build
  **/deals index** — the missing CRM search surface: searchable/filterable/
  exportable table (shared list pattern) across ALL deals incl. Passed, showing
  company → owner contact, broker, stage, asking/valuation, fit score; rows →
  /deals/[id]. Passed deals must be findable here forever (deals fall out of
  the pipeline and may fall back in). PM wires "Deals" into Sidebar on merge.
- 🔥 **List-building key-status honesty (John 7/11):** the "needs key" badge is
  STATIC — it names the required env var without checking it, so live sources
  (Serper/Places/Hunter/Exa all have keys) still look unconfigured. Add a
  server check (`/api/sources/status` or extend lead-lists GET) that reports
  which keys exist; badge becomes "connected ✓" / "needs key" truthfully.
  Show honest build statuses too (pending = "queued, runs on next worker
  pass/nightly" until the Lane C runner ships).
- 🔥 **Contacts ↔ Brokers rationalization (John's MECE point 7/11):** Brokers
  tab = auto-scraped directory (hundreds, cold); Contacts = curated CRM people
  (only 18 broker-contacts promoted so far) — the UI never explains this.
  (a) Reframe Brokers tab as "Broker Directory" with an explainer line +
  one-click **"Add to Contacts"** per row (creates contact w/ broker_id link);
  (b) add role/industry tags + a "Brokers" filter chip on Contacts; (c) contact
  detail shows linked broker-directory record (industries covered, listings).
  Keep both tabs but make the relationship explicit: directory = universe,
  contacts = relationships.
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
- 🔥🔥 **PURSUIT AUTOMATION ROUND 3 — JOHN DECIDED 7/11 AM (supersedes the
  "send route" idea):** John does NOT want auto-send; he wants **drafts in his
  Outlook** for review. (1) LANE C: replace the outbox "send" 501 with a
  **"Create Outlook draft" action** — Graph `POST /me/messages` (Mail.ReadWrite
  scope, NOT Mail.Send) puts the Claude-drafted inquiry in John's Outlook
  Drafts folder addressed to the broker; he reviews + hits send in Outlook
  himself. Outbox status → 'drafted_to_outlook'. (2) **BizBuySell-style form
  inquiries: APPROVED to automate behind one button, BUT gated** — John must
  see sample outputs for the first several; build preview-first (show filled
  form values → John clicks submit). (3) Fuller automation may come as trust
  builds — keep the audit trail. Round-2 leftovers still open for Lane B:
  "Request info" hooks on listing rows; Key Actions queued_email → /outbox
  links; NDA action queue.
- 🔥 **Inquiry Co-pilot for form-based sources** (Lane C w/ Lane B surface, see
  ADDENDUM): BizBuySell-style listings where inquiry = a login+form. Build the
  co-pilot path — "Request info" opens the listing's inquiry page with a
  copy-ready pre-filled contact block + note from inquiry_profiles (and, where
  possible, a browser-automation prefill John triggers from his own machine).
  John reviews + clicks submit; status flips to info_requested on click.
- 🔥🔥 **SCRAPE CRITERIA REDESIGN (John 7/12 ~00:45 — supersedes the old
  "unified criteria" idea):** PM confirmed screen_profiles feeds ONLY broker-
  scrape tiering (proprietary has no financials to screen), and moved the tab
  to Broker Sourcing as "Scrape Criteria". Rebuild the page LinkedIn-search
  style: (a) **industry → auto-keywords**: John types "hydraulic repair", a
  Claude endpoint (Lane C: POST /api/criteria/keywords) generates the full
  keyword set as removable TAG CHIPS he can prune/extend — he never
  brainstorms keywords himself; (b) **tag-chip UX everywhere** (include/
  exclude keywords, industries) with visual add/remove; (c) **sliding-scale
  bars** for guardrails (EBITDA, asking price, cash-flow ranges); (d) **state
  typeahead** (type "Ari…" → select Arizona — never free-typed); (e) a short
  "how this works" explainer at top: these criteria tier every scraped broker
  listing (Tier 1/2/...), nothing else. Changes re-tier on next scrape.
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
- 🔥🔥 **MOBILE PASS + PWA (John 7/12 ~13:30 — he'll work the CRM from his
  iPhone daily):** (a) PWA install polish: `web/app/manifest.ts` (name
  "Pronghorn", standalone display, theme color emerald) + apple-touch-icon +
  proper viewport meta — so Add-to-Home-Screen gives an app-like icon and
  full-screen launch; (b) mobile-first pass on the ON-THE-GO WORKFLOWS in
  priority order: Dashboard Key Actions (tap-to-act), Enrichment tab (tap
  row → company profile, big Enrich button, checkboxes usable by thumb),
  list-building form (typeahead works on iOS keyboard), company profile,
  pipeline (horizontal scroll snap per stage column); (c) tables collapse to
  card layouts under ~640px instead of tiny columns; (d) MobileNav already
  reuses Sidebar — verify cost badge + new entries render in the drawer.
  Test target: iPhone Safari. This unblocks John's daily mobile usage.
  **SCOPE CLARIFIED (John 7/12 ~13:45): mobile = FULL PARITY, not
  triage-only.** Everything doable on desktop must be doable on mobile —
  reviewing/approving outreach campaigns, building lists, working the CRM.
  Desktop correctness stays priority #1; mobile ships in tandem, never
  restricts scope. STANDING RULE for Lane B from now on: every new feature
  ships with a mobile-usable view in the same unit (responsive by default,
  card layouts under 640px) — mobile is not a later pass, it's part of done.
  The on-the-go workflows above are simply the first wave to polish.
- ⬜ Deal detail: market-multiple comparison widget (deal vs industry×size peers).
- ⬜ Lead-list detail page: view a built list's leads + enrichment status; export CSV.
- ⬜ Enrichment tab → functional: per-lead enrichment status, trigger enrichment.
- ⬜ Outreach Library → functional: sequence builder, variables, one-click export.
- ⬜ Cold Calling → functional: call queue + script + company card, mark dispositions.
- ⬜ SELF-ITERATE: critique each page vs end-state; fix dead ends, add missing links.

## Lane C — CRM & Data / Integrations  (`scraper/` scripts, `web/app/api/*`)
- 🔥🔥 **RUNNER MUST SELF-DRAIN + RE-ENRICH NO-OP BUG (John hit both 7/12
  ~15:20):** John queued 80 leads via the UI button; the job sat unprocessed
  (nothing runs run_jobs.js continuously) and when PM drained it manually the
  runner NO-OPed ("No un-enriched leads") because all 80 were already
  status='enriched' from tier 1. Fix: (a) run_jobs on a tight schedule (every
  loop iteration + a GH workflow every 15min); (b) jobs on already-enriched
  leads must CASCADE to tier 2 / fill-missing-fields, never no-op — this is
  the one-click cascade contract; ship the cascade path FIRST. (c) build the
  website-discovery pass (many skips = no website stored; find via Exa/Serper
  then re-run tier 1).
- 🔥 **LOCATION DATA POLLUTION (Lane A parsers + Lane C cleanup, John 7/12):**
  tupelomarket + businessbroker adapters write description text into
  listings.city (e.g. "HVAC BusinessesHVAC Businesses…Bellingham"). Fix both
  parsers, then a cleanup pass: re-derive city/state for polluted rows (regex:
  city ilike %business%/%serving%/%service% or length>40), null when
  unrecoverable.
- 🔥🔥 **FEEDBACK PIPELINE (John 7/12 ~13:15 — Tom joins TODAY; read
  docs/IMPROVEMENTS-LOOP.md):** `feedback` table (author, type, page, body,
  status, task_ref) + POST /api/feedback + PATCH status. THEN the standing
  rule for ALL lanes: each /loop iteration polls feedback for
  status='submitted' items touching your lane → triage into this queue
  (tag feedback id) → flip 'triaged'; flip 'building'/'shipped' as you go so
  the site status board stays truthful. Tom's items = John's items in
  priority; conflicts bubble to Decisions.
- 🔥🔥🔥 **ONE-CLICK CASCADING ENRICHMENT (John DECIDED 7/12 ~12:45 — ENRICHMENT-UX.md
  "ROUND 2" item 1 is the contract; owner contacts ARE the product):** (a) ONE
  button cascades tier 1 → tier 2 with EARLY EXIT when owner name+email+phone+
  LinkedIn complete; tier 2 = Hunter email (name+domain), Exa LinkedIn, phone
  hunt; /api/enrich previews MAX cascade cost. (b) **Contact-carry bug:** promotion drops
  owner channels when owner_name is missing (Sage Tree Care case) — carry
  orphaned channels to the company (notes or Unknown-owner contact). (c)
  **Audit owner_phone attribution** — company phones must not count as owner
  channels. (d) Push owner-contact coverage % as the lane's KPI. (e) **Subs =
  baseline, committed + PLANNED (John 7/12 ~13:00, see COST-TRACKING.md):**
  seed the subscriptions table with Hunter Starter ~$49/mo status='planned'
  (we'll outgrow the 25-free cap); /api/costs includes planned subs in
  subsMonthly with a planned flag so the badge shows the honest monthly
  floor and one over-cap pull never reads as a cost spike.
- 🔨 LANE C — 🔥🔥 **OUTLOOK DRAFTS + LIVE INGESTION — BUILT (John authorized
  drafts IN CHAT 7/12; auto-send remains forbidden — permanent 403).**
  (a) `POST /api/outbox/[id] {action:'draft'}` → Graph creates the inquiry in
  John's Outlook DRAFTS folder (Mail.ReadWrite only, scope-checked; status →
  drafted_to_outlook; listing_events audit). John reviews + sends in Outlook.
  (b) `scraper/graph_mail.js` + `ingest_pursuit.js --live [--hours N]` —
  scheduled pursuit detection via Graph Mail.Read. Both degrade with exact
  instructions until John's ONE consent (below) + GRAPH_* in web env.
- ✅ **OUTLOOK RE-AUTH: READY (PM staged the scopes 7/12 ~01:25).**
  `scraper/delivery/outlook.js` SCOPES = Mail.Send + Mail.Read +
  Mail.ReadWrite + User.Read + offline_access. MORNING STEP FOR JOHN
  (~2 min): pull main, then run `node auth_email.js` in
  `C:\Users\johnd\Pronghorn\scraper` → open the printed URL, enter the code,
  sign in, approve once. Token saves itself; unlocks scheduled pursuit
  detection AND Outlook-draft creation in one consent. Lane C: build the
  draft route + scheduled ingestion against these scopes now — they activate
  the moment John consents.
- 🔨 LANE C — 🔥🔥 **COST METERING — SHIPPED.** Migration `0009_cost_tracking.sql`
  (usage_events + subscriptions) · `core/usage.js` recorder (no-ops safely
  pre-0009) · every paid call site instrumented (enrichment Claude+Exa, Hunter,
  classification, leadgen blended, CLI + web drafting) · **GET /api/costs**
  serves the full badge shape TODAY (verified; returns zeros + apply-0009 note
  until migration; ownerContactsAcquired/costPerContact live already) ·
  `scraper/backfill_costs.js` = July backfill, RUN ONCE after 0009 (idempotent).
  **PM: apply 0009 with the rest, then run backfill_costs.js.**
- 🔨 LANE C — 🔥🔥🔥 **ENRICHMENT UX BACKEND — ALL 5 SHIPPED** (ENRICHMENT-UX.md):
  (1) address/city/state now PERSISTED at ingest (Serper+Places parse US
  addresses) + **151 existing leads backfilled** — John's no-location complaint
  fixed. (2) Free-pass auto-chained onto every build (`leadgen/free_pass.js`:
  location fill + TX license owner-name cross-ref; zero paid credits).
  (3) `POST /api/enrich {leadIds|listId|estimateOnly}` → cost preview
  (verified: 21 leads → $0.21) + job queue; `enrich/run_jobs.js` drains it
  (needs migration 0008 for the queue table; estimates work TODAY).
  (4) Enrichment now classifies **industry_verified + on_target** (columns
  post-0008, jsonb meanwhile); **backfill ran: 60 leads classified, 1
  off-target caught** (Cadden Community Mgmt on the lake list → Property
  Maintenance — John's exact example pattern). (5) `GET /api/taxonomy` — 15
  canonical industries w/ aliases for the typeahead (works TODAY via seed;
  0008 makes it DB-editable). **PM: apply 0008 with 0004-7.**

- 🔥🔥🔥 **ENRICHMENT BACKEND (John 7/11 23:40 — read docs/ENRICHMENT-UX.md;
  outranks everything):** (a) **persist address/city/state at leadgen ingest**
  (Serper/Places already return it — we drop it today; that's why John's 66
  tree-care leads have no location. Backfill where possible); (b) **free-pass
  enrichment chained automatically onto every list build** (website capture,
  location fill, license cross-ref, dedupe — never ask, costs nothing); (c)
  `enrichment_jobs` + **POST /api/enrich** (leadIds|listId) + runner so the UI
  button actually works with no CLI; (d) **industry_verified classification**
  during enrichment (Claude, actual business ≠ list intent; off_target flag
  for catchy-name mismatches) + backfill existing enriched leads; (e) industry
  taxonomy table + /api/taxonomy for Lane B's typeahead.
- 🔨 LANE C — 🔥🔥 **LEAD → COMPANY PROMOTION — SHIPPED + BACKFILL RAN.**
  `scraper/promote_leads.js` (batch, --dry-run, idempotent) + `POST
  /api/leads/promote {leadId}` for Lane B's button (returns {companyId,
  createdCompany|already}). Bar: owner name + ≥1 channel. Dedup on normalized
  name+state (links existing instead of duplicating); owner contact role=owner;
  enrichment overview → company notes. **RAN: 23 companies + 23 owner contacts
  created** — the Companies tab now has its proprietary prong. NOTE: origin
  value is 'lead' (the 0001 schema's canonical value for proprietary; the
  dashboard funnel already maps lead/referral → prong 'proprietary').
  Runner workflow chains promotion after each leadgen pass.
- 🔨 LANE C — 🔥🔥 **LEAD-LIST RUNNER — SHIPPED.** `.github/workflows/leadgen.yml`
  (twice daily + workflow_dispatch, Lane A's pattern): runs all pending
  lead_lists (`run_leadgen.js` already flips pending→running→complete with
  leads_found + cost_actual) then chains `promote_leads.js` so outreach-ready
  leads land in Companies automatically. Needs the same GH secrets John is
  adding (+`SERPER_API_KEY`, `GOOGLE_PLACES_API_KEY`). Until secrets land,
  runs also happen on any local worker pass (`node leadgen/run_leadgen.js`).
  Enrichment chaining stays in Lane A's enrichment.yml (2x daily).
- 🔨 LANE C — 🔥 **OUTREACH TRACKING — MODEL + API SHIPPED.** Migration
  `0007_outreach_tracking.sql`: `outreach_tracks` (company_id PK, state
  not_started|contacted|replied|meeting|nurture|dead, channel_last,
  last_touch_at, next_followup_due, owner_contact_id, notes). API
  `/api/outreach-tracks`: GET (?state=, ?due=1, joined w/ company+owner) +
  POST upsert — recording a touch also mirrors an activity onto the company
  feed. Dashboard Key Actions gains kind **followup_due** (due ≤ tomorrow,
  dead excluded). Degrades with apply-0007 message until migration lands
  (verified). LANE B: build the Outreach/Cold Calling surfaces on this.
- 🔨 LANE C — 🔥 **FORM-INQUIRY CO-PILOT BACKEND — SHIPPED (preview-first, per
  John's review gate).** `POST /api/inquiry-copilot {listingId}` → preview
  payload: listing's inquiry URL + copy-ready fields (name/email/phone from
  inquiry_profiles, Claude-drafted 60-100w form note; graceful fallback until
  ANTHROPIC_API_KEY is in web env). NOTHING is ever submitted by the API.
  `{confirm:true}` after John submits → info_requested + audit event
  (inquiry_form_submitted). Verified live against a BizBuySell Tier-1 listing.
  LANE B: render the preview + confirm flow on listing rows/detail.
- 🔨 LANE C — 🔥 **DATA FIX for Passed stage — PREPARED, PM EXECUTES.**
  `scraper/fix_passed_stage.js` (idempotent; moves stage Closed→Passed only
  where a pass reason exists). Lane C's safety layer correctly blocked running
  a bulk semantic change to live deals off a relayed instruction — **PM: run
  `node fix_passed_stage.js` once** (you hold John's firsthand feedback).
  Code ripples DONE: sync_hubspot maps 3939497680→'Passed' (pull) and
  'Passed'→3939497680 (push); ingest_outlook treats 'Passed' as terminal
  (mail signals can never resurrect a passed deal).
- 🔨 LANE C — 🔥🔥 **DASHBOARD AGGREGATES for Dashboard V3** — SHIPPED & VERIFIED.
  `GET /api/dashboard` (works TODAY, no migration needed) returns:
    `funnel:   [{prong: "broker"|"proprietary", subsector, stage, n}]`
      stages: screened_tier_1/2 → info_requested/nda_signed/cim_received →
      deal_<Stage> (CRM) · proprietary: lead_new/lead_enriched/…
    `keyActions: [{kind, title, detail, refId, at}]`
      kinds: nda_countersign_pending · ready_to_promote · queued_email ·
      stale_pursuit (>7d) · next_step_due (due ≤ tomorrow)
    `coverage: [{subsector, total, enriched, outreachReady}]`
  Verified live: funnel has 40 stage×subsector rows; key actions show John's 2
  FCBB NDA countersigns pending; coverage shows HVAC 150/20/8 etc.
  Migration `0006_dashboard_aggregates.sql` = same shapes as SQL views + the
  **outbox_emails table** (queued|sent|cancelled — Round-2 one-click-send
  contract; NOTHING auto-sends). **PM: apply 0004+0005+0006 together.**
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
- 📝 COORDINATION NOTE for Lane A (enrichment.yml): contract verified — the
  workflow's `node enrich/run_enrichment.js --limit N` + env vars match Lane C's
  CLI exactly and will run clean in CI. One gap: HUNTER_API_KEY is passed but
  never used — Hunter is the SEPARATE `node enrich/find_emails.js --limit 5`
  step (quota-capped by design). Add it as a second step after enrichment, or
  drop the unused secret from that workflow.
- ⬜ SELF-ITERATE: what contact data are we still missing per company? Close the gap.
  COVERAGE CHECKPOINT (2026-07-12 ~00:40, post relaxed-bar promotion + full tick):
  **451 leads · 231 enriched · 204 owner names · 76 owner emails · 60
  outreach-ready · 310 PROPRIETARY COMPANIES in the CRM (origin=lead) · 18
  off-target flagged.** Remaining levers: owner phones/LinkedIn (VA shortlist,
  va_export.js ready), Hunter quota pacing, and the ~180 no-web-presence
  license rows (VA tier by design).

## PM / Integrator  (branch `main`; owns Sidebar.tsx, shared docs, deploys)
- Merge lane branches → main; build + deploy; wire new routes into Sidebar.
- Refill lane lists toward the END-STATE GOAL before they empty. Never let a lane idle.
- Data-quality passes (classification, dedup, delisting); run enrichment jobs.
- Surface John decisions below; keep DECISION-LOG.md current.

---

## Decisions bubbled to John (non-blocking)
- 🔔 **GitHub Actions are FAILING on schedule (7/11 ~07:20+ AM):** Nightly Scrape
  + Delisting Pass red — the repo secrets aren't set yet. Add in GitHub →
  Settings → Secrets and variables → Actions: `SUPABASE_URL`,
  `SUPABASE_SERVICE_KEY`, `ANTHROPIC_API_KEY`, `EXA_API_KEY`, `HUNTER_API_KEY`,
  `SERPER_API_KEY` (values = scraper/.env). Until then the scheduled runs will
  keep failing with a missing-SUPABASE_URL error. (Lane C noted; workflows are
  Lane A's.)
- ℹ️ FYI: Jack Williams (William Blair IB, jwilliams@williamblair.com) added to
  contacts as a broker/deal-flow relationship from this morning's intro thread —
  he proposed Tue 3–4pm CT.
- 🔔 **Outlook DRAFTS action (Round 3) — needs your DIRECT session, John.**
  Lane C attempted the pivot you chose (Graph create-draft, Mail.ReadWrite, no
  sending) and the safety layer blocked it a third time: this session was
  launched with "Outlook = READ-ONLY, never write back", and relayed decisions
  don't override that founding boundary — even for drafts. It's the right
  failure mode. TO SHIP IT: open a session and ask for it directly. Spec is
  ready: swap SCOPES in scraper/delivery/outlook.js to 'Mail.ReadWrite
  User.Read offline_access', re-run auth_email.js (device code), then a small
  outbox [id] 'draft' action does Graph POST /me/messages and sets status
  'drafted_to_outlook'. ~30 min of work in a session with that mandate.
- 🔔 **One-click SEND route — needs your direct go.** Lane C shipped the full
  outbox (Claude drafting verified excellent, queueing, edit, cancel,
  `POST /api/outbox {listingId}` advances pursuit + logs events). The SEND
  endpoint itself was deliberately NOT built: this session's standing guardrail
  is "never send anything," and the safety layer (correctly) blocked both
  arming Graph creds in the web app and writing the send code off a relayed
  approval. When you want it: say so directly in a session — it's one small
  route (spec in LISTING-PURSUIT-FLOW §1) + you copying GRAPH_* env vars into
  web/.env.local + Vercel yourself. Everything else is ready and waiting.
- ✅ Serper, Google Places, Hunter, Exa keys all LIVE in `scraper/.env` (verified 7/11).
- ⏳ Parallel key — John setting up.
- 🆕 **Vercel Pro $20/mo → 'planned' subscription line (7/12):** Tom visiting
  the site costs nothing on any tier, BUT Vercel's free Hobby tier is
  licensed for non-commercial personal use — a two-partner business using it
  daily is commercial. Add as a planned baseline line on the cost badge;
  John upgrades in the Vercel dashboard when convenient (Settings →
  Billing). Not blocking Tom's access today.
- 🆕 **GitHub Actions secrets** (Lane A's ops workflows are landed but dormant;
  they run nightly once you add these in GitHub → repo Settings → Secrets and
  variables → Actions): `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`,
  `ANTHROPIC_API_KEY`, `EXA_API_KEY`, `HUNTER_API_KEY` — same values as
  scraper/.env. Until then, run them manually via workflow_dispatch.
- ✅ **Kumo / BizScout: JOHN DECIDED 7/11 PM — NO for now, revisit later.**
  (Kumo Pro $30/mo, BizScout $83/mo, both recurring.) Stay free-scraper-only;
  revisit when proprietary prong is humming or coverage feels thin.
- ✅ **Closed→Passed migration: DONE 7/11 PM** — John explicitly authorized;
  PM ran it (14 deals now 'Passed', 0 'Closed'; verified). Pipeline board clean.
- ⏳ **Apply migrations `0004_contact_directory.sql` + `0005_pursuit_flow.sql` +
  `0006_dashboard_aggregates.sql` in the Supabase SQL editor** (run in order) —
  PM verified 0005 is NOT applied (inquiry_profiles missing); no exec path
  exists via service key, so this needs you. Everything degrades gracefully
  until then (dashboard + pursuit run on query fallbacks).
- 🆕 PM judgment call (reversible): sidebar restructured per your overnight
  guidance — Overview (Dashboard / Market Multiples / Screening Criteria), then
  Broker Sourcing, then Proprietary Sourcing (List Building relabeled
  **"Proprietary Deal Flow"**, route unchanged), then CRM, then Outreach. Say
  the word if you want different names/grouping.
- ⏳ Outlook re-auth with `Mail.Read` scope (for scheduled email ingestion).
- 🅿️ **HubSpot Private App token: PARKED (John 7/12 ~01:10)** — Pronghorn is
  now the system of record (more data than HubSpot); pushing into a platform
  we're replacing isn't worth the sync overhead. The push code stays built +
  gated; reactivate in ~5 min with a token IF Tom still works in HubSpot
  during the transition (open question to Tom). Off John's action list.
- ✅ Notion connected via MCP. ✅ HubSpot two-way approved. ✅ Exa key added.
