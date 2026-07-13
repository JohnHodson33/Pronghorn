# PM / Integrator handoff — resume in a fresh session
_Rewritten 2026-07-12 ~23:00 by the outgoing PM session (context full). This
doc + the repo docs restore full state with zero loss. Boot prompt for John:_

> You are the PM/Integrator for the Pronghorn platform. cd to
> C:\Users\johnd\Pronghorn-pm, read docs/PM-HANDOFF.md first, then CLAUDE.md,
> docs/TASK-QUEUE.md, docs/JOHN-OPEN-ITEMS.md, docs/MORNING-BRIEF.md. Resume
> the PM loop (run /loop): git fetch, merge lane branches into main, resolve
> conflicts (TASK-QUEUE.md keep-both, Sidebar.tsx is yours), npm run build in
> web/, vercel deploy --prod (project MUST be "pronghorn"), verify
> pronghorn-green.vercel.app, refill lanes, answer John in chat.

## Setup (unchanged)
- Worktrees: Pronghorn=lane/brokers · Pronghorn-frontend=lane/frontend ·
  Pronghorn-integrations=lane/integrations · Pronghorn-pm=main (YOU).
- Deploy: `cd web && vercel deploy --prod --yes --token <VERCEL_TOKEN from
  web/.env.local>`; web/.vercel/project.json must say projectName "pronghorn".
  Site: https://pronghorn-green.vercel.app (basic auth: pronghorn-green-2026).
- PM-owned files: Sidebar.tsx, shared docs, deploys, this handoff.
- **PM recurring duty — NOTION NOTES TIDY (John confirmed 7/13):** each loop
  pass (or at least every few hours), search John's Notion for new AI meeting
  notes sitting at the Private ROOT (they land there, not in the folder),
  rename to `YYYY-MM-DD · Meeting title`, and file into the taxonomy under
  "Meeting Notes (CRM-synced)" (parent 39c42e2a-3ad4-81ee-9f74-ded5fb3bf720):
  <Industry>/Industry Research|Advisors/<person>|Deals/<target>; non-industry
  → Brokers & Intermediaries or Firm & Platform; empty → Archive. New industry
  = new folder on first note. Notion MCP tools do this (John authorized the
  writes 7/13). Lane C's 3h sweep handles the CRM tagging — the tidy is about
  Notion organization only.
- **PM worktree scraper/ has NO node_modules** — run node scripts with
  `NODE_PATH="/c/Users/johnd/Pronghorn-integrations/scraper/node_modules"`.
- Worker sessions (send_message needs John's confirm click):
  Brokers local_56a6eb86-…-c71b2e6e615b
  · Frontend local_38d3b5d9-3a59-4778-aa49-4a4d9860c03d (replacement 7/13
  ~11:30; predecessor local_bc4c78c9-… rolled over at 47c52e9, archived)
  · CRM/Data local_32385d95-1c7f-4341-9861-1989d0a4bbc8 (replacement 7/13;
  predecessor local_a5947c46-… archived). PM session (this loop) =
  local_b552862b-ea9f-4559-8adc-400f0bbf8c58. Durable channel = TASK-QUEUE.md.

## ⚠️ COMMUNICATION RULES (hard-won — read memory john-comms-file-channel)
1. **Answer LAST in every turn**: text before a tool call (esp. ScheduleWakeup)
   does NOT render on John's Dispatch mobile. Tools first, full answer last,
   nothing after it.
2. John wants DETAILED responses in chat (not files); JOHN-OPEN-ITEMS.md is a
   background ledger to resurface periodically. If a reply "vanishes," resend.
3. Check his OUTLOOK (MCP calendar/email tools) before calling correspondence
   items open. Proactively resurface open loops — he hates silent drops.
4. He dictates: interpret transcription artifacts generously ("nVenn"=ZoomInfo
   -type, "measy"=MECE, "for hours"=few hours).

## Where everything stands (7/12 ~23:00)
- **Site**: brand pass live (pronghornequity.com palette: navy-deep #17301F,
  ivory #EDE7D4, gold #C9BD96; logo web/public/pronghorn-logo.png; Playfair
  Display; dark forest sidebar). Two-prong IA. All migrations 0001-0010 applied.
- **Enrichment (John's #1)**: completeness levels LIVE (183 leads: 27 FULL ·
  31 CONTACTABLE · 8 IDENTIFIED · 117 BASIC), tier-aware Enrich w/ cost
  preview, progress banners + global pill, row→company profile, honest dots.
  One-click cascade: free tiers → tier1 → tier2 (Hunter ALWAYS if gaps; $34/mo
  annual plan ACTIVE, ~38% hit rate). Skip-tracing DEFERRED pending reps
  (Tracerfy ~$0.02/rec first sample). NOT yet live-fired: a real UI Enrich run
  end-to-end (~$14) — John's first click is the live test; watch it.
- **Autonomy machinery**: /improvements page LIVE w/ brain (8 PM suggestions
  seeded, agents add ≥2/night), mic dictation, feedback pipeline (agents poll
  /api/feedback each loop). AUTONOMY NIGHT order + SELF-ITERATE QUOTA in
  TASK-QUEUE header. auto_draft_owners.js queues drafts on CONTACTABLE
  (NEVER sends). Call-prep one-pager API live.
- **Ops**: nightly GH Actions VERIFIED (30 sources refreshed at 06:00, no
  sessions involved). 19.3k listings, 27 sources, ~113 T1. 310+ proprietary
  companies, 227+ owner contacts. Cost badge: $54/mo baseline (Hunter 34
  active + Vercel 20 planned) + ~$3 variable; sub-covered usage books $0.
- **Outlook**: consent DONE (Mail.Send+Read+ReadWrite); drafts route +
  scheduled ingestion live; pursuit detector auto-advances (Tree Service hit
  cim_received hands-free; aquatic contractor awaits countersign).
- **Outreach strategy** (docs/OUTREACH-STRATEGY.md): ~100/mo from REAL
  pronghornequity.com addresses (safe at volume, rules listed); in-house
  sequencing, NO Reply.io; drafts-first; open Q3 = sequence shape (w/ Tom).

## OPEN / WATCH
1. **"key missing" badges on /list-building**: /api/leadgen-keys reads the
   VERCEL env, which has NO API keys (PM was permission-blocked from adding
   them; John must add in Vercel dashboard → Settings → Environment Variables:
   ANTHROPIC_API_KEY, EXA_API_KEY, HUNTER_API_KEY, SERPER_API_KEY,
   GOOGLE_PLACES_API_KEY — values from scraper/.env, then redeploy). Until
   then the badges are truthful about the WEB env but misleading re the
   runner (local+GH have all keys; only PARALLEL is truly absent everywhere).
2. Tom joins: send him URL+password; /improvements is his channel. Vercel Pro
   $20 upgrade = compliance (planned line already on badge).
3. Jack Williams call Tue Jul 14 3:00-3:30pm CT (Teams; verified in Outlook).
   Offer John the William Blair prep one-pager beforehand.
4. Lane B next: contacts industry column+filters, listings price/multiple/
   margin restore + location truncate, mobile/PWA pass (FULL parity standing
   rule — mobile view ships in the same unit as every feature).
5. Lane C next: runner self-drain cadence (jobs must not sit), SoS resolver
   decision (bubbled), weekly digest + stale-pursuit nudges (approved-ish
   suggestions), Outlook drafts on outbox UI.
6. Keep MORNING-BRIEF.md fresh (self-iterate ships per lane listed); update
   JOHN-OPEN-ITEMS.md as things close.
7. HubSpot push PARKED · Kumo declined · key rotation resolved · GH secrets
   verified · session health: watch lane commit recency, one-paste restarts.
