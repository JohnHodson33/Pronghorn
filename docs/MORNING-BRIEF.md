# Morning brief — overnight of 2026-07-12 → 07-13 (PM session, rewritten nightly)

## ☀️ YOUR MORNING (5 quick actions + 1 heads-up)
0. **Migrations 0011 + 0012 (~2 min, in order):** same SQL-editor routine —
   `0011_feedback_comments.sql` (real threaded dialogue on /improvements)
   then `0012_lead_list_progress.sql` (live per-source progress on list
   builds — the "queued · 0 found" fix; runner degrades gracefully until
   then).
0b. **Lane A unblock — one direct line (~30 sec):** the auto-promote-T1
   build you approved was correctly blocked by Lane A's own permission
   layer (bulk writes to shared deal tables need YOUR words in ITS chat,
   not a relayed approval). Open the "Pronghorn - Brokers" session and
   paste: *"I approve the auto-promote Tier-1 → pursuits build as specced
   in TASK-QUEUE (dry-run first, limit 25, skip existing reviews, never
   contact anyone). Build it."* Drift alerting (approval #2) shipped fine —
   it needed no shared-table writes.
0c. **DECISION — the GitHub repo is PUBLIC (Lane C flag):** your strategy
   docs/thesis are world-readable. No secrets or PII are committed, but
   consider flipping to private (repo Settings → General → Danger Zone).
   Trade-off: private repos get 2k free Actions minutes/mo and our
   every-15-min workflows use roughly 3–6k — so going private likely means
   a paid Actions tier or slowing the runner cadence. Your call; I can
   model the exact cost if you want.
1. **GitHub secrets — 4 to add (~2 min):** GitHub → Settings → Secrets and
   variables → Actions, values from `C:\Users\johnd\Pronghorn\scraper\.env`:
   `GRAPH_CLIENT_ID`, `GRAPH_TENANT_ID`, `GRAPH_REFRESH_TOKEN` (unlocks the
   every-3h Outlook sync: pursuit detection + drafts push, never sends) and
   `GOOGLE_PLACES_API_KEY` (the 15-min leadgen runner's only missing key —
   your original six from yesterday are working; the 06:00 scrape proved it).
   Until then these jobs only run when a worker session drives them locally.
2. **Vercel env keys (~3 min, fixes the "key missing" badges):**
   Vercel dashboard → pronghorn → Settings → Environment Variables → add
   `ANTHROPIC_API_KEY`, `EXA_API_KEY`, `HUNTER_API_KEY`, `SERPER_API_KEY`,
   `GOOGLE_PLACES_API_KEY` (values from `scraper\.env`), then tell me — I
   redeploy. Until then /list-building badges are truthful about the WEB env
   only; the GitHub runner has all keys and drains jobs every 15 min anyway.
3. **Heads-up — your first real Enrich click is the live end-to-end test.**
   Real max-cascade estimate for the ENTIRE remaining lead base is **$4.03
   (403 leads)** — the ~$14 figure was stale, from before the Hunter
   accounting fix. Everything is verified except a real UI-triggered paid
   run; I'll be watching the job the moment you click.

## This week
- **Jack Williams (William Blair) — Tue Jul 14, 3:00–3:30 PM CT, Teams**
  (verified in Outlook). Say the word and I'll generate the call-prep
  one-pager (the API is live) Monday so you walk in briefed.
- **Tom:** send him https://pronghorn-green.vercel.app + password; the
  /improvements page is his channel and every lane polls it each loop.

## What shipped tonight (live on pronghorn-green.vercel.app)
0. **After you logged off (~00:30 wave):** (a) **brand sweep live** — the
   whole app now renders in the pronghornequity.com palette (340+ accent
   usages remapped, AA contrast kept) with Playfair display headings;
   (b) **list-build visibility** — lists now show honest live status
   (queued w/ next-run ETA → running w/ live counts → done) and the runner
   drains every 15 min, so your "queued · 0 found" confusion can't recur;
   (c) **size-proxy signal capture** started (review counts, employee
   bands, website size signals) — tier math still held for your card
   amendments; (d) old CRM session stood down cleanly; replacement session
   confirmed and already shipping.
1. **Outlook drafts + live mail ingestion are LIVE (your consent activated
   them):** queued outbox inquiries now push straight into your Outlook
   Drafts folder in bulk (drafts only — the token scope physically can't
   send); NDA/CIM pursuit detection runs on schedule; and broker
   correspondence auto-logs onto CRM deals (verified: Landmark deal picked
   up the Oliver data-room invite + both process letters, idempotently).
2. **Listings table:** polluted location values truncated so price /
   multiple / margin columns stay visible (Lane B; full column restore is
   next in their queue).
3. **Broker sources:** Murphy + Empire health-checked clean, parse quality
   verified (Lane A).
4. PM: merged all lanes → main, built, deployed, verified prod + /api/costs
   ($57.13 MTD: $54 subs + $3.13 variable; Hunter 73/500 searches).

## Self-iterate ledger (the SELF-ITERATE QUOTA you set)
- **Lane C:** deal-mail → CRM activity auto-logging (unprompted — removes
  the "forward me that email" click) + nightly digest/auto-cadence
  suggestion posted to the brain.
- **Lane B / Lane A:** night still in progress at last PM pass — I list
  their ships here as they land.

## Overnight receipts (verified by PM)
- 📈 **Coverage this morning: FULL 51 · CONTACTABLE 60** (tier-2 passes keep
  running; size bands accumulating). Lane C's finding: further contactable
  growth is now bottlenecked on OWNER NAMES — the unlock is your pending
  SoS-resolver decision (Decisions queue: extend free Socrata pattern /
  cheap keyed API / headless resolvers) or the VA tier. Also: the HubSpot
  re-import needs a direct 1-line ask in a Lane C session (bulk-PII
  guardrail, same class as the others; low urgency).
- ✅ **The dialogue loop you asked for is already working:** you commented on
  the nightly-digest card ("how does the system know a thesis is active?")
  and Lane C replied in-thread with a rules-based revision — YOU create
  explicit auto-enrich rules (industry + min size tier + caps); zero rules
  = zero auto-spend; lists never self-activate. That reply is the pending
  build contract — approve the card and that's what gets built.
- ✅ Lane A drift alerting verified two ways: all 30 live sources green, and
  a synthetic 40→4 count drop correctly flagged 🔴.
- ✅ Size-proxy signals flowing: LinkedIn employee bands captured in tier-2
  (live-tested), review counts persisted on 241/542 leads. Tier math still
  held for your card amendments.
- ✅ **Nightly cloud scrape ran on schedule** — 17,036 listings refreshed by
  ~07:00 (GitHub servers, no sessions involved).
- ✅ Site healthy all night (checked every pass); zero feedback submissions;
  no queued jobs stranded.

## Watch items
- **💳 FABLE 5 BILLING (your 7/12 heads-up):** check your Claude usage/billing
  page first thing — if Fable 5 flipped to token billing overnight, restart
  the agent sessions (PM + lanes) on **Opus 4.8**. Agents cannot detect the
  switch or change their own model; the model is picked per session by you.
- **Lane session health (PM watch, updated ~02:20): ALL THREE lanes have
  gone quiet** — last commits Lane B 00:18 (brand sweep) · Lane C 00:25
  (size signals) · Lane A 00:54 (drift alerting). Each shipped its unit
  cleanly first, so this looks like context limits, not crashes. Nothing is
  stuck server-side (no queued enrichment jobs, no pending lists — verified
  02:20). **Morning restart = one paste each** per the TASK-QUEUE HANDOFF
  rule: Lane C's boot prompt is in chat; Lanes A/B resume from the HANDOFF
  section of their DECISION-LOG-<lane>.md. The nightly GitHub scrape at
  06:00 runs regardless — no sessions involved.
- Feedback queue: 0 submitted items overnight so far; agent suggestions
  accumulating on /improvements for your morning approval pass.
- Full ledger: docs/JOHN-OPEN-ITEMS.md · Enrichment contract:
  docs/ENRICHMENT-UX.md · Outreach strategy: docs/OUTREACH-STRATEGY.md
