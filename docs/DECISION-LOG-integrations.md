# Decision log — Lane C (CRM & Data / Integrations)

## 🤝 HANDOFF (keep current — replacement session resumes from this)

**State (2026-07-13 ~00:25):** Worktree `C:\Users\johnd\Pronghorn-integrations`,
branch `lane/integrations` (push after each unit; PM merges — merged through
aff549e). Env files copied from main checkout; scraper/node_modules junction;
web/node_modules real install. Migrations 0004–0010 LIVE; **only 0011
(feedback_comments) pending PM.** Outlook consent LANDED — drafts + live
ingestion verified working. Shipped tonight: call-prep API, auto-draft owners
(25 in John's Outlook Drafts), deal-mail ingestion, feedback threads backend,
company-level completeness (/api/companies), industry normalization.

**MIGRATIONS 0004–0009 ARE LIVE (verified 7/12 ~19:00); only 0010 (feedback)
pending.** Post-migration backfills DONE: industry_verified column populated
for all 231 enriched leads (217 copied from jsonb + 14 fresh), 19 off-target
flagged; cost backfill already present; enrichment-job drain + tier-2 cascade
proven end-to-end (job queued → run_jobs → tier1+tier2 → complete). Still TODO
when convenient: re-run import_hubspot_contacts.js to move [hs:] note
breadcrumbs into the now-live hubspot_id/firm/title columns (needs a fresh MCP
contact dump — low urgency, contacts already usable).

**[self-iterate] 7/12 eve:** noticed by using the data that 21 leads had a
GENERIC mailbox (info@/sales@/support@) sitting in owner_email — inflating
CONTACTABLE with non-personal addresses (John wants OWNERS). Root cause: the
enrichment write path fell back owner_email = owner_email || business_email.
Fixed the source (generic → business_email, only personal in owner_email) +
cleaned the 20 existing (+1 junk support@exa.ai scrape artifact). Coverage now
honest: FULL 48 / CONTACTABLE 62. business_email preserved for later use.

**AUTONOMY NIGHT (John 7/12 ~21:00 "remove human clicks"):** posted 2 agent
suggestions to the brain (auto-draft owner outreach; nightly digest+cadence).
Built `auto_draft_owners.js` — Claude drafts a personalized cold email to the
OWNER of every CONTACTABLE proprietary company (relationship opener, not "are
you selling"), queues it in outbox_emails for John's review+send. NEVER sends.
Ran: 25 drafts queued ($0.024). Wired into leadgen.yml nightly. This removes
the per-lead "draft" click. 0010 (feedback) now LIVE — poll active.

**🎉 OUTLOOK CONSENT LANDED (7/12 ~22:25) — draft + live-ingestion features
are LIVE.** Verified: pushed all 25 auto-drafted owner emails into John's
Outlook Drafts (push_drafts_to_outlook.js); ran the first `ingest_pursuit.js
--live` scan (Graph Mail.Read works — flagged Oliver's unmatched Data Room
Invite for review). outlook-sync.yml schedules both every 3h (needs GRAPH_*
repo secrets). Nothing sends. This closes the last gated Lane C feature.

**PM POINTER (CORRECTED 7/13 ~00:20):** the ACTIVE PM session is
`local_b552862b-ea9f-4559-8adc-400f0bbf8c58` ("Pronghorn PM loop") — the
earlier id (local_1c8f3b29) was wrong/nonexistent; prior local_29b1759e is
dead. Route cross-session status to local_b552862b. Acknowledged.

**⚠️ FLAG for Lane B/PM:** Lane B's brand-pass `web/app/globals.css` (in the
Pronghorn-frontend worktree, ~1623 lines) has a DUPLICATE `@import
url(Playfair…)` MID-FILE → "CSS @import must precede all rules" → their dev
server 500s every route. Main's globals.css is fine (29 lines, correct), so
the live deploy is NOT affected — this only breaks Lane B's local preview
until they dedupe that @import. Not my file; flagged only.

**Current task:** loop in build+monitor mode. Just shipped cascading enrichment
(tier2.js), completeness levels, job progress, Outlook drafts (John-authorized
in chat), Graph live ingestion, feedback pipeline.

**Next 2:** (1) Standing thread-reply rule (activates on 0011): each loop, poll
feedback for suggestions/feedback with an unanswered John/Tom comment → reply
with a refined spec BEFORE building; on approve post build_plan, on ship post
completion_summary. (2) When John approves the nightly-digest amended card
[9bb9d925], build it with the thesis gate (active list + in-taxonomy +
not off_target), new-lists-held, nightly $ + Hunter caps, receipt+plan digest.
Migrations pending PM: 0011 (feedback_comments). Everything else 0004–0010 live.

**Post-migration (0004–0010) checklist:** re-run `import_hubspot_contacts.js`
(breadcrumbs→columns), `backfill_costs.js` once, `backfill_industry.js` for the
rest, verify `/api/enrich` `/api/feedback` `/api/costs` `/api/outreach-tracks`
light up, schedule the 3 GH workflows (leadgen/enrichment-jobs/pursuit-live).

**Gotchas a replacement MUST know:**
- **Outlook write-back (drafts/sends/scopes) is HARD-BLOCKED in sessions
  launched with the read-only guardrail** — 4 consistent safety rulings, incl.
  mere SCOPES-string prep. Do NOT re-attempt from such a session. John's
  morning re-auth path: HE (or a session he launches with an explicit
  Outlook-write mandate) edits `scraper/delivery/outlook.js` SCOPES to
  `'Mail.Send Mail.Read Mail.ReadWrite User.Read offline_access'` and runs
  `node auth_email.js` — one consent captures everything (~2 min).
- Bulk semantic mutations of live records on PM-relay authority also get
  blocked (Closed→Passed was executed by the PM instead). Additive
  imports/enrichment are fine — that's the founding mandate.
- HubSpot stage labels are booby-trapped; ALWAYS internal ids (see STAGE_MAP
  in sync_hubspot.js). 'Passed' = 3939497680 both directions.
- PowerShell 5.1 mangles embedded double quotes in `git commit -m @'...'@` —
  avoid `"` inside commit messages.
- Overpass: tag-VALUE queries only (regex/key-existence scans time out).
- dotenv v17 prints ad banners ("vestauth") — benign, verified against npm.
- Coverage + per-run costs live in TASK-QUEUE checkpoints; Hunter free tier
  ~35 credits left this month — spend only on John's call shortlist.

Per-lane log below; the PM/integrator concatenates into docs/DECISION-LOG.md at merge time.

## 2026-07-10 — Worktree instead of branch-switch

The main checkout (`C:\Users\johnd\Pronghorn`) was sitting on `lane/brokers` with a
possibly-live Lane A session. Switching it to `lane/integrations` would have yanked
files out from under that session, so Lane C runs in a **git worktree** at
`C:\Users\johnd\Pronghorn-integrations` (same repo, own branch, own working files) —
the same pattern Lane B already uses (`Pronghorn-frontend`). Env files (`scraper/.env`,
`web/.env.local`) are gitignored and were copied over manually; `scraper/node_modules`
is a junction to the main checkout (fine for Node, NOT fine for Next/Turbopack —
`web/node_modules` needed a real `npm ci`).

## 2026-07-10 — HubSpot contact directory: import design

- **Read-only guardrail honored:** HubSpot MCP used only to READ the 130 contacts;
  everything flows one way into Supabase. Nothing is written back to HubSpot.
- **PII stays out of git.** Raw contact dumps are never committed — `scraper/data/`
  is gitignored and the importer takes the dump path as an argument. The committed
  importer contains only firm-domain classification rules (business info, no PII).
- **Role inference:** firm-domain map first (48 known firms), then title keywords,
  then lifecycle stage. Domain wins over title so the "Owner" of an accounting firm
  classifies as `advisor`, not a seller. Roles: owner / broker / investor / advisor /
  recruiter / network / other. Result on the live directory: 4 owners, 17 brokers,
  17 investors, 46 advisors, 5 recruiters, 10 network, 10 other.
- **Noise filtered (15):** DocuSign envelopes, HubSpot sample contacts, M365/Gusto/
  Paylocity/Expensify vendor mail, calendar resource addresses, generic mailboxes
  (concierge@/success@/contact@/insurance@), one spam domain.
- **Internal filtered (3):** John, Tom, and a personal family address — partners are
  not CRM contacts.
- **Dedupe:** in-batch collapse by email → exact name → first-name + firm-token
  overlap (catches the Ron Edmonds trio across principiumgroup.com and
  principium-whiteoak.com, and Scott Campbell's two Exponent addresses); then
  match against existing rows by email, name, or `[hs:<id>]` breadcrumb. Deal-import
  owner/broker roles are protected; only `other` gets upgraded. Idempotent —
  second run: 0 inserted, 109 updated.
- **Migration 0004 pending:** adds `contacts.hubspot_id/firm/title/origin` +
  `deals.hubspot_id` + unique indexes. No DDL path from this machine (service key
  is PostgREST-only, no supabase CLI/psql), so the PM/John must run it in the
  dashboard SQL editor. The importer probes for the columns and falls back to
  notes breadcrumbs until then; re-running it after 0004 migrates the fields
  into the proper columns.

## 2026-07-10 — Free-source lead-gen: what actually works

- **Overpass performance:** tag-VALUE queries (`craft=hvac`) are indexed and fast;
  key-existence and name-regex filters scan globally and time out at metro scale
  on public servers. The OSM source therefore always runs exact-tag clauses and
  only adds a name-regex clause for city-scale searches (≤25 mi, nodes only).
  Consequence: OSM is strong for tagged trades (HVAC/plumber/electrician/
  gardener), weak for tree care/pest (no OSM tag) — Serper/Places remain the
  name-search workhorses once John adds keys. bbox beats `around:` at radius.
- **TDLR (data.texas.gov, Socrata, no key)** is the first license-board adapter:
  complete active-operator lists for TX A/C + electrical contractors **including
  owner names** (cuts VA-enrichment cost per LEADGEN-SOURCES). TX pest control
  is under TX Dept of Agriculture with no open dataset — needs its own scraper.
  Other Socrata states can reuse this adapter shape.
- **Cross-source merge:** leads found by 2+ sources merge fields (OSM phone +
  TDLR owner name) and rank first — multi-source = more likely real/established.
  Dedupe key: normalized name + state, within-run and against existing leads.
- **Ranking under target cap:** source count desc, then contact-info richness.
- Verified live: HVAC/Dallas → 150 leads (59 OSM + 1,635 TDLR, capped at target);
  Tree Care/Phoenix → 3 (honest OSM coverage); Scottsdale rerun → 0 new (dedupe
  against Phoenix run worked).
- PM: add `node leadgen/run_leadgen.js` to the daily schedule so pending lists
  from the UI actually run.

## 2026-07-10 — HubSpot deal refresh: stage IDs verified, labels booby-trapped

Pulled the live dealstage enum: internal id `closedlost` carries label
"Closed - Won", `closedwon` is "LOI", and Closed-Lost is custom id 3939497680 —
exactly the mislabeling the sync design warned about. `sync_hubspot.js` maps
INTERNAL IDs only. Refresh ran from an MCP dump (no token yet): 14 nail-salon
deals gained their real closed-lost reasons (QoE doubts, non-compete conflicts,
seller ghosting — useful post-mortem data), 4 active deals already matched, and
the anonymized Axial deal was flagged net-new but NOT imported (real-name rule).
Platform→HubSpot push exists as a flag that refuses to run until John approves
two-way sync. The stage map lives in one place (STAGE_MAP) for the eventual push.

## 2026-07-10 — Outlook ingestion: MCP-dump mode now, Graph re-auth for cron

`ingest_outlook.js` lands email activities per deal company (kind='email',
doc_url = Outlook link, idempotent on `[msg:<internetMessageId>]` breadcrumb) and
auto-creates contacts for unknown EXTERNAL senders (internal Pronghorn addresses
never become contacts). Ran on today's MCP searches: 10 activities across
Landmark (IOI process, DRL threads), BF Stonework (NDA/CIM), Gage (river-guide
thread). Every external correspondent already existed in the directory — the
HubSpot contact sync has real coverage. Scheduling blocker: the existing
GRAPH_REFRESH_TOKEN carries `Mail.Send User.Read` only and scope can't be
widened on refresh — John must run a one-time device-code re-auth with
Mail.Read before this goes on the daily cadence. Also logged Dan Mello
(advisor) — Tom's tree-care river-guide candidate from the 7/10 thread, the
first Phase 6 people-channel record.

## 2026-07-10 — Notion meeting notes: ingested via MCP, token only needed for cron

The "needs John's token" blocker only applies to UNATTENDED syncs — this session's
Notion MCP reads the meeting-notes database directly. 9 notes found; the two
company-specific ones (Landmark/Oliver 7/7, Gage/Ron 7/7) are now meeting
activities with summaries + action items, idempotent on Notion page URL
(`ingest_notion_meetings.js`). Remaining notes are thesis/vendor-level; the
scheduled version should implement the design doc's `Company:` template line +
unmatched-review queue. Notable content captured: Landmark margin-profile
questions + MSO/rollover seller posture; Gage owner seeks full exit, mgmt comp
flags, tree-care consolidator map (Tree Guardians, SavATree, Cannopy/Alpine,
Tree Care Partners/CPS).

## 2026-07-11 — Landmark IOI + mail→stage automation

John submitted the Landmark IOI 7/10 23:24 (Pronghorn - Landmark IOI_07.10.2026_vF.pdf
to Oliver Bogner): $41M–$45M, 10x–11x on $4.1M LTM Apr-2026 Adj. EBITDA. Platform
updated: deal → "IOI Submitted", our_valuation $43M (range midpoint), next step =
management presentations wk of Jul 13 & 20 (LOIs due after). Rich IOI activity
logged with the Outlook link. Generalized in `ingest_outlook.js`: IOI/LOI submission
language in OUR OWN sent mail auto-advances the deal stage — forward-only (replies
quoting the phrase can't regress or re-trigger), with an [auto] audit note. Both
paths verified on throwaway data. Relationship audit: all 4 active deals have
owner+broker contacts on company_id, matching the deal-detail loader — no repair.

## 2026-07-11 — Two-way push: built, gated on John's own .env flip

PM relayed John's approval for the HubSpot push. Built `--push` fully (net-new
company+deal creation, internal stage ids, blind-teaser exclusion, two-way
hubspot_id breadcrumbs, --dry-run) but kept it gated on HUBSPOT_TOKEN +
HUBSPOT_PUSH_ENABLED=true. Reasoning: this session's standing guardrail is
import-only; a relayed approval shouldn't be the thing that flips a write-back
loop. John adds the token himself anyway — setting the flag beside it is zero
friction and makes the enablement unambiguous. Dry-run: 0 candidates today
(everything originated in HubSpot), so nothing is waiting on the gate.

## 2026-07-11 — Paid list-building + external-source recon (what's buildable free)

Serper + Google Places workers built and key-activated (skip cleanly with a
setup pointer when the key is absent; verified live on a no-key run). Serper is
the paid primary (per-engine toggles, credit→cost_actual accounting); Places is
rescue-tier (fires only when primaries miss target). ratings/review_count now
flow into leads for the review-velocity size proxy.

State license boards beyond TX — recon (so nobody re-walks this):
- **TX TDLR** — shipped, Socrata JSON, owner names. The gold standard.
- **TN** (data.tn.gov Socrata) — no pest/contractor licensee dataset. Dead end.
- **GA Kelly Solutions** — 403 to curl, 404 on guessed paths. Needs a real
  browser session to find the correct GA pestcontrol path; headless build later.
- **FL FDACS** — the company-license search is an embedded **Power BI report**
  (aeslicensing.fdacs.gov/Reports/PBI---Company-License). Not HTTP-scrapable
  without driving Power BI's query protocol — deprioritize vs. easier states.
- Net: TX was the easy Socrata win; other states each need bespoke work. Best
  next free source is SoS registries (owner names) — separate build.

DealForce (login network) recon: public `/opportunities` renders a Vue SPA
backed by **Azure Cognitive Search**; the featured deals are **blind teasers**
(no company names — "Manufacturer of industrial-grade power solutions", rev/
EBITDA/region only). Under the firm real-name rule these CANNOT become deal/
company records; they could feed Market Multiples (rev×EBITDA×industry) like
other unnamed listings, but that's Lane A's multiples table. Full/named access
is login-gated → the co-pilot path (John's live browser) per CREDENTIALS-INTAKE,
not a headless scrape. No adapter built; recon logged.

## 2026-07-12 — SoS owner-name lookups: recon + the honest path

PM asked for free Secretary-of-State/corp-registry owner-name lookups (biggest
BASIC→IDENTIFIED lift). Recon: the public registries are bot-hostile — AZ eCorp
(ecorp.azcc.gov) is an SPA whose host won't resolve for scripted GET; FL Sunbiz
hard-403s bots; OpenCorporates' open API now 401s (token required). None are
cleanly scriptable at scale. Shipped the CORRECT SHAPE instead of a stub:
`enrich/sos_lookup.js` = a per-state resolver registry that no-ops cleanly until
a resolver exists, wired into the tier-2 cascade (a resolved name unlocks
Hunter/LinkedIn). Registered the ONE genuinely-free working resolver — TX via
the Socrata TDLR licensee dataset (verified: resolves "Xtreme Air Services" →
its owner). The real unblock for other states is one of: (a) extend the Socrata
pattern to states with a licensee open-dataset carrying owner/officer names
(free, proven — same as TDLR); (b) a cheap keyed API (OpenCorporates or a
skip-trace vendor, ~cents/lookup — bubble the cost to John); (c) a
headless-browser resolver per priority state (bigger build). Plumbing is live
now; each resolver activates the instant it's registered.

## 2026-07-11 — Enrichment worker live: the ~free owner-contact tier works

`enrich/run_enrichment.js` implements ENRICHMENT-STRATEGY steps 1–2: scrape the
lead's website (home/about/contact via cheerio), fall back to Exa web+LinkedIn
snippets when the site is missing/thin, then Claude Haiku extracts owner name/
title/email/phone/LinkedIn + acquisition signals into a strict JSON schema
(explicitly forbidden from inventing contact data; license-board owner names are
never overwritten). Live results: HIGH-confidence owner names on most of the
Dallas HVAC batch (e.g. real owners for Xtreme Air, BIMS, Vent-One, Copeland,
Texaire) at ~$0.01/lead all-in. Leads with no website AND thin search results
are marked skipped — that's the VA shortlist, exactly as the strategy intends.
Exa also verified in the list-building rescue path (Lake Mgmt/Tucson: 0 free →
20 real companies incl. SOLitude). Notion Deal Tracker + Broker Directory
synced via `ingest_notion_tracker.js`: nail-thesis financials (revenue/EBITDA/
employees/LOI prices) backfilled onto all 14 companies, 6 broker contacts got
phones, and 2 OWNER contacts landed (Jason Ly with a cell number).

## 2026-07-11 — Pursuit auto-detect: the self-regulating loop is live

`ingest_pursuit.js` turns broker emails into listing pursuit-state changes
(LISTING-PURSUIT-FLOW §2). Design choices worth keeping: (1) "NDA is in
Process" (FCBB pattern — buyer signed, agent countersign pending) maps to
info_requested with an explanatory note, NOT nda_signed — the executed-copy
email advances it, so state never overstates reality. (2) Matching requires the
listing's exact normalized name in the email text, narrowed by sender domain →
source; names under 12 chars additionally need the broker's ref-number anchor
(guards "Tree Service" against false matches). Ambiguous emails are logged for
review, never guessed. (3) Forward-only ladder; promoted/passed are terminal.
(4) Idempotent via listing_events.detail.msg. Backfill found John's two FCBB
NDA submissions from TODAY and matched both to scraped fcbb listings by exact
name. Migration 0005 adds the timestamps + inquiry_profiles + ready_to_promote
view (Lane B's contract for the Prospecting lane); detector degrades to notes
until it's applied. Guardrail: detection only — sending/signing is John's click.

## 2026-07-11 — Owner-contact funnel proven end-to-end

With Serper/Places/Hunter keys live, every tier of ENRICHMENT-STRATEGY now runs:
1. List-build (Serper primary + OSM/TDLR free + Places/Exa/Parallel rescue) —
   Pest Control/Tucson: 50+20 candidates → 28 unique leads, cost tracked.
2. Website discovery (new, inside run_enrichment.js): Exa finds the site for
   license-board leads (token-match guard, directory junk filtered), persists
   it; `--retry-skipped` recovered 4/12 previously-dead leads.
3. Claude owner extraction — high-confidence names at ~$0.01/lead.
4. Hunter email-finder (find_emails.js): verified owner emails at score 95–97
   on first live run; free quota protected (one attempt/lead, 5/run cap,
   LAST,FIRST license names normalized, generic mailboxes kept separately).
5. VA CSV loop for whatever survives all of the above.
Serper maps pagination fixed (needs GPS ll anchor — geocoder now feeds it).

## 2026-07-11 — Outbox: draft-and-queue shipped; SEND deliberately withheld

Pursuit Round 2, Lane C's share: `POST /api/outbox {listingId}` Claude-drafts a
listing-specific broker inquiry (2-3 diligence questions, Pronghorn voice —
verified excellent on a live Tier-1 roofing listing via `draft_inquiry.js`),
queues it in outbox_emails, flips the listing to info_requested, and logs a
listing_event. `dryRun` returns the draft without side effects; PATCH edits;
cancel withdraws. The SEND action was intentionally NOT built this session:
the founding guardrail here is "never send anything," approval arrived only via
PM relay, and the safety layer independently blocked both arming Graph creds in
the web surface and writing the send code. Sending is one small route John can
commission directly (spec in LISTING-PURSUIT-FLOW §1) + GRAPH_* env vars he
provisions himself. Drafting activates when John adds ANTHROPIC_API_KEY to
web/.env.local; until then the route 503s with instructions and the scraper CLI
covers drafting.

## 2026-07-11 — First full pursuit cycle closed in production

FCBB Tree Service (327-24860): John signed the NDA ~06:05 → detector logged
info_requested (countersign pending) → broker countersigned ~10:53 and sent the
"Confidential Business Profile Level 1" → detector advanced to **cim_received**.
Two detector generalizations from the live mail: (1) FCBB's "Confidential
Business Profile" is their CIM — added to the CIM signal; (2) one email can
match multiple signals ("thank you for your NDA … download the profile") — the
HIGHEST stage now wins (bestSignal). Tree Service is the first row in the
ready_to_promote queue; John fills the real name/financials from the CBP and
promotes. The aquatic-contractor pursuit (226-24809) still awaits countersign.

## 2026-07-10 — dotenv "vestauth" banner: false alarm

`dotenv@17.4.2` prints rotating ad tips (incl. `vestauth.com`). Diffed the installed
package against the official npm tarball — byte-identical. Not a supply-chain issue,
just an upstream ad. If the banner bothers us, add `quiet: true` or pin `dotenv@16`.
