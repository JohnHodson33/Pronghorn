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

**📋 MIGRATION STATE — PM DB AUDIT 7/13 ~10:00 (definitive; stop re-checking):**
0004–0010 ALL APPLIED (contact_directory, pursuit_flow, dashboard views +
outbox, outreach_tracks, enrichment_jobs + taxonomy, usage_events, feedback).
**MISSING: 0011 (feedback_comments) + 0012 (lead_lists.progress)** — both on
John's morning list. Build against the degrade paths until he runs them.

**📮 PM SESSION CHANGED (7/13 — CORRECTED ~01:20, the 00:15 id was WRONG):**
the prior PM session (local_29b1759e-…) is DEAD. The ACTIVE PM session id is
**`local_b552862b-ea9f-4559-8adc-400f0bbf8c58`** ("Pronghorn PM loop") —
send all cross-session status/reports there. (The earlier-posted
local_1c8f3b29-… does not exist — PM mis-derived it; replying to any message
FROM the PM also works.) First loop after pulling this: acknowledge in your
DECISION-LOG so PM knows the pointer landed. (TASK-QUEUE stays the durable
channel regardless.)

**🌙 AUTONOMY NIGHT ORDER (John, logging off 7/12 ~21:00 — verbatim intent:
"really push for the agents to self direct on creating new functionalities
or automations… so that Tom and I are not bottlenecks"):** tonight every
lane, beyond its queue: (a) post **≥2 improvement suggestions** to the brain
(POST /api/feedback, type='suggestion', author='Agent — <lane>') — bigger
swings for John's morning approval; (b) bias every build choice toward
REMOVING HUMAN CLICKS: schedule what is manual (runner cadence, auto-promote,
auto-draft on CONTACTABLE, auto-refresh lists), summarize what needs eyes
(receipts, digests, Key Actions) — the human touch should be approve/send/
sign, nothing else; (c) hard guardrails unchanged: nothing SENDS, nothing
destructive, spend within existing keys/plans. John's submitted feedback and
any 'approved' suggestions are top-of-lane the moment they appear.

**⚙️ SELF-ITERATE QUOTA (John 7/12 eve — "it feels like improvements only
happen when I prompt them"):** every lane ships **≥1 UNPROMPTED improvement
per night** — something you noticed by using the live site, not something
John asked for — and tags its commit `[self-iterate]`. ALSO: once migration 0010
is applied → **poll /api/feedback for status='submitted' EVERY loop
iteration**; Tom/John submissions on /improvements are top-of-lane priority.
PM lists each lane's self-iterate ship in MORNING-BRIEF so John sees
proactivity, not just responsiveness.

**⚙️ HANDOFF READINESS (PM rule, 7/12):** every worker keeps a short
"HANDOFF" section current at the TOP of its DECISION-LOG-<lane>.md (current
task, next 2, gotchas). Sessions die at context limits — a replacement session
must resume from one paste. PM watches lane commit recency and flags stalls
in MORNING-BRIEF.

**⚙️ CONTEXT ROLLOVER PROTOCOL (John 7/13 — "not scalable for me to notice
it"; ALL LANES, effective now):** when your session sees context-pressure
warnings from the harness (or you judge yourself past ~80%): (1) STOP taking
new units; finish + commit + push the current one; (2) refresh your HANDOFF
section (current task, next 2, gotchas, last commit hash) and add the line
"ROLLED OVER <date> — successor resumes here"; (3) send the PM session
(local_b552862b-ea9f-4559-8adc-400f0bbf8c58) a message titled "ROLLING OVER"
with your last commit hash; (4) go idle — no shared-doc writes after the
handoff commit. PM then: prepares the one-paste successor boot prompt,
surfaces it to John in chat + MORNING-BRIEF immediately (John's only action
= paste into a new session + Allow its hello), and covers any urgent lane
item in the gap. Do NOT wait until you're too full to write the handoff —
the handoff commit is the LAST thing you do, not the first thing you skip.

---

## Lane A — Brokers  (`scraper/sources/*`, `scraper/config.json`)
- 🔥🔥🔥 **JOHN APPROVED 7/13 (~01:45, explicit in PM chat) — your two AUTONOMY
  suggestions are GO, build both:** (1) **AUTO-PROMOTE T1 → PURSUITS:** nightly
  job opens a pursuit (stage 'new') for any Tier-1 listing clearing HARD
  criteria — priority state + CF $300K–$10M + thesis keyword + not delisted +
  not mirror-dup — each with a "why it qualified" receipt on the listing/deal;
  human touch = approve/reject (Pass action). Never contacts anyone. (2)
  **SOURCE-HEALTH DRIFT ALERTING:** trailing-7-run baseline per source; flag
  >25% count drop or null-financial-rate spike → compact digest to dashboard
  Key Actions (+ brain). Post-build: PM lists both in MORNING-BRIEF receipts.
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
- 📣 PM 7/13 ~15:00 — **LANE B: THE SIZE CONTRACT IS UP, START THE BUILD.**
  Lane C shipped it (merged + deployed): `/api/size-model` GET/PATCH =
  assumptions + Platform/Too-small thresholds (all editable, cascade on
  read); `/api/leads` + `/api/companies` rows carry always-present
  `size {tier platform|tuckin|toosmall, employees[], revenue[], ebitda[],
  confidence, basis}` + `est_revenue`/`est_ebitda` (null ⇒ blank) +
  `?tier=` filter + TIER_LABELS export for display names. Verified live on
  prod. Build now: Size Estimation tab (under Proprietary Sourcing) +
  ~est. Revenue / ~est. EBITDA columns on EVERY company/deal surface +
  Platform/Tuck-in/Too-small chips + tier filter. Amendment 3 (77a6cbf)
  is the spec.
- 📣 PM 7/13 ~09:30 — ✅ LANE B SWEEP (PM verified, all merged + live on
  prod): completeness UI c37126a · location truncate 4cc9684 · contacts
  industry 64a6cd6 · nav fix + CRM levels 8836564 · improvements dialogue
  c7e2fab · brand sweep a7fec41 · PWA ac50c30 · dispositions 1cf1c94 ·
  **Dashboard V3 241138f** (consumes 0006 views; already surfaced the Tree
  Service CIM→ready-to-promote in Key Actions). Lane B next: thread-count
  badges + outbox pill count, then the dead-end sweep vs END-STATE GOAL.
- ⚠️ LANE B HOUSEKEEPING (Lane C flag 7/13): your worktree's globals.css has a
  DUPLICATE mid-file `@import url(Playfair…)` that 500s YOUR dev server —
  main is fixed and prod is fine; pull main / dedupe locally.
- 🔥🔥🔥 **IMPROVEMENTS DIALOGUE (John in chat 7/12 ~23:45 — TOP OF LANE; screenshot
  feedback on /improvements):** John's exact words: "I wanna be able to actually
  have a dialogue with the agent before I click approve… and in that same
  conversation see status responses when things are completed and a summary of
  what was actually done. I don't wanna click approve willy nilly and have no
  idea what's actually getting put into the website." Build (with Lane C's
  comments API below): (a) each suggestion/feedback card opens a **THREAD view**
  — comments (John/Tom/Agent), status-change events inline (suggested →
  approved → building → shipped), completion summary rendered distinctly;
  (b) "Add detail" becomes **"Reply"** — composer posts a comment, and the card
  badges "agent reply pending" until the owning lane answers; (c) **Approve
  semantics**: button reads "Approve latest spec" and shows WHICH revision it
  approves (last agent reply = the build contract); after approve, the agent's
  first comment must be the BUILD PLAN, and on ship the thread gets the
  "what was actually done" summary + link; (d) mobile card layout per the
  standing parity rule. INTERIM (until Lane C's 0011 lands): render the
  existing body-append "— X adds:" segments as a pseudo-thread so John's
  amendments and PM replies already read as dialogue.
- 🔥🔥🔥 **COMPLETENESS LEVELS IN THE CRM + ENRICHMENT NAV FIX (John in chat
  7/12 ~23:59 — live feedback, do the nav fix FIRST, it's a 20-min unblocker):**
  (a) **NAV FIX:** from the Enrichment tab, clicking a company (name link and
  the CRM button currently both → /companies/[id]) strands John: the profile's
  back arrow goes to /companies, so working new-enrichments one-by-one means
  re-navigating to Enrichment every single time. Fix: company-profile back
  control returns to WHERE HE CAME FROM (?from= param or router.back() w/
  referrer fallback to /companies); ALSO drop the redundant duplicate click
  target on the Enrichment rows — keep the company-name link only. Acceptance:
  Enrichment → click company → profile → back → SAME enrichment list, scroll/
  filters intact, repeat for the next row without friction.
  (b) **COMPLETENESS ACROSS THE CRM:** the FULL/CONTACTABLE/IDENTIFIED/BASIC/RAW
  level must appear OUTSIDE the enrichment tab: level chip + channel dots as a
  column on /companies (and /contacts), a level FILTER + per-level counts
  header, combinable with the industry filter — John's stated query: "how many
  CONTACTABLE owners do I have in tree care across the full company database."
  Company profile shows its level near the header. (Lane C below serves the
  level server-side for companies; interim: derive client-side from owner
  contact channels.) Mobile parity per standing rule.
- 🔥 **BRAND ALIGNMENT PASS (John 7/12, PM started):** match the platform's
  cosmetics to pronghornequity.com. PM shipped: logo (public/pronghorn-logo
  .png) + dark forest sidebar + brand CSS variables in globals.css (--ph-navy
  -deep #17301F · --ph-green #2C5A43 · --ph-paper #FBF9F2 · --ph-ivory
  #EDE7D4 · --ph-gold #C9BD96 · --ph-gold-dark #A89A6F) + Playfair Display
  import + paper page background. LANE B FINISHES: sweep emerald-* accents →
  brand greens (buttons/links/chips), page H1s to Playfair (font-family
  var), keep readability AA; don't restyle data-dense tables beyond accents.
**⚠️ LANE B — YOUR "closes every 🔥" READ WAS STALE (PM 7/12 eve). PULL MAIN.
Your actual order:** (1) ENRICHMENT PROGRESS VISIBILITY UI + COMPLETENESS
LEVEL chips (below — John's top ask tonight); (2) ENRICHMENT ROUND 2 UI
(row-click→company profile, dots honesty, tier labels); (3) CONTACTS industry
column + filters; (4) LISTINGS table price/multiple/margin restore +
location truncate; (5) MOBILE PASS + PWA; (6) cold-calling dispositions —
YES, build against POST /api/outreach-tracks as the outcome contract
(disposition → outreach state + next_followup_due). /improvements page is
DONE (PM shipped it — extend, don't rebuild). Criteria auto-keyword button:
wire the existing POST /api/criteria/keywords ("hydraulic repair" → chip
set) into your new chips UI as a small follow-up.
- 🔥🔥 **IMPROVEMENTS PAGE (John 7/12 ~13:15 — Tom joins TODAY; read
  docs/IMPROVEMENTS-LOOP.md):** /improvements page: submit form (bug/idea/
  change, page, author John|Tom) → POST /api/feedback; status board
  (submitted→triaged→building→shipped) so Tom sees ideas move; agent
  self-review + roadmap panel (PM curates). PM wires sidebar entry on merge.
  Ship the basic version TODAY — the Haiku refine-chat step is v2.
- ✅ DECIDED (John 7/12 ~16:20): **Hunter Starter $49/mo APPROVED** — John
  upgrades in the Hunter dashboard (2 min; same API key, limits lift
  automatically); sub flips planned→active on the cost badge when done.
  **Hunter is ALWAYS part of the default cascade**: any Enrich click fires
  Hunter whenever contact info is still missing after the free tiers (early
  exit saves the cost when free sources complete the contact). **Skip-tracing
  DEFERRED** — run real Hunter reps first, measure hit rate, then decide;
  vendor recs on file (Tracerfy ~$0.02/rec pay-per-hit first sample, REISift
  $0.10 @ ~81% match) in the 7/12 chat + PM memory.
  → LANE C NOTE: cascade already fires Hunter for any lead missing email after
    free tiers (tier2.js), early-exit honored. Quota cap in tier2 (5/run) is a
    free-tier guard — LIFT it to a larger per-run budget once John's Starter is
    active (see Lane C item below).
- 🔨 LANE C — 🔥 **FREE OWNER-NAME UNLOCKS — SHAPE SHIPPED + RECON (7/12).**
  `enrich/sos_lookup.js`: per-state resolver registry wired into the tier-2
  cascade (resolved name → unlocks Hunter/LinkedIn); TX resolver LIVE via
  Socrata TDLR (verified). RECON (don't re-walk): AZ eCorp = SPA/won't resolve
  for scripted GET · FL Sunbiz = hard 403 to bots · OpenCorporates open API =
  401 (now token-gated). The public SoS SPAs are NOT cleanly scriptable.
  **DECISION FOR JOHN (bubbled):** other states unblock via one of — (a) extend
  the free Socrata pattern to states w/ a licensee open-dataset carrying owner
  names (proven, $0); (b) a cheap keyed API (OpenCorporates / skip-trace vendor,
  ~cents/lookup); (c) headless-browser resolver per priority state. Plumbing is
  live; each resolver activates the instant it's registered.
- 🔨 LANE C — 🔥🔥 **COST-BADGE ACCOUNTING FIXES — DONE + VERIFIED (John 7/12).**
  (1) No double-count: Hunter is a flat sub → usage now books $0 marginal +
  keeps units; 32 already-booked phantom rows zeroed ($5.80 → $0). (2)
  subsMonthly regression fixed: root cause was `/api/costs` selecting a
  `planned` column absent on the PM-seeded rows → PostgREST errored the whole
  subs query → subsMonthly=0; now `select('*')` + tolerant planned-derivation.
  **subsMonthly = $54** (Hunter $34 + Vercel Pro $20). (3) Hunter shows as
  **quota "73/500 searches"** not dollars; variableTotal now real ($3.11
  Claude/Exa/Serper); costPerContact $0.27 amortizes monthTotal $57.11 / 210
  owner contacts. `/api/enrich` estimate also de-Huntered ($0 marginal).
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
- ✅→🔥🔥 **SCRAPE CRITERIA REDESIGN — item (a) SHIPPED BY PM (7/13 ~00:40,
  John re-raised in chat):** the Subsectors card now has a one-line **"+ Add
  industry"** bar — type "hydraulic services", Claude brainstorms the full
  include/exclude keyword set (POST /api/criteria/keywords), the industry
  persists as a real chip (NEW: POST /api/taxonomy upsert) toggled ON, and
  keywords land in include/exclude lists. Verified live on prod. LANE B still
  owns the REST of this item (b–e below); don't rebuild (a).
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
- 🔨 LANE C — **BROKER_ID BACKFILL — RAN 7/13 (~12:45); honest result: 2/18
  linked** (James Feng, Phil Handke — both by email). The other 16 broker
  contacts are CURATED RELATIONSHIP people (Notion/HubSpot/deal imports:
  Oliver Bogner, Ron Edmonds, Jack Williams/William Blair, etc.) with NO
  record in the scraped listing-site directory — nothing to link to, working
  as designed. Matching: email-exact, then name-exact, then unambiguous
  token match (one false positive caught + reverted: "Bryant Bryant" ≠
  Bryant Hoover). LANE B: "in Contacts ✓" lights up only for directory
  brokers someone explicitly promotes — correct behavior; don't chase the 16.
- 🔨 LANE C — 🔥🔥🔥 **LIST-BUILD RUN VISIBILITY + 15-MIN DRAIN — SHIPPED
  (7/13, 6641c89; John's "queued · 0 found looks broken" complaint).**
  leadgen.yml now cron */15 (curl guard skips heavy steps when no pending
  lists; repo is public so Actions minutes are free); run_leadgen.js writes
  live progress per source stage into lead_lists (migration
  `0012_lead_list_progress.sql` — **PM: apply with 0011**; runner probe-
  degrades until then); GET /api/lead-lists serves `status_detail` per list
  ("Queued — the runner picks this up within ~15 minutes" / "Running — serper
  50 · osm 12…" / failure reason / "91 leads found") + POST returns the queued
  note. LANE B: render status_detail on the Proprietary Deal Flow list rows
  (replaces the bare status chip) — zero derivation needed, string is served.
- 🔨 LANE C — 🔥🔥 **SIZE-PROXY SIGNALS — CAPTURE SHIPPED (7/13, 1507f29);
  TIER MATH HELD for John's approval of card 37450f11.** tier-2 now grabs the
  LinkedIn company employee band into enrichment.size_signals (one Exa
  attempt/lead ever, verified live); tier-1 extraction returns size_signals
  {employees_stated, crew_count, fleet_size, locations} — stated numbers only;
  Places review_count already persisted at ingest (241/542 leads). Signals
  accumulate on every enrichment pass so the A/B/C tier build has data on day
  one. John also tied auto-enrich approval to size criteria on the digest card
  (9bb9d925 reply posted — rules-based spec is the pending build contract).
- 🔨 LANE C — 🔥🔥🔥 **FEEDBACK THREAD MODEL — BACKEND SHIPPED.** migration
  `0011_feedback_comments.sql` (feedback_comments + reply_pending col) +
  `GET/POST /api/feedback/[id]/comments` + feedback PATCH now auto-writes a
  status_change comment (thread = audit trail). Degrades cleanly pre-0011
  (verified). Nightly-digest [9bb9d925] correctly NOT built — John's concern
  already answered by PM's thesis-gate amendment, card still 'suggested'
  (awaiting his approve). Standing reply-before-build rule activates on 0011.
  **⚠️ Lane B/PM: your Pronghorn-frontend globals.css has a duplicate mid-file
  @import breaking that worktree's dev server — main is fine, live unaffected.**
  Lane B builds the thread UI on this API. **PM: apply 0011.**
  --- original card ---
- (a) migration
  `0011_feedback_comments.sql`: `feedback_comments` (feedback_id FK, author
  John|Tom|"Agent — <lane>", body, kind comment|status_change|build_plan|
  completion_summary, created_at) + `/api/feedback/[id]/comments` GET/POST;
  PATCH status writes a status_change comment automatically so the thread IS
  the audit trail. (b) **STANDING RULE (all lanes, replaces bare polling):**
  every loop, poll for suggestions/feedback with an UNANSWERED John/Tom
  comment → the owning lane replies with a refined spec BEFORE any build;
  the LAST agent reply is the build contract that Approve locks in. (c) On
  approve → post a build_plan comment (what will ship, where, est cost/time);
  on shipped → post a completion_summary comment (what actually changed,
  where to see it) + flip status. Nothing ships without its summary. (d)
  Wire the NIGHTLY DIGEST suggestion's amended spec (PM reply already on the
  card): thesis gate (active list + industry_verified in-taxonomy + not
  off_target), new lists start HELD (one activation decision per list),
  nightly $ + Hunter caps, digest = receipt + tonight's plan w/ pause. Do
  NOT start the digest build until John approves the amended card.
- 🔨 LANE C — 🔥🔥🔥 **OUTREACH DRAFT RULES — (a)+(b)+(c) SHIPPED 7/13 ~12:40
  (75f9a5e); AWAITING JOHN'S SAMPLE APPROVAL.** auto_draft_owners.js is now
  rules-gated (zero rules = zero drafts, verified live — works pre-0013 too)
  + tailored (each draft anchored on 1-2 concrete enrichment facts; leads
  without facts are SKIPPED) + provenance (draft_meta {rule, facts_used} on
  every outbox row post-0013). Migration `0013_outreach_rules.sql` — **PM:
  apply with 0011/0012.** THE GATE: 5 sample drafts on Tree Care CONTACTABLE
  owners are POSTED to /improvements (anchors like "1388 Google reviews at
  4.9", "50% Board Certified Master Arborists") with a proposed first rule
  (Tree Care · contactable · cap 5) — John approves/amends there; workflow
  step stays if:false until approval + first rule. (d) his 35 old drafts:
  inert, delete at leisure. Lane B: rules editor + "why drafted" line remain
  yours.
  --- original card ---
- 🔥🔥 **DEAL/COMPANY ATTACHMENTS + CIM INGEST (John 7/13 ~15:15 — received
  the All American Fence Erectors CIM via Axial; PM hand-built the records:
  company 35a33893 w/ CIM financials, deal ed791a49 stage 'CIM Received',
  Peregrine Advisors bankers as contacts):** (a) (Lane B+C) **attachments on
  company AND deal profiles** — extend the feedback-attachments pattern
  (private bucket `deal-attachments`, prefix {companyId|dealId}/, signed
  URLs, upload control + chips on both profile pages; CIMs/NDAs/LOIs live
  attached to their records). (b) (Lane C) **CIM/document ingest sweep**:
  scan John's Outlook (Graph, Mail.Read — consented) for deal-document
  attachments (CIM/IOI/LOI/NDA/teaser PDFs), upload to the bucket, attach
  to the matched deal/company, log an activity w/ provenance; backfill pass
  over existing mail (the AAFE CIM itself arrived via Axial phone/email).
  OneDrive/local-drive sweep = phase 2 (needs Files.Read consent — bubble
  to John). NEVER auto-delete or move mail.
- 🔥🔥🔥 **SIZE ESTIMATION — AMENDMENT 3 + UI COMPLETION (John 7/13 ~14:45;
  card 37450f11 flipped back to 'building' — server math shipped but John
  rightly notes NOTHING is visible on the site yet):**
  (a) **RENAME TIERS everywhere — "Platform / Tuck-in / Too small"**, never
  A/B/C (API values can stay internal but every label, chip, filter, and
  count reads the real words). (Lane C: rename in size.ts meta + API
  labels; Lane B: render accordingly.)
  (b) **Est. Revenue + Est. EBITDA columns on EVERY company/deal surface**
  — Enrichment tab, Companies, company profile header, Deals index + deal
  detail, outreach views. Columns ALWAYS present; blank (—) where no
  estimate; "~" prefix + provenance tooltip where present.
  (c) **Size Estimation tab under Proprietary Sourcing** (Lane B, with
  Lane C's 0014 assumptions table): per-industry payroll-%-of-rev +
  EBITDA-margin inputs AND **editable TIER THRESHOLDS** (Platform / Tuck-in
  / Too small boundaries in revenue and/or EBITDA terms) — all cascade on
  change, nothing baked. Seed thresholds: Platform ≥ $1M est. EBITDA;
  Tuck-in $250K–$1M; Too small < $250K (John can amend in the tab).
  (d) **PPP import (Lane C, next tick)** feeds the same math — until it
  runs, estimates rest on LinkedIn bands/reviews only; ship UI first so
  John SEES coverage grow.
- 🔥🔥🔥 **LEAD→CONTACT CHANNEL SYNC — ROOT-CAUSE FIX (John found it live 7/13
  ~14:00: A & B Lawn Service showed FULL + 2 dots on Enrichment but its CRM
  contact had NO channels — "I would not call that full… I assume there are
  many other examples"):** He was right: PM audit found **96/136 owner
  contacts stale** (lead had channels the contact lacked — promotion creates
  the contact once and later enrichment never propagates). **PM ran the
  one-time heal: 93 contacts updated, 112 channel fields filled
  (fill-blanks-only), A & B verified.** LANE C — fix the WRITE PATH so it
  never recurs: (a) whenever enrichment updates leads.owner_* on a lead
  with company_id, propagate to the matching owner contact (fill-blanks) in
  the same write; (b) promote_leads.js updates existing linked contacts'
  blank channels on every pass, not only at creation; (c) add the sync to
  the tier-2/run_jobs completion step. LANE B — company profile: if the
  owner contact still lacks a channel the LEAD has, show it with provenance
  ("from enrichment — not yet on contact") rather than blank. Acceptance:
  Enrichment-tab dots and the company profile can never disagree.
- 🔥🔥🔥 **JOHN'S VERDICT BATCH (7/13 ~13:15 in PM chat) — FOUR APPROVALS,
  effective now:**
  (1) **SIZE-PROXY CARD 37450f11 APPROVED WITH AMENDMENT (Lane C — top
  build):** add first-class **est_revenue + est_ebitda columns** from PPP
  data. Method (John's spec): annual payroll = PPP loan ÷ 2.5 × 12 (= loan
  × 4.8) → est. revenue = payroll ÷ industry payroll-%-of-revenue → est.
  EBITDA = revenue × 20%. **PM-researched initial payroll assumptions
  (editable table, like the taxonomy): tree care 40% · lawn care 35% ·
  pest control 33% · fencing 30%** (sources: TCIA payroll 40-55% of gross,
  field 30±5% + burden + office 10-12%; PCT/NPMA 2025 direct labor 26% +
  admin; Dan Mello interview 7/13: payroll 33-44% of rev; fencing =
  materials-heavier trade). Estimates are DIRECTIONAL/RELATIONAL by design
  (John: "prioritize size relative to other targets"). Caveats to encode:
  PPP capped comp at $100k/head (revenue biased LOW for high-wage firms —
  fine for ranking); 2020 payroll basis (relational OK; wage-inflation
  multiplier = calibration knob); use the LARGER single draw, never sum
  draws. UI (Lane B): est. revenue + est. EBITDA columns w/ "~" prefix +
  tooltip ("PPP-derived estimate"), sortable, beside size-tier chips.
  **AMENDMENT 2 (John 7/13 ~13:45): assumptions are UI-EDITABLE, math
  CASCADES.** (Lane B) a **"Size Estimation" settings tab** (same pattern
  as Scrape Criteria): per-industry inputs for payroll-%-of-rev (seeds
  above) AND **EBITDA margin % (seed 20 for ALL industries)**. (Lane C)
  store assumptions in an editable table (like taxonomy); **compute
  estimates at read time from raw PPP payroll × current assumptions —
  never persist baked revenue/EBITDA numbers** so one input change updates
  the whole DB instantly. Data source: SBA's public PPP FOIA dataset
  (data.sba.gov — full loan-level CSVs incl. borrower name/address/NAICS/
  loan amount/jobs; free download, no vendor needed). ALSO report **PPP
  match-rate per industry** vs our scraped companies so John can judge
  effectiveness + evaluate future baselining sources.
  (2) **DIGEST CARD 9bb9d925 APPROVED** — Lane C builds per the amended
  rules-based spec. (3) **PINNED VIEWS APPROVED** (card 5e13d986, Lane B).
  (4) **PAINTING/RESTORE SCREENING: DONE** — PM executed with John's
  approval (Green Industry Default 81→94 include keywords + 6 excludes via
  the criteria API; next nightly re-screens the backlog — Lane A verify
  painting listings appear after the run). **Sample-drafts card 611290ff:
  John still considering — auto-draft stays PAUSED.**
- 🔥🔥🔥 **OUTREACH DRAFT RULES + TAILORING (John in chat 7/13 ~11:15 after
  reviewing his Drafts folder — "I like the idea of the automation… but I
  don't think they should just auto draft… it's too broad and the content
  isn't tailored enough. I don't trust to click send."):** PM has PAUSED the
  auto-draft step in leadgen.yml (if: false) — do NOT re-enable until (c)
  below. (Lane C) (a) **DRAFT RULES — same design as the digest's
  auto-enrich rules (one rules engine if practical):** John creates explicit
  rules (industry allowlist — thesis-core only by default, HVAC et al.
  excluded until he says otherwise; min completeness CONTACTABLE+; min size
  tier once tier math ships; geography; nightly cap). **Zero rules = zero
  auto-drafts.** Leads outside rules are never drafted, period. (b)
  **TAILORING PASS:** rewrite the drafting prompt to anchor each email on
  SPECIFIC enrichment facts (site-scrape signals like certifications/years/
  services, city, industry specifics) in John's voice per
  docs/OUTREACH-STRATEGY.md — relationship-opener, never "are you selling",
  short. Outbox rows must show "why drafted" (rule matched + facts used).
  (c) **APPROVAL GATE:** generate 5 SAMPLE drafts on thesis-core tree-care
  CONTACTABLE leads → post to /improvements for John's review; resume
  auto-drafting only after he approves samples + at least one rule exists.
  (d) The 35 existing Outlook drafts: inert (nothing sends); John deletes at
  leisure; regenerate under new rules after (c). (Lane B) small surface:
  rules editor (reuse criteria chip patterns) + "why drafted" line on outbox.
- 🔨 LANE B — **(c) UI + (a) storage/endpoint SHIPPED 7/13 (lane/frontend):**
  `/api/feedback/[id]/attachments` (private bucket `feedback-attachments`,
  prefix-listing = metadata, NO migration needed — bucket auto-creates) +
  attach control on submit form + 📎 in every thread, chips w/ signed
  download links, mobile-verified. LANE C: only (b) PPP import remains.
- 🔨 LANE C — **(b) PPP SIZE IMPORT — SHIPPED 7/13 ~15:50 (308e8ff).**
  scraper/import_ppp.js: SBA 150k-plus PPP file (968k loans → 63k green-NAICS
  subset kept locally), conservative name+state match, 19/19 dry-run-validated
  → 19 leads gained PAYROLL-VERIFIED employee counts; **PLATFORM tier 1 → 10
  companies** (Tree Care of New York 120 jobs, Berger 111, All Turf 82, Tree
  Pros AZ 61…). jobs_reported ranks just under stated-on-site in tier math;
  Est. Revenue/EBITDA columns fill automatically. Re-run --match as new leads
  land (dataset static since 2021). Sub-150k files deliberately skipped: those
  borrowers are too-small tier by definition.
- 🔥🔥 **IMPROVEMENTS ATTACHMENTS + PPP SIZE DATA (John in chat 7/13 ~10:40 —
  "Tom should be able to attach analyses or data files… he's been using PPP
  loan databases to estimate company sizes"):** (Lane C) (a) Supabase
  Storage bucket `feedback-attachments` + `POST /api/feedback/[id]/attachments`
  (multipart upload, size/type limits, path recorded on a feedback_attachments
  table or 0011 comments extension) + signed-URL GET; (b) **PPP SIZE SIGNAL —
  fold into the size-proxy build:** SBA's public PPP loan data (company name,
  address, loan amount, JOBS REPORTED) is a free, high-quality size signal —
  loan ≈ 2.5× monthly payroll and jobs_reported ≈ employee count. One-time
  import of green-industry NAICS rows for our states → match to leads/
  companies by normalized name+state → size_signals.ppp = {loan, jobs, date}.
  Tom's own analyses become calibration inputs via the attachment upload.
  (Lane B) (c) attach-file control on the /improvements submit form + in
  thread replies; attachments render as chips w/ download links in the
  thread; mobile parity. Acceptance: Tom attaches a spreadsheet to a
  suggestion; the owning lane can download it; PPP-derived employee counts
  appear in size_signals for matched companies.
- 🔨 LANE C — 🔥🔥🔥 **MEETING-NOTES LIVE SWEEP — (a)+(b)+(c)+(d) SHIPPED 7/13
  ~13:35 (a7f0324).** `ingest_notion_meetings.js --live`: polls Notion for
  pages edited in the window (John's token + NOTION_TOKEN_TOM when Tom
  connects), Claude auto-tags to company/deal/contacts + summary w/ action
  items, idempotent on PAGE ID (survives URL-form differences), NEVER
  overwrites hand-cataloged entries (verified live against the PM's Dan Mello
  exemplar — left untouched), Dan-Mello people-detection w/ hard gates (full
  verbatim names only, no partners, no inferred firms), unmatched notes →
  dashboard Key Action `note_needs_tagging` (verified on dev; excludes
  contact-attached notes). Wired into outlook-sync.yml every 3h — **needs
  NOTION_TOKEN as a GH secret** (+ANTHROPIC_API_KEY already listed). LANE B:
  Key Actions card for note_needs_tagging → tap opens the note + a company
  picker; "Log meeting" paste box (Option B) still open as manual fallback.
  --- original card ---
- 🔥🔥🔥 **MEETING-NOTES PIPELINE — LIVE SWEEP + INPUT UI (John in chat 7/13
  ~10:20 — "the CRM includes all of the notes very easily… automated fashion…
  scrape Tom's Notion too… tag it to the right company or deal"; builds on
  docs/MEETING-NOTES-DESIGN.md + ingest_notion_meetings.js which already
  exists for curated dumps; PM hand-cataloged today's Dan Mello advisor note
  as the pattern exemplar — see contact 7b39286a + its meeting activity):**
  (Lane C) (a) LIVE SWEEP: extend ingest_notion_meetings.js with --live —
  poll the Notion API for new/edited AI meeting notes since last run.
  **NOTION_TOKEN IS LIVE (John added 7/13 ~11:10; PM synced to all worktree
  scraper/.env files + verified via API — currently sees 1 page, today's
  Dan Mello note). John is re-sharing the PARENT notes location so future
  notes inherit access; build the sweep now. Setup guide for Tom:
  docs/NOTION-CONNECT.md (his token will be NOTION_TOKEN_TOM).** (b) AUTO-TAG: Claude matches each note against
  CRM companies/contacts/deals (names, domains, attendee emails) → writes
  kind='meeting' activity w/ doc_url provenance (idempotent per URL) +
  confidence; ALSO auto-detect advisor/broker/owner people mentioned w/
  contact info → create/enrich contacts (Dan Mello pattern); (c) LOW
  CONFIDENCE → 'needs tagging' review queue surfaced in dashboard Key
  Actions, never silent-dropped; (d) wire into an existing 15-min/nightly
  workflow. TOM: same integration token pattern — Tom shares his workspace
  (or his notes teamspace) with the integration once; document the 2-min
  step for John to send him. (Lane B) (e) NOTES INPUT UI: "+ Add note"
  (global + on company/deal/contact pages): paste a Notion link OR raw
  text → server suggests tags as chips w/ confidence (company/deal/contact,
  editable) → user validates → saves as activity; (f) 'needs tagging'
  review list for sweep leftovers; (g) mobile parity per standing rule.
  Acceptance: John finishes a meeting, does NOTHING, and the note appears
  on the right company/contact feed within the sweep interval — or pastes
  a link and confirms tags in two clicks.
- 🔥🔥🔥 **LIST-BUILD RUN VISIBILITY + FASTER DRAIN (John in chat 7/13 ~00:50 —
  his Lawn Care National list sat "queued · 0 found" 15 min and read as
  BROKEN; "this is a very core functionality"):** (Lane C) (a) shorten
  `.github/workflows/leadgen.yml` cadence from 2×/day to **every 15 min**
  (same pattern as enrichment-jobs.yml — cheap no-op when queue empty);
  (b) add progress fields to lead_lists (status pending|running|complete|
  error + started_at + per-source progress jsonb: source running, candidates
  seen, leads inserted so far) and have run_leadgen.js update them as it
  works; (c) optional instant-trigger: POST /api/lead-lists fires a
  workflow_dispatch via GH token if present in env. (Lane B) (d) "Recent
  lists" rows show HONEST live status: queued → "queued — runner picks this
  up within 15 min (next pass ~HH:MM)"; running → live progress ("serper_maps
  — 38 found of target 100…") via polling; complete → result + link; error →
  say so. Same design language as the enrichment progress banner. NEVER let
  a queued list read as a malfunction. Acceptance: John builds a list,
  watches numbers move or sees exactly when it will run, and is told when
  it's done.
- 🔨 LANE C — 🔥🔥🔥 **COMPANY-LEVEL COMPLETENESS — SHIPPED.** `companyCompleteness()`
  added to `web/lib/completeness.ts` (same ladder, computed from owner-contact
  channels — one module, ladders can't drift). `GET /api/companies` returns
  level + per-level counts + `?level=` filter combinable with `?industry=`/
  `?origin=`/`?q=`; `GET /api/companies/[id]` returns the company + its level.
  Verified: company split 14 full / 58 contactable / 138 identified / 118 basic;
  **John's acceptance query answers — 34 CONTACTABLE+ owners in Tree Care.**
  Lane B renders the chips/filter/counts on /companies off this.
  --- original card ---
- 🔥🔥🔥 **COMPANY-LEVEL COMPLETENESS SERVER-SIDE (John in chat 7/12 ~23:59,
  pairs w/ Lane B's CRM levels item):** extend the completeness single source
  of truth (web/lib/completeness.ts) to COMPANIES: compute a company's level
  from its owner contact(s) channels (owner contact role=owner: name/email/
  phone/LinkedIn) — same FULL/CONTACTABLE/IDENTIFIED/BASIC/RAW ladder.
  /api/companies (list) returns level + per-level counts + supports
  ?level= filter combinable w/ industry; company detail includes it. Keep
  lead-level and company-level logic in the one module so the ladders never
  drift. John's acceptance query: "count of CONTACTABLE owners in tree care
  across the whole company DB" answerable in one filtered view.
- 🔥🔥🔥 **SIZE-PROXY SCORING for the proprietary funnel (John in chat 7/13
  ~01:05 — "we're really gonna need to solve this to make the proprietary
  funnel effective"; design card posted to /improvements for his amendments):**
  proprietary leads have no financials, so the cash-flow guardrails can't
  screen them — build a SIZE ESTIMATE from free signals so outreach targets
  acquirable-size companies first. (Lane C) (a) capture size SIGNALS:
  Google reviews count + rating (Places already returns it — persist at
  ingest like we did locations), LinkedIn company-page employee band (Exa,
  already in tier-2 path), website extraction adds employee_count / fleet
  size / locations count / years_in_business / service-area breadth to the
  Claude enrichment prompt (same call, no new cost); license boards where
  they list tech counts. (b) estimate: `size_signals` jsonb + per-industry
  revenue-per-employee benchmark table (landscaping ~$120-160k/emp, tree
  ~$150-200k, pest ~$150k; editable like taxonomy) → revenue RANGE →
  EBITDA RANGE via industry margin bands. Always ranges + confidence,
  never point estimates. (c) `size_tier` A|B|C|unknown server-side:
  A = likely anchor ($1M+ EBITDA plausible), B = tuck-in, C = too small;
  computed in the completeness module family (single source of truth).
  (d) calibration loop: when a pursuit yields real financials (CIM),
  log actual-vs-estimate to tune benchmarks. (Lane B) size-tier chip +
  filter on enrichment/companies/contacts, combinable w/ completeness +
  industry ("CONTACTABLE tree care, tier A"); outreach queue + auto-draft
  prioritization sort by tier; dashboard coverage by subsector × size tier.
  PAID upgrades (bubble to John, do NOT buy): ZoomInfo/Apollo/D&B give
  employee counts + revenue estimates ~$/lead if free signals prove thin.
- 🔥🔥 **INDUSTRY_VERIFIED NORMALIZATION (Lane B finding 7/12 late, PM relay):**
  classifier output fragments ("Tree care" / "Tree care services" / "Tree Care"
  = 3 different filter chips; same for Pool Service/Pool Services) — every
  industry count in the app splits. Fix: (a) classification prompt + write path
  SNAP to canonical `/api/taxonomy` labels (nearest-match, else 'Other —
  <raw>'); (b) one-time normalization pass over existing leads.industry_verified
  + contacts joins; (c) verify chips collapse on /contacts + /enrichment after.
- 🔨 LANE C — 🔥🔥 **RUNNER SELF-DRAIN + CASCADE NO-OP — FIXED + SHIPPED.**
  (a) `.github/workflows/enrichment-jobs.yml` drains the queue every 15 min +
  every worker loop pass. (b) `run_jobs.js` now CASCADES: tier-1 for new leads,
  then `enrich/tier2.js` (Hunter email + Exa LinkedIn, early exit when owner
  complete, quota-budgeted, no company-line phones) for enriched-but-incomplete
  — never no-ops. Live test: 10/15 LinkedIn URLs found. (c) website-discovery
  already exists in run_enrichment.js (Exa, --retry-skipped). `/api/enrich`
  estimate is now cascade-aware (tier1+tier2, verified: 21+7 → $0.28); job
  progress counts update live for the UI banner.
- 🔨 LANE C — 🔥🔥🔥 **COMPLETENESS LEVELS — SHIPPED.** `web/lib/completeness.ts`
  (FULL/CONTACTABLE/IDENTIFIED/BASIC/RAW, single source of truth) + `/api/leads`
  computes level server-side, sorts most-complete-first, returns per-level
  counts. Live: 451 leads = 14 full / 62 contactable / 128 identified / 239
  basic / 8 raw. Lane B: render dots + filter + counts header off this.
- 🔨 LANE C — 🔥🔥 **FEEDBACK PIPELINE — SHIPPED (Tom joins today).**
  `0010_feedback.sql` + `/api/feedback` GET/POST/PATCH (author John|Tom, type,
  page, lifecycle submitted→triaged→building→shipped→verified, per-status
  counts). Degrades w/ apply-0010 note (verified). Lane B builds /improvements
  on this. STANDING RULE now active for Lane C: each loop polls
  ?status=submitted, triages Lane-C items, flips 'triaged'.
- ✅ Contact-carry (Sage Tree Care) + Hunter $49 / Vercel Pro $20 planned subs
  — done in promote_leads.js + migrations 0009/0010.
- 🔨 LANE C — 🔥 **LOCATION POLLUTION — CLEANUP DONE (Lane C half).**
  `scraper/cleanup_locations.js` re-derived city/state for all 49 polluted rows:
  5 recovered a clean city (Portland/Pittsburgh/Cleveland + 2 counties w/ state
  prefix), 44 nulled as unrecoverable (case-glue/dedupe validator rejects junk
  like "LouisvilleLouisville"). **0 polluted rows remain.** ⬜ LANE A STILL OWES:
  fix the tupelomarket + businessbroker parsers so description text stops
  landing in listings.city at source (re-run cleanup_locations.js after).
- ✅ LANE C — **owner_phone attribution audit (John 7/12 ROUND 2 item c) — DONE.**
  Found 11/25 owner_phones were the company MAIN LINE (inflating "contactable").
  Demoted all 11 to enrichment.business_phone (owner-contactable dropped to the
  honest 75). Prevention: extraction prompt now separates owner cell vs
  business_phone, and the write path demotes any owner_phone that equals the
  lead's company phone. Won't recur.
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
- ✅ LANE C — 🔥🔥 **OUTLOOK DRAFTS + LIVE INGESTION — LIVE (John consented
  7/12 ~22:25; verified end-to-end).** Mail.ReadWrite + Mail.Read both active.
  (a) `POST /api/outbox/[id] {action:'draft'}` + `scraper/push_drafts_to_outlook.js`
  create drafts in John's Outlook DRAFTS folder — **ran: all 25 auto-drafted
  owner-outreach emails pushed to his Outlook** (review + send there; auto-send
  still a permanent 403). (b) `ingest_pursuit.js --live` reads Graph Mail.Read —
  **ran: first live scan advanced/reviewed real mail** (flagged an unmatched
  "Data Room Invite" from Oliver for manual review — see Decisions). (c)
  `.github/workflows/outlook-sync.yml` schedules both every 3h (needs GRAPH_*
  repo secrets). NOTHING sends — John's send is the only human touch left.
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
- 🔨 LANE C — **AZ owner-name resolver — SHIPPED (7/13 AM).** AZ ROC publishes
  ALL ~58k active contractor licenses as a public CSV (roc.az.gov/posting-list)
  incl. **Qualifying Party** = the licensed person. Registered as the 'AZ'
  resolver in enrich/sos_lookup.js (weekly-cached download, exact-name match w/
  suffix stripping, filters "QP Exempt" + org-shaped QPs). Live: 2/43 nameless
  AZ TREE CARE leads resolved+persisted (tree work is mostly ROC-exempt — the
  hit rate on AZ landscape/HVAC/plumbing/electrical lists will be far higher
  since those REQUIRE a ROC license). Supersedes the dead AZ eCorp recon path.
- ⬜ More state license boards (GA, SC, TN, FL; AZ OPM for pest) — recon
  logged in DECISION-LOG-integrations (GA Kelly blocked, FL = Power BI, TN
  empty). NC RECON 7/13: no free path — the landscape board
  (public-nclclb.arlsys.com) is search-UI only, and NC SOS bulk data (which
  DOES carry officers/company officials, weekly CSV) is a PAID data
  subscription — falls under John's pending SoS decision option (b).
- ⬜ Login-network sync — Axial (co-pilot + CIM ingest) + DealForce (creds in .env).
- 📝 COORDINATION NOTE for Lane A (enrichment.yml): contract verified — the
  workflow's `node enrich/run_enrichment.js --limit N` + env vars match Lane C's
  CLI exactly and will run clean in CI. One gap: HUNTER_API_KEY is passed but
  never used — Hunter is the SEPARATE `node enrich/find_emails.js --limit 5`
  step (quota-capped by design). Add it as a second step after enrichment, or
  drop the unused secret from that workflow.
- ⬜ SELF-ITERATE: what contact data are we still missing per company? Close the gap.
  COVERAGE CHECKPOINT (2026-07-13 ~08:20 loop pass): 40-lead tier-2 batch →
  **FULL 51 · CONTACTABLE 60**, +4 owner LinkedIn, +2 LinkedIn employee bands
  (size signals now accumulate on every pass), 0 Hunter emails (named backlog
  has used its one-attempt each — remaining unlock is owner NAMES: SoS
  resolvers beyond TX, or the VA tier). 10 fresh owner drafts queued to outbox
  (queue-only). NOTE: the queued HubSpot re-import (breadcrumbs→0004 columns)
  was BLOCKED by the safety layer as bulk PII export on relayed authority —
  same ruling class as prior sessions; needs John to ask for it directly in a
  session (2-min task then). Low urgency, contacts usable as-is.
  PRIOR CHECKPOINT (2026-07-12 ~20:05, two tier-2 batches w/ Hunter Starter):
  **completeness now FULL 50 · CONTACTABLE 58** (FULL was 14 → 33 → 50 across two
  40-lead tier-2 passes: +16 verified owner emails, +54 LinkedIn URLs total).
  Hunter spend ~$3 (30 searches, trivial vs 500/mo Starter). ~20 incomplete-named
  leads still un-tier-2'd (next passes). owner_phone attribution fixed. Note: a
  few Hunter skips are "owner_name" that's actually a company/LLC name (not a
  person) — a data-quality tail, low value to chase. ~180 no-web license rows
  are the VA tier by design.

## PM / Integrator  (branch `main`; owns Sidebar.tsx, shared docs, deploys)
- Merge lane branches → main; build + deploy; wire new routes into Sidebar.
- Refill lane lists toward the END-STATE GOAL before they empty. Never let a lane idle.
- Data-quality passes (classification, dedup, delisting); run enrichment jobs.
- Surface John decisions below; keep DECISION-LOG.md current.

---

## Decisions bubbled to John (non-blocking)
- 🔔 **The Pronghorn GitHub repo is PUBLIC (Lane C noticed 7/13):** the code
  AND the strategy docs (thesis, TASK-QUEUE, decision logs) are world-readable
  at github.com/JohnHodson33/Pronghorn. No secrets/PII are committed (verified
  rules hold), but competitors could read the playbook. Trade-off: making it
  private moves GitHub Actions onto the 2,000 free-min/mo meter — our two
  */15-min workflows would consume roughly 3–6k min/mo (idle ticks are cheap
  but not free). Options: (a) keep public (free automation, open playbook),
  (b) go private + accept ~$8–30/mo Actions overage, (c) go private + move
  schedules to a local runner. John's call; PM can flip visibility in repo
  Settings → General → Danger Zone.
- ✅ RESOLVED (Lane C, 7/12 eve): the unmatched Landmark/Oliver "Data Room
  Invite" gap is CLOSED — built `scraper/ingest_deal_mail.js` (--live) that
  matches broker mail to KNOWN DEALS by broker email→contact→deal and logs it
  as flagged activities (read-only; flags pursuit signals, never auto-moves a
  live deal's stage). Ran it: Landmark deal now has Oliver's Data Room Invite +
  both Process Letters logged as ⚑-flagged activities. Wired into
  outlook-sync.yml. **Your Landmark data room is OPEN — go pull the CIM.**
- 🔔 **25 owner-outreach drafts are in your Outlook Drafts** (auto-drafted on
  CONTACTABLE, pushed on your consent). Review + send the ones you like; nothing
  was sent. New CONTACTABLE owners get drafts nightly via the workflow.
- 🔔 **Owner-name lookups beyond TX need a small call (Lane C, 7/12):** free
  public SoS registries (AZ/FL/etc.) are bot-hostile SPAs and OpenCorporates
  went token-gated — none scriptable free at scale. Pick the path: (a) I extend
  the free Socrata license-dataset pattern state-by-state (proven, $0, but only
  states that publish licensee data w/ owner names); (b) buy a cheap keyed
  lookup (OpenCorporates or a skip-trace vendor, ~cents/lead) and I wire it into
  the resolver registry that's already live; (c) headless-browser resolvers per
  priority state (bigger build). TX already resolves names for $0 today.
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
