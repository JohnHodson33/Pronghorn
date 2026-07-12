# Pronghorn — complete open-items & explanations for John
_Updated 2026-07-12 ~00:55 · This file is the single source of truth for
everything awaiting you or recently decided. I keep it current; ask me
"what's open?" anytime and I'll resend it._

## ⚡ LATEST CLOSURES (7/12 ~00:55)
- ✅ **Migrations 0004/0005/0006: APPLIED — verified by PM** (inquiry_profiles,
  outbox_emails, ready_to_promote all live). Outbox queueing, pursuit
  timestamps, shared inquiry profile, dashboard views: unlocked.
- ✅ **GitHub secrets: added by John** — proof arrives when tonight's
  scheduled runs go green (~6–7am Phoenix). If any failure email still
  appears, forward it.
- ✅ **Supabase key rotation: already done** at the PM handoff (7/11 ~00:43,
  corroborated by .env timestamps). Reminder retired.
- ✅ **134 companies + 125 owner contacts** promoted into the CRM (relaxed
  bar per John's directive — every enriched lead becomes a company profile).
- 🔨 **Cost tracker (John 7/12):** spec in docs/COST-TRACKING.md; Sidebar
  month-to-date spend badge is DEPLOYED (invisible until Lane C's /api/costs
  lands — top of their queue). Breakdown: subscriptions (currently $0/mo) vs
  variable usage by service, plus **cost per owner-contact acquired** — the
  direct yardstick vs buying enriched data.
- ⏳ Still on John: **Outlook re-auth — FIRST THING TOMORROW** (Lane C stages
  the expanded permissions overnight; John gets a login link + code in chat,
  ~2 min). 🅿️ HubSpot token PARKED per John (Pronghorn is the system of
  record; reactivate only if Tom still works in HubSpot). Parallel key +
  Vercel env keys remain optional/no-rush.

---

## PART 1 — Your decisions tonight: confirmations

| # | Your call | Status |
|---|-----------|--------|
| 1 | "Yes migrate them" | ✅ DONE — all 14 nail-salon deals moved Closed → Passed (verified: 14 Passed, 0 Closed). Pipeline board is clean; they're searchable in the Deals tab. |
| 4 | Kumo: no for now | ✅ Logged in the decision queue as "revisit later." No subscription. |
| 5 | Restart workers, keep them busy | ✅ Work orders delivered to both sessions with tonight's priorities (details in Part 4). CRM/Data session is confirmed alive; Frontend session's delivery is queued — if it hasn't committed by morning it's context-dead and needs you to reopen it (I cannot create desktop sessions from here — my one hard limit). |
| 7 | Jack Williams (William Blair) | ✅ In contacts; he proposed Tue 3–4pm CT. |

## PART 2 — Item #2 explained: the Supabase migrations (0004/0005/0006)

**What a migration is:** a short SQL script that changes the database's
*structure* (new tables/columns). The app code that uses these tables is
already deployed and falls back gracefully until they exist.

**Why only you can run it:** my API key can read/write *data* in existing
tables but cannot alter *structure* — that requires your Supabase dashboard
login. Deliberate safety separation.

**What each unlocks:**
- **0004_contact_directory** — richer broker/owner contact storage.
- **0005_pursuit_flow** — real pursuit statuses + timestamps (info-requested /
  NDA-signed / CIM-received dates, document links), your saved inquiry
  profile (so your contact block syncs across devices instead of living in
  one browser), and the ready-to-promote queue.
- **0006_dashboard_aggregates** — dashboard SQL views + the **outbox_emails**
  table (drafted broker inquiries persist in the Outbox instead of falling
  back to mailto links).

**Exact steps (~5 min total):**
1. supabase.com → sign in → open the Pronghorn project
2. Left sidebar → **SQL Editor** → **New query**
3. On your PC, open `C:\Users\johnd\Pronghorn\supabase\migrations\0004_contact_directory.sql` in Notepad → Select All → Copy
4. Paste into the SQL editor → click **Run** → expect green "Success"
5. Repeat steps 2–4 for `0005_pursuit_flow.sql`, then `0006_dashboard_aggregates.sql` — **in that order**
6. Any error → screenshot to me.

## PART 3 — Item #3 explained: the GitHub Actions secrets

**What they are:** the six automation workflows (nightly scrape of all ~27
broker sources, delisting pass, source-quality report, enrichment tick,
lead-list runner) run on **GitHub's servers** — that's what makes the
platform 24/7 without your PC on or any Claude session open. GitHub jobs
can't see files on your computer, so GitHub provides an encrypted vault
("repository secrets") that only the repo owner can fill. Your failure
emails = the jobs waking up, finding the vault empty, and dying in 11
seconds. **They never touched any data.**

**Exact steps (~5 min):**
1. github.com/JohnHodson33/Pronghorn → **Settings** tab
2. Left sidebar → **Secrets and variables** → **Actions**
3. Green **New repository secret** button
4. For each of the six below: Name = exactly as written; Secret = the value
   after the `=` on the matching line of
   `C:\Users\johnd\Pronghorn\scraper\.env`:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_KEY`
   - `ANTHROPIC_API_KEY`
   - `EXA_API_KEY`
   - `HUNTER_API_KEY`
   - `SERPER_API_KEY`
5. Done — tonight's runs go green, failure emails stop, nightly automation is on.

## PART 4 — Item #6 explained: the standing items

1. **⚠️ Supabase key rotation (do this one):** early in the project the
   database master key was pasted into a chat. Anyone who saw it has full
   read/write access to the deal database. Fix: Supabase dashboard →
   **Project Settings → API keys** → rotate/regenerate the **service role
   key** → paste the new value into `C:\Users\johnd\Pronghorn\scraper\.env`
   (replace `SUPABASE_SERVICE_KEY=`) → tell me; I sync it to all worktrees +
   Vercel. **Timing tip:** do it right after (or together with) adding the
   GitHub secrets so the workflows get the new key, not the dead one.
2. **Outlook re-auth:** our Microsoft connection is missing two permissions:
   **Mail.Read** (scheduled inbox scanning for NDA/CIM auto-detection —
   currently only works when a worker session drives it) and
   **Mail.ReadWrite** (lets us place drafted broker inquiries into your
   Outlook **Drafts** folder — the feature you chose instead of auto-send).
   When Lane C stages it, you'll get a login link + code: sign in with your
   Microsoft account, approve once, done. I'll tell you the moment it's ready.
3. **HubSpot Private App token:** HubSpot → Settings → Integrations →
   **Private Apps** → Create app ("Pronghorn sync") → grant CRM objects
   read/write scopes → copy token → add to `scraper\.env` as
   `HUBSPOT_TOKEN=...` plus a new line `HUBSPOT_PUSH_ENABLED=true`.
   Unlocks the already-built two-way push of net-new CRM records.
4. **Parallel key:** optional rescue-tier data source; Exa already covers the
   role. Treat like Kumo — revisit later. No action.
5. **NEW — Vercel env keys (optional):** if you want the enrichment button to
   run *instantly in the browser* (vs. via the worker/GitHub runner, which
   needs nothing from you): Vercel dashboard → pronghorn project → Settings →
   Environment Variables → add `ANTHROPIC_API_KEY`, `EXA_API_KEY`,
   `HUNTER_API_KEY`, `SERPER_API_KEY`, `GOOGLE_PLACES_API_KEY` (values from
   `scraper\.env`). I attempted this myself and was blocked by the
   credentials guardrail. Low urgency.

## PART 5 — Tonight's enrichment findings (your tree-care lists)

- Your stuck **Phoenix tree-care list ran: 50 leads** inserted (98 candidates,
  cost ≈ pennies). Lists don't run automatically yet — the runner is Lane C's
  #1 build.
- Your **66-lead national tree list — first enrichment batch (25 leads,
  $0.09)**: 4 owner names at high confidence (Derek Babcock — Arborist Tree
  Service Spokane; David Mauk — Jones Road Tree Service; Ken Zuber —
  Environmental Tree Care; Mike Meyer — Meyer Tree Care) + 1 direct email
  (meyertreecare@gmail.com).
- **20 of 25 were skipped — this is the smoking gun**: no website was stored
  at ingest (the sources returned websites/addresses, our ingest drops them —
  same reason your locations were blank). Holding the remaining 41 until the
  ingest fix + website-discovery pass land (Lane C's top order), rather than
  burning credits on guaranteed skips.

## PART 6 — Your newest directive (every enriched company → CRM profile)

Received and agreed — this is the data flow working as designed. Current
promotion bar is stricter than your intent (requires owner name AND an email
or phone), which is why tonight's 4 new owner names didn't auto-appear in
Companies. **Change in motion:** promote every enriched lead once we have
company name + website/location — owner name and contact enrich the profile
when found, never gate it. Being wired now (PM + Lane C); the already-
enriched leads will backfill.

## PART 7 — What the agents are building overnight (work orders sent)

- **Lane C (CRM/Data):** persist address/website at ingest (+ backfill) →
  free-pass enrichment auto-runs on every new list → `/api/enrich` + runner
  (makes the UI button real) → verified-industry classification with
  off-target flagging → relaxed company promotion (Part 6) → Outlook-drafts
  feature (pending your re-auth).
- **Lane B (Frontend):** "Enrich selected (est. $X)" buttons + checkboxes →
  typeahead on industry/geography → Industry column replacing List column +
  off-target filter → filters on every table → live status updates.
- **Lane A (Brokers):** source health/maintenance (12 new sources today;
  free discovery saturated).
- **PM (me):** merge/build/deploy every ~25 min, verify prod, keep this file
  and the decision queue current, cover any lane that goes quiet.

## Communication fix
Several of my long chat responses never rendered for you (you saw gaps and
short replies; I saw sent messages). Everything substantive now ships as a
file like this one + a short chat note. If a response ever seems missing,
say "resend as file."
