# PM / Integrator handoff — resume in a fresh session

You are the **PM/Integrator** for the Pronghorn platform. A prior PM session hit
its context limit; this doc + the repo docs let you resume with zero loss.

## Your setup
- Work in **`C:\Users\johnd\Pronghorn-pm`** on branch **`main`**. (Git worktrees:
  Pronghorn=Brokers/lane/brokers, Pronghorn-frontend=lane/frontend,
  Pronghorn-integrations=lane/integrations, Pronghorn-pm=you/main.)
- Read FIRST: CLAUDE.md, docs/ROADMAP.md, docs/TASK-QUEUE.md (has the END-STATE
  GOAL + SELF-ITERATE directive), docs/PARALLEL-SESSIONS.md, and the design docs
  (LISTING-PURSUIT-FLOW, ENRICHMENT-STRATEGY, LISTBUILDING-API-SETUP).

## Your loop (repeat continuously; run `/loop` to stay 24/7)
1. `git fetch --all`; for each lane branch with commits ahead of main
   (`git log --oneline main..lane/<x>`), `git merge lane/<x>`.
2. Resolve conflicts — usually only docs/TASK-QUEUE.md (keep worker status notes +
   your structure) and web/components/Sidebar.tsx (wire any NEW routes workers report).
3. `cd web; npm run build` (catch errors). Then deploy:
   `vercel deploy --prod --yes --token <VERCEL_TOKEN from web/.env.local>`.
   **The web/.vercel/project.json MUST say projectName "pronghorn"** — if a deploy
   goes to a "web" project, copy `C:\Users\johnd\Pronghorn\web\.vercel\project.json`
   over yours and redeploy. Verify at https://pronghorn-green.vercel.app
   (Basic-auth password: `pronghorn-green-2026`).
4. **Refill drained lanes** in TASK-QUEUE toward the END-STATE GOAL — never let a
   lane idle. Run data-quality/classification passes (scraper/classify_industries.js).
5. When John adds a key to `C:\Users\johnd\Pronghorn\scraper\.env`, copy that file
   into every worktree's scraper/.env (worktrees don't share gitignored files).

## Talk to workers via the session-mgmt MCP (list_sessions / send_message)
Worker session IDs (may change if John restarts them — re-list to confirm):
- Brokers: local_56a6eb86-ae01-4177-a392-c71b2e6e615b
- Frontend: local_bc4c78c9-0696-42a0-ae0e-b10bd47bc429
- CRM/Data: local_a5947c46-e0f1-4d02-bbc4-cea8f4be5a6a
send_message prompts John to confirm; use it to re-activate a stalled worker or
hand off a new priority. The durable channel is TASK-QUEUE.md — workers pull it.

## State as of this handoff (2026-07-11 ~00:40)
- ~24 broker sources live (config.json). ~9k+ unique listings, ~5.6k with cash flow.
- Frontend: all tabs built (deal detail, enrichment/outreach/cold-calling, dashboard
  v2 at /, editable companies, filters). Working on LISTING PURSUIT FLOW.
- CRM/Data: HubSpot 130-contact sync, Notion/Outlook ingestion, free list-building
  (OSM+TX licenses). Working on pursuit auto-detect + enrichment worker.
- List-building keys LIVE in .env: SERPER, EXA, HUNTER, GOOGLE_PLACES. Parallel pending.

## Open items needing John (surface these; keep in DECISION-LOG/TASK-QUEUE)
- ⚠️ Supabase secret key rotation (shared in chat early on) — STILL OPEN.
- Change Axial/DealForce passwords (shared in chat) after automation verified.
- Parallel API key. Apply supabase/migrations/0004_contact_directory.sql.
- Outlook re-auth w/ Mail.Read scope. HubSpot Private App token (two-way push).
- Cold-email sending domain (separate from pronghornequity.com) + warmup.
