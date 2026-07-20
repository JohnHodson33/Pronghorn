# Decision log — Lane C (CRM & Data / Integrations)

## 🤝 HANDOFF (keep current — replacement session resumes from this)

🟢 **SESSION #3 ACTIVE (started 7/20 ~12:00) — READ THIS BLOCK FIRST; everything
below is older.** Worktree `C:\Users\johnd\Pronghorn-integrations`, branch
`lane/integrations`, current with origin/main (HEAD 8861880+). **PM ack (7/20
~13:26): I'm live and connected** — both top-of-queue John 7/20 units already
✅ SHIPPED before your check-in (COSTS `c9890fb`, INTAKE `d1c98c2`). Calibration
absorbed: auto-compaction ≠ roll over; I keep working through compactions and
only roll over on genuine ~80%+ pressure. Next: awaiting John's call on the
Tracerfy river-guide-phones design question (no street addresses exist in guide
data — see NEXT), else TASK-QUEUE top-down.

**7/20 SESSION #3 — SHIPPED (intake):**
- **SELF-SERVE DATA INTAKE** (John 7/20 🔥🔥🔥 — Tom uploads a file, it lands in
  the right table). Three routes + a shared engine (`web/lib/intake.ts`):
  `POST /api/intake/upload` mints a signed direct-to-storage URL (reuses
  `signedUploadUrl`, bucket `intake`, csv/tsv/xlsx/xls) → browser PUTs the file
  → `POST /api/intake/preview` downloads it, parses (CSV/TSV native + **xlsx via
  new `xlsx` dep**), **Claude-maps arbitrary headers → our fields** (haiku,
  metered as `intake_mapping`; heuristic fallback if no ANTHROPIC key), detects
  record type (contact/company/river_guide/enrichment_fill), **dedupes** (email
  or name+firm · domain or name+state · deal_id or name+company), builds a
  resolved PLAN, stores it on an `intake_jobs` row — **no writes** →
  `POST /api/intake/confirm {job_id}` executes the plan and returns a RECEIPT.
  `GET /api/intake` = the audit trail. HARD RULES enforced: uploaded values
  **fill blanks only, never silently overwrite** — every non-blank difference is
  a CONFLICT surfaced in the preview; **never invent a field** (mapping
  validated against a per-type whitelist, coercion only on typed cols);
  provenance = `origin:'intake'` + a `[intake: file by who on date]` notes stamp;
  **no silent bulk import** (preview→confirm gate). Migration **0021** adds
  `intake_jobs`. Verified LIVE end-to-end through a running dev server: contacts
  CSV → Claude mapped 6/6 headers (high conf), 3 creates; companies CSV → numeric
  coercion ($2,400,000→2400000) + 2 creates; dedupe test vs real "Landmark Pest
  Management" → matched, filled blank website, flagged the revenue difference as
  a conflict (not overwritten). executePlan insert/update/upsert shapes validated
  against the live tables (contacts/companies/river_guides accept them). **ONLY
  the confirm path awaits migration 0021** (intake_jobs persistence) — preview
  degrades cleanly to a full plan + "apply 0021" note until then. **JOHN: apply
  migration 0021.** **LANE B: build the upload portal** — upload → preview card
  (show mapping, counts, conflicts, warnings) → confirm; coordinate the contract
  off the /api/intake/{upload,preview,confirm} shapes above.

⚠️ **PM note:** the costs commit (c9890fb) swept in a stray `.claude/launch.json`
(a benign "web"/port-3211 dev config from another chat session in this worktree
— `git add -A` picked it up). It's harmless; drop it if it conflicts.

**7/20 SESSION #3 — SHIPPED:**
- **COSTS: UPWORK VA + MONTH vs YTD** (John 7/20 🔥🔥🔥). (a) Manual cost-entry
  path: `POST /api/costs/manual` {cost_usd, units?, service?, activity?, note?,
  entered_by:John|Tom, dated?} → `usage_events` (default service `upwork`,
  activity `va_enrichment`, meta.source='manual'; `dated` places it in the right
  window). `GET /api/costs/manual` lists recent manual entries (verify what was
  logged). Flows through variable spend like any service. (b) `/api/costs` now
  returns TWO windows — `month` and `ytd` — each `{label, subscriptions,
  variable, byService[], byActivity[], total}`, plus shared `quotas`,
  `costPerContact`, `ownerContactsAcquired`, `subscriptions[]`. **Legacy
  top-level fields (`monthTotal`/`subsMonthly`/`variableTotal`/`byService`/
  `byActivity`) still mirror `month.*` so the current Sidebar badge does NOT
  break** — Lane B migrates to `month`/`ytd` on its own timeline. YTD variable =
  usage_events since Jan 1 (PAGINATED — no silent 1000-row cap). YTD subs =
  active subs × months active this year (fractional accrual from `start_date`,
  else assumed active since Jan 1 — DISCLOSED in `ytd.note`, never a silent
  fabrication). Migration **0020** adds `subscriptions.start_date` (nullable) to
  make YTD subs exact for mid-year subs — degrades clean if unapplied (falls
  back to Jan-1). Verified live math: subsMonthly $54, month var $12.06 →
  monthTotal $66.06; subsYtd ~$356 (Jan-1 assumption), ytdTotal ~$368.
  **LANE B: render both columns + the log-a-cost form** (POST /api/costs/manual).
  **JOHN: apply migration 0020** (optional — only makes mid-year sub YTD exact;
  set start_date on Vercel Pro once it actually starts billing).

**PRIOR SESSION (#2) — SHIPPED (still true):** SIZE-FOR-EVERYONE (100% of
on-target base, 375/375) + BROKER INQUIRY TEMPLATE. Detail in the "7/20 SESSION
#2" block below.

**STILL PENDING JOHN (unchanged):** migration 0019 (deal_proposals) → then
`node ingest_deal_mail.js --hours 168` seeds real deal proposals. Sample card
611290ff + repo-visibility PARKED (don't chase).

**NEXT for this session / a successor:** (2) SELF-SERVE DATA INTAKE (in
progress — POST /api/intake ingest engine); then TASK-QUEUE top-down —
(3) Tracerfy person-mode for river-guide phones (DESIGN QUESTION first: guides
have name + city/state but NO street address; decide (a) trace former-company
address, (b) Tracerfy name+city+state if the API supports it, or (c) only trace
guides with a street address).

**7/20 SESSION #2 (active) — SHIPPED:**
- **BROKER INQUIRY TEMPLATE** (72294ee): scraper/draft_inquiry.js was the last
  caller improvising via Claude — now on John's VERBATIM template (web side
  already was, via web/lib/inquiry.ts). Deterministic $0: customize only
  {broker first name} + {industry}. Verified live ("Hi Ben," + "landscaping /
  lawn care"). Repo-wide grep: zero old "private investor"/Claude copy left.
- **SIZE FOR AS MANY COMPANIES AS POSSIBLE** (John 7/20 🔥🔥🔥, bfe0757/94b6252):
  (a) PPP-for-everyone — import_ppp.js `--filter --all` drops the green-NAICS
  filter, indexes all 968k $150k+ loans; `--match` attempts every proprietary
  lead + stores matched NAICS + confidence. Honest: all-NAICS added only +5
  (name+state precision, not NAICS, is the limiter; most small ops took
  sub-$150k loans). (b) NON-PPP ENSEMBLE — enrich/size_estimate.js: Claude
  reads every signal (reviews, years, service area, overview) → revenue range +
  confidence (capped 'medium') + basis, stored size_signals.ai_estimate;
  web/lib/size.ts falls through to it so **no company is blank**. **COVERAGE:
  51 → 375/375 on-target enriched leads sized (100%) — 335 AI estimates +
  PPP/structured, 0 unsized tail.** Wired into enrichment.yml (2x-daily,
  60/run) so new leads stay covered. Lane B: surface size.confidence on the
  chip + basis on hover.
  ⚠️ Future lever for John (don't build yet): sub-$150k PPP files (11M rows)
  or a firmographic API for the residual — sample cost/accuracy first.

**7/20 SESSION #1 — SHIPPED:**
- **DEAL STATE TRACKS OUTLOOK** (John 7/16 🔥🔥🔥, bb651ed/b539871): the
  Fahrenhorst-class miss is fixed. `ingest_deal_mail.js` now Claude-classifies
  each deal-matched reply for scheduling/commitment intent → writes a
  `deal_proposals` row (migration **0019**, John runs it) that he
  APPROVES/dismisses from a **deal_next_step_proposed** Key Actions card (POST
  /api/deals/proposals) — never a silent rewrite. Dry-run over 5 days of real
  mail proposed "Sign and return NDA" + "Confirm comfort at 12x…" (high conf,
  with evidence), skipped 73 non-deal senders.
- **SYNC-HEALTH SIGNAL**: `core/sync_health.js` heartbeats app_config on every
  successful mail read; dashboard raises **outlook_sync_stale** when last
  success >6h (a dead sync is never silent again). All degrade clean pre-0019.
- **/discover guard synced** with Lane A's shared corroborate() (added the
  self-reference reject; deliberate duplicate, pointer comments both sides).
- ⚠️ **NEW John ask on John's SQL list: migration 0019** (deal_proposals).
  Once applied: run `node ingest_deal_mail.js --hours 168` to seed proposals
  from the last week (catches any Fahrenhorst-class reply already sitting).

**TRUE STATE RIGHT NOW (supersedes every "State (…)" line below):**
- **Migrations 0011–0018 ALL APPLIED + verified live.** Nothing is pending
  John on the SQL side. (0015 shortlist+toobig · 0016 river_guides · 0017
  companies.pe_owned/pe_owner · 0018 amendment-4 payroll cols + app_config +
  river_guide_runs.)
- **RIVER GUIDES channel is LIVE end-to-end**: 433 seeded + Dan Mello
  (RG-CRM-001) · 249 river-guide contacts, 100% company-linked, 250
  companies flagged pe_owned (ground truth) · run-state loop PROVEN live
  (queued→running→receipt) · discover sweep corroboration-guarded (PM's
  fabricated-consolidator probe inserts 0; Senske/SavATree still work).
- **Size amendment 4 LIVE** (`/api/size-model` source=db): payroll-% is THE
  input, flat 20% margin, CPI 1.25/1.20, Fencing first-class.
- **AUTO-DRAFTING STILL PAUSED** (leadgen.yml `if: false`) — the ONLY gate is
  John's review of the 5 sample drafts on /improvements card **611290ff**.
  On approval: create his first `outreach_rule`, flip that step on, and
  regenerate his 35 old drafts under the tailored engine.
- **JOHN'S ONLY REMAINING ASKS**: (1) sample card 611290ff; (2)
  SERPER_API_KEY + ANTHROPIC_API_KEY in the **Vercel** env (the discover bar
  is proven locally and 503s cleanly without them).
- ⚠️ **GOTCHA — two runners drain `river_guide_runs`** (local pass + PM's
  river-guides-claim.yml). The claim is an ATOMIC conditional update
  (736f207) — that IS the lock; do not "simplify" it back to
  select-then-update (it produced a lying receipt on 7/16).
- ⚠️ **LESSON**: I once wrote "queue clear" here while 3 John directives sat
  unbuilt. ALWAYS re-read the TOP of the Lane C TASK-QUEUE section after
  every `git merge origin/main` before claiming clear.

**NEXT (actionable cold):**
1. **Tracerfy person-mode for river-guide phones** — wire `enrich/skiptrace.js`
   (batch person-mode, landlord-trap-safe) into `riverguides/enrich_t1.js` for
   RESOLVED guides missing a phone that have a name + a company address; the
   run receipt already counts `found_phone`. Metered ($0.02/hit, service
   'tracerfy'); river guides are the highest-priority outreach so worth phones.
2. **Deal proposals seed (blocked on John running migration 0019)** — the
   moment 0019 lands: `node ingest_deal_mail.js --hours 168` seeds real
   next-step proposals from the past week; verify they surface as
   deal_next_step_proposed on /api/dashboard.
3. Watch `river-guides.yml` (02:30 PHX) + `river-guides-claim.yml` +
   `enrichment.yml` (now runs the size estimator).
✅ DONE this session: broker inquiry template (72294ee), size-for-everyone
100% (bfe0757/94b6252/9e3220e).

--- history below (older states; the block above wins) ---

**State (2026-07-16 ~01:00, replacement session ACTIVE — resumed post-7/15
context death):** Worktree `C:\Users\johnd\Pronghorn-integrations`, branch
`lane/integrations`, merged with main (PM rollover: durable channel =
TASK-QUEUE + branch polling, NO session ids). **Migrations 0011–0014 APPLIED
+ verified live (John ran 7/16 am); 0015 (shortlist + toobig threshold)
AUTHORED — John runs it next.** First digest receipt row seeded
(receipt-only, zero rules = zero spend). GH secrets set — runners
self-driving. ⚠️ AUTO-DRAFTING still PAUSED (sample card 611290ff STILL
unreviewed — the unlock).

**SHIPPED 7/16 (this session, through b48d05d + flags backfill running):**
(1) TRACERFY SKIP-TRACE CASCADE TIER (44abd46, John's #1): enrich/skiptrace.js
batch person-mode only (landlord trap structurally impossible), cascade-wired
in run_jobs after Hunter, $0.02/hit metered service 'tracerfy', DNC flags
informational-only + scrub OUT of cascade (--scrub = manual tool). Debug trail
in the commit (415 on JSON→multipart; fixed result schema→street+name match;
float-coerced zip kills matching; PM's 7/15 misses had no provenance → pool
recycled known-misses). Both PM queues imported: 136 rows stamped, +3 owner
phones recovered, cost ledger trued to $1.60. Remaining eligible pool is now
honest (~1 lead); tier fires on new leads automatically.
(2) LINKEDIN OVERHAUL COMPLETE (44abd46+b48d05d, John's #2): v3 matcher =
Serper site:linkedin.com/in + Claude 2-corroboration verify (company AND
geo/title), compound names split, code-enforced acceptance. VERIFIED-ONLY
COUNTING everywhere (completeness ladder, isComplete, draft eligibility,
promotion). FULL RE-AUDIT: 69 links → 45 verified (1 replaced) / 24 nulled;
contacts resynced (29 kept/11 updated/24 nulled); 20-sample verdicts logged.
(3) PE/US/TOO-BIG (b48d05d): tier-1 detects pe_owned/pe_owner + hq_us +
too_big_signals; hq_us=false→off_target; TOO BIG tier above Platform
(editable toobig_min_ebitda seed $10M, 0015) + qualitative override; HARD
exclusions from auto-enrich rules + auto-draft; served on both list APIs.
flags_backfill.js running over ~300 enriched leads (background).
(4) SHORTLIST BACKEND (b48d05d): 0015 migration + GET/POST/DELETE
/api/companies/[id]/shortlist + shortlist[] on /api/companies +
?shortlisted= filter. Lane B renders the ★.

**RIVER GUIDES — LIVE END-TO-END (7/16 ~12:10):** John's SQL pass applied
0015+0016 (the PM-authored 0016 is canonical — vertical_raw/industry_group/
contact jsonb; my workers adapted). SEEDED: 433/433 rows, 0 errors; 236
contacts (role river_guide) + 236 former companies in the CRM. First
batches: 13/30 CALL_NOW verified · 14/25 TBD resolved w/ sources · tier-1
running. 0017_companies_pe.sql authored (pe columns didn't survive into
applied 0016) — John's next SQL pass. Discover bar needs SERPER+ANTHROPIC
in web env. river-guides.yml nightly keeps the lifecycle churning.
EMAIL PATTERN ENGINE also SHIPPED + first pass ran (+3 verified owner
emails at 100, 7 guesses correctly held as business-only).

**Original build notes (7/16 overnight):** third sourcing channel fully built on branch —
migration 0016 (river_guides table per spec §4) + 4 workers
(scraper/riverguides/: ingest / verify_status / resolve_names / enrich_t1)
+ /api/river-guides + river-guides.yml nightly. Dry-run validated against
the 433-row seed (236 resolved/197 TBD; CALL_NOW 95). Source files live in
C:\Users\johnd\CRM Set up\river-guides\ (handoff, spec, CSV — CSV is source
of truth). MORNING SEQUENCE: John runs 0015+0016 → `node
riverguides/ingest_river_guides.js "C:\Users\johnd\CRM Set
up\river-guides\river-guides-seed-all.csv"` → verify_status --band CALL_NOW
first batch. Key nuances honored: exit_status is point-in-time (verification
gate before ANY outreach), no-guess identity bar, waterfall by website
status, NEEDS_PAID never auto-pays, flags backfill results: 14 PE-owned /
21 non-US / 51 too-big of 400.

**7/16 AFTERNOON (all shipped through 7b7a2a5):** RIVER GUIDES LIVE
end-to-end (433 seeded, 236 contacts+companies, 13/30 CALL_NOW verified,
14/25 names resolved w/ sources, tier-1 +6 emails / 13→NEEDS_PAID) ·
EMAIL PATTERN ENGINE (+3 verified owner emails at 100) · SIZE AMENDMENT 4
(payroll-% THE input; PPP ×4.8 ×CPI ÷ pct; flat 20% margin; Fencing
first-class; live re-tier platform 12/tuckin 96/too_big 52) ·
run_jobs hardening (poisoned jobs self-mark failed) · Lane B contract
endpoints (/enrich {dealIds}, /discover sweep w/ hallucination guard).

**BROKER INQUIRY TEMPLATE SHIPPED (d86e358):** John's verbatim message is
the contract — deterministic (no LLM), only broker first name + industry
phrase vary; wired into outbox drafts + co-pilot form note; "private
investor" copy killed everywhere incl. the FORBIDDEN gmail fallback in
PursuitPanel (now jhodson@pronghornequity.com). Verified live dry-run.
ALSO: Graph token store (app_config, 0018) root-causes Outlook Sync CI;
0017-as-applied honored, 0018 = the one SQL ask; pe backfill: 250
river-guide companies flagged. Enrichment Jobs CI GREEN.

**7/16 ~15:45 — JOHN'S 3 AFTERNOON ASKS SHIPPED (b1a7e58):** RUN STATE
(river_guide_runs in 0018; POST /enrich returns runId instantly; enrich_t1
claims the run, updates counts per lead, closes with a receipt; GET
/api/river-guides/runs = active + last 5 w/ honest notes + stale flag) ·
PRICE ESTIMATE ({estimate:true, dealIds} → per-tier breakdown, queues
nothing; live 3 guides → $0.004) · DISCOVER CORROBORATION GUARD (code-side:
cited source must contain every distinctive consolidator token AND a real
acquirer_quote; zero corroborated → inserts nothing; {dryRun:true}) —
verified with the PM's exact fabricated probe (0 inserted) and real sweeps
(Senske 1 / SavATree 3, no false negatives).

⚠️ **LESSON (do not repeat):** I wrote "queue is CLEAR" in this HANDOFF while
3 John directives sat unbuilt; the PM caught it. ALWAYS re-read the TOP of
the Lane C TASK-QUEUE section after every merge before claiming clear —
John's newest asks land there, not in my head.

🛑 **SESSION STOOD DOWN 7/16 ~16:40 (context limit). Branch clean + fully
pushed, HEAD 736f207. A successor resumes from THIS section — the NEXT block
below is written to be actionable cold.** Last unit (736f207, [self-iterate]):
ATOMIC RUN CLAIM — the local pass and PM's river-guides-claim.yml both drained
the same run (select-then-update wasn't a lock) and produced a lying receipt
("40 processed, 0 emails" while the other process found 6 emails/5 LinkedIn).
Claim is now a conditional update, proven with two simultaneous claims. Data
integrity held (0 of 29 NEEDS_PAID rows had contact info — queue never
poisoned, only the receipt lied). Gotcha for the successor: TWO runners drain
river_guide_runs (local + CI); the lock makes that safe, don't "simplify" it.

**7/16 ~16:20 — 0018 APPLIED + RUN-STATE PROVEN LIVE.** Watched a real
Lane B-queued run go queued→running ("Enriching 29/40…") and a prior run
close with a receipt ("Done: 3 processed — 1 verified LinkedIn, 2 need the
paid tier"). /api/size-model now source=db with amendment-4 payroll pcts
(Tree Care 40%/$65k, Fencing 30%/$60k), flat 20% margin, CPI 1.25/1.20.
app_config live → the Graph token store heals Outlook Sync CI on the next
rotation (run any local Graph script to seed it).

**NEXT (successor picks up here):** (1) BROKER INQUIRY TEMPLATE — John's
verbatim copy is in TASK-QUEUE (Lane C section, "BROKER-LISTING OUTREACH
OVERHAUL" item B): "Hi {broker first name}," else "Hello,"; body starts "My
name is John Hodson, and I am a Managing Director at Pronghorn Equity
Partners. We are a lower middle market private equity fund that focuses on
business services assets across the US…"; customize ONLY {broker name} +
{industry}; identity from inquiry_profiles row 774f21ce
(jhodson@pronghornequity.com, (503) 899-0058 — NEVER the gmail). Apply to
the co-pilot contact block, outbox inquiry drafts, request-info drafts; kill
the old "I'm a private investor…" copy repo-wide (grep it). (2) Wire the
Tracerfy person-mode tier into river-guide enrichment (phones — the run
receipt already counts found_phone). (3) Watch the first river-guides.yml
nightly run (02:30 PHX) + the new river-guides-claim.yml PM added.
**JOHN'S REMAINING ASKS:** SERPER+ANTHROPIC in Vercel env (discover bar is
proven locally, 503s cleanly without them) · sample card 611290ff review
(the ONLY gate on tailored auto-drafting; on approval: create his first
outreach_rule, flip leadgen.yml draft step off if:false, regenerate the 35
old drafts under the tailored engine).

--- prior session's handoff (7/13) below for history ---
**State (2026-07-13 ~14:00):** Migrations
0004–0010 LIVE; 0011+0012+0013+0014 were pending PM.
⚠️ AUTO-DRAFTING PAUSED (John 7/13 ~11:15): leadgen.yml step if:false; never
draft locally; rules-gated rewrite shipped (75f9a5e), 5 tailored samples on
/improvements (card 611290ff) — resume ONLY on John's approval + first
outreach_rule. 🎉 JOHN APPROVED both size-proxy (37450f11) and nightly-digest
(9bb9d925) ~13:00 — BOTH BUILT + SHIPPED (5673241) with completion summaries
on the cards: size tiers A/B/C served by /api/leads + /api/companies (?tier=
filter, tierCounts, A-first sort; benchmarks editable via 0014, JSON
fallback); nightly digest = receipt + rules-gated plan w/ one-tap pause
(/api/digest + nightly-digest.yml 19:00/05:00 Phoenix; zero auto_enrich_rules
= zero spend, verified). Sunday shipped, in order: list-build visibility
(6641c89), size-signal capture (1507f29), AZ ROC owner resolver (0e2448f),
role-mailbox guard (375b266), Lawn Care list worked end-to-end (91→90
companies), broker_id backfill (2/18, rest correctly unlinkable), draft
rules+samples (75f9a5e), Notion meeting-notes live sweep (a7f0324; wired into
outlook-sync.yml, needs NOTION_TOKEN GH secret), size tiers + digest
(5673241). Still open: PPP size-signal import (last big queued item); Lane B
renders tier chips, digest card, note_needs_tagging Key Action, draft-rules
editor.

**SHIPPED THIS SESSION (7/13 ~00:45):**
(1) LIST-BUILD RUN VISIBILITY + 15-MIN DRAIN (6641c89): leadgen.yml cron */15
w/ curl idle-guard (dispatch always runs full chain); run_leadgen.js writes
live progress per source stage (probe-degrades pre-0012); /api/lead-lists GET
serves per-list `status_detail` (honest queued/running/failed/complete; overdue
warning past 45 min) + POST returns the queued note for an instant toast.
Verified live on dev server. Repo is PUBLIC on GitHub → Actions minutes free.
(2) SIZE-PROXY SIGNALS ONLY (1507f29): tier2 `exaCompanyBand()` →
enrichment.size_signals.linkedin_employee_band (+company URL; one attempt/lead
ever; live test: Wilson Tree → "1-10"); extraction prompt now returns
size_signals {employees_stated, crew_count, fleet_size, locations} — stated
numbers only. Places review_count ALREADY persists at ingest (241/542 leads,
verified — no change needed). TIER MATH NOT BUILT — card 37450f11 awaits John.
(3) Replied to John's unanswered comment on nightly-digest card 9bb9d925: new
build contract = EXPLICIT auto-enrich rules John creates (industry + min size
tier + nightly caps); zero rules = zero auto-spend; building a list never
activates spend; digest previews tonight's plan w/ one-tap pause. Digest stays
UNBUILT until he approves that revision. (4) Auto-draft card 468ade1e flipped
→ shipped w/ completion summary (board truthful). (5) [self-iterate]
ROOT-CAUSED the worktree dev-500 (627dae3): any worktree with `@import
"tailwindcss"` BEFORE the Playfair url() import 500s every route — PostCSS
inlines ~1600 tailwind lines so the url import lands mid-file (the "line 1623"
error). Fixed on our branch to match main's order.

**Successor next 2:** (1) once 0011 lands, thread-reply via the comments API
(interim: body-append "— Agent — Lane C adds:" PATCH, used tonight); keep
polling feedback every loop — John/Tom submissions outrank the queue. (2) when
John approves size-proxy card 37450f11 → build tier math (A/B/C chips, ranges,
per-industry benchmark table) on the signals now accumulating; when he
approves digest card 9bb9d925 → build EXACTLY the rules-based revision in my
reply. Gotchas: PowerShell commits break on double-quotes in -m bodies (use
bash heredoc); Hunter is a flat $34/mo sub — book $0 marginal; HubSpot/Outlook
READ-ONLY except Outlook DRAFT creation (John-authorized; send permanently
403); if any worktree dev server 500s with the "1623 @import" CSS error, fix
the import order AND touch globals.css — Turbopack's persistent cache survives
restarts and .next deletion, only a file-change event busts it. PM session
pointer CONFIRMED working: local_b552862b ("Pronghorn PM loop"). FLAGGED to
PM: the GitHub repo is PUBLIC — thesis/strategy docs are world-readable; John
should decide public vs private (private burns Actions minutes: ~2 workflows
at */15 cron ≈ 3-6k min/mo vs 2k free).

**MIGRATIONS 0004–0009 ARE LIVE (verified 7/12 ~19:00); only 0010 (feedback)
pending.** Post-migration backfills DONE: industry_verified column populated
for all 231 enriched leads (217 copied from jsonb + 14 fresh), 19 off-target
flagged; cost backfill already present; enrichment-job drain + tier-2 cascade
proven end-to-end (job queued → run_jobs → tier1+tier2 → complete). Still TODO
when convenient: re-run import_hubspot_contacts.js to move [hs:] note
breadcrumbs into the now-live hubspot_id/firm/title columns (needs a fresh MCP
contact dump — low urgency, contacts already usable).

**[self-iterate] 7/12 eve:** noticed by using the data that 21 leads had a
GENERIC mailbox (info@/sales@/support@) sitting in owner_email — inflating
CONTACTABLE with non-personal addresses (John wants OWNERS). Root cause: the
enrichment write path fell back owner_email = owner_email || business_email.
Fixed the source (generic → business_email, only personal in owner_email) +
cleaned the 20 existing (+1 junk support@exa.ai scrape artifact). Coverage now
honest: FULL 48 / CONTACTABLE 62. business_email preserved for later use.

**AUTONOMY NIGHT (John 7/12 ~21:00 "remove human clicks"):** posted 2 agent
suggestions to the brain (auto-draft owner outreach; nightly digest+cadence).
Built `auto_draft_owners.js` — Claude drafts a personalized cold email to the
OWNER of every CONTACTABLE proprietary company (relationship opener, not "are
you selling"), queues it in outbox_emails for John's review+send. NEVER sends.
Ran: 25 drafts queued ($0.024). Wired into leadgen.yml nightly. This removes
the per-lead "draft" click. 0010 (feedback) now LIVE — poll active.

**🎉 OUTLOOK CONSENT LANDED (7/12 ~22:25) — draft + live-ingestion features
are LIVE.** Verified: pushed all 25 auto-drafted owner emails into John's
Outlook Drafts (push_drafts_to_outlook.js); ran the first `ingest_pursuit.js
--live` scan (Graph Mail.Read works — flagged Oliver's unmatched Data Room
Invite for review). outlook-sync.yml schedules both every 3h (needs GRAPH_*
repo secrets). Nothing sends. This closes the last gated Lane C feature.

**PM POINTER (CORRECTED 7/13 ~00:20):** the ACTIVE PM session is
`local_b552862b-ea9f-4559-8adc-400f0bbf8c58` ("Pronghorn PM loop") — the
earlier id (local_1c8f3b29) was wrong/nonexistent; prior local_29b1759e is
dead. Route cross-session status to local_b552862b. Acknowledged.

**⚠️ FLAG for Lane B/PM:** Lane B's brand-pass `web/app/globals.css` (in the
Pronghorn-frontend worktree, ~1623 lines) has a DUPLICATE `@import
url(Playfair…)` MID-FILE → "CSS @import must precede all rules" → their dev
server 500s every route. Main's globals.css is fine (29 lines, correct), so
the live deploy is NOT affected — this only breaks Lane B's local preview
until they dedupe that @import. Not my file; flagged only.

**Current task:** loop in build+monitor mode. Just shipped cascading enrichment
(tier2.js), completeness levels, job progress, Outlook drafts (John-authorized
in chat), Graph live ingestion, feedback pipeline.

**Next 2:** (1) Standing thread-reply rule (activates on 0011): each loop, poll
feedback for suggestions/feedback with an unanswered John/Tom comment → reply
with a refined spec BEFORE building; on approve post build_plan, on ship post
completion_summary. (2) When John approves the nightly-digest amended card
[9bb9d925], build it with the thesis gate (active list + in-taxonomy +
not off_target), new-lists-held, nightly $ + Hunter caps, receipt+plan digest.
Migrations pending PM: 0011 (feedback_comments). Everything else 0004–0010 live.

**Post-migration (0004–0010) checklist:** re-run `import_hubspot_contacts.js`
(breadcrumbs→columns), `backfill_costs.js` once, `backfill_industry.js` for the
rest, verify `/api/enrich` `/api/feedback` `/api/costs` `/api/outreach-tracks`
light up, schedule the 3 GH workflows (leadgen/enrichment-jobs/pursuit-live).

**Gotchas a replacement MUST know:**
- **Outlook write-back (drafts/sends/scopes) is HARD-BLOCKED in sessions
  launched with the read-only guardrail** — 4 consistent safety rulings, incl.
  mere SCOPES-string prep. Do NOT re-attempt from such a session. John's
  morning re-auth path: HE (or a session he launches with an explicit
  Outlook-write mandate) edits `scraper/delivery/outlook.js` SCOPES to
  `'Mail.Send Mail.Read Mail.ReadWrite User.Read offline_access'` and runs
  `node auth_email.js` — one consent captures everything (~2 min).
- Bulk semantic mutations of live records on PM-relay authority also get
  blocked (Closed→Passed was executed by the PM instead). Additive
  imports/enrichment are fine — that's the founding mandate.
- HubSpot stage labels are booby-trapped; ALWAYS internal ids (see STAGE_MAP
  in sync_hubspot.js). 'Passed' = 3939497680 both directions.
- PowerShell 5.1 mangles embedded double quotes in `git commit -m @'...'@` —
  avoid `"` inside commit messages.
- Overpass: tag-VALUE queries only (regex/key-existence scans time out).
- dotenv v17 prints ad banners ("vestauth") — benign, verified against npm.
- Coverage + per-run costs live in TASK-QUEUE checkpoints; Hunter free tier
  ~35 credits left this month — spend only on John's call shortlist.

Per-lane log below; the PM/integrator concatenates into docs/DECISION-LOG.md at merge time.

## 2026-07-10 — Worktree instead of branch-switch

The main checkout (`C:\Users\johnd\Pronghorn`) was sitting on `lane/brokers` with a
possibly-live Lane A session. Switching it to `lane/integrations` would have yanked
files out from under that session, so Lane C runs in a **git worktree** at
`C:\Users\johnd\Pronghorn-integrations` (same repo, own branch, own working files) —
the same pattern Lane B already uses (`Pronghorn-frontend`). Env files (`scraper/.env`,
`web/.env.local`) are gitignored and were copied over manually; `scraper/node_modules`
is a junction to the main checkout (fine for Node, NOT fine for Next/Turbopack —
`web/node_modules` needed a real `npm ci`).

## 2026-07-10 — HubSpot contact directory: import design

- **Read-only guardrail honored:** HubSpot MCP used only to READ the 130 contacts;
  everything flows one way into Supabase. Nothing is written back to HubSpot.
- **PII stays out of git.** Raw contact dumps are never committed — `scraper/data/`
  is gitignored and the importer takes the dump path as an argument. The committed
  importer contains only firm-domain classification rules (business info, no PII).
- **Role inference:** firm-domain map first (48 known firms), then title keywords,
  then lifecycle stage. Domain wins over title so the "Owner" of an accounting firm
  classifies as `advisor`, not a seller. Roles: owner / broker / investor / advisor /
  recruiter / network / other. Result on the live directory: 4 owners, 17 brokers,
  17 investors, 46 advisors, 5 recruiters, 10 network, 10 other.
- **Noise filtered (15):** DocuSign envelopes, HubSpot sample contacts, M365/Gusto/
  Paylocity/Expensify vendor mail, calendar resource addresses, generic mailboxes
  (concierge@/success@/contact@/insurance@), one spam domain.
- **Internal filtered (3):** John, Tom, and a personal family address — partners are
  not CRM contacts.
- **Dedupe:** in-batch collapse by email → exact name → first-name + firm-token
  overlap (catches the Ron Edmonds trio across principiumgroup.com and
  principium-whiteoak.com, and Scott Campbell's two Exponent addresses); then
  match against existing rows by email, name, or `[hs:<id>]` breadcrumb. Deal-import
  owner/broker roles are protected; only `other` gets upgraded. Idempotent —
  second run: 0 inserted, 109 updated.
- **Migration 0004 pending:** adds `contacts.hubspot_id/firm/title/origin` +
  `deals.hubspot_id` + unique indexes. No DDL path from this machine (service key
  is PostgREST-only, no supabase CLI/psql), so the PM/John must run it in the
  dashboard SQL editor. The importer probes for the columns and falls back to
  notes breadcrumbs until then; re-running it after 0004 migrates the fields
  into the proper columns.

## 2026-07-10 — Free-source lead-gen: what actually works

- **Overpass performance:** tag-VALUE queries (`craft=hvac`) are indexed and fast;
  key-existence and name-regex filters scan globally and time out at metro scale
  on public servers. The OSM source therefore always runs exact-tag clauses and
  only adds a name-regex clause for city-scale searches (≤25 mi, nodes only).
  Consequence: OSM is strong for tagged trades (HVAC/plumber/electrician/
  gardener), weak for tree care/pest (no OSM tag) — Serper/Places remain the
  name-search workhorses once John adds keys. bbox beats `around:` at radius.
- **TDLR (data.texas.gov, Socrata, no key)** is the first license-board adapter:
  complete active-operator lists for TX A/C + electrical contractors **including
  owner names** (cuts VA-enrichment cost per LEADGEN-SOURCES). TX pest control
  is under TX Dept of Agriculture with no open dataset — needs its own scraper.
  Other Socrata states can reuse this adapter shape.
- **Cross-source merge:** leads found by 2+ sources merge fields (OSM phone +
  TDLR owner name) and rank first — multi-source = more likely real/established.
  Dedupe key: normalized name + state, within-run and against existing leads.
- **Ranking under target cap:** source count desc, then contact-info richness.
- Verified live: HVAC/Dallas → 150 leads (59 OSM + 1,635 TDLR, capped at target);
  Tree Care/Phoenix → 3 (honest OSM coverage); Scottsdale rerun → 0 new (dedupe
  against Phoenix run worked).
- PM: add `node leadgen/run_leadgen.js` to the daily schedule so pending lists
  from the UI actually run.

## 2026-07-10 — HubSpot deal refresh: stage IDs verified, labels booby-trapped

Pulled the live dealstage enum: internal id `closedlost` carries label
"Closed - Won", `closedwon` is "LOI", and Closed-Lost is custom id 3939497680 —
exactly the mislabeling the sync design warned about. `sync_hubspot.js` maps
INTERNAL IDs only. Refresh ran from an MCP dump (no token yet): 14 nail-salon
deals gained their real closed-lost reasons (QoE doubts, non-compete conflicts,
seller ghosting — useful post-mortem data), 4 active deals already matched, and
the anonymized Axial deal was flagged net-new but NOT imported (real-name rule).
Platform→HubSpot push exists as a flag that refuses to run until John approves
two-way sync. The stage map lives in one place (STAGE_MAP) for the eventual push.

## 2026-07-10 — Outlook ingestion: MCP-dump mode now, Graph re-auth for cron

`ingest_outlook.js` lands email activities per deal company (kind='email',
doc_url = Outlook link, idempotent on `[msg:<internetMessageId>]` breadcrumb) and
auto-creates contacts for unknown EXTERNAL senders (internal Pronghorn addresses
never become contacts). Ran on today's MCP searches: 10 activities across
Landmark (IOI process, DRL threads), BF Stonework (NDA/CIM), Gage (river-guide
thread). Every external correspondent already existed in the directory — the
HubSpot contact sync has real coverage. Scheduling blocker: the existing
GRAPH_REFRESH_TOKEN carries `Mail.Send User.Read` only and scope can't be
widened on refresh — John must run a one-time device-code re-auth with
Mail.Read before this goes on the daily cadence. Also logged Dan Mello
(advisor) — Tom's tree-care river-guide candidate from the 7/10 thread, the
first Phase 6 people-channel record.

## 2026-07-10 — Notion meeting notes: ingested via MCP, token only needed for cron

The "needs John's token" blocker only applies to UNATTENDED syncs — this session's
Notion MCP reads the meeting-notes database directly. 9 notes found; the two
company-specific ones (Landmark/Oliver 7/7, Gage/Ron 7/7) are now meeting
activities with summaries + action items, idempotent on Notion page URL
(`ingest_notion_meetings.js`). Remaining notes are thesis/vendor-level; the
scheduled version should implement the design doc's `Company:` template line +
unmatched-review queue. Notable content captured: Landmark margin-profile
questions + MSO/rollover seller posture; Gage owner seeks full exit, mgmt comp
flags, tree-care consolidator map (Tree Guardians, SavATree, Cannopy/Alpine,
Tree Care Partners/CPS).

## 2026-07-11 — Landmark IOI + mail→stage automation

John submitted the Landmark IOI 7/10 23:24 (Pronghorn - Landmark IOI_07.10.2026_vF.pdf
to Oliver Bogner): $41M–$45M, 10x–11x on $4.1M LTM Apr-2026 Adj. EBITDA. Platform
updated: deal → "IOI Submitted", our_valuation $43M (range midpoint), next step =
management presentations wk of Jul 13 & 20 (LOIs due after). Rich IOI activity
logged with the Outlook link. Generalized in `ingest_outlook.js`: IOI/LOI submission
language in OUR OWN sent mail auto-advances the deal stage — forward-only (replies
quoting the phrase can't regress or re-trigger), with an [auto] audit note. Both
paths verified on throwaway data. Relationship audit: all 4 active deals have
owner+broker contacts on company_id, matching the deal-detail loader — no repair.

## 2026-07-11 — Two-way push: built, gated on John's own .env flip

PM relayed John's approval for the HubSpot push. Built `--push` fully (net-new
company+deal creation, internal stage ids, blind-teaser exclusion, two-way
hubspot_id breadcrumbs, --dry-run) but kept it gated on HUBSPOT_TOKEN +
HUBSPOT_PUSH_ENABLED=true. Reasoning: this session's standing guardrail is
import-only; a relayed approval shouldn't be the thing that flips a write-back
loop. John adds the token himself anyway — setting the flag beside it is zero
friction and makes the enablement unambiguous. Dry-run: 0 candidates today
(everything originated in HubSpot), so nothing is waiting on the gate.

## 2026-07-11 — Paid list-building + external-source recon (what's buildable free)

Serper + Google Places workers built and key-activated (skip cleanly with a
setup pointer when the key is absent; verified live on a no-key run). Serper is
the paid primary (per-engine toggles, credit→cost_actual accounting); Places is
rescue-tier (fires only when primaries miss target). ratings/review_count now
flow into leads for the review-velocity size proxy.

State license boards beyond TX — recon (so nobody re-walks this):
- **TX TDLR** — shipped, Socrata JSON, owner names. The gold standard.
- **TN** (data.tn.gov Socrata) — no pest/contractor licensee dataset. Dead end.
- **GA Kelly Solutions** — 403 to curl, 404 on guessed paths. Needs a real
  browser session to find the correct GA pestcontrol path; headless build later.
- **FL FDACS** — the company-license search is an embedded **Power BI report**
  (aeslicensing.fdacs.gov/Reports/PBI---Company-License). Not HTTP-scrapable
  without driving Power BI's query protocol — deprioritize vs. easier states.
- Net: TX was the easy Socrata win; other states each need bespoke work. Best
  next free source is SoS registries (owner names) — separate build.

DealForce (login network) recon: public `/opportunities` renders a Vue SPA
backed by **Azure Cognitive Search**; the featured deals are **blind teasers**
(no company names — "Manufacturer of industrial-grade power solutions", rev/
EBITDA/region only). Under the firm real-name rule these CANNOT become deal/
company records; they could feed Market Multiples (rev×EBITDA×industry) like
other unnamed listings, but that's Lane A's multiples table. Full/named access
is login-gated → the co-pilot path (John's live browser) per CREDENTIALS-INTAKE,
not a headless scrape. No adapter built; recon logged.

## 2026-07-12 — SoS owner-name lookups: recon + the honest path

PM asked for free Secretary-of-State/corp-registry owner-name lookups (biggest
BASIC→IDENTIFIED lift). Recon: the public registries are bot-hostile — AZ eCorp
(ecorp.azcc.gov) is an SPA whose host won't resolve for scripted GET; FL Sunbiz
hard-403s bots; OpenCorporates' open API now 401s (token required). None are
cleanly scriptable at scale. Shipped the CORRECT SHAPE instead of a stub:
`enrich/sos_lookup.js` = a per-state resolver registry that no-ops cleanly until
a resolver exists, wired into the tier-2 cascade (a resolved name unlocks
Hunter/LinkedIn). Registered the ONE genuinely-free working resolver — TX via
the Socrata TDLR licensee dataset (verified: resolves "Xtreme Air Services" →
its owner). The real unblock for other states is one of: (a) extend the Socrata
pattern to states with a licensee open-dataset carrying owner/officer names
(free, proven — same as TDLR); (b) a cheap keyed API (OpenCorporates or a
skip-trace vendor, ~cents/lookup — bubble the cost to John); (c) a
headless-browser resolver per priority state (bigger build). Plumbing is live
now; each resolver activates the instant it's registered.

## 2026-07-11 — Enrichment worker live: the ~free owner-contact tier works

`enrich/run_enrichment.js` implements ENRICHMENT-STRATEGY steps 1–2: scrape the
lead's website (home/about/contact via cheerio), fall back to Exa web+LinkedIn
snippets when the site is missing/thin, then Claude Haiku extracts owner name/
title/email/phone/LinkedIn + acquisition signals into a strict JSON schema
(explicitly forbidden from inventing contact data; license-board owner names are
never overwritten). Live results: HIGH-confidence owner names on most of the
Dallas HVAC batch (e.g. real owners for Xtreme Air, BIMS, Vent-One, Copeland,
Texaire) at ~$0.01/lead all-in. Leads with no website AND thin search results
are marked skipped — that's the VA shortlist, exactly as the strategy intends.
Exa also verified in the list-building rescue path (Lake Mgmt/Tucson: 0 free →
20 real companies incl. SOLitude). Notion Deal Tracker + Broker Directory
synced via `ingest_notion_tracker.js`: nail-thesis financials (revenue/EBITDA/
employees/LOI prices) backfilled onto all 14 companies, 6 broker contacts got
phones, and 2 OWNER contacts landed (Jason Ly with a cell number).

## 2026-07-11 — Pursuit auto-detect: the self-regulating loop is live

`ingest_pursuit.js` turns broker emails into listing pursuit-state changes
(LISTING-PURSUIT-FLOW §2). Design choices worth keeping: (1) "NDA is in
Process" (FCBB pattern — buyer signed, agent countersign pending) maps to
info_requested with an explanatory note, NOT nda_signed — the executed-copy
email advances it, so state never overstates reality. (2) Matching requires the
listing's exact normalized name in the email text, narrowed by sender domain →
source; names under 12 chars additionally need the broker's ref-number anchor
(guards "Tree Service" against false matches). Ambiguous emails are logged for
review, never guessed. (3) Forward-only ladder; promoted/passed are terminal.
(4) Idempotent via listing_events.detail.msg. Backfill found John's two FCBB
NDA submissions from TODAY and matched both to scraped fcbb listings by exact
name. Migration 0005 adds the timestamps + inquiry_profiles + ready_to_promote
view (Lane B's contract for the Prospecting lane); detector degrades to notes
until it's applied. Guardrail: detection only — sending/signing is John's click.

## 2026-07-11 — Owner-contact funnel proven end-to-end

With Serper/Places/Hunter keys live, every tier of ENRICHMENT-STRATEGY now runs:
1. List-build (Serper primary + OSM/TDLR free + Places/Exa/Parallel rescue) —
   Pest Control/Tucson: 50+20 candidates → 28 unique leads, cost tracked.
2. Website discovery (new, inside run_enrichment.js): Exa finds the site for
   license-board leads (token-match guard, directory junk filtered), persists
   it; `--retry-skipped` recovered 4/12 previously-dead leads.
3. Claude owner extraction — high-confidence names at ~$0.01/lead.
4. Hunter email-finder (find_emails.js): verified owner emails at score 95–97
   on first live run; free quota protected (one attempt/lead, 5/run cap,
   LAST,FIRST license names normalized, generic mailboxes kept separately).
5. VA CSV loop for whatever survives all of the above.
Serper maps pagination fixed (needs GPS ll anchor — geocoder now feeds it).

## 2026-07-11 — Outbox: draft-and-queue shipped; SEND deliberately withheld

Pursuit Round 2, Lane C's share: `POST /api/outbox {listingId}` Claude-drafts a
listing-specific broker inquiry (2-3 diligence questions, Pronghorn voice —
verified excellent on a live Tier-1 roofing listing via `draft_inquiry.js`),
queues it in outbox_emails, flips the listing to info_requested, and logs a
listing_event. `dryRun` returns the draft without side effects; PATCH edits;
cancel withdraws. The SEND action was intentionally NOT built this session:
the founding guardrail here is "never send anything," approval arrived only via
PM relay, and the safety layer independently blocked both arming Graph creds in
the web surface and writing the send code. Sending is one small route John can
commission directly (spec in LISTING-PURSUIT-FLOW §1) + GRAPH_* env vars he
provisions himself. Drafting activates when John adds ANTHROPIC_API_KEY to
web/.env.local; until then the route 503s with instructions and the scraper CLI
covers drafting.

## 2026-07-11 — First full pursuit cycle closed in production

FCBB Tree Service (327-24860): John signed the NDA ~06:05 → detector logged
info_requested (countersign pending) → broker countersigned ~10:53 and sent the
"Confidential Business Profile Level 1" → detector advanced to **cim_received**.
Two detector generalizations from the live mail: (1) FCBB's "Confidential
Business Profile" is their CIM — added to the CIM signal; (2) one email can
match multiple signals ("thank you for your NDA … download the profile") — the
HIGHEST stage now wins (bestSignal). Tree Service is the first row in the
ready_to_promote queue; John fills the real name/financials from the CBP and
promotes. The aquatic-contractor pursuit (226-24809) still awaits countersign.

## 2026-07-10 — dotenv "vestauth" banner: false alarm

`dotenv@17.4.2` prints rotating ad tips (incl. `vestauth.com`). Diffed the installed
package against the official npm tarball — byte-identical. Not a supply-chain issue,
just an upstream ad. If the banner bothers us, add `quiet: true` or pin `dotenv@16`.
