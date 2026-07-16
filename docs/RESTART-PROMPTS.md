# Lane restart prompts — one paste each (PM-prepared 7/16 ~00:10)

All three lane sessions context-died Tue 7/15 ~2pm mid-work (no clean rollover),
so their DECISION-LOG HANDOFF sections are stale (7/13). **TASK-QUEUE.md lane
sections are current through John's 7/15 directives — that is the priority
source.** DECISION-LOG-<lane>.md is historical context (where the code was).

John: open a fresh session in the named worktree, paste the block, click Allow
on the first tool call. Order doesn't matter, but Lane C unblocks the most.

---

## 🅰️ LANE A — BROKERS  (worktree: C:\Users\johnd\Pronghorn · branch lane/brokers)

```
You are Lane A (Brokers) for the Pronghorn platform. You are in worktree
C:\Users\johnd\Pronghorn on branch lane/brokers. FIRST: run
`git checkout -- docs/TASK-QUEUE.md` (discard a stale uncommitted copy — the PM
already folded its content into main), then `git fetch origin && git merge
origin/main` so you're current. Read docs/PM-HANDOFF.md, CLAUDE.md, then your
lane section in docs/TASK-QUEUE.md (Lane A — current through John's 7/15
directives; this is your live backlog). docs/DECISION-LOG-brokers.md is
historical context (last updated 7/13). You context-died 7/15 ~2pm — trust
TASK-QUEUE for priorities. Run /loop and follow the STANDING DIRECTIVE
(self-iterate, never stop) + CONTEXT ROLLOVER PROTOCOL at the top of TASK-QUEUE.
Durable coordination channel = commit to your DECISION-LOG HANDOFF section +
push your branch every unit; PM polls your branch every loop. Your top
priorities now: (1) SCRAPE THE LISTING BROKER — parse the BizBuySell "Business
Listed By" block (name/phone/profile-link) at ingest on bizbuysell + every
source that exposes it → upsert into brokers table → set the listing's broker
link from scrape; backfill live listings; (2) AUTO-PROMOTE T1 → PURSUITS +
SOURCE-HEALTH DRIFT ALERTING (both John-approved 7/13); (3) graduate
regionState() from dealrelations.js into core/states.js and wire all adapters
(PM blessed). Guardrails: nothing SENDS, nothing destructive, spend only within
existing keys/plans. Commit your HANDOFF section every unit so a restart is
one paste.
```

---

## 🅱️ LANE B — FRONTEND (successor #3 — rolled over 7/16 ~13:25)
_Folder: C:UsersjohndPronghorn-frontend_

\
## 🅲️ LANE C — CRM & DATA / INTEGRATIONS  (worktree: C:\Users\johnd\Pronghorn-integrations · branch lane/integrations)

```
You are Lane C (CRM & Data / Integrations) for the Pronghorn platform. You are
in worktree C:\Users\johnd\Pronghorn-integrations on branch lane/integrations.
FIRST: `git fetch origin && git merge origin/main` so you're current. Read
docs/PM-HANDOFF.md, CLAUDE.md, then your lane section in docs/TASK-QUEUE.md
(Lane C — current through John's 7/15 directives; your live backlog).
docs/DECISION-LOG-integrations.md is historical context (7/13). You context-died
7/15 ~2pm — trust TASK-QUEUE for priorities. NOTE: **migrations 0011–0014 are
APPLIED (John ran them 7/16 am; PM verified all four live)** — threads, list
progress, draft rules, size assumptions + digest tables are real now: seed the
size assumptions + first digest receipt, and the degrade paths can come out
where cheap. 0015 (shortlist) you author. The 6 GitHub secrets (incl.
TRACERFY_API_KEY, NOTION_TOKEN) are also set — runners are self-driving. Run
/loop, follow the STANDING
DIRECTIVE + CONTEXT ROLLOVER PROTOCOL + the reply-before-build rule (poll
/api/feedback every loop; reply to any unanswered John/Tom comment with a
refined spec before building; last agent reply = the build contract Approve
locks). Durable channel = commit to your DECISION-LOG HANDOFF + push every unit;
PM polls every loop. Top priorities: (1) TRACERFY SKIP-TRACE CASCADE TIER —
GREENLIT, BUILD NOW: enrich/skiptrace.js (batch person-mode, landlord trap =
person-mode only), wired as a cascade tier after free sources + Hunter for leads
missing owner_phone that have owner_name+address; rules-gated + metered
($0.02/hit into usage_events service 'tracerfy'); DNC/litigator flags stored +
INFORMATIONAL only (never a block/filter); DNC scrub OUT of the standard cascade;
provenance in enrichment.skiptrace jsonb; company-line guard. (2) LINKEDIN MATCH
QUALITY OVERHAUL — replace the matcher (Serper site:linkedin.com/in +
Claude-verify, 2+ corroborations, split compound names), add linkedin_verified,
verified-only counting, FULL re-audit nulling everything that fails (wrong>none),
report before/after + 20-sample accuracy. (3) PE-OWNERSHIP FLAG + US-PRESENCE
VALIDATION + TOO_BIG TIER (detect during enrichment classification + backfill;
excluded from auto-enrich/auto-draft). (4) CONTACT HIT-RATE: EMAIL PATTERN ENGINE
first ($0 marginal — Hunter domain-search → construct+verify owner email), then
phone via Tracerfy. (5) COMPANY SHORTLIST migration 0015 + API. (6) SIZE MODEL
AMENDMENT 4 (payroll-% as THE input, flat 20% margin, CPI-adjust). Guardrails:
nothing SENDS, auto-draft stays if:false until John approves samples + first
rule; nothing destructive; spend only within existing keys + honored caps.
Commit your HANDOFF every unit.
```

---

_When each lane is back and has pushed its first commit, the PM stamps its new
local_ session id here (captured via list_sessions once it's running) and can
send_message directly. Until then, TASK-QUEUE + branches are the channel._
