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

## 2026-07-10 — dotenv "vestauth" banner: false alarm

`dotenv@17.4.2` prints rotating ad tips (incl. `vestauth.com`). Diffed the installed
package against the official npm tarball — byte-identical. Not a supply-chain issue,
just an upstream ad. If the banner bothers us, add `quiet: true` or pin `dotenv@16`.
