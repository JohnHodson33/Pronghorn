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

**📮 PM ROLLOVER COMPLETE + LANES RESUMED (7/16 ~00:10):** the prior PM
(local_b552862b, "[DEAD] Pronghorn PM loop") handed off; the NEW PM is LIVE
and looping. **John resumed all three lanes by pasting the restart prompts
INTO THE ORIGINAL SESSIONS (not fresh ones) — this is FINE**: the harness
auto-compacts their history and the boot prompts rebuild state from docs, so
**the session roster: Brokers local_56a6eb86-… · **Frontend successor #3 = local_429a0be5-… (started 7/16 ~15:15; the old local_38d3b5d9 is DEAD/retired)** · Frontend-OLD
local_38d3b5d9-… · CRM/Data local_32385d95-… (all running as of 7/16 00:08).
Lanes: your earlier in-session instructions may be stale post-compaction —
**TASK-QUEUE.md is the priority source**, trust it over anything you
half-remember. Migrations 0011–0014 APPLIED (PM verified); 6 GH secrets +
Vercel NOTION_TOKEN set; runners self-driving. **DURABLE COORDINATION
CHANNEL = THIS FILE + your branch**: (1) commit status to your
DECISION-LOG-<lane>.md HANDOFF section + push every unit; (2) cross-lane/PM
notes = 📣 lines here. PM polls all three branches every loop and merges
continuously. Do not message local_b552862b (retired PM).

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
- ⬜ **RIVER GUIDES: consolidator-sweep refresh (LATER — not tonight; after
  your current queue):** periodic re-run of the acquisition-log queries per
  consolidator (docs/RIVER-GUIDES-INTEGRATION.md step 9 + spec §7 maps at
  the local path noted there) → new add-ons enter the river_guides lifecycle
  as NEEDS_NAME/RESOLVED rows. Hallucination guard is a hard rule: no
  invented names/domains, unverified = TBD.
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
- 🔥🔥🔥 **ENRICHMENT RUN VISIBILITY ON RIVER GUIDES + KILL THE DOTS (John
  7/16 ~12:50 — TOP OF LANE, supersedes ordering below; his words: "I click
  the button, I have no idea if it's actually working, no idea when it's
  complete, no idea what has actually occurred… if Tom were to use it he'd
  have no idea. Too hard to track."):**
  (Lane C — the state) (a) POST /api/river-guides/enrich creates a RUN
  record (reuse the enrichment_jobs pattern: kind='river_guides', total,
  processed, found_email, found_linkedin, found_phone, escalated_paid,
  state queued|running|done + started/finished_at); enrich_t1.js updates it
  per lead as it works and closes it with the receipt; GET
  /api/river-guides/runs serves active + last-5 runs. Worker picks up
  queued runs within its loop/cron cadence — and the run row must say
  honestly "queued — worker starts within ~15 min" until it flips running.
  (Lane B — the visibility) (b) **sticky progress banner** on /river-guides
  the moment a run exists: "Enriching river guides: 34/54 processed — 22
  emails, 12 LinkedIns, 6 → paid queue" — live (poll ~5s while active);
  (c) **completion banner/toast + durable receipt**: "Done 13:17: 52
  processed → 35 emails, 20 LinkedIns, 15 → paid review (hit rate 71%)"
  with a 'view results' link that applies the right filter; last-run
  receipt stays visible on the page (Tom sees what happened without any
  chat); (d) **REPLACE the 3 contact dots with THREE LABELED COLUMNS —
  Email / Phone / LinkedIn — showing the ACTUAL VALUES** (truncated,
  mailto:/tel:/profile links, — when missing) so filled-vs-empty is
  obvious per row and populates LIVE during a run; (e) **per-row status
  chip** in John's terms: Pending · Enriching · Enriched · Needs paid ·
  Name first (not the raw enum); (f) same columns treatment on the
  ENRICHMENT tab + anywhere else contact dots exist — the dots pattern is
  RETIRED platform-wide. ACCEPTANCE (John's test): click Enrich → watch
  numbers move → told when done + what happened → see exactly which people
  gained which channels, all without asking an agent. Mobile parity.
  **SAME UNIT — LAYOUT + REACHABILITY + SORT (John 7/16 ~13:00):**
  (g) **FULL-WIDTH TABLE**: /river-guides drops the max-w-6xl cage — data
  tables use the whole viewport to the right margin ("an extra forty
  percent of the page we're just not using"); with Email/Phone/LinkedIn as
  real columns this should kill horizontal scroll at laptop widths. Where
  any table still overflows: the h-scrollbar must be USABLE —
  sticky/always-visible, never only at the foot of a 200-row list ("having
  to scroll all the way down just to see the right-hand columns is
  terrible").
  (h) **REACHABILITY FILTER**: channel-presence dropdown — Has phone / Has
  email / Has LinkedIn / Any channel / No channel — combinable with band
  ("101 Call-nows but only a fraction have phones I can call" → 'Call now
  + Has phone' = the actual call list). Band chips show reachable counts
  ("Call now · 16 · 9 reachable").
  (j) **VERIFICATION EVIDENCE VISIBLE (PM 7/16 ~13:50)**: the status-
  verify worker stores its evidence in notes (e.g. "LinkedIn shows
  Principal at Apex Land Group") — surface it on the row (expand/hover on
  the exit chip) so John/VA can adjudicate the inconclusives in seconds;
  first verify pass: 30 checked -> 3 auto-verified, the evidence on the
  other 27 is the human-review gold.
  (i) **SORTABLE HEADERS**: click Name/Industry/Exit/Score/Year/State to
  sort asc/desc (score + year = the quantitative stack-rank).
- 🔥🔥 **RIVER-GUIDES ENRICH PRICE ESTIMATE (John 7/16 ~12:30 — "give me a
  price estimate before I click Enrich, same as companies; I want to be
  conscious of marginal cost"):** (Lane C) extend POST /api/river-guides/
  enrich to accept {estimate:true, dealIds} → returns WITHOUT queuing:
  {count, eligible, breakdown: {hunter: {calls, marginalUsd: 0, quotaUnits},
  linkedin_verify: {searches, estUsd}}, totalEstUsd} — mirror the
  /api/enrich estimate math (Hunter = quota units not dollars; Serper/
  Claude verify = the real pennies; add a skiptrace line only if/when that
  tier wires in for guides). (Lane B) the button becomes **"Enrich selected
  (est. $X · N Hunter)"** — fetch the estimate on selection change
  (debounced), split shown in a tooltip, post-click receipt stays honest
  vs the estimate. Mobile parity.
- 🔥🔥 **⚖️ LIST-UX STANDARD — ONE PATTERN EVERYWHERE (John 7/16 ~13:00,
  STANDING RULE for every list page; his words: "sometimes there are
  dropdown filters up top, sometimes clickable chip lists off to the side
  — which I really don't like — sometimes column-header dropdowns… we
  should just have these consistent across the whole site"):** THE
  standard for every table (listings, companies, contacts, brokers,
  deals, enrichment, river-guides, lead lists):
  (1) top bar = free-text search + count chips for the page's key split
  (band/level/tier) + CSV export; (2) **column headers do the work**:
  click to sort asc/desc (every column, quantitative included), dropdown
  filter on categorical columns (multi-select w/ counts); (3) NO side
  chip-list filters — retire them wherever they exist; (4) filters+sort
  serialize to URL params and survive back-nav (pattern exists); (5) data
  tables are FULL-WIDTH (no reading-width cage) w/ usable overflow
  scrolling; (6) card collapse under 640px. Extract ONE shared component
  set (FilterDropdown/SortHeader/ListShell) and MIGRATE page by page —
  each migrated page ships in its own commit. Where this contradicts
  older cards below, THIS wins.
- ✅→🔨 **RIVER GUIDES UI — JOHN'S 7/16 ~00:50 DIRECTIVE (page SHIPPED
  overnight + Sidebar wired by PM; remaining sub-items fold into the
  visibility/layout card above):**
  (a) **"River Guides" page under Proprietary Sourcing** (PM wires Sidebar
  on merge): shared list pattern — filters + counts header for priority band
  (CALL_NOW / ENRICH_THEN_ASSESS / NURTURE / RESOLVE_NAME_FIRST), industry,
  enrichment status, exit status (chip shows ⚠ unverified vs ✓ verified),
  state; default sort = band then screen_score desc; checkbox select →
  **"Enrich selected (est. $X)"** (reuse the enrichment progress UI); row →
  linked contact/company profile; CSV export = the VA handoff for the paid
  tier; search; mobile parity per standing rule. (b) **Contacts page: "River
  Guide" filter chip** + river-guide panel on contact profiles (band, exit
  status, former company + acquirer/sponsor, verification state). (c) Show
  the former-company link on company profiles ("sold to <acquirer>, <year> —
  former owner is a River Guide prospect"). (d) **"Find more" discovery bar**
  on the River Guides page (John 7/16 ~01:15 — the page is a sourcing tool,
  not a repository): pick industry / consolidator (or type a new one) → runs
  Lane C's POST /api/river-guides/discover → live progress (reuse enrichment
  progress UI) → new candidates appear in the list banded RESOLVE_NAME_FIRST
  /CALL_NOW etc. Nothing here sends anything.
- 📣 LANE C 7/16 ~14:55 — **ANSWER TO JOHN'S "should the advisor tag become
  river guide?" — DATA SAYS KEEP BOTH, and the exemplar was hiding in the
  CRM.** Audited all 47 `advisor` contacts: 46 are SERVICE PROFESSIONALS
  (DLA Piper counsel, Kroll, Cetane, accountants, recruiters — HubSpot
  imports classified by firm domain). Renaming advisor → river_guide would
  mis-tag every one of them. The tags are orthogonal: **advisor = people who
  advise us professionally · river_guide = exited operators we recruit for
  equity.** Recommend keeping both (no rename) — your call stands.
  **BUT: exactly ONE advisor was a true river guide — Dan Mello** (Seacoast
  Tree Care, exited to LawnPro 12/2024, notes literally say "open to
  advisory board / diligence / CEO eval"). He predates the channel, so the
  433-row sweep never had him and he'd have been missing from the River
  Guides page you open. ADDED as RG-CRM-001: score 85, **CALL_NOW, already
  VERIFIED** (first-party — you met him 7/13), linked to his existing
  contact. ⚠️ his non-compete runs through 12/14/2026 (NE corridor) — noted
  on the row; respect it in any sourcing ask. His contact role left as
  'advisor' pending your tag decision (nothing destructive done).
  Channel health: 249 river-guide contacts, 100% company-linked, 0 dupes,
  0 advisor collisions.
- 📣 LANE C 7/16 ~12:50 — **STATUS + ONE SQL ASK (0018).** Enrichment Jobs CI
  is GREEN again (19:18Z — secrets-timing as diagnosed). Outlook Sync's
  failure ROOT-CAUSED and durably fixed on branch: Microsoft rotates Graph
  refresh tokens on use; CI's rotated copy died with the ephemeral checkout,
  staling the GH secret (invalid_grant). Fix = shared token store
  (app_config, in 0018) all runners read/write; sync steps now
  continue-on-error so one failure can't skip drafts/Notion. JOHN'S ONE SQL
  FILE: **0018_size_amendment4.sql** (amendment-4 columns + payroll seeds +
  Fencing row + app_config; 0017-as-applied was pe-only and file now matches
  exactly). pe backfill RAN: 250 river-guide companies flagged pe_owned w/
  acquirer (sponsor) — the PE filter has ground truth today. Amendment-4
  payroll math LIVE (Berger: PPP $1.6M ×4.8 ×1.25 ÷30% → $27-36M rev);
  re-tier: platform 12 / tuckin 96 / too_big 52. Still outstanding: SERPER+
  ANTHROPIC in web env (discover bar) · sample card 611290ff (auto-draft
  unlock).
- 📣 LANE C 7/16 ~12:10 — **RIVER GUIDES CHANNEL IS LIVE END-TO-END.** John's
  SQL pass landed → seeded + first worker batches done: **433/433 rows
  ingested (0 errors), 236 river-guide CONTACTS + 236 former-company records
  in the CRM** (each company tagged acquired-by-consolidator = PE ground
  truth). Bands: CALL_NOW 95 · ENRICH 127 · NURTURE 14 · RESOLVE_NAME 197.
  First batches: **13/30 CALL_NOW status-VERIFIED** (contactable pending
  John's review; rest stayed honestly unverified) · **14/25 TBD names
  RESOLVED with source URLs** (Mariani founders page, Canopy, A Plus Tree
  PRs — never guessed; 11 stayed TBD) · tier-1 contact enrichment running.
  /api/river-guides serving Lane B's live page (95 CALL_NOW verified working
  on prod after next deploy). NIGHTLY: river-guides.yml (02:30 PHX) keeps
  verify→resolve→t1 churning within caps. TWO ASKS: (a) John's next SQL
  pass: **0017_companies_pe.sql** (2-line alter; the applied 0016 didn't
  carry companies.pe_owned/pe_owner — code degrades meanwhile); (b) Vercel/
  web env: **SERPER_API_KEY + ANTHROPIC_API_KEY** to activate the Find-more
  discovery bar (clean 503 note until then).
- 📣 LANE C 7/16 ~11:35 — **RIVER GUIDES BACKEND COMPLETE ON lane/integrations;
  JOHN'S ONE SQL PASS UNLOCKS THE WHOLE CHANNEL.** For the MORNING-BRIEF: John
  runs **0015 + 0016 together** (SQL editor, in order: 0015 shortlist +
  toobig threshold · 0016 river_guides table + companies.pe_owned/pe_owner
  columns). The moment they land I: ingest the 433-row local seed (contacts
  role river_guide + former companies w/ pe_owned ground truth), fire the
  first status-verification batch on CALL_NOW (the list→call-list unlock),
  and start identity resolution on the 197 TBD rows. Lane B's live page
  endpoints all served: GET /api/river-guides (client filters ✓), POST
  /api/river-guides/enrich {dealIds} ✓, POST /api/river-guides/discover
  {industry, consolidator} ✓ (bounded 60s sweep, hallucination-guarded,
  needs **SERPER_API_KEY + ANTHROPIC_API_KEY added to web env + Vercel** —
  currently returns a clean 503 note without them; add to John's env list).
  ALSO: Enrichment Jobs CI failure investigated — main's code = my code,
  exits 0 locally in an exact-CI env repro (empty queue, 5 secrets only);
  failures clustered 15:40–17:54Z alongside other workflows that have since
  recovered → consistent with secrets being added mid-window. Hardened the
  real defect found while tracing: a poisoned job now marks itself failed
  instead of crash-looping the runner unmarked; fatal errors log full stacks.
  Watch the next scheduled run — if it still fails, the full stack will be
  in the log.
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
- ⬜ (B sweep 7/13, recovered by PM from brokers-worktree uncommitted) /sources
  page: absorb the displaced v2 source-health table (last run, dedup totals,
  +7d per source — loaders still in lib/dashboard.ts).
- ⬜ (B sweep 7/13, recovered) Broker Directory "in Contacts ✓" → deep-link a
  filtered contacts view (needs a ?broker= or search param on /contacts).
- ⬜ (B sweep 7/13, recovered) Enrichment/leads industry chips → click-to-filter
  (chips are display-only today; the dropdown does the work).

## Lane C — CRM & Data / Integrations
- 🔥🔥🔥 **DEAL STATE MUST TRACK OUTLOOK — JOHN 7/16 ~16:00 (verbatim: "you
  should be updating this based on my Outlook traffic"). A REAL MISS, not
  theory:** Robert Fahrenhorst (Peregrine) replied 7/15 22:56 on the AAFE
  thread — "Hi John, anytime Tue works great" — and the CRM still read "IOI
  due 7/17" a full day later. PM only caught it because John said so in chat.
  TWO causes, fix both: (a) **outlook-sync.yml was FAILING all day** (16:42 +
  19:34 runs red; your 22:15 token-store fix turned it green) — a dead sync
  must never be silent: emit a failure signal (Key Actions card + MORNING-BRIEF
  watch item) whenever the sync errors or hasn't succeeded in >6h; (b)
  **pursuit detection only reads NDA/CIM signals** — it does not parse
  SCHEDULING/COMMITMENT intent. BUILD: Claude-classify inbound broker/banker
  replies on threads tied to a deal → extract (i) meeting agreement or
  availability ("anytime Tue works"), (ii) the requested next step, (iii) any
  date the counterparty commits to → propose an updated deals.next_step +
  next_step_due and surface it as a **Key Actions card John approves** — never
  silently rewrite a deal from an email (his no-guess bar). The
  agreed-but-unscheduled meeting is the highest-value catch: this one sat 24h
  and the slot (Tue 7/21 2-4pm PT) is still empty on his calendar. PM
  hand-corrected AAFE + Odulaire on 7/16 — this card is about the machine
  catching the next one.
=======
- 📣 LANE C 7/16 ~16:40 — 🛑 **LANE C IS AT ITS CONTEXT LIMIT — NEEDS A FRESH
  SESSION.** Everything is committed + pushed (HEAD 736f207); the HANDOFF at
  the top of docs/DECISION-LOG-integrations.md resumes a successor cold (it
  names the next 3 builds w/ exact copy locations + John's open asks). John's
  restart prompt = the same one-paste pattern as this morning, pointed at
  that HANDOFF. **Last unit ([self-iterate], 736f207): ATOMIC RUN CLAIM** —
  found live that my local pass and PM's new river-guides-claim.yml BOTH
  drained the same run (select-then-update wasn't a lock), producing a LYING
  RECEIPT ("40 processed, 0 emails" while the other process found 6 emails +
  5 LinkedIn on overlapping rows). Claim is now a conditional update — proven
  with two simultaneous claims (one WON, one stood down). **Data integrity
  held**: of 29 NEEDS_PAID rows from the raced run, 0 had contact info — the
  paid queue was never poisoned, only the receipt lied. PM: if you keep the
  claim workflow AND a local pass, the lock now makes that safe.
- 📣 LANE C 7/16 ~16:20 — **0018 APPLIED; THE RUN-STATE LOOP IS PROVEN LIVE.**
  Watched a real run (Lane B's page queued 40 guides) go `queued → running`
  with counts moving — GET /api/river-guides/runs served **"Enriching 29/40 —
  0 emails, 0 LinkedIn found so far…"**, and a prior run closed **"Done: 3
  processed — 0 emails, 1 verified LinkedIn, 2 need the paid tier. Hunter 1
  lookups ($0 marginal)."** That's exactly the is-it-working / when-done /
  what-did-I-get John couldn't see. Also verified post-0018: /api/size-model
  serves **DB payroll pcts** (source=db; Tree Care 40% + $65k wage; Fencing
  first-class 30% + $60k) with flat 20% margin + CPI 1.25/1.20; app_config is
  live so the Graph token store heals Outlook Sync CI on the next rotation.
  **LANE B: the runs endpoint is real — render the banner/receipt.**
  Remaining John asks: SERPER+ANTHROPIC in Vercel env (discover proven
  locally) · sample card 611290ff (auto-draft unlock).
- 📣 LANE C 7/16 ~15:45 — **JOHN'S THREE AFTERNOON ASKS SHIPPED (b1a7e58).
  PM: deploy + tell John to refresh.** My earlier "queue clear" HANDOFF was
  WRONG — the PM caught it; these three were unbuilt. Now done + verified:
  (1) **RUN STATE** (his loudest complaint): `river_guide_runs` (in 0018) ·
  POST /enrich returns a runId instantly · enrich_t1 claims the run, moves
  counts per lead, closes with a receipt · **GET /api/river-guides/runs**
  (active + last 5) with honest notes — "Queued — worker starts within ~15
  min" → "Enriching 7/20 — 3 emails found so far…" → "Done: 20 processed —
  6 emails, 2 verified LinkedIn, 13 need the paid tier" — plus a `stale`
  flag when a queued run outlives the cadence. LANE B: render on this.
  (2) **PRICE ESTIMATE**: POST /enrich {estimate:true, dealIds} → per-tier
  breakdown without queuing (Hunter = $0 marginal + quota units; LinkedIn
  verify = Serper + Haiku). Live: 3 guides → $0.004.
  (3) **DISCOVER CORROBORATION** (PM's probe was right): the guard is now
  code-side — the cited source's own text must contain every distinctive
  token of the queried consolidator AND the model's acquirer_quote must be
  real text from that result; zero corroborated → inserts NOTHING and says
  so; {dryRun:true} added. VERIFIED: "Test Sweep Probe" → inserted 0; real
  sweeps unaffected (Senske 1, SavATree 3 — no false negatives).
  Worker round also ran: +7 emails, +7 verified LinkedIn, 4 names resolved,
  2 statuses verified ($0.17). ⚠️ **0018 now also carries river_guide_runs**
  — still ONE SQL file for John; the runs API degrades until it lands.
  OUTSTANDING FROM JOHN: 0018 · SERPER+ANTHROPIC in Vercel env (discover is
  live-tested locally and works) · sample card 611290ff.
- 📣 PM 7/16 ~14:10 — 🔥 **DISCOVER SWEEP: ACQUIRER-CORROBORATION GAP (PM
  live-probed prod):** POST /discover with a FABRICATED consolidator name
  still inserted a row — a REAL company (The Care of Trees, actually a
  Davey deal) got attributed to the fake acquirer from generic industry
  search results. The no-guess bar held for the seller name (named:0) but
  NOT for acquirer attribution. FIX: only insert a candidate when the
  queried consolidator name literally appears in the fetched source next
  to the acquisition claim; unknown consolidators with zero corroborated
  results return "no corroborated add-ons found" and insert NOTHING. Also
  add {dryRun:true} support (PM probe created junk; PM deleted it, table
  back to 433).  (`scraper/` scripts, `web/app/api/*`)
- 🔥🔥🔥 **RUN-STATE FOR RIVER-GUIDE ENRICHMENT (John 7/16 ~12:50 — TOP OF
  LANE with the price estimate; see the full spec at the top of Lane B):**
  your parts = run record on enrich POST (enrichment_jobs pattern,
  kind='river_guides') · enrich_t1.js updates processed/found counts per
  lead + closes with receipt · GET /api/river-guides/runs (active + last 5)
  · honest queued-state message. Pairs with the estimate-before-click
  contract already queued. Lane B renders; ship your half first.
- 📣 PM 7/16 ~12:00 — **RIVER GUIDES: PM SHIPPED THE CRITICAL PATH** (John's
  #1 today; lanes were down): migration `0016_river_guides.sql` authored
  (John runs it w/ 0015) · `scraper/ingest_river_guides.js` (parser verified
  on all 433 rows) · GET `/api/river-guides` (deployed). **LANE C: do NOT
  rebuild those three — your river-guides scope is now: (a) CRM linking unit
  (RESOLVED rows → contacts tag river_guide + companies w/ pe_owned ground
  truth, then backfill contact_id/company_id on river_guides); (b) POST
  /api/river-guides/enrich (page already sends {dealIds}) → tier-1 waterfall
  person-mode w/ website-status routing; (c) POST /api/river-guides/discover
  (consolidator sweep, hallucination-guarded); (d) status-verification +
  identity-resolution workers.** Original card follows:
- 🔨 LANE C — 🔥🔥🔥 **RIVER GUIDES CHANNEL — BACKEND BUILT 7/16 overnight
  (John's direct directive ~00:45, "run with this, I'll look in the
  morning"). AWAITING: John runs migration 0016 (with 0015) → I ingest the
  433-row seed + fire the first worker batches immediately.** Architecture
  per John's instinct: NO separate scraping section — `river_guides` table =
  the channel's workstream state (lifecycle NEEDS_NAME→PENDING_T1→T1_DONE|
  NEEDS_PAID→ENRICHED→VERIFIED, spec §4 schema, scoring §3, provenance);
  RESOLVED people also become CRM CONTACTS (role 'river_guide') tagged to a
  COMPANY record for the business they sold (origin 'river_guide', website
  anchored; notes carry "acquired by <consolidator> (<sponsor>)" — direct
  PE-ownership input as John noted). Workers (scraper/riverguides/):
  `ingest_river_guides.js` (idempotent on deal_id; dry-run validated: 433
  rows = 236 resolved/197 TBD, bands CALL_NOW 95 · ENRICH 127 · NURTURE 14 ·
  RESOLVE_NAME_FIRST 197; top states FL 72, TX 31, CO 25, GA 25) ·
  `verify_status.js` (THE high-leverage job: exit_status is point-in-time at
  close → fresh LinkedIn/web re-check sets current_status_verified, flips
  EMPLOYED→EXITED, rescores; NOBODY contacted unverified) ·
  `resolve_names.js` (identity resolution w/ code-enforced no-guess bar:
  name + source URL + non-low confidence or stays TBD — the hallucination
  guard from the research) · `enrich_t1.js` (waterfall routed by website
  status: LIVE→Hunter domain-first, REDIRECTS→acquirer domain,
  DEFUNCT/NOT_FOUND→verified-LinkedIn-first; failures → NEEDS_PAID review
  queue, nothing auto-pays). API: GET/PATCH/POST /api/river-guides (filters
  band/status/industry/state/name_status/q + counts incl. state M&A density;
  POST queue_enrichment/queue_verification = John's "select for enrichment").
  river-guides.yml nightly 02:30 Phoenix (verify 30 → resolve 25 → t1 20).
  LANE B: "River Guides" page under Proprietary Sourcing off /api/river-guides
  (band chips, lifecycle columns, select→queue actions, state density view);
  contacts page: role filter now includes river_guide.
  OPEN FOR JOHN (morning): (a) run 0015+0016; (b) existing 'advisor' contacts
  (e.g. Dan Mello) — flip to river_guide or keep advisor as the broader tag?
  (c) Archetype B (ex-corp-dev) intake is deliberately NOT built yet —
  separate LinkedIn-recipe path per spec §5, say go when wanted.
  --- PM original card (discover endpoint spec still owed by Lane C) ---
- 🔥🔥🔥 **RIVER GUIDES CHANNEL — JOHN'S 7/16 ~00:50 DIRECTIVE, slots ABOVE the
  Tracerfy tier (they share plumbing — build together where natural). READ
  docs/RIVER-GUIDES-INTEGRATION.md FIRST (PM architecture decision), then the
  spec + handoff at `C:\Users\johnd\CRM Set up\river-guides\` (LOCAL PATH —
  🔒 NEVER commit the CSV/docs or any named-person extract to this PUBLIC
  repo; personal data goes ONLY into Supabase).** Build order: (1) migration
  `0016_river_guides.sql` per spec §4 + contact_id/company_id FKs (John runs
  it in his morning SQL pass); (2) `ingest_river_guides.js` — the 433-row
  seed CSV → table, idempotent on deal_id; RESOLVED rows create/link a
  contacts row (tag/role **river_guide**) + companies row for their former
  company (dedupe by domain/name) with **pe_owned=true, pe_owner=
  "<acquirer> (<sponsor>)"** — ground truth for your PE backfill; (3)
  GET/PATCH `/api/river-guides` (filters: industry, priority_band,
  enrichment_status, exit_status, state; PATCH = inline edit, human wins);
  (4) **LinkedIn status-verification worker** — reuse your new verified
  matcher; sets current_status_verified, can flip EMPLOYED→EXITED (earnout
  expiry = where the value unlocks; HIGHEST-LEVERAGE step); (5) identity
  resolution for ~197 NEEDS_NAME rows (LinkedIn + SoS resolvers + acquirer
  press) — NEVER guess names/domains, unresolved stays TBD; (6) enrichment
  waterfall person-mode routed by company_website_status (LIVE→domain-first
  Hunter, REDIRECTS→acquirer domain, DEFUNCT/NOT_FOUND→LinkedIn-first),
  Tier-1 free only, failures → NEEDS_PAID for the VA-export CSV (NO
  automated paid tier); screen_score recompute per spec §3. Outreach
  eligibility = CALL_NOW + VERIFIED only; nothing sends; river-guide draft
  template (equity-not-fees positioning, spec §8) is a SEPARATE template
  awaiting John's approval — do not wire drafts yet.
  **(7) DISCOVERY — John's clarification 7/16 ~01:15: "not just a repository
  to house these people — I want the functionality to find additional river
  guides."** Build an on-demand **consolidator-sweep worker** (this is the
  channel's list-builder, much lighter than company scraping): input =
  industry or consolidator name (spec §7 maps seed the dropdown; free-text
  for new ones) → Serper/Exa queries ("<X> acquires", "<X> acquired",
  acquirer press/portfolio pages) → Claude extracts candidate add-on deals
  (company, year, seller if NAMED IN THE SOURCE) → dedupe vs existing
  (person, company) → new rows enter the SAME lifecycle (NEEDS_NAME or
  RESOLVED w/ provenance). HALLUCINATION GUARD is hard law: a name/domain
  not literally present in a fetched source = TBD, never a guess. Also
  support the spec §5 "quiet Archetype A" + Archetype B LinkedIn recipe
  searches as a second query mode (results land as candidates w/ source
  links, same guard). POST /api/river-guides/discover queues it; reuse the
  enrichment-jobs progress pattern so John watches it run.
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
- 🔥🔥 **TRACERFY SKIP-TRACE INTEGRATION (John created the account 7/15 eve;
  TRACERFY_API_KEY live in all worktree .envs — **SAMPLE RAN + VALIDATED
  7/15 eve: 49 leads → 14 hits (29%), 13 w/ owner MOBILES; charged
  PER-HIT (14 credits = $0.28). DNC scrub: 55 phones → 28 clean/27
  flagged. PM imported fill-blanks w/ provenance: +11 owner phones
  (7 clean, 4 flagged), +2 emails; enrichment.skiptrace jsonb carries
  per-phone dnc/litigator flags + queue_id. Total test cost $1.38.
  BUILD THE CASCADE TIER NOW.**
  **COMPLIANCE POSTURE (John 7/15 late — supersedes the earlier 🚫 spec):**
  no automated calling exists or will; humans hand-pick who to call. So:
  (1) pull + store ALL traced contact info, flagged or not; owner_phone
  fills regardless of flag; (2) DNC flags = INFORMATIONAL badge only on
  the cold-calling queue/profiles (small marker, never a block, never an
  eligibility filter); (3) **DNC scrub drops out of the standard cascade**
  (saves 5× the trace cost; per-contact cost = $0.02) — keep
  scrub-from-queue available as an on-demand tool if John ever wants a
  batch checked.):** (Lane C) (a) `enrich/skiptrace.js` — Tracerfy /trace API
  (name + address → owner cell/landlines/emails), wired as a tier in the
  cascade AFTER free sources + Hunter, only for leads still missing
  owner_phone that have owner_name + address. (b) **Rules-gated**: eligible
  = thesis industry, US, not PE-flagged, within size bounds; per-run budget
  cap (like Hunter's) honored from digest/job caps. (c) **Metered**: $0.02/
  hit into usage_events (service 'tracerfy'), quota/cost line on the badge;
  /api/enrich estimate includes the tracing marginal. (d) **Provenance +
  honesty**: phones land w/ source:'skip-trace' + confidence; company-line
  guard applies (never count a traced number that matches the company
  main line as an owner channel). (e) GH secret TRACERFY_API_KEY joins
  John's batch (now 6). Sample CSV: Downloads/pronghorn-skiptrace-sample-50.csv.
  **API SPECIFICS (Tracerfy docs, Downloads/tracerfy-api-docs.md):** Bearer
  auth; base https://tracerfy.com/v1/api. Use **batch person-mode**: POST
  /trace/ w/ csv_file + column mappings, trace_type='normal' (1 credit ≈
  $0.02/lead); poll GET /queues/ (max 1/20s) or account webhook; results
  CSV at download_url includes misses. Instant person lookup = POST
  /trace/lookup/ find_owner:false (5 credits/hit, 0/miss, 500 RPM) for the
  in-cascade single-lead path. ⚠️ NEVER use find_owner:true / 'advanced' on
  business addresses — returns the PROPERTY owner (often the landlord, not
  the business owner). **BONUS — DNC/TCPA COMPLIANCE:** trace responses
  carry per-phone dnc/tcpa-litigator flags, and POST /dnc/scrub-from-queue/
  (1 credit/phone) scrubs Federal/State DNC + litigator lists. INTEGRATE:
  store dnc/litigator flags on every traced phone; cold-calling queue shows
  🚫 on flagged numbers + excluded from all automated-outreach eligibility.
  Rate limits: 10 batch posts / 5 min.
- 🔥🔥🔥 **LINKEDIN MATCH QUALITY OVERHAUL (John 7/15 ~11:40 — found All Turf's
  owner LinkedIn was a WRONG-PERSON match he disproved in 30 seconds; "every
  representative example I look at seems to be wrong… I'd be trusting it for
  automated outreach"; TOP of Lane C):** the 7/13 tightening was not enough.
  (a) **REPLACE the matcher**: Serper `site:linkedin.com/in "{owner name}"
  "{company}"` (+city/state variants) → Claude VERIFIES the snippet — accept
  ONLY with 2+ corroborations (company-name token AND geo/title match);
  compound names ("Gary Wilson Sr. and Gary Wilson Jr.") must be SPLIT into
  individual people before matching, never matched as a string. (b)
  **verified-only counting**: add linkedin_verified flag; ONLY verified
  links count as owner channels (FULL/CONTACTABLE math + outreach
  eligibility) — an unverified link is displayed greyed w/ "unverified".
  (c) **FULL RE-AUDIT of every existing owner_linkedin** with the new
  validator: null everything that fails corroboration (wrong > none —
  John's trust standard); report before/after counts + measured accuracy
  on a hand-checkable sample of 20. (d) If verified hit-rate lands too low,
  bring John a paid-lookup comparison (Proxycurl-class person API / Apollo)
  w/ per-lookup cost + sample accuracy — HIS decision, don't subscribe.
  (e) Exemplar fix done by PM: All Turf (a087c894) wrong link nulled;
  correct = Gary Wilson, Co-Founder Turf Masters Brands, Loganville GA —
  ALSO a PE-flag candidate (Turf Masters = roll-up), see PE item below.
- 🔥🔥🔥 **INLINE EDIT EVERYWHERE (John 7/15, via Lane A session — Lane B):**
  on any record detail view (broker listing, company, deal, enrichment
  lead), click a field → edit → save inline: location, owner name, email,
  phone, website, etc. Goal: when John finds a datum himself he adds it
  directly instead of asking an agent. Human-entered values must WIN over
  future enrichment (fill-blanks never overwrites; add edited_by/at
  provenance where cheap). PATCH routes exist for most (/api/leads/[id],
  /api/companies/[id], /api/contacts/[id], /api/deals/[id]) — extend where
  missing. Mobile parity.
- 🔥🔥 **FILTER/SORT PERSISTENCE ON BACK-NAV, ALL LISTS (John 7/15, via
  Lane A session — Lane B):** Broker Listings (and any list still missing
  it) must retain filter + sort when clicking into a record and coming
  back — John steps through matching records one by one. The pattern
  ALREADY EXISTS (Enrichment: sessionStorage + ?from back-nav; Companies:
  URL-param serialization) — extend uniformly to /listings, /brokers,
  /deals, /contacts; sort state included (e.g. EBITDA desc), not just
  filters.
- 📣 PM → LANE A: **regionState() graduation BLESSED** — move it from
  dealrelations.js into core/states.js and wire all adapters; shared
  geography helpers belong in core. (Merged your SOCAL fix.)
- 🔥🔥🔥 **CONTACT HIT-RATE PROGRAM (John 7/15 ~12:15 — "way too many blanks
  to actually source off this"; PHONE > EMAIL priority):**
  (Lane C) (a) **EMAIL PATTERN ENGINE (ships first — $0 marginal, PM
  live-proved on treeprosaz.com: pattern={first}@, staff emails at 93-94
  conf):** new tier-2.5 step — Hunter DOMAIN-SEARCH per company domain
  (1 quota search) → store pattern + published emails on the company →
  CONSTRUCT owner email from pattern + owner first/last → VERIFY via
  Hunter verifier → only verified writes to owner_email (else
  business_email w/ 'pattern-guess' provenance). Cache pattern per domain
  forever. Backfill over every IDENTIFIED lead w/ domain + owner name.
  (b) **PHONE (higher priority) — JOHN APPROVED THE SAMPLE 7/15 ~12:30:**
  PM built the 49-lead file (38 tree care + 11 lawn care, named owners w/
  addresses) → saved to John's Downloads as
  pronghorn-skiptrace-sample-50.csv. AWAITING: John's Tracerfy signup
  (account creation = his step) → he uploads the CSV OR sends
  TRACERFY_API_KEY and a session runs it via their /trace API. Then:
  measure hit rate + spot-check 10 numbers, report cost-per-verified-cell.
  Tracerfy = $0.02/hit pay-as-you-go, no subscription, credits never
  expire, bulk CSV + API — vs Apollo Basic $49/mo (~75 mobile credits,
  ~8 credits/mobile in practice → effectively $0.50-1+/mobile).
  ZoomInfo-class ($15-30K/yr) NOT cost-effective at this stage.
  (c) published role-emails from domain-search (service@/accounting@)
  store as business channels — useful for pattern + never owner channels
  (role-mailbox guard already enforces).
- 🔥🔥🔥 **US-PRESENCE VALIDATION + "TOO BIG" TIER (John 7/15 ~11:55 —
  Irrigation Excellence exemplar: Europe/S.America HQ, ~12-company group,
  slipped into a national irrigation list AND read as an attractive
  'Platform' because we couldn't size it; PM flagged it off_target):**
  (Lane C) (a) **US-presence check in enrichment classification**: from the
  site scrape + address signals, classify hq_us true/false/uncertain —
  non-US (or primarily non-US) → off_target w/ reason, excluded from
  coverage math + all automation; backfill over existing enriched leads.
  (b) **TOO BIG tier above Platform**: editable threshold in the Size
  Estimation tab (seed: est. EBITDA > $10M) → tier 'too_big' — stays on the
  list, clearly tagged, filterable out. (c) **QUALITATIVE bigness detection
  — sizing can't rely on PPP alone**: during enrichment, flag conglomerate
  signals (multi-continent presence, 'group of companies', N subsidiaries,
  'offices in', franchise networks) → too_big even with NO numeric
  estimate + a reason string. (Lane B) (d) tier chip/filter for Too big;
  threshold input in the tab; off-target reason shown on hover.
- 🔥🔥 **COMPANY SHORTLIST / STAR (John 7/15 ~11:45 — "flag or heart
  companies I've looked at that might be good potential targets… so I'm
  not scrolling annually and forgetting what I did"; explicitly NOT a deal
  stage):** (Lane C) migration `0015_shortlist.sql`: `company_shortlist`
  (company_id, person John|Tom, note text nullable, created_at; PK
  company+person) + GET/POST/DELETE on /api/companies/[id]/shortlist +
  shortlist state joined into /api/companies rows. (Lane B) ★ toggle on
  every Companies row + profile header (one tap, optimistic), filter
  "★ Shortlisted" (mine / Tom's / any), shortlisted-first sort option, and
  the star + who/when visible so future outreach passes know it already
  passed John's smell test. Later hook: outreach/draft-rules can prioritize
  shortlisted companies — do NOT wire that until John says so.
- 🔥🔥 **PE-OWNERSHIP FLAG (John 7/15 ~11:20 — "PE-owned targets are not
  good targets for us… at the very least a column to filter them out"):**
  (Lane C) (a) add `pe_owned` boolean + `pe_owner` text to companies/leads
  enrichment; DETECT during enrichment classification — site scrape + Exa
  snippets carry the signals ("a portfolio company of…", "backed by…",
  "acquired by [PE firm]", "[Firm] company"); AAFE's CIM showed a live
  example (competitor "Acquired by Gemspring Capital"). (b) backfill pass
  over existing enriched companies/leads (Claude over stored enrichment
  jsonb + one Exa check for Platform-tier companies — PE ownership is most
  likely exactly in the big ones). (c) PE-owned leads are EXCLUDED from
  auto-enrich rules + auto-draft eligibility by default. (Lane B) (d)
  pe_owned filter + badge on Companies/Enrichment; show pe_owner in the
  tooltip/profile.
- 🔥🔥 **COMPANIES TABLE FILTER/SORT OVERHAUL (John 7/15 ~11:20):** (Lane B)
  (a) industry chips → a DROPDOWN (multi-select w/ counts) — chips won't
  scale as industries grow; (b) **column-header dropdown filters** on the
  list headers: owner-reach level (raw/basic/identified/contactable/full),
  size tier, stage — click the header, pick values; (c) **sortable
  est. Revenue + est. EBITDA columns** (asc/desc toggles on header click);
  (d) keep pinnable URLs in sync with all of it (filters serialize to
  params as today); (e) same pattern on Enrichment where headers overlap.
  Mobile parity per standing rule.
- 🔥 **ATTACHMENT UPLOADS >4.5MB FAIL ON PROD (PM found live 7/14):** Vercel
  caps request bodies at 4.5MB — the 22MB AAFE CIM bounced off the new
  upload route (FUNCTION_PAYLOAD_TOO_LARGE) even though the app allows
  25MB. LANE B FIX: browser uploads go DIRECT to Supabase Storage via
  createSignedUploadUrl (API route only mints the signed URL + validates
  name/type), listing stays as-is. PM interim: uploaded the AAFE CIM
  server-side — it renders on deal ed791a49 + company 35a33893 now.
  Lane C's Outlook ingest is unaffected (server-side writes).
- 🔥🔥🔥 **BROKER-LISTING OUTREACH OVERHAUL (John 7/13 eve, screenshots of the
  Rockwall TX lawn-care listing — three parts):**
  (A) **(Lane A) SCRAPE THE LISTING BROKER**: BizBuySell pages carry a
  "Business Listed By" block (e.g. William Pala · 954-289-9634) we currently
  DROP. Parse broker name/phone/profile-link at ingest on bizbuysell (+
  every source exposing it) → upsert into brokers table → set the listing's
  broker link so the broker is tagged to the listing/company FROM SCRAPE
  (never gated on becoming a deal). Backfill pass over live listings.
  (Lane B small: render the broker + phone on listing detail w/ link to
  the directory record.)
  (B) **(Lane C) INQUIRY TEMPLATE — John's verbatim message is the contract**
  (inquiry_profiles row 774f21ce now seeds identity: John Hodson ·
  jhodson@pronghornequity.com · (503) 899-0058 — NEVER the gmail):
  Greeting: "Hi {broker first name}," when known, else "Hello," (no name
  guessing). Body: "My name is John Hodson, and I am a Managing Director at
  Pronghorn Equity Partners. We are a lower middle market private equity
  fund that focuses on business services assets across the US. We are
  spending a lot of time in the {industry} space and would love to get some
  additional information on the below listing. / Are you able to share the
  NDA and any initial materials? It would also be helpful to hop on an
  introductory call to learn more and introduce myself. / Looking forward
  to it. / Best, / John Hodson" — customize ONLY {broker name} + {industry}
  (natural phrasing, e.g. "landscaping / lawn care"). Applies to: co-pilot
  contact block, outbox inquiry drafts, request-info drafts. Kill the old
  "I'm a private investor…" copy everywhere.
  (C) **CIM ATTACHMENTS ON LISTINGS TOO**: extend the deal/company
  attachments + email CIM-ingest item to BROKER LISTINGS (the FCBB Tree
  Service CIM John received must attach to its listing/company record —
  today it isn't saved anywhere visible). Same bucket pattern; auto-pull
  from Outlook traffic and tag to the matched listing/company/deal.
- 🔥🔥🔥 **SIZE MODEL AMENDMENT 4 (John 7/13 ~17:45 — RESTRUCTURE THE
  ASSUMPTIONS; supersedes the rev-per-employee input display):** (Lane C
  model + Lane B tab, top priority):
  (a) **PRIMARY editable input per industry = PAYROLL % OF REVENUE** — the
  metric John & Tom actually reason in (matches Tom's offline PPP analysis).
  Revenue math: PPP loan → annual payroll (×4.8) → revenue = payroll ÷
  payroll%. Do NOT display revenue-per-employee as an input ("I don't have
  a great way to look at rev/employee and know if it makes sense").
  (b) **EBITDA margin = FLAT 20% for every industry** (conservative),
  single editable value — retire the low/high band display (John: bands
  directionally fine but specific values not trusted; HVAC 10-18 reads
  wrong). est_ebitda = est_revenue × margin.
  (c) **CPI-ADJUST PPP-derived revenue**: loans are 2020/2021 snapshots —
  grow by cumulative CPI from loan date → today (seed factors ≈ 1.25 for
  2020 draws, ≈ 1.20 for 2021; keep as an editable per-year factor pair).
  Nothing fancier — conservative by design.
  (d) **ONE mental model**: employee-only estimates (LinkedIn/site counts,
  no PPP) flow through the SAME payroll-% math via an internal avg
  fully-burdened wage per industry (seed ~$55-70K by trade; internal, not
  the headline input). Payroll-% seeds per the SIZE ROLLOUT EXPANSION item
  below. Tab shows: payroll % (editable) · EBITDA margin (editable, 20) ·
  tier thresholds (editable) — nothing else as inputs.
- 🔥🔥 **SIZE ROLLOUT EXPANSION (John 7/13 ~17:30 — "roll out with the
  industries we laid out then expand to others on the site"):** (Lane C)
  (a) add **Fencing** as a first-class taxonomy industry + benchmarks entry
  (AAFE-class targets currently hit 'default'); (b) add per-industry
  **ppp_payroll_pct** to size-benchmarks/size-model (editable in the tab w/
  0014) and use it in the PPP payroll→revenue math. Researched seeds: tree
  40 · lawn 35 · pest 33 · fencing 30; PM-proposed for the rest
  (labor-intensity based, John tunes in the tab): Landscaping 38 · Pool 32 ·
  Irrigation 32 · Lake/Pond 33 · HVAC 30 · Plumbing 32 · Electrical 34 ·
  Roofing 25 · Windows&Doors 26 · Cleaning/Janitorial 50 · Restoration 32 ·
  Property Maintenance 40 · default 33. Computed-on-read means each
  assumption activates instantly — no re-import needed.
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
