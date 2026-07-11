# Decision log — Lane C (CRM & Data / Integrations)

Per-lane log; the PM/integrator concatenates into docs/DECISION-LOG.md at merge time.

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

## 2026-07-10 — dotenv "vestauth" banner: false alarm

`dotenv@17.4.2` prints rotating ad tips (incl. `vestauth.com`). Diffed the installed
package against the official npm tarball — byte-identical. Not a supply-chain issue,
just an upstream ad. If the banner bothers us, add `quiet: true` or pin `dotenv@16`.
