# Brief — Wed 7/16 morning (PM session, rewritten each cycle)

## ☀️ YOUR SHORT LIST (priority order — ~12 min total)
0. **🔴 THE BIG ONE — restart the three lane sessions (one paste each, ~2 min).**
   All three context-died Tue ~2pm; every queued 🔥 build (Tracerfy cascade,
   LinkedIn overhaul, PE flag, inline edit, size amendment 4, shortlist) is
   stalled until they're back. Prompts are ready to copy in
   **docs/RESTART-PROMPTS.md** — open a fresh session in each named worktree,
   paste, click Allow. Lane C unblocks the most; do it first if you only do one.
1. **Migrations 0011→0014, in order (~4 min):** Supabase SQL editor, files from
   `C:\Users\johnd\Pronghorn-pm\supabase\migrations\` — 0011 feedback threads ·
   0012 list progress · 0013 draft rules · 0014 size assumptions + digest.
   (0015 shortlist doesn't exist yet — Lane C authors it after restart.)
2. **GitHub secrets ×6 (~2 min):** `GRAPH_CLIENT_ID`, `GRAPH_TENANT_ID`,
   `GRAPH_REFRESH_TOKEN`, `GOOGLE_PLACES_API_KEY`, `NOTION_TOKEN`,
   `TRACERFY_API_KEY` (values in `Pronghorn\scraper\.env`). Makes every runner
   self-driving.
3. **Vercel env:** add `NOTION_TOKEN` (then I redeploy) — Notion-link paste in "+ Note".
4. **Review the 5 sample outreach drafts** (/improvements card 611290ff) — still
   the ONLY gate on tailored auto-drafting; after 0013, create rule #1 on /outbox.
5. **Check SPAM for the OneHub data-room invite (Odulaire "Project Lifeline")** →
   review the data room → IOI ASAP (others already submitted).
6. **Open decisions:** repo public/private · VA hire go/no-go (Upwork ~$6/hr,
   200-lead shortlist already in your Downloads).

## 🎯 DEAL DESK
- **All American Fence Erectors** (fencing, $5.4M rev / $1.9M AEBITDA @35%): deal
  @ CIM Received, CIM attached. Next: Q&A call w/ Robert Fahrenhorst (Peregrine),
  then **IOI due 7/17**.
- **Odulaire / "Project Lifeline"** (mobile medical, ~6–6.5x ask): @ Info
  Requested. Next: SPAM → OneHub data room → **IOI ASAP**.
- **Landmark Pest Management:** IOI submitted 7/10 ($41–45M, 10–11x). Virtual
  mgmt presentations wk of 7/13 & 7/20; LOIs due shortly after.
- **Gage Tree Care (FCBB):** @ Info Requested — CIM received, ready to promote.
  ⚠️ Its next_step is blank in the deal record — confirm this is the FCBB tree
  CIM and I'll set the follow-up (didn't want to guess wrong data).

## 💰 TRACERFY SKIP-TRACE — VALIDATED & LIVE-ISH (your 7/15 sample program)
Key live in all scraper/.env files. PM ran two batches: **49-lead sample (14
hits, 13 owner mobiles) + 87-lead backlog (11 hits) → +18 owner phones, +10
emails, ~$1.60 total; ~931 credits remain.** Per-hit billing ≈ $0.02. Compliance
posture (your call): pull everything, DNC flags **informational only** (badge on
the cold-call queue, never a block), scrub OUT of the standard cascade. Lane C's
top build is the in-cascade tier (enrich/skiptrace.js) — greenlit, waiting on
the restart.

## ✅ OVERNIGHT PM STATE (7/15 23:20 → 7/16 00:10)
- Rollover from the prior PM absorbed; new PM live and looping.
- All lane branches merged to main (0 ahead); nothing outstanding to integrate.
- Nightly scrape verified fresh (max last_seen 9.4h; 17,341 listings seen in
  24h; no queued enrichment jobs or pending lists to drain).
- Site + /api/feedback healthy (200). Feedback: nothing new to triage (4 shipped,
  5 suggested, 4 approved, 2 building — the approved/building are stalled on the
  dead lanes, another reason to restart).
- Recovered 3 uncommitted Lane B self-iterate items from the brokers worktree
  before they'd be lost on restart; folded into main TASK-QUEUE.
- Restart prompts prepared (docs/RESTART-PROMPTS.md); TASK-QUEUE pointer block
  updated to rollover-complete + id-free coordination.

## 👀 WATCH ITEMS
- ⚠️ **06:00 nightly scrape reliability:** the 7/15 06:00 GitHub Actions run did
  NOT fire (7/14 did). Data is currently fine (9.4h fresh from a later run), but
  **check your GitHub failure emails / repo → Actions tab** — the scheduled
  workflow may be failing or disabled. This + the secret batch is what makes the
  platform self-driving. I'll watch the next 06:00 and catch-up locally if it
  misses again.
- Lanes remain dead until you restart them — I'm covering merges/deploys/data in
  the gap but cannot build their queues.
- Fable 5 billing: swap any agent still on Fable 5 to Opus 4.8 at your discretion
  (agents can't detect the switch themselves).
- 45 inert drafts in Outlook Drafts — delete at leisure.
- Tom: awaiting his first login/feedback + his Notion token (docs/NOTION-CONNECT.md).
