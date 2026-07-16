# PM / Integrator handoff — resume in a fresh session
_Rewritten 2026-07-15 ~23:20 by the outgoing PM session (context full; ran
7/12→7/15). This doc + TASK-QUEUE.md + JOHN-OPEN-ITEMS.md + MORNING-BRIEF.md
restore full state with zero loss. Boot prompt for John:_

> You are the PM/Integrator for the Pronghorn platform. cd to
> C:\Users\johnd\Pronghorn-pm, read docs/PM-HANDOFF.md first, then CLAUDE.md,
> docs/TASK-QUEUE.md, docs/JOHN-OPEN-ITEMS.md, docs/MORNING-BRIEF.md. Resume
> the PM loop continuously (run /loop): git fetch, merge lane branches into
> main, resolve conflicts (TASK-QUEUE.md keep-both, Sidebar.tsx is yours),
> build web/, vercel deploy --prod (project MUST be "pronghorn"), verify
> pronghorn-green.vercel.app, poll /api/feedback for submitted items, watch
> lane commit recency, refill lanes, keep MORNING-BRIEF + JOHN-OPEN-ITEMS
> fresh, run the Notion notes tidy pass, run the scrape catch-up check, and
> answer John in chat — always as the last message of the turn. FIRST
> ACTIONS: (1) find your own session id (search transcripts for a phrase you
> just sent to a worker — list_sessions excludes self; the scratchpad UUID
> is NOT your session id), update the 📮 PM-pointer block at the top of
> TASK-QUEUE.md with it, commit+push; (2) ask John to do the three one-paste
> lane restarts (all lanes are context-dead; each resumes from the HANDOFF
> section of its DECISION-LOG-<lane>.md); (3) confirm the 06:00 nightly
> scrape ran (check max listings.last_seen_at; if stale >20h, kick
> `node run_supabase.js` locally in background).

## Setup (stable facts)
- Worktrees: Pronghorn=lane/brokers · Pronghorn-frontend=lane/frontend ·
  Pronghorn-integrations=lane/integrations · Pronghorn-pm=main (YOU).
- Deploy: `cd web && vercel deploy --prod --yes --token <VERCEL_TOKEN from
  web/.env.local>`; web/.vercel/project.json must say projectName
  "pronghorn". Site: https://pronghorn-green.vercel.app (basic auth:
  pronghorn / pronghorn-green-2026).
- PM-owned: Sidebar.tsx, shared docs, deploys, this handoff, criteria data
  edits John approves, data-quality passes, Notion tidy.
- **PM worktree scraper/ has NO node_modules** — run node scripts with
  `NODE_PATH="/c/Users/johnd/Pronghorn-integrations/scraper/node_modules"`.
- Bash env-var gotcha: keys in .env may carry \r (Notepad) — always
  `tr -d '\r'` after cut. NEVER append to .env without a leading \n check
  (a 7/15 glue bug came from appending to a file with no trailing newline).
- Session roster (all 3 lanes CONTEXT-DEAD as of 7/15 pm — need John's
  one-paste restarts): Brokers local_56a6eb86-… · Frontend (replacement)
  local_38d3b5d9-… · CRM/Data (replacement) local_32385d95-… . Outgoing PM
  = local_b552862b-… (this doc's author, retiring). Durable channel =
  TASK-QUEUE.md; send_message needs John's Allow click per send.
- **CONTEXT ROLLOVER PROTOCOL** is a standing rule (TASK-QUEUE top): lanes
  self-announce at ~80% and hand off; PM preps successor prompts.

## ⚠️ COMMUNICATION RULES (hard-won)
1. **Answer LAST in every turn** — text before a tool call (esp.
   ScheduleWakeup) does NOT render on John's mobile. Tools first, full
   answer last, nothing after it.
2. John wants DETAILED chat answers; docs are the durable ledger he reads
   later. Resurface open loops — he hates silent drops.
3. He dictates: read transcription artifacts generously ("trace supply"=
   Tracerfy, "Paraguin"=Peregrine, "Altherf"=All Turf, "for hours"=few hrs).
4. Verify before asserting; report failures plainly; wrong > none applies
   to data (his trust standard — null unverified channels).
5. John's guardrail philosophy: rules-engines with "zero rules = zero
   automation"; flags informational not blocking (no auto-dialer exists);
   approval gates before any outreach automation resumes.

## Where everything stands (7/15 ~23:20)
- **Site/pipeline**: healthy; nightly scrape FIXED (NUL-byte sanitizer +
  poisoned-row fallback in core/db_output.js) after 7/15 morning failure;
  scrape catch-up rule added (see boot prompt). Painting/restore keywords
  live in screening (94-keyword profile).
- **Sourcing screen (John's 7/15 directives, queued top-of-lanes, NOT yet
  built — lanes died)**: LinkedIn match overhaul (PM ran the audit: 138
  links → 69 verified / 69 nulled; verified-only counting is the queued
  code change) · PE-ownership flag (PM swept Platform tier; 5 non-US
  leads off-targeted; Sunday CO = VC-backed noted; All Turf ↔ Turf
  Masters) · US-presence validation + TOO BIG tier (Irrigation Excellence
  = exemplar, off-targeted) · company shortlist ★ (0015 migration to be
  authored by Lane C) · companies table filter/sort overhaul · inline
  edit everywhere + filter/sort persistence on back-nav (Lane A relayed).
- **Tracerfy skip-trace: VALIDATED + LIVE-ISH** — key in all scraper/.env
  files (232-char JWT); PM ran 49-lead sample (14 hits, per-hit billing
  ≈$0.02) + 87-lead backlog (11 hits): **+18 owner phones, +10 emails,
  ~$1.60 total; ~931 credits remain.** Compliance posture per John: pull
  everything, DNC flags informational only, scrub OUT of standard cascade.
  Lane C builds enrich/skiptrace.js cascade tier (spec in TASK-QUEUE incl.
  landlord trap: person-mode only). enrichment.skiptrace jsonb = provenance.
- **Size model**: tiers/columns/tab live; **amendment 4 pending build**
  (payroll-% as THE input, flat 20% margin, CPI-adjust, one mental model)
  — Lane C's top build with the skiptrace tier. PPP import ran (Platform
  tier 17, cleaned of non-US junk by PM sweep).
- **Outreach**: auto-draft PAUSED (leadgen.yml if:false). 5 sample drafts
  on /improvements card 611290ff — JOHN STILL HASN'T REVIEWED (the unlock).
  Draft rules engine + /outbox rules UI shipped; 0013 activates. John's
  verbatim broker-inquiry template queued (Lane C) — pronghorn identity
  fixed in inquiry_profiles (jhodson@pronghornequity.com).
- **Deals**: AAFE (fencing, $5.4M/$1.9M AEBITDA) — deal 'CIM Received',
  CIM attached, IOI target 7/17, Peregrine bankers as contacts. Odulaire
  "Project Lifeline" (mobile medical, ~6-6.5x ask) — deal 'Info Requested',
  IOI ASAP, data room invite may be in John's SPAM (OneHub). Landmark IOI
  submitted. Tree Service (FCBB) ready-to-promote in Key Actions.
- **Notion**: taxonomy live (Meeting Notes (CRM-synced) → industry folders);
  parent SHARED with integration (29 pages visible); PM tidy pass = loop
  duty; Lane C's 3h sweep tags notes → CRM (needs NOTION_TOKEN GH secret
  for cloud cadence). Tom's guide: docs/NOTION-CONNECT.md.
- **VA option**: 200-lead shortlist in John's Downloads
  (pronghorn-va-shortlist-200.csv) + job-post text delivered in chat 7/15;
  va_import.js is the return path. John evaluating Upwork hire ($6/hr).
- **Costs**: ~$57-60 MTD ($54 subs + variable); every paid call metered.

## 🎯 JOHN'S PENDING LIST (he wants to run these tonight)
1. **Supabase migrations 0011→0014, in order** (~4 min): SQL editor, files
   from C:\Users\johnd\Pronghorn-pm\supabase\migrations\ — 0011 threads ·
   0012 list progress · 0013 draft rules · 0014 size assumptions + digest.
   (0015 shortlist doesn't exist yet — Lane C authors it post-restart.)
2. **GitHub secrets ×6**: GRAPH_CLIENT_ID, GRAPH_TENANT_ID,
   GRAPH_REFRESH_TOKEN, GOOGLE_PLACES_API_KEY, NOTION_TOKEN,
   TRACERFY_API_KEY (values in Pronghorn\scraper\.env) — makes all runners
   self-driving.
3. **Vercel env**: NOTION_TOKEN (then PM redeploys) — Notion-link fetch in
   "+ Note".
4. **Three lane restarts** (one paste each; prompts = HANDOFF sections of
   DECISION-LOG-<lane>.md; Lane C's boot prompt pattern is in 7/13 chat).
5. **Review the 5 sample drafts** (/improvements card 611290ff) — the only
   gate on tailored auto-drafting; then create rule #1 on /outbox.
6. **Check SPAM for the OneHub data-room invite (Odulaire)** + review data
   room; IOI pen-to-paper (others already submitted).
7. Open decisions: repo public/private · VA hire go/no-go.

## First-loop checklist for the incoming PM
- [ ] Own session id → TASK-QUEUE 📮 block → commit/push
- [ ] John: lane restarts (then re-point each lane to your id via Allow'd
      messages or let them read TASK-QUEUE)
- [ ] Verify 06:00 scrape ran (catch-up if stale)
- [ ] Verify Jack Williams + Odulaire follow-ups live in deals' next_steps
- [ ] Rewrite MORNING-BRIEF for 7/16 with the Tracerfy results + John's list
- [ ] When migrations land: tell Lane C (digest seed + APIs light up)
