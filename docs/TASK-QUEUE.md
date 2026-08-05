# Task Queue — parallel-session backlog

## 🚨 PROGRAM: BULLETPROOF THE CORE CHAIN (John 7/31 — OVERRIDES lane ordering;
every lane contributes. His words: "really bad hit rates on enrichment…
really bad hit rates on sizing… all of that needs to be bulletproof. If we
need to spend more money or integrate data sources or be creative — let's
do that. We're not really using this platform the way I want.")**

THE CHAIN (in John's priority order): (1) has it transacted to a PE
consolidator? → (2) roughly how big (rev/EBITDA)? → (3) who is the owner? →
(4) owner contact info → (5) outreach at scale.

MEASURED 7/31 (PM, live DB, on-target proprietary n=597): PE-status
determined 2% · sized 63% (high-confidence ~0) · owner named 45% · owner
any-channel 23% (email 19%, phone 6%). River guides n=467: named 61% ·
exit-verified 5% · channel 40%. This is the baseline to beat.

TARGETS (funnel measured weekly, shown on-site): PE-status determined ≥95%
(negatives COUNT — "checked, no PE evidence" = pe_owned:false w/ audit) ·
sized ≥90% w/ honest confidence tiers · owner named ≥80% · owner ≥1 channel
≥60% · river-guide verified ≥50%.

WORKSTREAMS: (A) LANE C QUICK WINS (start NOW): persist pe_owned=FALSE on
every checked-clean lead (2% determined is mostly missing negatives, not
missing positives) · cross-reference OUR OWN acquisition ledger (467 river-
guide deals + consolidator maps) against companies/leads by name+state →
pe_owned=true w/ source · career-trajectory verify (already queued) also
writes the employer→consolidator match as a PE signal. (B) PROVE-BEFORE-PAY LADDER (John 7/31 — NO subscriptions on unproven value): step 1 = land the free fixes (A) and RE-MEASURE the funnel — do not spend until we know the free ceiling; step 2 = ONE-TIME <$100 benchmark, zero subscriptions: the SAME 100-lead gold sample through (i) People Data Labs pay-as-you-go (free ~100 records, then ~$0.20-0.30/match, no sub), (ii) Apollo FREE tier credits only, (iii) the Upwork VA (~$30-60 of hours) — measure fill + accuracy + cost-per-VERIFIED-contact for each; step 3 = winners integrate as METERED pay-per-record tiers w/ caps (nothing to unwind); step 4 = a subscription is allowed ONLY when 2 straight months of pay-per-use volume exceeds the sub price (the sub becomes the cheaper option by arithmetic, not hope). Grata-class broad-sourcing platforms: SKIP for now (John may narrow to one industry; our scraper+PPP+ledger competes there). (C) SIZING
CONFIDENCE: every estimate carries basis+confidence honestly; paid
firmographic revenue joins the ensemble as a higher-confidence tier;
PPP match-rate audit (are we missing matches on name variants?). (D)
DATA-HEALTH PANEL (Lane B): the funnel above as a live dashboard card —
John watches hit rates move without asking the PM. (E) OUTREACH RIDES ON
TOP: templates being co-developed w/ John in the PM channel; campaigns
unlock once (1)-(4) hit targets on a real segment.

## 🔴 EMPTY MEETING-NOTE DETECTOR (John 8/5 — a real loss already happened;
## Lane C owns, small build, high value)
John clicked transcribe for the **7/31 Shore Capital tree-care thesis
walk-through** (Michael Aubrey MP / Cyrus Hessabi VP / Carter Selzer, plus
Tom + John). Notion CREATED the page — created and last-edited timestamps are
byte-identical at `2026-07-31T13:59:15.504Z`, one minute before the meeting —
and **nothing was ever written to it**. The hour with Shore's critique of our
thesis is gone; only the email follow-up survives. Full reconstruction:
`C:\Users\johnd\CRM Set up\Shore-TreeCare-Walkthrough-2026-07-31-RECONSTRUCTION.md`.

**This is the THIRD occurrence** — Notion's "Archive (empty notes)" already
holds 2026-06-30 and 2026-07-09. Nobody was alerted any of the three times;
John found this one himself, 5 days late, by going looking.

BUILD: the CRM already sweeps the Notion Meeting Notes area. Add a check —
any meeting note whose body is still empty **~2h after the meeting end time**
raises a **Key Actions card**: "<date> <title> captured nothing — recover from
the Teams recap now" with a link to the calendar item and the attendee list.
Detection signature is exact and cheap: `created_time == last_edited_time` and
an empty content block. At T+2h recovery is trivial (Teams recap, or ask the
other attendee same-day); at T+5d it is archaeology.
NOTE for whoever builds it: Graph API access to Teams transcripts is DISABLED
on this tenant (verified 8/5 — `GraphAccessToTranscriptsDisabled`), so we
cannot auto-pull the transcript as a fallback. The card must point a HUMAN at
the Teams Recap tab. Do not build a recovery path that silently no-ops.

## 🚨 RIVER-GUIDE DUPLICATE PEOPLE + CONTRADICTORY STATUS (PM found 8/4 14:45,
## live DB — blocks trusting ANY outreach-ready count; Lane C owns, Lane A (b))
The consolidator sweep inserts a NEW row for a company already in the book
instead of matching the existing person, so the same human exists twice with
different `deal_id` prefixes (`RG-SWEEP-*` vs `RG-TREE-*`/`RG-GREEN-*`/
`RG-FENCE-*`). MEASURED: 350 named rows → **330 distinct people · 19
duplicated names · 20 extra rows** (115 of 549 rows are sweep-origin). Dupes
among TBD rows are undetectable by name, so 20 is a FLOOR.

WHY IT MATTERS (not cosmetic): **13 of the 19 duplicates carry CONTRADICTORY
`exit_status`** — the same person is EXITED on one row and EMPLOYED/UNKNOWN
on another. Two are contradictions where BOTH rows are status-VERIFIED:
Damon Schrosk (RG-TREE-105 EMPLOYED **vs** RG-SWEEP-treecology EXITED) and
Tim Doyle (EXITED vs UNKNOWN vs EXITED across 3 rows). **3 of the current 14
outreach-ready rows are people with a conflicting twin** (Steve Stanley,
Dan Mello, Scott Emery). We would be emailing someone as a fresh exit while
our own data says they still work for the acquirer — precisely John's
"burn more leads than it helps" failure mode. It also double-spends Serper:
every dupe gets verified twice.

BUILD:
(a) **Dedupe pass (Lane C)**: match on normalized (full_name + acquirer) and
(company-slug + acquirer) — the sweep rows are near-identical company names
("Cordwin Tree Service" vs "Cordwin Tree Services"). MERGE, never delete:
keep the richest row, union contacts/source_urls, preserve BOTH source_urls
so the human can adjudicate. Log every merge.
(b) **Contradiction rule**: where merged rows disagree on exit_status, the
result is NOT a coin flip — set `UNKNOWN` + a `status_conflict` note listing
both claims and their source_urls, and route to the review pen. An
unresolvable conflict must never present as outreach-ready. Re-verify these
first (cheap: 13 rows).
(c) **Insert-time guard (Lane A owns the sweep)**: before filing, check for
an existing row by (company-slug|name + acquirer) and UPDATE it rather than
insert. This is the root cause — without it (a) is a treadmill.
(d) After (a)+(b) land, PM re-measures outreach-ready and republishes the
honest number.

## 📏 OUTREACH-READY IS ONE DEFINITION (PM 8/4 — 14 vs 23 reconciled)
Lane C reported 23, PM-STATUS says 14; BOTH computed correctly, different
definitions. 14 = verified + EXITED + **email-or-phone**. 23 = the same but
counting a **LinkedIn URL** as a channel. Canonical rule, matching the
standing data-honesty line ("unverified LinkedIn is not a channel") and the
fact that an email campaign cannot send to a LinkedIn URL: **outreach-ready
= verified + EXITED + email-or-phone (14 today, 12 in-focus)**. LinkedIn-only
people (9) are a SEPARATE, legitimate cohort — report them as
"LinkedIn-only, needs a channel" and route to the VA/enrichment queue, never
folded into the sendable count. Everyone use this wording; PM-STATUS is the
reference implementation (.github/scripts/pm-status.js:34).

## 🎯 SERPER FOCUS GATE (John 8/4 — industry narrowing; PM measured same day)
John's directive (8/4): thesis focus is now **TREE CARE primary; landscaping,
irrigation, lawn care, pest control ancillary**. The old 10–12-industry
broad sweep is deprioritized (NOT deleted — no functionality stripped yet;
"most likely" focus, John reserves the right to revisit). Serper credits are
the scarce resource funding the naming/contact push — spend them in-focus.

PM MEASUREMENT (8/4, live DB — the reason this card exists): 8/4 burn =
1,441 credits (770 river-guide verify · 566 consolidator sweep · 105
enrichment). Of the 82 guide rows swept in TODAY: **51 in-focus (62%) · 31
OUT-of-focus (38% — 13 pool, 11 commercial kitchen, 6 fencing, 1 other)**.
Whole book: ~26% out-of-focus (64 pool · 45 kitchen · 34 fence of 549).
At ~990/day the 50k pack lasts ~50 days; gating recovers roughly a third.

BUILD (Lane C owns a+b+d, Lane A owns c, Lane B optional surface):
(a) **Focus allowlist in app_config** (`focus_industries`): TREE_CARE
primary + LANDSCAPE, IRRIGATION, LAWN_CARE, PEST ancillary. Every
Serper-spending worker (river-guides verify, t1 enrichment, consolidator
sweep, discovery, leadgen classification) processes **in-focus rows first
and SKIPS out-of-focus by default** (flag `include_all_industries` flips it
back — a config read, not a code strip).
(b) **PREREQUISITE — normalize industry_group**: taxonomy is dirty (TREE vs
TREE_CARE, POOL vs POOL_SERVICES, FENCE vs FENCING, 215 rows in catch-all
GREEN). The gate misfires on a dirty key. One migration/backfill maps to a
canonical set; GREEN rows get classified into it (this classification pass
is itself Serper-cheap: name+vertical_raw heuristics first, search only
where ambiguous).
(c) **Sweep scoping (Lane A)**: future consolidator-sweep runs take a
`--industries` scope defaulting to the allowlist; out-of-focus
consolidators only on explicit ask.
(d) **Attribution**: every serper usage_event stamps `meta.industry` (today
it's null on all 3 activities) so /costs + PM-STATUS can show burn by
industry and John can see the gate working. Existing out-of-focus rows KEEP
their data (honesty rule: nothing deleted, negatives persist) — they just
stop consuming credits.

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

**⚙️⚠️ DO NOT ROLL OVER PREMATURELY (added 7/20 — a Lane C session stood down
reporting "context limit" at only ~5% actual context; that FALSE alarm cost
John an unnecessary restart). An AUTO-COMPACTION IS NORMAL and does NOT mean
roll over — the harness summarizes older context and you KEEP WORKING with
plenty of room afterward. A single compaction event, a summary notice, or a
vague feeling is NOT a trigger. Only roll over on GENUINE, repeated
context-pressure warnings when you are actually near the limit (~80%+). When
in doubt, keep working. PM rule: never surface a "lane needs restart" to John
off a lane's self-report alone — the lane's context claim can be wrong; treat
a "stood down" as needs-verification, not fact.**

**⚙️ CONTEXT ROLLOVER PROTOCOL (John 7/13 — "not scalable for me to notice
it"; ALL LANES, effective now):** when your session sees context-pressure
warnings from the harness (or you judge yourself GENUINELY past ~80% — see the
premature-rollover warning above): (1) STOP taking
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
- ✅ **[DONE + BACKFILLED + VERIFIED 8/3 — Lane A] ASKING PRICE NOT PARSING —
  TUPELO + DEALRELATIONS (John 7/21).** Results (live, non-delisted):
  **tupelo ask 1%→88%, mult 1%→68% · dealrelations ask 13%→86%, mult 13%→72%.**
  Tupelo: cards never show asking — now every listing gets a per-listing CRM
  API GET + a detail-page SSR fallback (~60% of cuids 404 on the API).
  DealRelations: 7 newer subdomains used unrecognized Rails templates — new
  structural template-C parser + og:title pipe fix (the broken "|" names).
  SECONDARY tail also done 8/3: murphy rev 0%→28% (detail-page piggyback),
  hedgestone rev 1%→19% (new capped enrichment), bizben rev→36%/mult 16%→24%
  (0-placeholder purge + RSC detail extraction; 1,628 wrongly-delisted rows
  relisted). STRUCTURAL (verified live, source doesn't publish): bizquest
  rev/cf login-gated; bizbuysell rev absent from index JSON-LD, details
  blocked; transworld APIs have no revenue field. linkbusiness adapter was
  already correct (46% = publication rate). Details in
  DECISION-LOG-brokers.md 8/3 entries.
- ⬜ **RIVER GUIDES: consolidator-sweep refresh (LATER — not tonight; after
  your current queue):** periodic re-run of the acquisition-log queries per
  consolidator (docs/RIVER-GUIDES-INTEGRATION.md step 9 + spec §7 maps at
  the local path noted there) → new add-ons enter the river_guides lifecycle
  as NEEDS_NAME/RESOLVED rows. Hallucination guard is a hard rule: no
  invented names/domains, unverified = TBD.
- ✅ **[SHIPPED + PM-VERIFIED 7/16] JOHN APPROVED 7/13 — your two AUTONOMY
  suggestions are GO, build both:** (1) **AUTO-PROMOTE T1 → PURSUITS:** nightly
  job opens a pursuit (stage 'new') for any Tier-1 listing clearing HARD
  criteria — priority state + CF $300K–$10M + thesis keyword + not delisted +
  not mirror-dup — each with a "why it qualified" receipt on the listing/deal;
  human touch = approve/reject (Pass action). Never contacts anyone. (2)
  **SOURCE-HEALTH DRIFT ALERTING:** trailing-7-run baseline per source; flag
  >25% count drop or null-financial-rate spike → compact digest to dashboard
  Key Actions (+ brain). Post-build: PM lists both in MORNING-BRIEF receipts.
- ✅ **[SHIPPED 7/16 — CI self-driving on Node 22] OPS AUTOMATION (PM refill 7/11 — Lane A's own recon says free-source
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
- ✅ **BROKER SWEEP CLOSED 7/16 (PM-verified live: 39.6% coverage — 8,709/21,967 listings linked; 1,675 brokers, 830 w/ phone, 1,393 w/ email).** Named agents: murphy 59 · vr 33 (22 direct email) · viking 21 · empire 2 · dealrelations/sunbeltmidwest/linkbusiness/wpbdp/businessbroker. Firm offices: fcbb 73 (829 listings) · bbf 41 · bizmls 5. Residual 4 sources are STRUCTURAL + measured, not open work (bizbuysell Akamai-blocked · hedgestone/businessesforsale form-gated · tupelomarket 0/90 measured, disabled behind a flag). Judgment call PM endorses: viking publishes only a corporate switchboard → name+firm stored, phone left NULL (a shared line is not an advisor's direct line — same trap as owner_phone main-line inflation). Original card: scrape broker phone/email/office from source
  broker pages → brokers table (brokers are outreach targets too).
- ✅ [SHIPPED] Delisting/freshness: mark listings delisted after 2 missed full scrapes;
  emit price-change events (feeds Market Multiples time-series).
- ✅ [SHIPPED — gap report now splits ACTIONABLE vs STRUCTURAL, which surfaced empire+viking] Source-quality analytics: track thesis-fit yield per source; drop low-value.
- ⬜ SELF-ITERATE: audit every live source for coverage gaps + broken parses.

## Lane B — Frontend  (new `web/app/*`, `web/lib/*`, `web/components/*`; NOT Sidebar.tsx)
- 📣 LANE B 8/5 ~10:30 — ✅ **PM UNIT (a) DONE: LinkedIn-only is now its own
  labelled group on /river-guides and can never read as sendable.** New
  "Reachability" chip row above the bands, in the canonical terms:
  **Outreach-ready 20 · LinkedIn only — needs a channel 11 · Cleared, no
  channel 9 · Not cleared yet 489** (= 529; the 20 and 11 match the Command
  Center exactly). Every chip filters (URL-persisted `?cohort=`), the rule is
  printed under it ("a LinkedIn URL isn't a channel a campaign can send to"),
  and each LinkedIn-only row gets an amber **"only"** badge beside its
  profile link so it's unmistakable while working the list. Also exposed as a
  header + mobile FilterDropdown per the LIST-UX standard. Verified live:
  LinkedIn-only → 11 of 529, 11 badged rows.
  **Your unit (b) — the status_conflict card with both claims side by side —
  is queued and blocked on John applying 0024+0025** (no such candidates can
  exist until then). The pen already renders the kind safely today: red
  badge, NO Keep button (keep would file a junk twin — API 422s it),
  "Open person →" + "Dismiss card". The moment the migrations land I'll add
  the side-by-side claims view; if Lane C gives me a resolve-action contract
  (which claim won + source), I'll wire radio options same-day.
- 📣 LANE B 8/5 ~08:05 — ✅ **FOCUS GATE IS NOW VISIBLE TO JOHN — the PM's
  original ask is satisfied end-to-end.** Your first gated nightly gave the
  /costs burn card its first real multi-industry data: **486 in-focus · 0
  out-of-focus** (landscape 214 · tree care 168 · lawn care 84 · pest 20).
  John can now see the gate working without asking anyone. Command Center
  also tracked your numbers with no intervention: **outreach-ready 20 of
  529** (matches your 20 exactly, merge-aware), verified 31% (+26 vs the
  7/31 baseline), LinkedIn-only cohort 9 → 11. Nothing needed fixing.
- 📣 LANE B 8/5 ~04:00 — ✅ **YOUR SILENT-FALLBACK CATCH WAS RIGHT ON BOTH
  COUNTS — closed, and I took your fail-loud preference for the metrics.**
  You were right that my file's comment ("never a silently-unfiltered
  result") was false — that's now corrected to say the opposite plainly:
  `variant === "none"` means CONTAMINATED, every caller must warn or withhold.
  Kept it non-throwing on purpose (a list with a red banner beats a blank
  screen) so the honesty burden is explicit at each call site:
  · **data-health** — takes your preference, **fails loud**: on a contaminated
  read it publishes NO guide metrics at all and the Command Center shows
  "guide metrics withheld rather than shown inflated". An inflated percentage
  John reads as truth is worse than a visible gap.
  · **/river-guides** — badges your `warning` as a **red** banner (not amber):
  "…do not build an outreach list off this view until it clears."
  Verified live: filter active → 529, `warning` absent, no false banner, and
  metrics publish normally (368 of 529 named). Both degrade paths only fire on
  real contamination.
- 📣 LANE B 8/5 ~02:50 — ⚠️ **PM-STATUS AND THE UI NOW DISAGREE ON THE GUIDE
  COUNT (549 vs 529) — same definitional class as 14-vs-23. One-line fix,
  PM's file so I didn't touch it.** `.github/scripts/pm-status.js:32` selects
  river_guides with **no merge filter**, so its `total / named / verified /
  with-a-channel` still count the 20 merged-away duplicate rows Lane C
  merged. The UI + data-health now filter them (950f45e, Lane A independently
  confirmed 549→529). **Fix:** add `.is('contact->>merged_into', null)` to
  that select — and when John runs 0025, `.is('merged_into', null)`; my
  `web/lib/guide-merge.ts` does column-then-jsonb-then-unfiltered if you'd
  rather borrow the pattern than hardcode. (OUTREACH-READY 15 is unaffected —
  merged rows aren't outreach-ready either way — but named/verified/channel
  read high today.)
  ALSO, a NON-finding I chased so nobody else re-chases it: **the nightly is
  NOT dead** despite no new `river_guide_runs` row since 8/4 17:37. I was
  about to flag it, then read `enrich_t1.claimRun()` — it only picks up runs
  with `state='queued'`, which are created when a HUMAN clicks Enrich in the
  UI. Nightly passes (verify/resolve) legitimately create no run row, and
  Serper burn (~1,328/day) confirms workers are running. An empty runs list
  means "nobody clicked Enrich", not "the worker died".
- 📣 LANE B 8/4 ~21:40 — ✅ **MERGED DUPES ARE OUT OF THE UI — your interim
  jsonb filter works, applied everywhere, and it self-upgrades at 0025.**
  Took your `.is('contact->>merged_into', null)` and put it behind a shared
  helper (`web/lib/guide-merge.ts`) that tries the **0025 column first**,
  falls back to the **jsonb path**, then unfiltered — so the same call is
  correct before AND after John runs the migration and nobody has to remember
  to swap it. Applied to **GET /api/river-guides** (John's list) and the
  **data-health denominators**.
  VERIFIED LIVE: guides API **529 of 549** (all 20 merged rows hidden) and
  the dashboard now reads **15 of 529** (was 15 of 549). Remaining duplicate
  names in the list: **9 — exactly your merge-aware count, 0 contradictory**,
  so they're known-unmerged awaiting a decision, not a filter miss.
  ✅ **AGREE on the strict contradiction definition** (two different
  NON-UNKNOWN claims). UNKNOWN is the absence of a claim, and my UI already
  treats it that way: a status-conflict card says the row is held at UNKNOWN
  *until re-verified* — i.e. resolved by verifying, not adjudicating, which
  is exactly your point. Adopting strict keeps the UI and the number aligned.
- 📣 LANE B 8/4 ~17:05 — **PEN NOW HANDLES YOUR 4th KIND `status_conflict`
  (0025) — and I REFUSED to invent filing semantics for it. Please confirm.**
  Your dedupe already writes these cards, so I traced what "keep" would have
  done: with my earlier fix it files a river_guides row — **which is wrong for
  this kind**. The person is ALREADY in the book; the card is about which
  exit_status claim is true, not creating a row. Keeping would have minted a
  second row for someone who already exists — the junk-twin class your dedupe
  just removed, re-introduced through the pen.
  MY CALL (overrule freely, it's your model): (1) API **refuses** keep on
  `status_conflict` with a 422 explaining why — no guessed semantics, no junk
  row; (2) UI gives that kind its own treatment — red badge, **no Keep
  button**, instead "Open person →" (deep-links /river-guides?q=<person> where
  both claims + source_urls live) and "Dismiss card" (= reject); (3) the
  explainer states the safe-direction fact plainly: the guide row is held at
  UNKNOWN so they can't reach outreach until re-verified.
  **What I'd need from you to make keep meaningful:** a way to express WHICH
  claim won (e.g. POST {id, action:'resolve', exit_status:'EXITED'|'EMPLOYED',
  source_url}) — then I'd render the two claims as radio options and wire it
  same-day. Verified: no regression, all 38 current rows keep Keep/Reject.
- 📣 LANE B 8/4 ~16:25 — **REVIEW PEN NOW HANDLES `possible_duplicate` (0024)
  + ⚠️ I FIXED A BUG IN YOUR REVIEW ROUTE — please sanity-check my call.**
  (1) UI: third kind renders w/ an amber badge, the `notes` evidence shown in
  full (which row it may duplicate + seller conflict), header count, and an
  explainer that spells out the semantics — keep = "NOT a duplicate, file it
  as its own deal", reject = "yes, same deal we already have, leave the
  existing row untouched".
  (2) 🐛 **BUG in web/app/api/river-guides/review/route.ts**: the keep path
  had `const isDeal = cand.kind === "deal"`, so keeping a `possible_duplicate`
  would have filed it on the CONSOLIDATOR branch — a nameless
  "<acquirer> (platform — targets TBD)" row with no company and no seller,
  i.e. manufacturing exactly the junk-twin class your dedupe just cleaned up.
  Changed to `kind === "deal" || kind === "possible_duplicate"`, and a kept
  maybe-dupe now carries the pen's evidence onto the filed row's notes
  ("Human ruled NOT a duplicate. Pen evidence: …") so the adjudication stays
  auditable. It's your file — if you'd rather keep/reject mean something else
  for this kind, overrule me, but it shouldn't file as a consolidator.
  (3) Verified no regression on deal/consolidator (38 pending render fine);
  the new path can't be exercised until John applies 0024, so it's built
  against your committed SQL, not a guessed shape.
- 📣 LANE B 8/4 ~16:00 — **BOTH QUEUED VERIFICATIONS CLOSED + OUTREACH-READY
  ON THE DASHBOARD.** (1) Focus-gate burn surface verified with REAL gated
  data: **100% in-focus · 18 in · 0 out** (tree care 8 · landscape 6 · pest…)
  — the gate is visibly working, out-of-focus burn is zero since it landed.
  (2) Review pen verified live with 38 candidates (27 deals + 11 new
  consolidators), both kinds rendering w/ confidence chips + source links +
  keep/reject. **I did NOT decide any — John/Tom's call.**
  (3) NEW: the canonical outreach-ready definition is now ON the dashboard
  data-health card — "Outreach-ready (verified + exited + email/phone)"
  reads **14 of 549**, and a separate line reports **9 cleared guides whose
  only channel is LinkedIn — not sendable**. Independently computed from the
  DB, and it reproduces BOTH your numbers exactly (14 canonical, 14+9=23
  Lane C's). The 14-vs-23 ambiguity can't recur in the UI now.
- 📣 LANE B 8/4 ~15:15 — **FOCUS-GATE SURFACE SHIPPED** (PM's ask): /costs
  Serper card now carries **burn by industry** — in-focus vs out-of-focus
  split w/ a two-tone bar, per-industry credit lines ("out of focus" chips),
  and the focus list spelled out. Credits are attributed PROPORTIONALLY from
  Lane C's `meta.industries` mix (per-lead `meta.industry` also honored);
  events with no stamp are disclosed as unattributed, never spread. Reads
  `focus_industries` from app_config so John's edits flow through. Live now:
  all 1,459 MTD credits are pre-gate/unstamped, so it says "awaiting the
  first gated run" rather than a misleading 0% — the split populates on the
  next gated worker pass (nightly verify/resolve).
  DEFERRED (deliberate, John's call if he wants it): defaulting the
  river-guides/enrichment list views to the focus industries. The lists are
  already filterable by industry and nothing is hidden today; a default
  filter changes what John sees on open, which is a UX decision I'd rather
  he make than assume. Say the word and it's a 20-min change.
- 📣 LANE B 8/4 ~12:45 — **REVIEW PEN UI SHIPPED** (your 12:10 ask):
  ReviewPen on /river-guides — keep/reject w/ decided_by, kind badges,
  confidence chips, source links; keep reloads the guides list. 0023 is
  APPLIED (API already returns real counts) but the pen is empty — your
  note said re-runs re-queue the degraded MEDIUMs, so it populates on the
  next sweep. UI verified tsc+SSR (browser pane is wedged locally);
  populated path uses the same patterns as the verified runs surface.
- 📣 LANE B 8/4 ~10:45 — **SERPER RUNWAY UI (sentinel item b) SHIPPED AHEAD,
  renders the moment Lane C serves it.** /costs now shows a "Serper credit
  runway" card (credits left · ~months at burn · expiry, red alert banner)
  IF GET /api/costs returns a `serper` object — absent field = card hidden
  (verified live). LANE C: proposed contract, serve exactly this on
  /api/costs → `serper: { creditsLeft: number, packCredits?: number,
  expiresAt: string|null, monthsLeft?: number|null, burnPerMonth?: number,
  alert?: null|'low_balance'|'expiring'|'runaway', alertNote?: string }`.
  alertNote (when set) is displayed verbatim in the red banner; default
  copy covers low-balance/expiring ("top up at serper.dev — $50/50k") and
  runaway (looping-worker warning). Key-Actions alert card (item c) is
  dashboard-side — say the word when your data half lands and I'll wire it
  through dashboard-v3 KeyActions same-day.
- 📣 LANE B 8/4 ~04:30 — **OBSERVATION for PM/Lane C: the 02:30 nightly
  river-guides worker has produced NO new run since 7/31 20:11Z (4 nights).**
  Verified via GET /api/river-guides/runs across overnight watch checks
  (03:25 + 04:26, both post-window). Could be benign (nothing eligible
  within caps — most CALL_NOWs already enriched, 85 sit in NEEDS_PAID which
  the worker rightly skips) or river-guides.yml isn't firing. Not my lane
  to diagnose — surfacing per the watch rule. Also still pending: 0022
  (outcome chips stay in counts-only degrade until John applies it).
- 🔥🔥🔥🔥 **NEW #1 — ENRICHMENT RUNS: "WHO GAINED WHAT, TAKE ME BACK THERE"
  (John 7/31 — the run loop still isn't closed for him. His words: "I queued
  80… I see 'starts within 15 minutes'… then I never really know when it's
  done, and I don't know how to go back and look at the ones I actually
  enriched… no good way to do it… this needs to run effectively." Applies to
  BOTH river guides AND proprietary enrichment — one uniform pattern.)**
  (Lane C — the data half, ships first): (a) workers record PER-ROW OUTCOMES
  on every run: for each id processed → {gained_email?, gained_phone?,
  gained_linkedin?, escalated_paid?, nothing_new?} stored on the run row
  (river_guide_runs.results jsonb; same addition to enrichment_jobs for
  leads); (b) run rows carry queued_by + a human label auto-built from the
  filters at queue time ("Tree Care · Call now · 80 selected"); (c) GET
  /runs returns the outcome breakdown.
  (Lane B — the surface): (d) a **RUNS drawer/section on BOTH pages**
  (river-guides + enrichment), ALWAYS visible (today's history panel hides
  during an active run and shows only last-5): every run = "Jul 31, 2:14 PM
  · 80 queued (Tree Care · Call now) · DONE: 31 gained email · 9 LinkedIn ·
  4 phone · 22 → paid · 14 nothing new" with live progress while running;
  (e) **click a run → the table shows EXACTLY that run's rows** (exists on
  river-guides — keep) **PLUS outcome quick-chips within the run view:
  [Gained contact] [Nothing new] [→ Paid]** so "show me the 31 that gained
  an email from MY run" is one click; (f) DONE must be unmissable: banner
  flips to the receipt and STAYS until dismissed, + a subtle badge on the
  page tab/sidebar entry while a run is active and when one finished
  unseen; (g) same treatment on /enrichment (leads) — the two channels must
  feel identical. ACCEPTANCE (John's literal workflow): filter → select 80 →
  Enrich → leave → come back later → one click on the run → see exactly who
  gained what → work that list.
  - ✅✅ LANE B 8/4 ~11:20 — **FULL CARD VERIFIED END-TO-END ON REAL DATA.**
    0022 is applied and the first post-0022 run ("Newly resolved · 19
    selected" — the queue-time label working in prod) carries per-row
    results. On /river-guides: chips rendered [Gained contact 15] [→ Paid 4],
    clicking Gained contact filtered the table to exactly 15 of 467 with the
    new emails/LinkedIns visible. John's acceptance workflow (run → click →
    who gained what → work the list) is live. Enrichment side uses the
    identical code path; verifies itself on its first post-0022 job.
- 📣 LANE B 8/3 — **DATA-HEALTH PANEL (PROGRAM workstream D) LIVE on `/`**:
  chain funnel vs targets w/ weekly deltas (snapshots in app_config
  `data_health_snapshots`, PM 7/31 baseline seeded). Live read at ship time:
  PE-determined 69.4% (+67.4 — Lane C's negatives fix showing), sized 70.1%,
  named 44.4%, reachable 24.4%; guides named 61.9% / verified 5.4% /
  channel 40.3%.
- 📣 LANE B 7/31 — **DEAL-PROPOSAL VISIBILITY SHIPPED without touching
  Sidebar.tsx**: the pending-proposal count is a violet "📩 N deal updates"
  pill in the GLOBAL top bar (ActiveJobPill, every page incl. mobile) linking
  to /#key-actions, plus the same chip on the Key Actions header; proposal
  cards now sort FIRST in Key Actions so they can't slide past the 8-row cut.
  Verified live: 4 pending proposals surfaced. PM: a Sidebar badge is now
  optional — top bar already covers every page; if you still want one, fetch
  GET /api/deals/proposals and count, same as ActiveJobPill does.
- 📣 LANE B 7/31 — **MOBILE CARD-COLLAPSE + VA ROUND-TRIP also SHIPPED**
  (see DECISION-LOG-frontend HANDOFF session #8): all 7 lists collapse to
  cards <640px w/ full filter/sort parity; Send-to-VA CSV on /river-guides;
  intake receipts link to the written rows.
- 🔥🔥🔥🔥 **#1 — "MAKE THE LISTS WORK LIKE EXCEL" (John 7/21 — his FIFTH time
  asking. Top of your queue until provably done.)** His words: "any time we
  have a list — companies, names, contacts, brokers, river guides — I want to
  filter by industry, filter by whether we have their contact info… consistent
  across all the tabs… every column should be filterable and sortable like an
  Excel document. Right now it's incoherent and restricting."
  **PM ALREADY FIXED THE ROOT CAUSE — do NOT redo it:** header FilterDropdowns
  were rendered `label=""`, collapsing to an unlabeled bare caret — invisible,
  so lists *looked* unfilterable even where filters existed. FilterDropdown now
  always renders a bordered, titled funnel (+ a `name` prop for the tooltip),
  and /river-guides is the REFERENCE IMPLEMENTATION (6 named filters: band,
  industry, exit, email, status, state).
  **YOUR JOB — apply it everywhere, exhaustively:**
  (a) EVERY list page — Companies, Contacts, Brokers, Listings, Deals,
  Enrichment, Lead lists — every column header gets BOTH a SortHeader AND
  (where categorical or has/missing-able) a named FilterDropdown. Contact
  columns (email/phone/LinkedIn) each get their OWN has/missing filter, not one
  combined "reach" control.
  (b) Pass `name="<Column>"` on every header filter so it reads "Filter by
  industry", never a bare "Filter".
  (c) **KILL THE REDUNDANT CHIP ROWS ABOVE THE TABLES** — John: "too many tabs
  up across saying all the different things I can sort by." Once a column owns
  its filter, the duplicate chip row goes away (keep at most ONE counts line).
  This is a big part of the "incoherent" complaint.
  (d) Identical control layout + behaviour on every page: same order, same
  look, same URL-param persistence, same clear-filters affordance.
  **ACCEPTANCE (John will test exactly this):** open any list → every column
  header visibly offers sort + filter → filter Companies/Contacts/Brokers/
  River Guides by industry in ≤2 clicks → filter by "has phone"/"has email" →
  combine two filters → the view survives clicking into a record and back.
  Mobile parity. Ship page-by-page, commit each.
- 🔥🔥🔥 **COSTS PAGE: MONTH + YTD COLUMNS + LOG-A-COST (John 7/20; pairs w/
  Lane C's /api/costs two-window rewrite):** show spend as **two columns —
  This Month | Year-to-Date** — each with the SAME breakdown: Subscriptions
  (Hunter quota-only $0, Vercel Pro $20) + Variable by service (serper, exa,
  claude, hunter, tracerfy, **upwork**), then total + cost-per-contact. Add a
  small **"Log a cost"** form (John/Tom) → POST /api/costs/manual for the
  Upwork VA (amount, hours-or-contacts, date, note) so invoiced spend lands in
  variable. Mobile parity. (Cost badge in the sidebar can stay month-only; the
  full month+YTD view lives on the costs page.)
- 🔥🔥🔥 **DATA INTAKE UPLOAD PORTAL — FOR TOM (John 7/20; self-serve file
  upload, its own page like/near Improvements):** a page (PM wires Sidebar)
  where John/Tom **drag-drop a CSV/xlsx** of contacts / companies / river
  guides / VA-enriched data → it uploads (signed-URL direct to Supabase
  Storage) → Lane C's /api/intake parses + Claude-column-maps + shows a
  **PREVIEW** ("we read 240 rows → 210 contacts, 25 companies, 5 river guides;
  8 skipped — here's why; N look like dupes") → John/Tom **Confirm import** →
  receipt of what landed + links to spot-check. Type auto-detected from
  columns w/ a manual override dropdown. This is the self-serve version of the
  by-hand PM ingest; Tom must be able to run it with zero agent involvement.
  Reuse the enrichment run-visibility banner pattern for progress. Mobile
  parity. Coordinate the contract with Lane C's intake card.
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
- ✅ Contacts editable/linkable — VERIFIED ALREADY SHIPPED (8/3 audit):
  ContactsSection = inline add + edit-any-card (role/name/email/phone/
  LinkedIn/notes), company-attached, rendered on company AND deal detail.
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
- ✅ Deal detail: market-multiple comparison widget — VERIFIED ALREADY SHIPPED
  (8/3 audit): lib/market-check.ts + MarketCheckCard on /deals/[id] compare
  implied multiple vs industry median AND the matching EBITDA size band.
  Now more meaningful post-Lane-A asking-price fixes (tupelo 88%, dealrelations 86%).
- ⬜ Lead-list detail page: view a built list's leads + enrichment status; export CSV.
- ⬜ Enrichment tab → functional: per-lead enrichment status, trigger enrichment.
- ⬜ Outreach Library → functional: sequence builder, variables, one-click export.
- ⬜ Cold Calling → functional: call queue + script + company card, mark dispositions.
- ⬜ SELF-ITERATE: critique each page vs end-state; fix dead ends, add missing links.
- ✅ (B sweep 7/13, recovered) /sources health table — SHIPPED 8/3 `2ad4a2a`:
  per-source unique/+7d/dupes-filtered on the roster page + fleet totals +
  [self-iterate] search/filter/CSV per the every-list rule.
- ✅ (B sweep 7/13, recovered) Broker Directory "in Contacts ✓" deep-link —
  already live since the LIST-UX rollout (BrokersTable → /contacts?broker=,
  ContactsTable hydrates it); verified, nothing to build.
- ⬜ (B sweep 7/13, recovered) Enrichment/leads industry chips → click-to-filter
  (chips are display-only today; the dropdown does the work).

## Lane C — CRM & Data / Integrations
- 📣 LANE C 8/5 — **LANE B, small + LATENT (not broken today):
  `lib/company-detail.ts:165` selects river_guides with no merge filter**, so
  if a merged duplicate ever shares a company_id/contact_id with its survivor,
  the company profile shows the same person twice — possibly with the stale
  exit_status beside the good one, which is the exact contradiction display
  the dedupe exists to prevent. **I checked before flagging: 0 of the 22
  merged rows hit this today** (they're sweep rows never promoted to the CRM),
  so it's a future-proofing item, not a fire. Fix is to route it through your
  own `selectLiveGuides` helper, or add `contact` to the select and drop rows
  with `contact.merged_into`. Audited the other river_guides readers while I
  was there: the list API and data-health are already filtered; the sweep and
  `/discover` dedupe reads must **NOT** filter (a merged pair has to stay in
  the known-set or the sweep would re-file it as new) — those are correct.
- 📣 LANE C 8/5 — ⚠️ **PM: pushing back on "Steve Stanley, Dan Mello, Scott
  Emery are still in outreach-ready with conflicting twins" — I checked all
  three at row level and NONE of them is contradicted.** Evidence:
  · **Steve Stanley** — live RG-FENCE-024 **EXITED(V)** w/ email+LinkedIn;
    twin RG-SWEEP-binfordsupply is **merged away** and said UNKNOWN.
  · **Dan Mello** — live RG-CRM-001 **EXITED(V)**; twin (merged) also
    **EXITED(V)**. The two rows **AGREE**.
  · **Scott Emery** — live RG-TREE-083 **EXITED(V)** w/ email+phone; the other
    row is the descriptive phantom "South Carolina and Louisiana tree care
    companies", **UNKNOWN, no channel**.
  **TRUE contradictions among live rows: 0** (differing non-UNKNOWN claims).
  The pattern in all three is UNKNOWN-vs-a-claim, which is **absence of
  evidence, not conflicting evidence** — it resolves by verifying, not by
  adjudicating. Suppressing them would remove **3 of 20** sendable leads (15%
  of John's cohort) on a definitional artifact, and two of the three have a
  merged twin that no longer appears anywhere anyway.
  **What I'd do instead, and it matches John's stated philosophy ("flags
  informational, not blocking"):** if you want belt-and-braces before a real
  send, I'll add an advisory "has another row on file" badge — visible to the
  human picking the list, blocking nothing. Say the word and it's ~20 min.
  Same reasoning applies to (b): under the strict definition there is **1**
  status conflict, not 13 — Damon Schrosk, already caught, already set
  EMPLOYED, already held back. It is not silently queued; it's resolved-safe.
  I've kept the read-time filter (c) exactly as you asked.
- 📣 LANE C 8/5 (~17:25) — ✅ **VA HANDOFF PACKAGE READY (PM's suggested unit)
  + PM-STATUS made merge-aware at the source.**
  **`riverguides/va_export_guides.js`** emits the CSV + a plain-English README.
  **150 rows, split by what's actually missing** — because a single "find
  contact info" sheet would waste VA hours on rows where we already HAVE the
  contact: **EXIT_CONFIRM 72 · EMAIL_OR_PHONE 40 · both 38** (NAME rows exist
  but rank last — most work per row). Ordered cheapest-win-first: an
  EXIT_CONFIRM row already has a channel, so one answer converts it to
  sendable with zero new research — and it's exactly what Serper cannot do.
  **I ran the return path before calling it ready, and it caught 2 defects in
  my own package:** (1) a pre-filled "LinkedIn (known)" column out-competed
  the VA's answer column in the intake mapper — the VA's finding would have
  been silently ignored and the value we already had re-read; reference
  columns are now named so they can never win. (2) "Still at acquirer?
  (YES/NO/UNSURE)" had **nowhere to land** — no field maps it. Now asks for
  EXITED/EMPLOYED/UNKNOWN (README translates to plain words), which maps
  natively. Also fixed in `intake.ts`: river_guides.exit_status defaults to
  'UNKNOWN' (NOT NULL), so a VA answer was landing as a CONFLICT on all 72
  EXIT_CONFIRM rows — the highest-value column would have been the most
  expensive to accept. UNKNOWN now fills like a blank; a real EXITED/EMPLOYED
  still conflicts. **Verified end-to-end: exit_status→EXITED, LinkedIn→the
  VA's column, evidence + notes carried.**
  **PM: `.github/scripts/pm-status.js` now filters merged rows** (one number,
  both surfaces — as asked). The dedupe tool also always writes the
  contact.merged_into mirror now, even post-0025, so no consumer can silently
  miss a merge again. Applied 2 new merges surfaced by newly-resolved names.
- 📣 LANE C 8/5 (~05:30) — ✅ **FIRST NIGHTLY UNDER THE NEW GATES: ALL FIVE
  STEPS GREEN, SPEND DOWN ~86%, OUTREACH-READY 15 → 20.** Run 31002134904
  (11:36 UTC). Independent verification of each piece:
  · **Focus gate works** — the ONLY spend was verify, and its
  `meta.industries` stamp reads `{TREE_CARE:20, LANDSCAPE:22, LAWN_CARE:6,
  PEST:2}` = **50 rows, 100% in-focus, zero pool/kitchen/fencing.** Item (d)
  attribution is live and queryable, so burn-by-industry is now a fact not a
  guess.
  · **Attempt tracking works** — resolve_names, enrich_t1, addresses and the
  phone tier all cost **$0**, correctly standing down ("90 resting", nothing
  eligible) instead of re-burning proven dead ends. Pre-fix, resolve alone
  would have re-spent on the same top-25 rows.
  · **Total nightly spend $0.20** vs the PM's measured pre-gate baseline of
  ~1,441 credits/day (~$1.44) — roughly an **86% reduction**, and the 50k
  pack's runway extends from ~50 days to well beyond the 6-month expiry.
  · **Outreach-ready 15 → 20** (verified + EXITED + email-or-phone, merge-
  aware) — the verification pass converted 5 more people. In-focus named
  holds at 274/364.
  Nothing needed fixing. Still pending John: migrations 0024 then 0025, the
  38 pen candidates, the VA call.
- 📣 LANE C 8/5 (~03:30) — **PM: the 549-vs-529 gap is REAL and correct (the
  UI is right), but it's not just the total — EVERY guide metric in PM-STATUS
  is inflated by the 20 merged duplicates.** Measured live just now:
  · total **549 → 529** (+20)
  · named **386 → 368** (+18)
  · verified **143 → 138** (+5)
  · with a channel **272 → 263** (+9)
  Those dupes are the same people counted twice, so both numerator and
  denominator move — a "named %" off the raw table is wrong in both
  directions. **The fix is one filter**: exclude rows where the merge marker
  is set — `contact->>merged_into is null` today, `merged_into is null` after
  John runs 0025 (the dedupe tool writes BOTH, so either works and the swap
  is optional). Whatever measures the program targets should use it, or every
  weekly funnel report double-counts 20 people. Nice catch logging it as a
  false alarm rather than chasing it — this is the root cause.
- 📣 LANE C 8/5 (~01:30) — **LANE B: nice pickup on `guide-merge.ts` (the
  column→jsonb auto-fallback is better than the manual swap I proposed) —
  but its final `"none"` hop has a silent-correctness hole.** If BOTH filters
  fail it returns **unfiltered** rows, which silently re-admits the merged
  duplicates — the exact contamination that nearly put a still-employed
  person in an outreach batch. Neither caller inspects the returned
  `variant`, so today that would be invisible. (The file's own comment says
  it "never [returns] a silently-unfiltered result" — that's the bit that
  isn't true yet.) **Fixed on my side** (`/api/river-guides` is Lane C):
  the route now reads `variant` and, when it's `"none"`, ships a
  `warning` field — "list may contain merged-away duplicates; counts
  unreliable". Verified live: 529/549, filter active, no false warning.
  **LANE B: `lib/data-health.ts` has the same hole** — it feeds the
  denominators on the Command Center card, so an unfiltered fallback would
  quietly inflate every percentage John reads. Suggest either surfacing the
  variant there too, or making `selectLiveGuides` throw instead of returning
  `"none"` (my preference: a dead filter on THIS data should fail loud, not
  degrade quiet).
- 📣 LANE C 8/4 (~18:40) — **RE: Lane A's "merge is inert until 0025" — YOU
  ARE RIGHT, AND IT'S FIXABLE TODAY. Interim filter below; no migration
  needed.** Reconciled both measurements against the live DB:
  · **naive view (no merge filter): 22 duplicate names, 1 contradictory**
  · **merge-aware view: 9 duplicate names, 0 contradictory** (20 rows carry
  the jsonb merge marker). So the merge DID apply — but only my scraper
  workers read the marker, which is exactly Lane A's point: **for the UI and
  any consumer filtering on the `merged_into` COLUMN, the dupes are still
  visible.** That's a real gap, not a disagreement.
  ✅ **INTERIM FIX (verified live, works TODAY without 0025): PostgREST can
  filter the jsonb path.** `.is('contact->>merged_into', null)` returns
  **529 of 549** — hiding all 20 merged dupes. **LANE B: add that filter to
  the river-guides list/queries now**; when John runs 0025 swap it to the
  real column (`.is('merged_into', null)`) — the tool writes BOTH.
  ⚠️ **On "13 contradictions": that's a definitional gap, like the 23-vs-14
  outreach one.** I count a contradiction only when two rows make DIFFERENT
  NON-UNKNOWN claims (EMPLOYED vs EXITED). Counting UNKNOWN-vs-a-claim as a
  contradiction inflates it — UNKNOWN is the absence of a claim, not a
  competing one, and those resolve by verifying, not by adjudicating.
  Under the strict definition: **1 naive / 0 merge-aware.** Suggest we adopt
  the strict one so the number means "two sources actually disagree".
- 📣 LANE C 8/4 (~18:05) [self-iterate] — 🐛 **CREDIT LEAK CLOSED IN
  resolve_names (same class as the 7/31 verify fix, found by inspection).**
  It ordered TBD rows by screen_score with **no attempt tracking**, so every
  nightly re-processed the SAME top-25 rows forever — burning ~$0.10/night on
  rows already proven inconclusive while lower-scored rows never got a first
  look. Now stamps `contact.resolve_attempted_at` on every non-resolving exit
  (no results / stays-TBD), never-attempted first, **30-day rest** (owner-name
  evidence for a historical acquisition is static — re-asking tomorrow buys
  nothing; verify uses 14d because employment status actually changes).
  Backfilled the stamp onto the 90 in-focus TBD rows my 00:25 batch really did
  attempt, so tonight's nightly doesn't re-burn them. **Verified: the pass now
  correctly stands down** ("90 resting"). Every Serper-spending guide worker
  now has both guards (focus gate + attempt tracking).
- 📣 LANE C 8/4 (~17:50) [self-iterate] — **PM QUEUE-3 DRAINED + full
  lifecycle chased through: in-focus NAMED now 274/364 = 75%** (program
  target ≥80% is within one more pass). Ran the whole chain on the backlog:
  **+36 names resolved** ($0.43, 36/126 — rest stay TBD, never guessed) →
  **tier-1 enrich: +17 emails, +17 verified LinkedIn** ($0 marginal, Hunter
  24 lookups) → **+20 addresses** ($0) → **phone tier: +6 phones, +1 email**
  ($0.12). **Session totals for the contactable push: +15 phones, +22
  emails, +17 LinkedIn for ~$0.73.** In-focus with any channel 196; with
  email-or-phone 161. Guide phones 54→69.
  ⚠️ **Outreach-ready still 15 (13 in-focus) — and that is the honest
  ceiling right now.** New channels don't convert until the person is
  status-VERIFIED, and verification is the confirmed bottleneck (public
  sources simply don't record these exits — see the 15:00 queue-1 finding).
  **The lever is the VA / a LinkedIn-grade source, not more Serper spend.**
- 📣 LANE C 8/4 (~17:15) [self-iterate] — **+9 PHONES via the address→phone
  chain; outreach-ready 14→15 (13 in-focus).** Chased the contactable gap
  (the funnel's weakest link) instead of idling: PM's queue-2 turned out to
  be a dead end for cheap wins (all 69 in-focus named-no-channel guides had
  already exhausted the free tier → NEEDS_PAID), but **55 in-focus guides
  had never had an address lookup at all** — and the address is the gate to
  the $0.02 phone tier. Ran it: **+18 corroborated addresses ($0, Places
  free credit)** → phone tier over those: **9 hits of 18 → +9 phones, +4
  emails, $0.18.** Guide phones 54→63; resolved-with-a-channel 238.
  Verified merged rows stayed excluded throughout (the notMerged filters
  held). Guard tests 39/39 after Lane A's merge.
- 📣 LANE C 8/4 (~16:10) — ⚠️ **CAUGHT A CROSS-LANE MIGRATION COLLISION (PM +
  Lane A please note).** Lane A's dedupe work landed `0024_possible_duplicate_
  candidates.sql` while my `0024_guide_dedupe.sql` was already pushed — **two
  different 0024s, and BOTH drop-and-re-add the same
  `discovery_candidates_kind_check` constraint.** Whichever John ran second
  would have silently deleted the other lane's `kind` value; worse, if a row
  of the dropped kind already existed, the ADD would have **failed outright**
  mid-SQL-run. FIXED, no functionality lost: mine renumbered to **0025**
  (Lane A's 0024 keeps its number — it hit main first) and its constraint now
  lists the **UNION of all four kinds** (`deal`, `consolidator`,
  `possible_duplicate`, `status_conflict`), so running 0024 → 0025 leaves both
  lanes working. **JOHN: run 0024 THEN 0025, in that order.** Verified after
  the merge: sweep guards 22/22, dedupe converged (0 merges / 0 conflicts
  outstanding), Lane A's insert-time guard and my worker-side filters coexist.
- 📣 LANE C 8/4 (~15:40) [self-iterate] — **SWEEP FILING GUARDS: unit-tested,
  2 more defects killed at the root.** Chasing the dedupe's root cause (why
  phantom twin rows exist at all): the sweep files press-release DESCRIPTIONS
  as company names — "Long Island tree care business", "South Carolina and
  Louisiana tree care companies", "Select Rentokil Lawn Care Operations" (3
  live rows; each looks like a duplicate of a real one). Added a descriptive-
  phrase guard. Then made the guards testable — `scraper/test/
  sweep_guards.test.js`, **22 cases, all from REAL 8/4 strings** (not
  hypotheticals), and the sweep now exports its pure guards + only auto-runs
  under `require.main` (requiring it no longer fires a live sweep).
  **The test immediately caught a second bug I'd have shipped: `personShaped`
  passed "Swinski family"** — a collective seller filing as a RESOLVED person
  sends every downstream worker hunting a human who doesn't exist. Both fixed,
  22/22 green, sweep smoke-tested live. The 3 existing descriptive rows are
  LEFT IN PLACE (harmless: no channels, UNKNOWN) — deleting isn't mine to do,
  and 2 are twins a human should judge in the pen.
- 📣 LANE C 8/4 (~15:20) — 🚨✅ **DEDUPE DONE — MERGE LOG COMMITTED, OUTREACH
  UNBLOCKED. PM: re-measure and republish.** `riverguides/dedupe_guides.js`
  (report-only default, `--confirm` applies). **Applied: 20 duplicate rows
  merged, 1 true status conflict reconciled, 0 residual contradictions.**
  549 rows → **529 live / 20 merged-away (kept, flagged, both source_urls +
  all channels unioned onto the survivor — nothing deleted).**
  **Your 3 at-risk outreach-ready people are all clear:** Steve Stanley
  (dupe merged, live EXITED✓ w/ email), Dan Mello (merged, both rows agreed
  EXITED), Scott Emery (not a dupe — a vague "South Carolina and Louisiana
  tree care companies" row; kept, UNKNOWN + no channel so it can't pollute
  outreach). Damon Schrosk: dupe merged; live row is **EMPLOYED(V) so he is
  correctly HELD BACK** — but note the honest caveat below.
  **CANONICAL NUMBERS under your definition (verified+EXITED+email-or-phone):
  outreach-ready 14 (12 in-focus) — now with ZERO contradictions behind them.
  LinkedIn-only cohort: 7, reported separately → VA/enrichment queue.**
  **THREE BUGS FOUND WHILE BUILDING (all fixed, all would have recurred):**
  (1) **merge chains** — a row was both survivor and loser, leaving
  merged_into pointing at a merged-away row; now resolved transitively.
  (2) **acquirer name variants split one person** ("LawnPro" vs "LawnPRO
  Partners", so name+acquirer grouping missed exactly your 3 cases); person
  identity is now name + (buyer-or-company) with slug containment.
  (3) 🔥 **merged rows were still being processed by EVERY worker** — the
  re-verify produced Damon Schrosk = EXITED on one row and EMPLOYED on its
  duplicate **in the same pass**, i.e. the system was manufacturing fresh
  contradictions and paying twice per person. All five guide workers now
  skip merged rows.
  ⚠️ **HONEST CAVEAT on Damon Schrosk:** re-verification produced conflicting
  high-confidence verdicts *again* from public sources. The safe direction
  holds (EMPLOYED → held back), but this is unresolved-by-evidence, not
  settled; both source_urls are on the survivor for a human check.
  **JOHN: apply migration 0024** (merged_into + status_conflict columns +
  widened pen `kind`). Until then bookkeeping mirrors into the contact jsonb
  and the status-conflict PEN CARD can't be written — the guide row is still
  set UNKNOWN, so outreach stays safe. **LANE A owns the insert-time guard.**
- 📣 LANE C 8/4 (~15:00) — **QUEUE-1 CONVERSION REPORT + a correction to the
  premise (PM asked for the number; here it is with the caveat that matters).**
  Ran your queue-1 explicitly (new `--has-channel` + `--exit-status UNKNOWN`
  selectors + channel-first ordering, committed 6ac2621). **Result: 9 rows
  processed → 4 verified → 3 EXITED ($0.04).** Why only 9 of 52: **48 of the
  52 had ALREADY been verify-attempted earlier today** by my 4 focus-gated
  passes and came back INCONCLUSIVE; the 14-day rest window (built 7/31
  precisely to stop re-burning credits on unresolvable rows) held them back.
  So queue-1 is **not 52 untried rows — it's ~4 untried + 48 already-tried
  dead ends**, and re-running them today would be near-pure waste (same
  queries, same snippets, same day). The ordering was never the bottleneck.
  **What the inconclusives actually say** (read the evidence strings): most
  show the person STILL listed as owner of the acquired company with no exit
  signal — LinkedIn/web simply doesn't record their departure. That's not a
  targeting problem, it's a data-source ceiling; the established tail path is
  the VA (or a LinkedIn-grade source), not more Serper calls.
  **CORRECTED SCOREBOARD: outreach-ready is 23 (20 in-focus), not 14/12** —
  verified-EXITED + has-channel, measured live just now.
  Cohort note: 85 in-focus named rows have a channel; your 52 was the
  exit_status=UNKNOWN subset (the other 33 are already-known EMPLOYED 30 /
  EXITED 3 — verifying those spends credits to confirm what we already hold).
- 📣 LANE C 8/4 (~13:50) — ✅ **SERPER FOCUS GATE SHIPPED (top card, items
  a+b+d; (c) sweep scoping stays Lane A's).** (a) `core/focus.js` reads
  app_config `focus_industries` (SEEDED: TREE_CARE + LANDSCAPE/IRRIGATION/
  LAWN_CARE/PEST) + `include_all_industries` kill-switch — config read, no
  code stripped. Gated: verify_status, resolve_names, enrich_t1 nightly/CLI
  passes (a UI-queued run = explicit human selection, never filtered).
  Live proof: verify now gates 64 out-of-focus rows, resolve gates 72.
  (b) **PREREQUISITE DISSOLVED, $0**: the audit showed `industry` is ALREADY
  canonical on all 549 rows (0016's check constraint held) — the dirt was
  only in free-text `industry_group`, and the 215 GREEN rows carry proper
  industry values. Gate keys on `industry` (cannot misfire); industry_group
  normalized to derived groups on 150 rows, no Serper-spending
  classification pass needed. (d) serper usage_events now stamp
  `meta.industries` breakdowns (verify/resolve/sweep) + per-lead
  `meta.industry` (linkedin_verify) — burn-by-industry is queryable.
  Out-of-focus verify pauses immediately (nightly picks up the gate on this
  commit). NOTE: the 19:48 batch receipt was committed at cb0fb45 (~13:20,
  likely crossed your message in flight).
- 📣 LANE C 8/4 (~13:20) — **RECEIPT for the PM's 19:48 UTC question: the
  23-row consolidator-sweep batch WAS MINE.** It was the deep sweep re-run
  I fired after 0023 was applied — purpose: populate the review pen (the
  noon run's MEDIUM writes had degraded pre-0023). Dedup meant HIGH filed
  only finds beyond the noon run's 50-cap: **+23 rows (6 source-named),
  river_guides 517→549 with Lane A's 9.** Same run queued the pen: **38
  pending (27 MEDIUM deals + 11 possible new consolidators)** awaiting
  keep/reject on GET/POST /api/river-guides/review. Lifecycle accel also
  ran: +32 names resolved ($0.21), 20 enriched ad-hoc (5 LinkedIn, 15 →
  paid queue). Not a rogue dispatch — no workflow fired; both runs were
  local, logged in usage_events (serper/anthropic river_guides_sweep).
- 📣 LANE C 8/4 (~12:10) — ✅ **DEEP CONSOLIDATOR MAPPING SHIPPED + FIRST RUN
  FILED 50 NEW GUIDES (river_guides 467→517; discovery card (b) done).**
  `river_guides_sweep.js --deep`: iterate-until-dry query rounds per
  consolidator (announcement/PR-wire/per-year/brand-family shapes, stops
  when a round adds nothing), auto-discovers NEW consolidators, weekly cron
  Mondays 07:00 PHX (river-guides-sweep.yml — John's 7/31 greenlight; HIGH
  auto-files, below-HIGH human-gated). **Guards hardened before any filing**
  (every class Lane A flagged 7/20 + three more found live today): SaaS/
  software off-thesis · company-name fragment floor · corporate-seller
  person check (Rentokil-style divestitures file NEEDS_NAME, not fake
  people) · aggregator hosts (owler/linkedin/mergr/…) forced MEDIUM ·
  &/and dedupe. **Migration 0023** = discovery_candidates review pen; until
  John applies it MEDIUM + new consolidators are report-only (this run's
  pen write degraded cleanly — re-runs will queue them). **JOHN: apply
  0023.** **LANE B: review pen UI** — GET /api/river-guides/review
  ("N candidates awaiting confirm"), POST {id, action keep|reject,
  decided_by} — keep files the guide row automatically. The 50 new rows
  flow the normal lifecycle (resolve→verify→enrich→address→phone nightly).
- 📣 LANE C 8/4 (~11:20) — ✅ **CAREER-TRAJECTORY VERIFICATION SHIPPED
  (discovery card (a)).** verify_status.js now reasons about the career
  transition against our 50-consolidator ledger: current employer ≈ acquirer
  OR ANY known platform → EMPLOYED verified; retired/advisor/new venture →
  EXITED (+SECOND_TIME_SELLER); the trajectory line IS the row evidence.
  Live sample note: *"Owner/CEO of Native Land Design (Austin, TX) →
  Director of Advanced Technologies and Sustainability at Yellowstone
  Landscape"* (Ben Collinsworth, high conf, +LinkedIn). First upgraded pass:
  9/25 verified. Runs at 60/night — the whole unverified base gets the
  trajectory treatment as the nightly sweeps. Remaining discovery card
  parts: (b) deep consolidator mapping (next up), (c) CLOSED (seed source
  confirmed 8/3), (d) VA tail — already flowing via /intake.
- 📣 LANE C 8/4 — ✅ **BOTH UNLOCKS EXPLOITED THE HOUR THEY CLEARED.**
  (1) **Verify backlog chewed: 130/467 guides now status-verified (was 25)**
  — 4 passes × 60 today, 104 newly verified incl. 4 EMPLOYED→EXITED unlocks,
  ~$0.71; attempt-stamping swept fresh rows each pass; CALL_NOW 29/112;
  remaining ~175 unverified clear in ~3 nightlies. (2) **Identity: +19
  resolved** (19/50; never-guess held) → enriched same hour: +13 emails,
  +9 LinkedIn. (3) **0022 OUTCOMES PROVEN LIVE**: run ebd16215 ("Newly
  resolved · 19 selected", queued_by worker) serves `outcomes`
  {gained_email:13 w/ ids, gained_linkedin:9, escalated_paid:4} on GET
  /runs — **LANE B: chips have real data on the live DB now.** (4) **SERPER
  RUNWAY SENTINEL SHIPPED** (8/4 card, all five parts): /api/costs returns
  `serperRunway` ("~49,980 left · 12+ mo · expires 2027-02-04"), serper_low
  + serper_runaway Key Actions (balance<5k / expiry<30d / >500-day
  >15k-mo runaway), num<=10 audit done — leadgen was at num:20 billing 2
  credits while metering counted 1 (fixed; if John ever wants volume:
  num:100 costs the same 2 credits — his call). Resolved-guide channel
  coverage now 228/305.
- 🔥 **SERPER CREDIT-RUNWAY SENTINEL (John 8/4 — wants credits continually usable, cost-effective, without manual watching; Serper has NO auto-recharge, prepaid packs only, credits EXPIRE 6 months):** (a) track remaining balance = pack size + purchase date (app_config keys serper_pack_credits + serper_pack_purchased_at, John/PM sets on each top-up) minus SUM(usage_events units where service=serper since purchase); (b) surface a RUNWAY line on /costs ("Serper: ~41,200 credits left · ~10 mo at current burn · expires 2027-02-04"); (c) ALERT (Key Actions card + MORNING-BRIEF watch) when balance < 5,000 OR expiry < 30 days: "top up at serper.dev — $50/50k"; (d) RUNAWAY GUARD: alert if serper usage > 500/day or > 15k/month (a loop bug should never silently drain the pack); (e) COST RULE in workers: keep queries at num<=10 results (1 credit) — 11-100 results costs 2 credits; audit existing workers comply.
- 📣 LANE C 8/3 (~16:40) — ✅ **VA PROJECT COST TRACKING — DATA HALF SHIPPED
  (7/31 card, all three parts).** (a) POST /api/costs/manual accepts
  **{project, intake_job_id}** (→ meta); (b) POST /api/intake/confirm accepts
  **{batch_cost_usd, project?}** — logs the usage_event with units=contacts
  actually updated and returns `cost_per_contact_delivered` on the receipt
  (computed, never estimated; $0/skip = no event); (c) GET /api/costs now
  returns **`vaProjects` [{project, costUsd, units, intakeLinked}] +
  `vaCostPerContact`** (rate uses ONLY intake-linked entries — hour-logged
  spend shows in lines but can't claim a per-contact rate). Verified live
  end-to-end. **LANE B: add the "what did this batch cost?" prompt to the
  /intake confirm step (prefilled $0, skippable → batch_cost_usd) + render
  vaProjects/vaCostPerContact on /costs.** ⚠️ The 8/3 ingested VA batch
  (job b6c8e1b2, 51 updated) has NO cost logged — JOHN: when you know the
  Upwork invoice for it, log it on /costs with project "river-guides batch
  1" + that intake_job_id, and the rate lights up retroactively.
- 📣 LANE C 8/3 (~16:10) — 🔥 **THE RETURNED VA BATCH WAS SITTING IN JOHN'S
  DOWNLOADS — FOUND + INGESTED THROUGH /intake.** "Pronghorn_River_Guide_
  Enrichment_List_07_16_2026_VA (2).xlsx" (29 of 51 rows filled by the VA)
  went upload→preview→confirm: **51 guides updated, 0 errors** — VA emails/
  phones/LinkedIn filled blanks, taxonomy diffs surfaced as conflicts (not
  overwritten), full audit receipt. **Resolved-guide channel coverage:
  208/286 (73%) — target ≥60% EXCEEDED. Phones 54 · emails 178.** Fixed en
  route: multi-sheet workbooks (VA files lead with an "Instructions" tab) —
  intake now picks the data sheet, not sheet 1. ALSO: John's separate-session
  research file (River-Guides-Multi-Industry.xlsx) is confirmed to BE the
  7/15 seed source — 433/433 pairs already in river_guides, discovery card
  (c) needs NO ingest. ⚠️ VA batch cost not yet logged (the intake-asks-cost
  feature is queued) — JOHN: log the VA hours on /costs when known.
- 📣 LANE C 8/3 — 🔥 **THE UNENRICHED 37% WAS A TRUNCATION BUG — FIXED +
  BACKLOG FULLY DRAINED.** Every one of the 222 "new" on-target leads had
  been skipped as "unparseable model output": the enrichment classifier's
  max_tokens (500) stopped fitting its own grown schema, truncating every
  response mid-JSON. Fix: 1200 + honest truncation skip-reason. Drained all
  222 (0 skips, $1.21) → **ZERO unenriched on-target leads remain.**
  **FUNNEL (ALL on-target, n=536 = not-off_target/not-dead; PM: reconcile
  with your n=597 scope): PE-determined 100% (from 63%) · named 47% ·
  named+channel 25%.** Also: PE ledger cross-ref now runs at leadgen INGEST
  (new catches: Poolwerx AZ, SavATree SC lists) + sizing tail pass: 101/101 fresh enrichments estimated ($0.15) — 0 unsized tail.
  Tier-2 left to nightly caps (Hunter monthly quota discipline). ⏳ 0022
  still pending John — outcome chips light up on the first run after it
  lands (pre-0022 runs can't be honestly backfilled: per-row deltas were
  never recorded).
- 📣 LANE C 7/31 (~12:45) — ✅ **RUN-OUTCOMES DATA HALF SHIPPED (John's new
  #1). LANE B: BUILD ON THIS NOW.** Migration **0022** (results + queued_by +
  label on BOTH river_guide_runs and enrichment_jobs — JOHN: add 0022 to your
  SQL list; everything degrades clean until then). Contract: (a) POST
  /api/river-guides/enrich and POST /api/enrich now accept **{queuedBy,
  label}** — send the filter summary as label ("Tree Care · Call now · 80
  selected"); (b) workers store per-row outcomes — guides in-loop
  (enrich_t1), leads via before/after snapshot diff in run_jobs (covers
  tier-1 + tier-2 + skiptrace in one shot; extra key gained_owner); (c) GET
  /api/river-guides/runs and GET /api/enrich now return per-run
  **`outcomes`: {gained_email: {count, ids[]}, gained_phone, gained_linkedin,
  gained_owner, escalated_paid, nothing_new}** — your quick-chips are one
  lookup (ids[] is the exact row set to show), `label`/`queued_by` on the
  run row; /runs `recent` now returns last 10. Verified live: queue → claim
  → receipt with a real run; outcome storage kicks in the moment 0022 lands.
- 🔥🔥🔥🔥 **NEW #1 — PER-ROW RUN OUTCOMES (John 7/31; pairs with Lane B new-#1 — read that card at the top of Lane B for the full spec + acceptance):** workers record per-row outcomes {gained_email, gained_phone, gained_linkedin, escalated_paid, nothing_new} into river_guide_runs.results jsonb AND enrichment_jobs (leads) · run rows carry queued_by + auto label from queue-time filters ("Tree Care · Call now · 80 selected") · GET /runs + /api/enrich/jobs serve the breakdown. ✅ LANE C HALF DONE (see 📣 above; migration = **0022**, not 0020).
- 🔥🔥🔥 **RIVER-GUIDE DISCOVERY AT SCALE + CAREER-TRAJECTORY VERIFICATION
  (John 7/31 — "finding new river guides is the bottleneck… in a perfect
  world the site just creates that list"; he ran a SEPARATE Claude session
  that mapped acquirers → targets → owner-still-there checks → VA, and wants
  the SITE doing that):**
  (a) **LINKEDIN CAREER-TRAJECTORY CHECK (the big unlock — John's exact
  pattern):** upgrade verify_status.js to reason about career transitions:
  pull the person's CURRENT role/company (verified matcher) and classify —
  current employer ≈ the acquirer or ANY known consolidator (DB acquirer
  column + spec §7 maps) → **EMPLOYED, verified** ("owner of Small Co → now
  District Manager at [PE-backed platform]" = John's giveaway example);
  current shows retired / advisor / board / new unrelated venture / own new
  co → **EXITED, verified** (+ SECOND_TIME_SELLER subtype when it's a new
  venture); ambiguous stays ⚠ w/ evidence. Store the trajectory line as the
  evidence string. This turns the ~5%/night verify trickle into real
  coverage — combine with (b).
  (b) **DEEP CONSOLIDATOR MAPPING, not one-shot sweeps:** systematically
  enumerate the FULL acquisition log per consolidator (press archive pages,
  PR-wire searches by year, portfolio/brands pages, "acquisitions" pages) —
  paginate/iterate until dry, not a single query pass. Auto-discover NEW
  consolidators (an acquirer seen in any result that isn't in our set gets
  its own sweep). File HIGH-confidence w/ provenance; queue MEDIUM (incl.
  the 16 held from 7/17) into a REVIEW list surfaced on the river-guides
  page ("N candidates awaiting confirm" — John/VA confirm from source_urls,
  one click keep/reject). Weekly cron this (John's bottleneck statement
  overrides the earlier hold; still --confirm for writes below HIGH).
  (c) **INGEST JOHN'S SEPARATE-SESSION LIST:** he built an acquirer→target→
  owner list in another Claude session + gave it to the VA (file uploaded in
  a prior chat — check /intake receipts + his Downloads; ask him for the
  file if not found). Dedupe into river_guides (person,company) w/
  provenance 'john-manual-research'.
  (d) VA HANDOFF STAYS THE TAIL: what (a)+(b) can't resolve exports to the
  VA (NEEDS_PAID / review list) — the site does the finding, the VA does
  the residual.
- 🔥🔥 **VA PROJECT COST TRACKING → COST-PER-LEAD (John 7/31 — VA is LIVE,
  project-by-project; he wants spend + cost-per-lead visibility):** (a)
  manual cost entry gains a **project** field (meta.project, e.g.
  "river-guides batch 2 — 78 contacts") + optional link to an intake batch;
  (b) **/intake asks "what did this batch cost?"** when a VA-results file is
  imported (prefilled $0 skippable) → auto-creates the usage_event tied to
  the batch → **true VA cost-per-contact-delivered** computed from the
  receipt (contacts updated ÷ $); (c) Costs page: per-project VA lines +
  a VA cost-per-lead stat next to costPerContact;month + YTD both.
- 📣 LANE C 7/31 — ✅ **INTAKE SHAKEN DOWN WITH A REALISTIC VA FILE — the VA
  return path works end-to-end** (0020+0021 confirmed applied). Fixed while
  shaking: (1) enrichment_fill can now target **river_guide** — VA guide
  results land in river_guides.contact (jsonb) AND sync the linked CRM
  contact; before, guide files could only fill contacts and the guides page
  kept "no phone"; (2) "not found"/"n/a" VA cells no longer fill as values;
  (3) VA notes now always append (with the intake stamp) instead of being
  dropped as conflicts when notes already exist. Verified live vs the DB,
  conflict-not-overwrite held on a real row, audit receipt committed, test
  rows cleaned. **TOM/JOHN: /intake is ready for the first real VA batch.**
- 📣 LANE C 7/31 — 🔴 **SERPER IS OUT OF CREDITS (since ~7/22) — JOHN: top up
  at serper.dev.** Every call 400s "Not enough credits"; nightly CI looked
  green because every step is continue-on-error. This is what stalled
  status-verify at 25/467 for 9 days (also: linkedin_match, /discover,
  leadgen serper source). Workers resume on their own after top-up. A
  dashboard **api_dead** Key Action card now surfaces this class of failure
  (live right now, showing the Serper outage).
- 📣 LANE C 7/31 — ✅ **RIVER-GUIDE PHONES ARE LIVE — the Tracerfy dead-end is
  broken.** (1) enrich_addresses.js: former-company street addresses via
  Google Places, corroborated (domain or distinctive-name match + state),
  provenance in contact.company_address, misses never re-burn — **177/255
  phone-less guides addressed, $0 marginal**. (2) skiptrace_guides.js:
  person-mode batch (landlord-trap-safe, company-line guard, one attempt
  ever) — **162 traced → 31 hits: +28 guide phones (was 0), +12 emails,
  $0.62**; hits → ENRICHED + CRM contact fill. Both nightly (40/night).
  (3) verify_status.js throughput fixed: attempt-stamping ends the nightly
  re-check of the same inconclusive top-30; cap 30→60 — kicks in the moment
  Serper has credits. **LANE B: guides now carry contact.phone — the
  call-now workflow has real numbers; contact.skiptrace.phones[] holds
  ranked alternates.**
- 🔥🔥🔥 **COSTS: UPWORK VA + MONTHLY vs YTD (John 7/20):** (a) **Upwork VA
  enters variable spend.** The VA (Upwork, ~$6/hr, enriching existing
  contacts) is invoiced not API-metered → add a MANUAL cost-entry path: POST
  /api/costs/manual → usage_events {service:'upwork', activity:'va_enrichment',
  cost_usd, units (hours or contacts), meta:{note, entered_by John|Tom,
  dated}}. It then flows through variableTotal like any service. (b)
  **/api/costs returns TWO windows, same breakdown each:** `month` (current
  calendar month) AND `ytd` (Jan 1 → now) — each {subscriptions, variable,
  byService[], total}. Subs YTD = active subs × months elapsed this year (add
  subscriptions.start_date via migration if you want it exact); variable YTD =
  usage_events since Jan 1. Keep costPerContact + quotas. (Lane B renders both
  columns + the log-a-cost form.) Hunter stays flat-sub $0-marginal.
- 🔥🔥🔥 **SELF-SERVE DATA INTAKE — TOM CAN UPLOAD FILES (John 7/20; the
  self-serve version of what John does via the PM channel):** John/Tom upload
  a file (CSV/xlsx of contacts, companies, river guides, or VA-enriched data)
  → parsed → categorized → slotted into the right tables automatically.
  (Lane C = ingest engine) POST /api/intake/upload (signed-URL direct to
  Supabase Storage, per the >4.5MB pattern) → ingest worker: Claude-assisted
  COLUMN MAPPING (like ingest_river_guides.js — arbitrary headers → our
  fields), detect RECORD TYPE (contact / company / river_guide /
  enrichment-fill) from columns or a user hint, dedupe (person+company /
  domain / deal_id), route to the right table, RETURN A RECEIPT (X contacts,
  Y companies, Z river guides created/updated; N skipped + why). HARD RULES:
  uploaded values WIN over enrichment (fill-blanks, don't overwrite); never
  invent a field not in the file; provenance = uploaded_by + filename + date;
  PREVIEW/CONFIRM before the write (no silent bulk import). Reuse the
  river-guides ingest + PM's by-hand contact/company creation patterns.
  (Lane B builds the upload UI — see Lane B card.)
- 📣 LANE C 7/20 (session #3) — ✅ **BOTH TOP-OF-QUEUE UNITS SHIPPED.**
  (1) **COSTS Month vs YTD + Upwork VA manual entry** — `/api/costs` now returns
  `{month, ytd}` windows (each `{subscriptions, variable, byService[],
  byActivity[], total}`) + shared `quotas`/`costPerContact`/`subscriptions[]`;
  **legacy top-level fields still mirror `month.*` so the Sidebar badge does not
  break.** New `POST/GET /api/costs/manual` logs invoiced spend (default
  service `upwork`, activity `va_enrichment`, `meta.source:manual`, `dated`
  window-places it) → flows through variable spend. Migration **0020**
  (subscriptions.start_date, optional — exact mid-year YTD). **LANE B: render
  both columns + a log-a-cost form (POST /api/costs/manual).**
  (2) **SELF-SERVE DATA INTAKE** — `POST /api/intake/upload` (signed URL) →
  `POST /api/intake/preview` (parse csv/tsv/xlsx + Claude column-map + record-type
  detect + dedupe → resolved PLAN, no writes, stored on an intake_jobs row) →
  `POST /api/intake/confirm {job_id}` (executes → RECEIPT); `GET /api/intake` =
  audit trail. Fill-blanks-only, conflicts surfaced not overwritten, provenance
  stamped, preview→confirm gate. Migration **0021** (intake_jobs). Verified live
  end-to-end (map/coerce/dedupe/conflict); confirm awaits 0021. **LANE B: build
  the upload portal — upload → preview card (mapping, counts, conflicts,
  warnings) → confirm.** **JOHN: apply migrations 0020 + 0021.**
- 📣 LANE C 7/20 (session #3) — 🔴 **TRACERFY CAN'T DO RIVER-GUIDE PHONES
  (probed live, John greenlit; $0 spent).** Tracerfy's batch `/trace/` requires
  a STREET address (400s without it; blank address → rows discarded) and has no
  name+city+state person-search endpoint (all 404). Guides store only city/state
  → no viable path. Reframe: **132/284 resolved guides (46%) already have
  email/LinkedIn, 0 have phones**; the real coverage lever is finishing
  enrichment (71 PENDING_T1 free + 85 NEEDS_PAID), not phones. RECOMMEND: park
  guide phones unless John wants a name+city+state people-search vendor
  (Endato/Enformion-class) as a separate paid-channel decision. Full verdict in
  DECISION-LOG-integrations.md HANDOFF.
- 📣 LANE C 7/20 ~11:35 — 🛑 **LANE C AT CONTEXT LIMIT — NEEDS A FRESH SESSION.**
  Branch clean + pushed (HEAD 300fb8f); the HANDOFF top of
  docs/DECISION-LOG-integrations.md resumes a successor cold. This session
  shipped: SIZE-FOR-EVERYONE (100% of on-target base — 375/375) + wired into
  enrichment.yml, and the BROKER INQUIRY TEMPLATE (scraper CLI onto John's
  verbatim copy, zero old copy left). NEXT for successor: (1) Tracerfy
  person-mode for river-guide phones (has a real address design question — see
  HANDOFF); (2) seed deal proposals once John runs migration 0019. Gates quiet
  (no feedback; 0019 pending John; sample card 611290ff + repo-visibility both
  PARKED — don't chase). John's restart prompt = same one-paste pattern
  pointed at the HANDOFF.
- 📣 LANE C 7/20 — ✅ **BROKER INQUIRY TEMPLATE SHIPPED (72294ee).**
  scraper/draft_inquiry.js was the last caller improvising via Claude — now on
  John's VERBATIM template (deterministic $0; customize only {broker first
  name} + {industry}). Web side already correct (web/lib/inquiry.ts). Verified
  live; repo-wide grep confirms zero "private investor"/old-Claude copy left.
- 📣 LANE C 7/20 — ✅ **SIZE-FOR-EVERYONE SHIPPED (bfe0757/94b6252).** Both
  halves of the spec below: (a) PPP now runs all-NAICS against the full
  proprietary base (import_ppp.js --filter --all + --match; +confidence per
  match); (b) non-PPP ensemble (enrich/size_estimate.js) Claude-sizes the tail
  with a labeled revenue range + confidence, and web/lib/size.ts falls through
  to it so **no company is blank**. **COVERAGE: 51 → 375/375 on-target
  enriched leads sized (100%) — 335 AI estimates + PPP/structured, 0 unsized
  tail.** Wired into enrichment.yml (2x-daily) so new leads stay covered. **LANE B: surface `size.confidence` on the size
  chip + `size.basis` on hover** (AI estimates read "… (AI estimate)", capped
  medium). Honest note: all-NAICS PPP added only +5 — name+state precision is
  the limiter, so the ensemble is where coverage comes from; sub-$150k PPP
  files / a firmographic API are future levers for John (sample cost/accuracy
  first — don't build yet).
- 🔥🔥🔥 **SIZE ESTIMATION = FIRST-CLASS, PPP FOR EVERYONE + A NON-PPP PATH
  (John 7/20 — "size estimation is a very important part of this process; I
  want a size estimation for as many companies as possible"):**
  (a) **RUN PPP AGAINST EVERY PROPRIETARY COMPANY, not just named industries/
  tiers.** Any company that enters the funnel from proprietary outreach gets a
  PPP-match attempt at enrichment (name + state + address/city fuzzy match to
  the PPP loan DB; store matched loan + draw year on the company/lead so the
  size lib's PPP path fires). Backfill the match over EVERY existing
  proprietary company/lead now, not just Platform tier. The payroll-% math is
  already amendment-4 correct (lib/size.ts); this is purely about feeding it
  the PPP anchor for the whole base. Report coverage: X of Y proprietary
  companies now PPP-sized.
  (b) **NON-PPP SIZE ESTIMATION for the tail PPP can't cover (John: "start
  thinking of ways to do this outside the PPP database").** Build an ensemble
  that picks the best available signal per company and always yields a range +
  CONFIDENCE (never blank): priority = PPP match (high) → LinkedIn employee
  band (med) → stated employees/crew count/fleet size (med) → Google
  review-count + service-area breadth + # locations + years-in-business as a
  weak floor (low). Add a **Claude-over-all-signals estimator**: feed it every
  captured signal (size_signals jsonb already holds employees_stated,
  crew_count, fleet_size, locations, review_count) and have it return a revenue
  range + confidence + one-line basis — flagged clearly as lower-confidence
  than PPP. Surface the confidence on the size chip so John/Tom know how much
  to trust each estimate. Later paid option to bring John (don't subscribe):
  a firmographic API (D&B/ZoomInfo-class) for the residual — sample cost +
  accuracy first. (Lane B: show confidence on the size chip + basis on hover.)
- 📣 PM → LANE C (from Lane A, 7/17): **SHARED RIVER-GUIDES EXTRACTOR EXISTS —
  point /discover at it.** Lane A ported your corroboration guard into
  `scraper/riverguides/extract.js` (pure + exported, unit suite 7/7 incl. the
  fabricated-consolidator probe) and refactored the batch sweep onto it — one
  Claude call per consolidator (~$0.12/sweep) and it now resolves seller names
  when a source names them. Your `web/app/api/river-guides/discover/route.ts`
  still has its OWN inline copy of the guard — collapse to ONE implementation:
  either import the shared module across the boundary or keep them in sync
  deliberately (your architectural call, like score.js). Exported API:
  `extractAcquisitions({results:[{url,title,snippet}], consolidator, industry,
  apiKey})` → `[{company, deal_year, seller_name|null, resolved, city, state,
  source_url}]`, plus pure `corroborate(a, results, consolidator)` for tests.
  Details in Lane A's DECISION-LOG-brokers.md (7/17). Not urgent — do it when
  you next touch /discover, but don't let the two guards drift.
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
- 📣 LANE C 7/20 — ✅ **DEAL-STATE-TRACKS-OUTLOOK SHIPPED (b539871, bb651ed).**
  The Fahrenhorst miss is fixed: ingest_deal_mail.js Claude-classifies each
  deal-matched reply for scheduling/commitment intent → deal_proposals row
  (migration 0019) John APPROVES from a **deal_next_step_proposed** Key Actions
  card (POST /api/deals/proposals) — never silent. + SYNC-HEALTH: dashboard
  raises **outlook_sync_stale** when the last successful mail read is >6h
  (core/sync_health.js heartbeats app_config). Dry-run over 5 days of real mail
  proposed "Sign and return NDA" + "Confirm comfort at 12x, broker will
  schedule intro with Rebecca" (high conf), skipped 73 non-deal senders. All
  degrade clean pre-0019. Also synced the /discover corroboration guard onto
  Lane A's shared extract.js (added the self-reference reject). **JOHN: run
  migration 0019; then `node ingest_deal_mail.js --hours 168` seeds proposals
  from the past week. LANE B: render the deal_next_step_proposed +
  outlook_sync_stale Key Actions cards (approve/dismiss → POST
  /api/deals/proposals).**
  --- Lane C status history (7/16) below ---
- 📣 LANE C 7/16 ~16:40 — 🛑 **LANE C IS AT ITS CONTEXT LIMIT — NEEDS A FRESH
  SESSION.** Everything is committed + pushed (HEAD fad9aa2+); the HANDOFF at
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
