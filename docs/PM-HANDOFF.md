# PM / Integrator handoff — resume in a fresh session
_Rewritten 2026-08-04 by the outgoing PM (context full). This doc +
docs/PM-STATUS.md (CI-generated) + TASK-QUEUE.md restore full state._

## FIRST 3 MINUTES
1. `cd C:\Users\johnd\Pronghorn-pm` · `git fetch --all`
2. **Read `docs/PM-STATUS.md`** — CI regenerates it every 6h with the live
   funnel, lane health, Serper runway, and alerts. It is the truth; a lane's
   self-report is not. (If it looks stale, run the "PM watchdog" workflow.)
3. Start the heartbeat: CronCreate `11,41 * * * *` with the loop prompt
   (below). Session-only; it dies with you — that's why CI carries the load.

## WHAT RUNS WITHOUT ANY SESSION (do not rebuild)
- **CI auto-integrator** (`.github/workflows/integrator.yml`, every 20 min):
  merges clean lane branches → main, build-gated. Conflicts are skipped and
  left for the PM.
- **Vercel Git auto-deploy**: main → production automatically (connected
  8/4; project root dir = `web`). **Do NOT run `vercel deploy` anymore** —
  pushing to main is the deploy.
- **PM watchdog** (`.github/workflows/pm-watchdog.yml`, every 6h): writes
  docs/PM-STATUS.md with funnel + alerts.
- Nightly scrape, river-guides workers, leadgen, outlook sync, river-guides
  claim (15 min) — all GitHub Actions, all green on Node 22.

## THE PM'S REMAINING JOB (what CI can't do)
Merge **conflicts** · independent **verification** of lane claims against the
DB · **judgment** on John's directives → TASK-QUEUE cards · **nudging/restart
prompts** for dead lanes · answering John in chat LAST every turn.

## HARD-WON RULES (violating these has cost John time)
- **Never quote a lane's self-report or a run receipt without checking the
  DB** — async workers change rows between report and read (proven twice).
- **Restart prompts go INLINE in chat, full text + full absolute path**
  (`C:\Users\johnd\Pronghorn-pm\docs\RESTART-PROMPTS.md`), never a bare
  "docs/…". Surface them the moment a lane goes dark, unasked.
- **Auto-compaction ≠ rollover.** A lane claiming "context limit" at low
  usage is a false alarm; verify before telling John to restart.
- Data honesty: wrong > none. Company main lines are never owner phones;
  unverified LinkedIn is not a channel; negatives get persisted too.
- Nothing SENDS. Auto-draft stays gated until John approves a template.

## STATE AS OF 8/4 (verify with PM-STATUS.md)
- Funnel: PE-status 100% ✅ · sized 100% ✅ · named ~47% · contactable ~28%
  (the last two were Serper-starved 7/22→8/4; climbing again since top-up).
- River guides: 517 total · 139 verified · 14 outreach-ready · 85 in the VA
  queue. Deep consolidator sweep + review pen live (migrations 0022, 0023).
- Serper: 50k credits bought 8/4 (expire ~Feb 2027); runway card on /costs.
- Deals: AAFE **Passed** (franchise ROFR + EBITDA quality). Landmark IOI in.
  Monster Tree + NatureScapes at CIM Received.
- Lanes A/B: backlogs empty, self-iterating. Lane C: carrying the funnel work.

## THE ONLY THING OPEN ON JOHN
**River-guide outreach template redline.** 14 guides are outreach-ready and
blocked on approved copy. Draft #1 lives in the 7/31 chat; John's feedback:
the old auto-drafts were "really bad… would burn more leads than it helps."
Co-develop it with him — short, peer-to-peer, one concrete fact, equity-not-
fees positioning (spec §8). Same for the broker-outreach template.

## LANE SESSION IDS (8/4)
Brokers `local_27457b33` · Frontend `local_9500debf` · CRM/Data
`local_6dd8b0ff`. Nudge with send_message; if dead, paste from
RESTART-PROMPTS.md (refresh it first — the stored prompts go stale).
