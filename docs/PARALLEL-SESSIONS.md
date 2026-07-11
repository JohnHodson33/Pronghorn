# Running multiple Claude Code sessions in parallel

Yes, this works and is worth doing to use spare capacity — **2–3 sessions is the
sweet spot; 5–6 gets coordination-heavy for little extra gain.** The constraints
aren't compute (each session is independent) — they're the three *shared
singletons*: the git repo, the Supabase database, and the Vercel deploy. Assign
lanes so sessions touch different files and disjoint data, and they run cleanly
in tandem.

## The collision risks (and how lanes solve them)
1. **Git push conflicts** — two sessions pushing to `main` collide. → Each session
   works on its **own branch**; ONE integrator session merges to main.
2. **Same-file edits** — two sessions editing `Sidebar.tsx` / `config.json` / a doc
   → merge conflict. → Lane ownership: each shared file has ONE owner lane.
3. **Database row contention** — mostly safe (sessions insert disjoint sources).
   Avoid two sessions running the SAME source or a full-table reclassify at once.
4. **Deploy collisions** — only the **integrator** lane deploys to Vercel.

## Lane assignment (each session: read ROADMAP.md + this file, take a lane)
- **Lane A — Broker sources.** Owns `scraper/sources/*` (new adapter files) and
  `scraper/config.json`. Builds adapters, runs scrapes. Branch `lane/brokers`.
- **Lane B — Frontend tabs.** Owns new dirs under `web/app/*`, new files in
  `web/lib/*` and `web/components/*`. Does NOT edit `Sidebar.tsx` (hand new routes
  to the integrator). Branch `lane/frontend`.
- **Lane C — CRM & integrations.** Outlook contacts → CRM, HubSpot sync,
  enrichment jobs. Owns `scraper/` integration scripts + new `web/app/contacts`
  etc. Branch `lane/integrations`.
- **Lane D — Integrator (run this one yourself / primary session).** Owns `main`,
  `Sidebar.tsx`, shared docs (ROADMAP, DECISION-LOG, SOURCES), and ALL Vercel
  deploys. Merges the other branches periodically.

## Rules for every session
- Commit small and often to your OWN branch; pull main before merging.
- Append to `docs/DECISION-LOG.md` only via the integrator (or a per-lane log file
  `docs/DECISION-LOG-<lane>.md` the integrator concatenates) to avoid conflicts.
- Never run a full-table reclassify or the same source as another live session.
- Only the integrator deploys.

## Practical recommendation
Start with **2 sessions**: this primary one (Lane D integrator + whatever it's
mid-task on) and ONE more on Lane A (brokers) or Lane C (integrations). Add a
third only if the first two never step on each other. The marginal value drops
fast past 3 because merge/coordination time grows.
