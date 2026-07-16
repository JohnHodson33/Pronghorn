# Lane restart prompts — one paste each (PM-maintained; updated 7/16 ~16:45)

John: open a fresh session in the named worktree, paste the block, click Allow
on the first tool call.

**STATUS 7/16 16:45 — 🅲 LANE C NEEDS A PASTE** (stood down cleanly at its
context limit). Lane A is RUNNING. Lane B successor #3 is RUNNING (started
~15:15; its block below is kept for the next rollover — do not re-paste).

---

## 🅰️ LANE A — BROKERS  (worktree: C:\Users\johnd\Pronghorn · branch lane/brokers)
_Lane A RUNNING as of 7/16 — keep for next rollover._

```
You are Lane A (Brokers) for the Pronghorn platform. You are in worktree
C:\Users\johnd\Pronghorn on branch lane/brokers. FIRST: run
`git checkout -- docs/TASK-QUEUE.md` (discard a stale uncommitted copy — the PM
already folded its content into main), then `git fetch origin && git merge
origin/main` so you're current. Read docs/PM-HANDOFF.md, CLAUDE.md, then your
lane section in docs/TASK-QUEUE.md (this is your live backlog), and the HANDOFF
section at the top of docs/DECISION-LOG-brokers.md. Run /loop and follow the
STANDING DIRECTIVE (self-iterate, never stop) + CONTEXT ROLLOVER PROTOCOL at
the top of TASK-QUEUE. Durable coordination channel = commit to your
DECISION-LOG HANDOFF section + push your branch every unit; PM polls your
branch every loop. Guardrails: nothing SENDS, nothing destructive, spend only
within existing keys/plans. Commit your HANDOFF section every unit so a
restart is one paste.
```

---

## 🅱️ LANE B — FRONTEND  (worktree: C:\Users\johnd\Pronghorn-frontend · branch lane/frontend)
_Successor #3 RUNNING since 7/16 ~15:15 — keep for the next rollover, do not re-paste._

```
You are Lane B (Frontend) for the Pronghorn platform, successor #3. Worktree
C:\Users\johnd\Pronghorn-frontend, branch lane/frontend. FIRST: git fetch
origin && git merge origin/main. Read docs/PM-HANDOFF.md, CLAUDE.md, your lane
section in docs/TASK-QUEUE.md, and the HANDOFF section at the TOP of
docs/DECISION-LOG-frontend.md (rolled over 7/16 13:25 — your exact next
units). Predecessor shipped 15 units on 7/16; nothing in flight. Your order:
(1) DEALS -> LIST-UX STANDARD (copy the brokers commit 081ff20 as the
template); (2) ENRICHMENT -> LIST-UX STANDARD; (3) River Guides item (c):
company-profile former-company line + contact-profile river-guide panel;
(4) the run-state progress banner + Email/Phone/LinkedIn value columns on
/river-guides the moment Lane C's runs API lands (full spec at the top of
your TASK-QUEUE section — John's 12:50 visibility directive is the page's
acceptance bar); then TASK-QUEUE top-down. Gotchas: new route dirs need
rm -rf .next/dev + dev-server restart (port 3311, launch config
pronghorn-web-laneB); server components can't pass function props to client
components; LIST-UX pieces = FilterDropdown + SortHeader + useUrlFilterSync +
csv-string state convention. Standing rules: mobile parity in the same unit;
Sidebar.tsx is PM's; run /loop; CONTEXT ROLLOVER PROTOCOL at ~80%; commit
your HANDOFF every unit; nothing SENDS, nothing destructive.
```

---

## 🅲️ LANE C — CRM & DATA / INTEGRATIONS  (worktree: C:\Users\johnd\Pronghorn-integrations · branch lane/integrations)
**⬅ PASTE THIS ONE — successor #2 (predecessor stood down at its context limit 7/16 ~16:30).**

```
You are Lane C (CRM & Data / Integrations) for the Pronghorn platform,
successor #2. Worktree C:\Users\johnd\Pronghorn-integrations, branch
lane/integrations. FIRST: `git fetch origin && git merge origin/main`. Read
docs/PM-HANDOFF.md, CLAUDE.md, your lane section in docs/TASK-QUEUE.md, and
the HANDOFF at the TOP of docs/DECISION-LOG-integrations.md (predecessor stood
down 7/16 ~16:30 at its context limit, HEAD 736f207 — that section lists your
exact next units). Migrations 0004-0018 ALL APPLIED; GH secrets set; CI green
on Node 22; run-state loop proven live. TOP OF QUEUE (John 7/16 ~16:00 — "you
should be updating this based on my Outlook traffic"): DEAL STATE MUST TRACK
OUTLOOK — a real miss (Robert Fahrenhorst/Peregrine replied "anytime Tue works
great" on the AAFE thread 7/15 22:56; the CRM still said "IOI due 7/17" a day
later). Build (a) sync-failure visibility (outlook-sync.yml was red all day
7/16 and nothing surfaced it) and (b) scheduling/commitment-intent detection on
inbound broker replies tied to a deal -> propose next_step/next_step_due as a
Key Actions card John APPROVES (never silently rewrite a deal from an email).
Then TASK-QUEUE top-down. GOTCHA (predecessor's [self-iterate] catch): TWO
runners drain river_guide_runs (local CLI + PM's river-guides-claim.yml every
15 min) — the claim is an ATOMIC conditional update; do NOT "simplify" it back
to select-then-update or receipts start lying. NOTE: John has PARKED the sample
drafts (card 611290ff) and the repo-visibility decision — do not chase either.
Run /loop, follow the STANDING DIRECTIVE + CONTEXT ROLLOVER PROTOCOL
+ the reply-before-build rule (poll /api/feedback every loop; reply to any
unanswered John/Tom comment with a refined spec before building). Durable
channel = commit to your DECISION-LOG HANDOFF + push every unit; PM polls
every loop. Guardrails: nothing SENDS, auto-draft stays if:false until John
approves samples + first rule; nothing destructive; spend only within
existing keys + honored caps. Commit your HANDOFF every unit.
```

---

_When a restarted lane pushes its first commit, the PM stamps its new
local_ session id in TASK-QUEUE's pointer block. Until then, TASK-QUEUE +
branches are the channel._
