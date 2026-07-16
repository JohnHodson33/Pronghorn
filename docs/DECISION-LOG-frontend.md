# Decision log — Lane B (Frontend/Tabs)

Per-lane log per PARALLEL-SESSIONS.md; the PM/integrator folds these into
DECISION-LOG.md and wires routes into Sidebar.tsx.

## 🔄 HANDOFF — successor #2 live 7/16 (loop running; 7/15 backlog)

- **7/15+7/16 directives**: (1) ✅ INLINE EDIT; (2) ✅ FILTER/SORT
  PERSISTENCE; (3) ✅ COMPANIES OVERHAUL; (4) ✅ RIVER GUIDES PAGE;
  (5) ✅ LeadsTable header parity; (6) ✅ ★SHORTLIST + TOO-BIG UI;
  (7) ✅ /improvements thread polish on real 0011; (8) ✅ RIVER GUIDES
  LIVE — Lane C's backend landed, page lit up with ZERO code change (433
  candidates: 106 Call now · 130 Enrich&assess · 14 Nurture · 183 Resolve
  name; band filter + URL sync verified on real data); 0015 APPLIED —
  stars verified persisting (star→read→unstar round-trip); (9) ✅
  PE-OWNED UI (this unit): PE badge w/ pe_owner tooltip + "Hide PE-owned"
  filter (?pe=hide) on Companies; hide-PE toggle + badge on Enrichment
  (sessionStorage); PE-owned chip on the company profile header.
  fetchCompanies reads the 0017 columns tolerantly AND backstops from
  lead enrichment.pe_owned — 14 companies + 9 leads flag TODAY, before
  Lane C's column backfill; (10) ✅ RIVER GUIDES migrated to John's 13:00
  **LIST-UX STANDARD** (first page): full-width, every column sortable
  via NEW shared `SortHeader` (numeric opens desc), categorical header
  dropdowns (industry/exit/status/state + NEW reachability filter on
  Contact — real counts 41 email · 24 LinkedIn · 388 none), toolbar
  slimmed to search + band chips + actions, all URL-synced; verified on
  the 433 live rows + mobile; (11) ✅ LISTINGS → the standard:
  industry/state/source selects retired into header dropdowns (multi-
  select, counts), NEW Status header filter, csv-string state keeps
  saved views AND ?industry= deep links back-compatible (verified: 17
  Tree Care of 847, same param shape); every column already sorted;
  full-width already. Also (item j) verify-worker EVIDENCE now shows in
  the exit-chip tooltip on river-guide rows; (12) ✅ CONTACTS → the
  standard: role/industry chip rows retired into Role + Company-industry
  header dropdowns (multi-select w/ counts), Name/Company SortHeaders,
  old singular URLs hydrate. River Guides item (b) rode along free —
  ?role=river_guide filters the 249 ingested guides via the Role
  dropdown. ALSO fixed real truncation: the contacts fetch capped at 500
  while the DB now has 654 (154 invisible) — raised to 2000. NEXT:
  standard migration — brokers → deals → enrichment (each its own
  commit); then River Guides item (c) (former-company line on company
  profiles) + contact-profile river-guide panel. NOTE for PM: the >4.5MB
  upload fix ALREADY SHIPPED 7/14 (363547f) — queue item stale.

## 2026-07-16 — ★Shortlist + Too-big tier UI (0015 backend, John 7/15)

- **StarButton** (compact = one-tap ★ on Companies rows, toggles John's
  star; full = John+Tom buttons w/ who/when on the profile header),
  optimistic w/ revert — verified the pre-0015 degrade: POST returns the
  apply-note, the star un-lights. fetchCompanies/fetchCompanyDetail join
  company_shortlist tolerantly (two-shape select / separate query).
- **★ Shortlist filter** (by John / by Tom, counts) in the Companies
  toolbar, `?star=` URL param; **shortlisted-first is the standing
  tiebreak** when no column sort is active (stable sort keeps today's
  order until stars exist).
- **Too-big tier**: violet chip color in all three tier maps + LeadsTable
  count init (was a NaN waiting for the first too_big lead); Size
  Estimation tab gains the editable "Too big: min EBITDA" boundary (seed
  $10M); size-model PATCH whitelist gains toobig_min_ebitda (Lane C's
  route missed it — flagged here for their awareness).
- Everything activates the moment John applies 0015; zero code change.
- **State facts**: migrations 0011–0014 APPLIED (threads, list progress,
  outreach rules, size assumptions all serve real data now — degrade
  paths retired naturally). Dev server = pronghorn-web-laneB, port 3311;
  new route dirs need `rm -rf .next/dev` + restart (bit again 7/16).
  Server components can't pass function props to client components —
  InlineField takes declarative `format="money"` instead.

## 2026-07-16 — River Guides page (John 7/16 ~00:50 top-of-lane)

- **New route `/river-guides`** (client page against Lane C's documented
  contract — archetype spec §4 field names verbatim, read from the LOCAL
  research folder per the privacy rule; nothing personal committed):
  band counts header (Call now / Enrich & assess / Nurture / Resolve name,
  spec ordering + screen_score desc default sort), search + Industry/
  Status/Exit/State FilterDropdowns (URL-synced via the shared hook),
  exit chips show ⚠ at-close vs ✓ verified w/ the no-outreach-until-✓
  tooltip, TBD names amber-flagged, contact dots, checkbox select →
  "Enrich selected" (fires POST /api/river-guides/enrich; honest note
  until Lane C's waterfall), **"Find more" discovery bar** (industry +
  consolidator → POST /api/river-guides/discover; honest note until the
  sweep endpoint exists), CSV export = the VA paid-tier handoff.
- **Degrade verified live**: API absent → amber banner ("lights up
  automatically when 0016 + ingest land"), zero counts, sweep/enrich
  return honest notes; mobile 375px clean. When Lane C ships GET
  /api/river-guides {guides:[...]}, the page is done — no code change.
- Items (b)/(c) — Contacts "River Guide" chip + profile panels — wait on
  the contact_id/company_id FKs actually populating (ingest step 2).
- **PM: wire "River Guides" into Sidebar** under Proprietary Sourcing.

## 2026-07-16 — Companies table filter/sort overhaul (John 7/15)

- **NEW `components/FilterDropdown.tsx`** — multi-select dropdown w/ counts,
  Clear action, outside-click close; `header` variant renders compact inside
  table `<th>`s (stopPropagation so header clicks don't collide).
- **CompaniesTable rebuilt**: industry chips → toolbar multi-select dropdown
  (options sorted by count: Tree Care 167 · HVAC 116…); Owner reach / Size /
  Deal stage become **header dropdown filters** (chips rows removed — the
  split lives in the dropdown counts now); **Revenue + EBITDA headers sort**
  (click: desc → asc → off; sort value = actual figure, else estimate
  midpoint, blanks always last). All state URL-synced; multi-values as csv
  (?industry=Tree+Care,HVAC) and OLD singular pinned URLs still hydrate.
- Verified live: 3-industry × 2-level filter = 87/557 w/ URL round-trip,
  EBITDA desc ordering correct, dropdown toggle updates rows+URL, mobile
  375px (no overflow, panel fits). Item (e) — same header pattern on
  Enrichment — is the next unit.

## 2026-07-16 — Filter/sort persistence on back-nav, all lists (John 7/15)

- **NEW `lib/use-url-filters.ts`** — the shared hook the 7/13 pattern note
  predicted: `useUrlFilterSync(serialize, hydrate, deps)` reads params once
  on mount (SSR-safe) and replaceStates on change. Wired into
  **ListingsTableV2 (incl. SORT: ?sort=cashFlow&dir=desc + full filter set
  — q/industry/state/source/tiers/CF-range/multiple/priority/relevant)**,
  **BrokersTable** (q/industry/state/min/contact), **DealsTable** (q/stage —
  ?stage= stays the pipeline deep-link param). Companies/Contacts already
  had inline param sync; Enrichment keeps its sessionStorage variant.
- Defaults are omitted from the URL (tier=all-four, sort=tier/asc, etc.) so
  clean pages keep clean URLs; every non-default view is pinnable.
- Verified the acceptance flow live: /listings filtered to Tree Care +
  tiers 1-2 + cashFlow desc → click into a listing → back → same 14-row
  filtered/sorted list; brokers + deals param round-trips confirmed.

## 2026-07-16 — INLINE EDIT EVERYWHERE (John 7/15 top directive)

- **`components/InlineField.tsx`** — reusable click-to-edit: click a value
  → input (16px font, no iOS zoom) → Enter/blur saves via PATCH
  `{[field]: value}`, Escape cancels; optimistic w/ revert+error on fail;
  empty renders as italic placeholder; ✎ affordance on hover.
- **Mounted on**: company profile (industry/city/state/website in header,
  revenue/EBITDA stat cards — click the ~estimate to type the real
  figure); listing detail (city/state + asking/cash-flow/revenue cards);
  deal detail (revenue/EBITDA → company PATCH, our-valuation → deal
  PATCH); enrichment LeadsTable Owner cell (owner_name + phone + email
  inline per row, ~145 rows).
- **API**: NEW `PATCH /api/listings/[id]` (city/state/industry +
  asking_price/cash_flow/gross_revenue, number validation); leads PATCH
  extended w/ owner_*/website/phone/city/state + **human-wins provenance**:
  each edit merges `{field: iso-ts}` into `enrichment.human_edited` so
  fill-blanks enrichment can skip human-entered values (Lane C: honor
  this key in the write paths). Companies/contacts/deals PATCHes already
  covered the needed fields.
- Verified end-to-end: API writes + provenance + validation (bad number
  400s), full UI round-trip (click → type → blur → PATCH → DB, then
  restored), mobile 375px clean (no overflow, fields tappable). Headless
  test note: programmatic .blur() doesn't emit focusout — real browsers do.

## 🔄 Previous handoff (7/13 ~17:45, retired)

- **State**: nothing in flight. Latest: improvements ATTACHMENTS shipped
  (UI + API, see 7/13 entry below) — browser-verified end-to-end, test
  artifacts removed from storage. Prior state (through 9cd3f33 dead-end
  sweep) merged to main and live.
- **7/13 ~22:30 — SIZE ESTIMATION TAB + TIER CHIPS/COLUMNS ON COMPANIES
  SHIPPED** (amendment 3 build on Lane C's size contract): (a) new
  `/size-estimation` page — editable tier boundaries + per-industry
  benchmarks table (PATCH /api/size-model; honest 0014 seed note) with a
  LIVE example row so the cascade is visible (verified: 12 Tree Care emp →
  Tuck-in, 60 → Platform). **PM: wire "Size Estimation" into Sidebar**
  (suggest under Proprietary Sourcing, beside Scrape Criteria). (b)
  /companies: Size filter chips w/ counts (live split: 10 Platform · 85
  Tuck-in · 7 Too small · 367 Unsized), tier chip column (tooltip = full
  derivation: employees ← basis → revenue → EBITDA + confidence), and
  Revenue/EBITDA columns fall back to ~range estimates when no actuals
  (actuals always win); `?tier=` URL param combinable with level/industry —
  `/companies?tier=platform&level=contactable` = 5 rows, verified live.
  fetchCompanies reuses the exact /api/companies join+math so surfaces
  can't drift.
- **7/13 ~22:50 — SIZE TIER CHIPS ON /enrichment SHIPPED** (same build,
  next surface): fetchEnrichmentOverview + fetchLeadList now compute `size`
  per lead from the SAME model/math, so a lead's tier here matches the
  company it becomes. LeadsTable: size filter-chip row (live 7 Platform ·
  25 Tuck-in · 7 Too small · 113 Unsized), Size chip column w/ derivation
  tooltip, tier in the CSV/VA-handoff export, filter persisted in the
  session-storage set. Verified live: Platform filter → 7 rows, all
  Platform. This covers "size-tier chips" on ALL three list surfaces
  (companies + enrichment + list-detail) — queue item complete.
- **7/13 ~21:45 — LEAD-CHANNEL PROVENANCE ON COMPANY PROFILE SHIPPED:**
  when the source lead holds an owner channel no contact carries (the
  promotion/sync gap Lane C is root-causing), the profile shows a sky strip
  above Contacts — "From enrichment — not yet on a contact: 📞 … (lead's
  owner: X) — the nightly sync folds these onto the contact" — instead of
  reading as blank. Read-only by design (the write path is Lane C's).
  Verified on a live gap company (4b09be03, orphan phone).
- **7/13 ~21:20 — NOTE-NEEDS-TAGGING KEY ACTION SHIPPED:** untagged sweep
  notes (kind='meeting', no targets, has doc_url — same criterion as
  /api/dashboard) now join Key Actions from fetchDashboardV3 directly (the
  0006 view predates the kind, so the lib queries activities itself).
  Interactive card: 🏷️ note title + "open note ↗" + Tag-it picker
  (/api/search) → NEW `PATCH /api/activities` sets the target → note
  leaves the queue on refresh. Verified with a marker row end-to-end
  (tagged to a company via the picker, PATCH landed, row deleted after).
  Also serves as the 'needs tagging' review surface (queue item f) until
  volume justifies a dedicated list page.
- **7/13 ~20:55 — PINNED VIEWS SHIPPED (card 5e13d986, John: "let's see
  what this looks like"):** 📌 Pinned row on the dashboard (chips = labeled
  filter-URLs, localStorage per device, ✕ to unpin; seeds: CONTACTABLE Tree
  Care · Enrichment · Outbox — all removable) + 📌 pin button on the
  Companies/Contacts toolbars (prompts for a label, captures current path +
  filter params). Verified round-trip live. Promote to a table later if
  John wants cross-device sync.
- **SIZE BUILD COMPLETE 7/13 eve (amendment 3 end-to-end):** Size
  Estimation tab (0fcf124) · companies tier chips+est columns (0fcf124) ·
  enrichment/list-detail tier chips (44e33a5). Also done this session:
  pinned views 4c2354c · note-tagging card c3bf3a7 · provenance strip
  a5b6833 · outreach rules ae622da · attachments 977fa21 · notes input
  db8bd1c · status_detail d4d1417.
- **7/14 — company+deal attachments shipped** (AAFE CIM card, lib/
  attachments-store.ts + AttachmentPanel; verified). Lane C owns the CIM
  ingest sweep into the same `deal-attachments` bucket.
- **REMAINING (blocked/waiting on others):** SIZE AMENDMENT 4 (payroll-% as
  THE input, flat 20% EBITDA margin, CPI-adjust) — the Size Estimation tab
  rebuild WAITS on Lane C restructuring size.ts/size-model/0014 (verified
  7/14: model still revenue-per-employee + margin band, NOT yet payroll-%).
  Approved cards needing Lane-C-first backends: company DEDUPE review queue
  (fuzzy-match + merge API), STALE-PURSUIT auto-nudge (drafter). 0011-0014
  application self-upgrades affected UI. Next self-iterate when polling is
  dry: dead-end sweep vs END-STATE GOAL.
- **7/13 ~19:45 — OUTREACH RULES SURFACE SHIPPED** (Lane C's 75f9a5e landed
  the backend; Lane B's half same evening): new `/api/outreach-rules`
  (GET/POST/PATCH/DELETE, degrades w/ honest note pre-0013) + rules editor
  on /outbox (taxonomy chips w/ ★ thesis-core, state chips, completeness
  floor, nightly cap; "zero rules = zero auto-drafts" state is explicit) +
  "why drafted" provenance line on outbox rows (draft_meta post-0013;
  outbox GET does the two-shape select fallback). Everything verified
  against the degrade path; saves go live the moment PM applies 0013.
- **Next**: unblocked queue is DRAINED (7/13 ~19:05). Blocked/waiting:
  size-tier chips (John's tier-math approval, card 37450f11) · 'needs
  tagging' review list (Lane C sweep leftover shape) · ?broker= contact
  filter data (Lane C broker_id backfill, flagged in TASK-QUEUE) ·
  0011/0012 application (thread API + list progress go live, no code
  change). Loop is on a ~25-min poll cadence: feedback → new TASK-QUEUE
  items → main updates. Sweep notes: sources health lives on /sources
  (V3 dashboard intentionally lean); Add-to-Contacts + /deals index +
  Passed handling were already shipped by predecessor.
  SHIPPED this session: attachments (977fa21) · meeting-notes input
  (db8bd1c) · status_detail rows (d4d1417) · [self-iterate] URL-param
  filtered views (fef296a) · [self-iterate] mic on Add-note + broker
  deep links (bccaa86). PM merged through fef296a → main (6efa365).
- **Session notes**: dev server = launch config `pronghorn-web-laneB` port
  3311 (killed the dead predecessor's orphaned process holding the port —
  two dev servers can't share this worktree's .next). Feedback polled 17:40:
  0 submitted, 0 reply_pending; the 2 approved cards are Lane A's.
- **Environment**: work in the git worktree `C:\Users\johnd\Pronghorn-frontend`
  (NEVER the main checkout — other lanes live there); dev server = launch
  config `pronghorn-web-laneB`, port 3311; copy web/.env.local if recreating.
- **Gotchas (bite in this order)**:
  · Migration 0011 is NOT applied — comments API + reply_pending are dormant;
    the /improvements threads run on the pseudo-thread fallback by design.
    0006 IS applied (dashboard views live). Verify columns before trusting
    any "shipped" API — route code existing ≠ table existing.
  · Turbopack: new route dirs need a dev-server restart (404 otherwise);
    never run `next build` while dev runs in this worktree (corrupts
    .next/dev/types → rm -rf .next/dev); any `@import url(...)` in
    globals.css must precede `@import "tailwindcss"`.
  · Tier-2 enrich rate: server prices it; do NOT reintroduce the old $0.11
    tooltip constant (PM hot-fixed once already).
  · Brand: the emerald token scale IS the brand palette now (globals.css
    @theme) — keep using emerald-* classes, they render brand greens.
  · Guardrails honored all session: no test writes to shared prod data (the
    permission classifier blocks them anyway), no live enrichment test-fires
    (~$14), nothing ever auto-sends (mailto/outbox = John's click).
  · PM session: local_b552862b-… ("Pronghorn PM loop"); two earlier PM
    sessions are dead — verify with list_sessions before messaging; one PM
    pointer previously named a nonexistent session id.
- All shipped work is browser-verified except paths requiring live paid runs
  or prod-data mutation; those verify on John's first real use.

## 2026-07-14 — Est. size on the deals index + company profile header (amendment 3 "every surface")

- Amendment 3(b) required est. Revenue/EBITDA + tier on EVERY company/deal
  surface; companies + enrichment shipped earlier, this adds the **deals
  index** (Size chip column w/ derivation tooltip + est-EBITDA fallback +
  size_tier/est in CSV) and the **company profile header** (tier chip beside
  the completeness chip; Revenue/EBITDA stat cards fall back to ~est ranges
  when no reported figure). fetchDeals + fetchCompanyDetail compute size via
  the same lead-join + model as the other surfaces (no drift).
- Verified live: deals index Size column (19 CRM deals correctly Unsized —
  they have real CIM financials, no source-lead signals); company profile —
  Tyger's Lawn & Tree (246 reviews, null revenue) shows "Too small" + est
  ~$95K–$950K rev / ~$11K–$190K EBITDA; a 5-review company correctly shows
  no chip. Sanity confirmed the null path (no lead signal = Unsized, blank).
- REMAINING amendment-3 surface: deal DETAIL financial cards (lowest value —
  deals there have actual CIM figures; small follow-up). Outreach views get
  it when those surfaces gain size sorting.

## 2026-07-14 — Attachment uploads bypass Vercel's 4.5MB cap (PM bug flag)

- **Bug (PM found live):** the 22MB AAFE CIM bounced off the new upload route
  with FUNCTION_PAYLOAD_TOO_LARGE — Vercel caps serverless request bodies at
  4.5MB, and my routes streamed the file THROUGH the function. Same latent
  defect on the feedback route (Tom's larger PPP spreadsheets).
- **Fix:** two-step signed-URL upload. The API route now mints a signed
  upload URL (`createSignedUploadUrl`, validating name/ext + ensuring the
  bucket) and the browser PUTs the file DIRECT to Supabase Storage — nothing
  large passes through Vercel. `signedUploadUrl()` in attachments-store.ts +
  `uploadViaSignedUrl()` client helper in Attachments.tsx; company/deal AND
  feedback routes converted; the bucket fileSizeLimit still enforces the max
  at the storage layer. Verified end-to-end incl. an 8MB (server) and 6MB
  (browser) file — both PUT 200 and list at full size; extension rejection
  intact on all three routes (test files removed).
- Pattern note: any future upload surface uses `uploadViaSignedUrl(endpoint)`
  against a route returning `{signedUrl, path}` — never stream a file body
  through a Vercel function again.

## 2026-07-14 — Company + deal document attachments (AAFE CIM card)

- **CIMs/NDAs/LOIs attach to their records** (John 7/13, AAFE CIM via Axial):
  new `GET/POST /api/companies/[id]/attachments` + `/api/deals/[id]/attachments`
  on a private `deal-attachments` bucket, prefixed `company/{id}/` and
  `deal/{id}/` so a company and its deal never collide. 25MB cap (CIMs run
  large), doc-oriented allowlist (pdf/docx/xlsx/pptx/images/zip).
- Shared `lib/attachments-store.ts` (list/upload/ensureBucket) — the feedback
  route was left untouched (verified path); this is the reusable half for
  record profiles. New `AttachmentPanel` in Attachments.tsx = endpoint-driven
  labeled document section (heading + count + 📎 Attach + download chips);
  mounted on the company profile ("Documents") and deal detail ("Deal
  documents"). Verified end-to-end: upload/list/signed-download/extension-
  reject on both routes + UI render (test files removed).
- **Turbopack gotcha bit again:** the two new route dirs 404'd after a plain
  restart — needed `rm -rf .next/dev` + restart (confirms the HANDOFF note).
- LANE C owns (b): the CIM/document ingest sweep from Outlook into this same
  bucket — the storage + UI half is ready for it to write into.

## 2026-07-13 — [self-iterate] Filtered views become URLs (contacts + companies)

- Noticed using the live site: every filter on /contacts and /companies
  lives in client state only — no filtered view is shareable, bookmarkable,
  or deep-linkable, which dead-ends cross-page links (the Broker Directory
  "in Contacts ✓" pill pointed at the UNFILTERED list). Shipped: filters ↔
  URL params on both tables (contacts: q/role/industry/email/phone/broker ·
  companies: q/industry/level/stage/deal) — read once on mount (SSR-safe),
  replaceState on change. John's acceptance query is now literally a URL:
  `/companies?industry=Tree Care&level=contactable` (verified: 26 rows).
- Broker page pill now deep-links `/contacts?broker=<id>` w/ a clearable
  "linked to broker record" chip. **Data gap found: 0 contacts carry
  broker_id** (flagged to Lane C in TASK-QUEUE — the pill has been falling
  back to "directory only" for every broker; the filter activates on
  backfill).
- Pattern note for future list pages: same ~20-line param sync; consider a
  shared hook if a third table needs it.

## 2026-07-13 — List-build honest status rows (Lane C contract, John's "queued · 0 found looks broken")

- Recent-lists rows on /list-building now render the served `status_detail`
  verbatim ("Queued — the runner picks this up within ~15 minutes" /
  "Running — serper 50…" / "91 leads found" / failure reason) beside a
  status-toned chip (queued zinc · running amber pulse · complete emerald ·
  failed red). Zero client derivation — the string is Lane C's.
- Page polls /api/lead-lists every 10s while any list is pending/running,
  stops when all settle. Build-success message now uses the POST's `note`
  (replaces the stale "runs once keys are connected" copy).
- Verified live on complete rows + 375px; queued/running strings come from
  the API paths Lane C verified — no test list queued against prod.

## 2026-07-13 — "+ Add note" meeting-notes input (John 7/13 ~10:20, item e)

- **Global header button** (layout.tsx, next to ActiveJobPill — available on
  every page incl. mobile): paste a Notion link OR note text → **new API
  `POST /api/notes/suggest`** matches companies/contacts/deals by name
  (deterministic + transparent: full-name = high, all-name-words = medium,
  with a reason per chip; generic names contained in a longer match are
  suppressed — "Tree Care" no longer rides along with "Sage Tree Care").
  Chips editable: ✕ remove, search-add via existing /api/search. Save writes
  one kind='meeting' activity per tagged record (verified live: Dan Mello
  exemplar note landed on contact 7b39286a + Sage Tree Care company; test
  rows removed).
- `/api/activities` extended to accept contactId/dealId targets (schema
  already had the columns; company-latest-deal auto-attach unchanged).
- **Notion fetch**: works when NOTION_TOKEN is in the WEB env; without it
  the panel says exactly that and asks for pasted text (link still saves as
  doc_url). **PM: add NOTION_TOKEN to web/.env.local + Vercel env** when
  convenient — Lane C already holds the token for the sweep.
- **Bug found + fixed in the same unit:** the header bar's `backdrop-blur`
  creates a CSS containing block that traps `fixed` overlays inside the
  50px bar — the panel now portals to document.body. Any future modal
  launched from the header needs the same portal.
- Claude-confidence matching stays with Lane C's sweep (b); this UI is the
  interactive two-click path. Item (f) 'needs tagging' review list waits on
  the sweep's leftover shape.
- Mobile: bottom-sheet at <640px (verified 375px), centered 512px dialog on
  desktop (verified 1280px).

## 2026-07-13 — Improvements attachments (John 7/13 ~10:40, Tom's PPP analyses)

- **New API route `/api/feedback/[id]/attachments`** (GET list w/ 1h signed
  URLs · POST multipart upload, 15MB cap, extension allowlist incl. xlsx/csv/
  pdf + iPhone image formats). Storage design: files live in private bucket
  `feedback-attachments` under `{feedbackId}/{ts}_{name}` — the prefix listing
  IS the metadata, so **no migration needed** and nothing new for John's SQL
  list. Bucket auto-creates on first upload (verified live; test files
  removed after).
- **LANE C NOTE:** this covers the storage+endpoint half of your queue item
  (a) — no feedback_attachments table required. Still yours: PPP size-signal
  import (b).
- **UI:** `components/Attachments.tsx` — chips w/ download links + 📎 attach
  in every thread (FeedbackThread), staged-files picker on the submit form
  (uploads after POST returns the id; upload failure surfaces honestly).
  Mobile-verified at 375px (no overflow, chips wrap).
- Attachments attach to the CARD (not individual comments) — matches the
  storage-prefix design and Tom's use case; revisit only if per-comment
  provenance ever matters.

## 2026-07-10 — Deal detail page (`/deals/[id]`)

- **New route: `/deals/[id]`** — deal working view: stage dropdown (live PATCH),
  next-step editor with due date, closed-lost reason (shown when stage =
  Closed), financial cards (revenue / EBITDA / asking with implied multiple /
  our valuation), source-listing link, broker + owner contacts, activity feed
  (reuses ActivityForm; posts attach to the company AND its latest deal).
- **PM to wire (files Lane B doesn't own):**
  1. `Sidebar.tsx` — no new nav item needed (detail page, not a tab), but
     pipeline cards in `app/pipeline/page.tsx` should wrap each card in
     `<Link href={`/deals/${d.id}`}>` so the board opens the detail view.
  2. `app/companies/[id]/page.tsx` — the stage chip (deal) could link to
     `/deals/${deal.id}`.
- **New API route: `PATCH /api/deals/[id]`** — whitelisted fields: `stage`
  (validated against STAGES), `nextStep`, `nextStepDue`, `closedLostReason`,
  `ourValuation`. Sets `updated_at`. (TASK-QUEUE gives Lane C `web/app/api/*`
  "for data"; this route is UI-serving and only touched by the new page — no
  file conflict, flagging for awareness.)
- Chose `/deals/[id]` over `/pipeline/[id]`: pipeline is a view of deals, and
  deal URLs shouldn't imply board position. `deals/` is a NEW dir (Lane B owns).
## 2026-07-10 — Enrichment tab (`/enrichment`)

- **New route: `/enrichment`** — leads funnel between List Building and
  outreach. Status cards (new → enriching → enriched → in_sequence →
  contacted → responded, dead) that filter the table; per-lead row shows
  source tags + BBB grade, owner-contact completeness dots (phone/email/
  LinkedIn — the VA step), and AI-signal chips read from `leads.enrichment`
  jsonb (overview, PE-backed). Read-only scaffold: statuses advance once the
  enrichment worker (Lane C) lands.
- **PM to wire:** Sidebar "Enrichment (soon)" placeholder → live link to
  `/enrichment`.

## 2026-07-10 — Outreach Library tab (`/outreach`)

- **New route: `/outreach`** — sequence editor (multi-step emails with delay
  days), variable chips ({{first_name}}, {{company}}, {{city}}, {{industry}},
  {{personalized_line}}, {{sender_name}}), live preview with a sample enriched
  lead, seeded "Owner cold outreach v1" 3-email starter sequence.
- **Scaffold decisions:** sequences persist to localStorage only — there is no
  outreach table in the schema and migrations aren't Lane B's. **PM/Lane C:
  add `outreach_sequences` table** (id, name, steps jsonb, updated_at) + a
  /api/outreach route; the page's storage layer is isolated so the swap is
  small. Export button present but disabled — needs a reply.io (or similar)
  account + API key → **add to John's bubbled decisions**.
- **PM to wire:** Sidebar "Outreach Library (soon)" → `/outreach`.

## 2026-07-10 — Cold Calling tab (`/cold-calling`)

- **New route: `/cold-calling`** — one-screen call block: dialable-lead list
  (any phone on record, not dead), selected company's info/signals/tel: link,
  and the script auto-filled with that company's real data (falls back to a
  review-count personalized line when AI enrichment hasn't run). Script edits
  persist to localStorage.
- **Next build (not in scaffold):** call-outcome logging (→ lead status +
  activities) and reply.io call-task sync; **John decision:** Nooks parallel
  dialer.
- **PM to wire:** Sidebar "Cold Calling (soon)" → `/cold-calling`.

## 2026-07-10 — Listings CSV export + saved views (`ListingsTableV2.tsx`)

- **New component: `components/ListingsTableV2.tsx`** — the existing
  ListingsTable plus (a) **Export CSV** of exactly the filtered+sorted rows
  (client-side Blob, filename includes date + active view name; columns incl.
  margin %, implied multiple, tier reasoning) and (b) **saved filter views**
  (name → full filter/sort state, localStorage, chips above the filter bar).
- Filters live in the table component's client state, and Lane B can't edit
  the existing ListingsTable.tsx — so this is a superseding copy. **PM: in
  `app/listings/page.tsx` change the import to
  `@/components/ListingsTableV2`, then delete `ListingsTable.tsx`.**
  Verified against live data (443 rows; view-filtered export = 66-line CSV).

## 2026-07-10 — Dashboard v2 (`/dashboard-v2`)

- **New route: `/dashboard-v2`** — everything live, replacing the mock-data
  dashboard: newest Tier-1 feed (cash flow, ask + implied multiple, outbound
  links), per-source health table (status dot from last_run_status, last run,
  dedup-filtered totals, +7d), market-multiples snapshot (top thesis verticals
  from lib/analytics medians), next-steps-due list (overdue in red), pipeline-
  by-stage chart driven by live deals.
- **PM to wire:** promote to `/` by replacing `app/page.tsx` body with this
  page (or re-export), then delete the temp `/dashboard-v2` route. All loaders
  live in the new `lib/dashboard.ts`.
- Count hygiene: all listing counts exclude `duplicate_of` mirrors so totals
  and +7d agree (the old listingStats didn't; BizQuest showed 119 vs +1597).

## 2026-07-10 — Company detail v2 (`components/CompanyDetailV2.tsx`)

- **New server component `CompanyDetailV2`** (+ `lib/company-detail.ts`)
  upgrading the company profile with the three queue items: contacts section
  (role badges, mailto/LinkedIn), listing history (origin + identity-linked
  listings, live/delisted chips, seen-range, listing_events timeline), and a
  market-multiple check (deal asking ÷ EBITDA vs industry median + matching
  size band, priced-rich/at-market chip). Stage chip now links to /deals/[id].
- **PM swap:** `app/companies/[id]/page.tsx` body becomes
  `return <CompanyDetailV2 id={id} />` (imports: the component + notFound
  handling stays inside it). Existing page untouched by Lane B.
- Dev note: Turbopack on this Windows worktree did NOT hot-register a new
  route dir created while `next dev` ran — restart the dev server if a brand-
  new route 404s.

## 2026-07-11 — 🔥 John's live CRM feedback (PM-directed, existing files edited)

Per PM directive, Lane B now edits the existing pipeline/companies pages
(ownership delegated for these items):

- **Pipeline** (`app/pipeline/page.tsx`, `lib/crm.ts`): every card is a
  `<Link>` to `/deals/[id]` (hover ring); fetchDeals resolves the broker —
  company contact with role=broker first, origin-listing broker fallback —
  so cards show "Broker · name".
- **Companies tab** (`app/companies/page.tsx` + new
  `components/CompaniesTable.tsx`): Industry is its own column (chip style),
  search bar, industry filter chips (Nail Salon / Tree Care / …), stage
  dropdown + has-deal toggle, whole row navigates to the profile.
- **Company profile editable** (`app/companies/[id]/page.tsx` swapped to
  `CompanyDetailV2`): new `components/CompanyEditor.tsx` (name/industry/
  location/website/revenue/EBITDA/basis) → new `PATCH /api/companies/[id]`
  (whitelisted; name cannot be blanked — no-blind-teaser rule); DealControls
  embedded so John can move stages from the profile. Deal detail already
  shows company + broker + owner + notes with links (verified live —
  Landmark reads IOI Submitted from Lane C's Outlook ingest).

## 2026-07-11 — Pending PM swaps executed by Lane B

Since the PM delegated existing-file edits for the feedback round, Lane B
also executed the two swaps previously flagged as PM actions:
- `app/listings/page.tsx` now imports `ListingsTableV2`; old
  `ListingsTable.tsx` deleted.
- Dashboard v2 promoted to `/` (`app/page.tsx`); temp `/dashboard-v2` route
  deleted. Sidebar needs no change.

## 2026-07-11 — Refill wave 2: listing detail, global search, contacts, unified lists

- **`/listings/[id]`** — in-app listing detail: financials + implied multiple,
  Claude screener tier + reasoning, price/event timeline (listing_events),
  broker card, promote-to-CRM (existing /api/promote; real-name rule; shows
  CRM link if already promoted). Listing names in the table open it; the
  broker-site link is a small "source ↗" anchor.
- **Global search** — `/api/search` (grouped ilike over deals/companies/
  contacts/listings) + GlobalSearch top bar in `layout.tsx` (⌘K, debounced
  dropdown, Enter = first hit). Layout now gives `main` the scroll so the
  pipeline board fits (pipeline h-screen → h-full). NOTE: layout.tsx edited
  (only Sidebar.tsx is reserved); flag if PM wants it back.
- **Editable contacts** — ContactsSection on company profile + deal detail;
  POST `/api/contacts`, PATCH `/api/contacts/[id]` (role whitelist; falls back
  gracefully when migration 0004's firm/title columns aren't applied). Deal
  attach derives via company; contact↔deal join table = Lane C call if wanted.
- **Unified list pattern (John's callout)** — shared `lib/csv.ts`;
  BrokersTable (search, industry/state/min-listings/has-contact filters, CSV),
  ContactsTable (search, role chips, has-email/phone, row → company, CSV),
  LeadsTable on Enrichment (search + CSV = the VA handoff file), CSV added to
  CompaniesTable. Every list page — Listings, Companies, Contacts, Brokers,
  Leads — is now searchable + filterable + exportable.

## 2026-07-11 — Mobile pass + shared market check

- **Mobile-responsive pass**: new `MobileNav` drawer that *reuses* the
  untouched Sidebar component (hamburger < md, overlay drawer, closes on
  navigation); desktop sidebar hidden on small screens via a layout wrapper;
  page padding `p-4 md:p-8` everywhere. Verified at 375px — no horizontal
  overflow; tables scroll in their containers.
- **Market-check widget shared**: `lib/market-check.ts` +
  `components/MarketCheckCard.tsx`; now on BOTH deal detail and company
  profile ("asking 4.6× vs market median 2.8× → priced above market", with
  size-band median). Company-detail loader refactored onto the shared helper.

## 2026-07-11 — 🔥🔥 Listing pursuit flow (LISTING-PURSUIT-FLOW.md)

- **PursuitPanel on listing detail** — status stepper (new → interested →
  info_requested → nda_signed → cim_received → passed; doc's enum, coordinated
  with Lane C), "Request info" primary action, and the pre-drafted inquiry:
  broker-email case = merge-fielded draft with a **mailto: one-click** ("opens
  in YOUR mail app — you click send"; nothing ever auto-sends) + copy button;
  no-email case = co-pilot mode (open inquiry page ↗ + copy contact block).
  Reusable **inquiry profile** editor (name/phone/email/default note) —
  persists to `inquiry_profiles` when Lane C's migration lands, localStorage
  until then (`/api/inquiry-profile` reports `missing: true` pre-migration).
- **`POST /api/listings/[id]/pursue`** — validates against the pursuit enum,
  upserts listing_reviews.status, stamps requested_at / nda_signed_at /
  cim_received_at when those columns exist (graceful pre-migration), and logs
  a listing_events row (pursuit history survives into the CRM).
- **Pipeline "Prospecting" lane** — leftmost dashed amber column showing
  listings in info_requested / nda_signed / cim_received with status chips +
  broker; cards link to `/listings/[id]`. Empty state prompts "Request info".
- **Promote pre-fill** — PromoteForm shows everything carried from the listing
  (industry/geo/ask/rev/CF/broker) + post-NDA blanks: real name (required),
  true revenue/EBITDA, owner name/email/phone. `/api/promote` extended: real
  financials override listing numbers, owner becomes a role=owner contact,
  and the founding activity embeds the pursuit-history timeline.
  **NOTE for Lane C:** promote now writes `listing_reviews.status='promoted'`
  (doc enum) instead of legacy `pushed_to_crm` — migration should treat both.
- Listings table now shows REAL review statuses (joined listing_reviews;
  was hardcoded "new").

## 2026-07-11 (overnight) — Dashboard V3 command center + 0005 alignment

- **`/` rebuilt per DASHBOARD-VISION.md §1** (lib/dashboard-v3.ts): (a) **Key
  Actions** human-attention queue on top — ready-to-promote (cim_received),
  NDA states (distinguishes "broker countersign pending" [watch] from "your
  signature needed" [urgent]), drafted inquiries awaiting John's one-click
  send, stale pursuits >7d, overdue next steps — verified live with John's two
  real FCBB NDA pursuits from Lane C's Outlook backfill; (b) **total-pipeline
  funnel** — prospecting states (amber) flowing into deal stages (green),
  bar-chart style; (c) **subsector matrix** — per green subsector: thesis-fit
  broker listings vs proprietary targets, with the outreach-ready fraction as
  a darker overlay (the "commit to one vertical" picture). Interim aggregates
  from tables; swap to Lane C's views/api when they land.
- v2 dashboard widgets displaced (Tier-1 feed, source health, multiples
  snapshot, stage chart): loaders remain in lib/dashboard.ts — resurrect onto
  /sources or /analytics if John misses them.
- **/api/inquiry-profile aligned to migration 0005** (uuid pk, `default_note`
  column, first-row singleton). Pre-migration behavior unchanged
  (localStorage fallback). **PM: apply 0005 + 0004 in the SQL editor** — the
  dashboard's stale-pursuit detection and shared inquiry profile need them.
- Round-2 dependencies for Lane C: one-click Outlook SEND api + Claude
  per-listing draft api — Lane B surfaces (Key Actions rows, PursuitPanel)
  are ready to consume them; today the send path is the mailto draft.

## 2026-07-12 — Outbox integration (pursuit round 2 hooks)

- **"Request info" now drafts-first**: PursuitPanel POSTs `/api/outbox`
  (Lane C's Claude-drafted inquiry → queued for John's one-click send; the
  route flips status itself). Falls back to the plain status flip + mailto/
  co-pilot surface when drafting isn't available (no broker email 422, no
  API key/migration 503). Queued drafts show on the listing page with a
  "Review & send in Outbox →" banner (listing-detail loader reads
  outbox_emails, tolerant pre-0006).
- **Dashboard Key Actions** now include queued outbox drafts ("Inquiry
  awaiting your send… one click in the Outbox", urgent) linking to /outbox.
- Still open from round 2: co-pilot browser-prefill for form-based sources
  (needs John's own machine/Chrome), NDA-required-source pre-flagging (needs
  per-source metadata — Lane A/C).

## 2026-07-12 — Passed stage + /deals index (John's 11:45 feedback)

- **Pass action** (DealControls, on deal detail + company profile): "Pass on
  deal" → reason input → PATCH stage="Passed" (reuses closed_lost_reason).
  Passed is a real stage but NOT a board column — the pipeline filters it
  out; a Passed banner shows on the deal with the reason, and re-activating
  = picking any stage from the dropdown. PATCH whitelist now STAGES+Passed.
- **/deals index** — shared list pattern across ALL deals incl. Passed:
  search (company/owner/broker/reason), data-driven stage chips w/ counts,
  CSV export, rows → /deals/[id]; Passed rows dimmed with inline reason.
  Deep-linkable via /deals?stage=Passed (pipeline's "Passed deals: N →"
  points there). Owner column = role=owner/seller contact via fetchDeals
  (which now also carries our_valuation, fit_score, pass reason).
- **PM:** wire "Deals" into Sidebar (CRM section, above Companies). The 14
  nail-salon deals show under "Closed" until Lane C's data fix moves them to
  Passed — the chips are data-driven, so no UI change needed when that runs.

## 2026-07-12 — 🔥🔥 Enrichment UX (ENRICHMENT-UX.md contract, all 5 Lane B items)

- **LeadsTable rebuilt** (shared by Enrichment tab + list detail, so both
  surfaces got everything at once): row checkboxes + select-all-visible →
  **"Enrich selected (est. $X)"** ($0.01/lead) → POST `/api/enrich`
  {leadIds}; degrades with a clear notice + selection kept until Lane C's
  endpoint lands (verified). **Verified Industry column** replaces List
  (industry_verified when present, list-inherited shown with "?" and grey
  until verified; list is now a filter). **Off-target** chip + toggle filter
  (hidden by default per contract) + discard (new PATCH `/api/leads/[id]`,
  status→dead, no deletes). **Filters**: search, industry, state, list,
  owner-found, email-found. **Add to Companies** per outreach-ready row via
  Lane C's live `/api/leads/promote` (→ company page); promoted rows show
  "in CRM →". **Live updates**: polls every 5s while any lead is enriching.
- **Typeahead** on the list-build form: industry suggests from
  `/api/taxonomy` (Lane C) with a static 26-trade fallback; geography from a
  static Sun-Belt-first metro/state list (lib/geo-suggest.ts). Arrow keys +
  Enter or click; free text allowed. Verified: "phoe" → "Phoenix, AZ" picks.
- All new-column selects (industry_verified/off_target) use the tolerant
  retry pattern until Lane C's classification migration lands.

## 2026-07-12 — Contacts↔Brokers rationalization + taxonomy alignment

- **Broker Directory reframe**: /brokers retitled with the explainer John
  asked for (directory = scraped universe, Contacts = curated relationships);
  per-row **"+ Contacts"** promotes a broker into the CRM via new idempotent
  `POST /api/brokers/[id]/add-to-contacts` (role=broker, broker_id link,
  firm/origin when 0004 is applied); promoted rows show "in Contacts ✓".
- **`/brokers/[id]` detail page**: reachability, specialties, and every
  listing they represent (live/delisted, tier, multiple) linking into
  /listings/[id]. Broker names in the directory table link here.
- **Contacts**: broker-linked rows show "directory →" back to their
  /brokers/[id] record. Note: the 18 HubSpot-imported broker contacts carry
  no broker_id yet — they'll get the directory link when Lane C's
  relationship repair matches them.
- **Taxonomy typeahead aligned to Lane C's real /api/taxonomy**: it returns
  {industries:[{label, aliases,…}]} and ignores ?q= — the client now fetches
  once and filters labels+aliases locally ("exterminator" finds Pest
  Control); static fallback kept.

## 2026-07-12 — Key-status honesty + outreach tracker surface

- **List-building key badges**: new `GET /api/leadgen-keys` (boolean presence
  per credential — process.env + scraper/.env fallback in dev, values never
  exposed); source cards show server-checked "connected ✓"/"key missing";
  footer names exactly the missing keys (live: only PARALLEL_API_KEY).
- **Outreach tracker** mounted on /outreach above the sequence library —
  Lane C's /api/outreach-tracks (0007): per-company state chips
  (not_started → contacted → replied → meeting → nurture → dead) with
  inline state change + next-follow-up date (overdue = red), owner
  reachability, links to the company. TRACKING ONLY — no sending anywhere,
  per OUTREACH-STRATEGY.md "no site build until John + Tom finalize".

## 2026-07-12 — Unified Screening Criteria UX (DASHBOARD-VISION §2.1)

- **Criteria page upgraded**: dual-thumb log-scale sliders for cash-flow and
  asking-price ranges (synced with the numeric inputs), **subsector toggle
  chips** driven by /api/taxonomy — toggling writes the canonical label +
  aliases into industry_keywords_include (hand-typed keywords untouched;
  toggle state derives from the live keyword list — verified: all six
  green-industry subsectors read back ✓ from the default profile), and a
  clickable US-state grid for priority states.
- **Both funnels visibly consume one set**: new CriteriaStrip on the
  list-building form shows the profile's active subsectors + priority states
  + cash-flow band; clicking a chip fills the industry/geography fields
  (verified: Pest Control → industry field). The scraper side already reads
  screen_profiles every run — unchanged.
- Schema untouched: keywords remain the source of truth, so the pipeline
  needs no migration.

## 2026-07-12 (eve) — 🔥🔥🔥 Completeness levels + progress visibility + round-2 UI

- **Completeness is the demarcation** (lib/completeness.ts, Lane C's single
  source of truth): every lead shows its level chip (● full ◕ contactable
  ◑ identified ◔ basic ○ raw); counts header doubles as the filter
  ("183 leads: ●27 ◕31 ◑8 ◔117 ○0" — live values); default sort =
  most-complete-first so results float up after a run.
- **Tier-aware Enrich**: selection changes debounce a POST /api/enrich
  estimateOnly → button reads "Enrich 156 (t1×32 + t2×124) — est. $13.96"
  (live-verified); fully-enriched selections say so and disable (verified).
- **Progress visibility**: queuing shows a sticky banner with a progress bar
  polling GET /api/enrich?job= every 4s ("Enriching 34/80 — N owners, M
  emails…"), honest "queued — runner picks this up within ~15 min" after
  60s, and a completion summary with a "View results" reset. Global ⚙ pill
  in the top bar (ActiveJobPill, 15s poll) visible from any page. NOTE: did
  NOT queue a live job to test (≈$14 paid run — cost guardrail); polling
  paths mirror verified patterns.
- **Round-2 UI**: promoted lead rows click through to the company profile
  (website demoted to a ↗ icon); channel dots = usable owner channels only;
  cascade tiers explained in the button tooltip + footer.

## 2026-07-13 — 🔥🔥🔥 Nav fix + completeness across the CRM (+ dev 500 hotfix)

- **NAV FIX (acceptance verified end-to-end)**: enrichment rows push
  `?from=enrichment`; company profile's back control is a new BackLink that
  router.back()s to WHERE JOHN CAME FROM ("← Back to enrichment"), falling
  back to /companies when opened cold. LeadsTable filters persist in
  sessionStorage so the round trip keeps them (verified: filter to ● full →
  open Titan Tree Care → back → same filtered list, ring intact). The
  duplicate "in CRM →" click target on enrichment rows is now a plain ✓ —
  the row itself is the single target.
- **COMPLETENESS ACROSS THE CRM**: /companies gains an "Owner reach" column
  (level chip + channel dots) + level filter chips with counts, combinable
  with industry — John's stated query verified live: ◕ contactable × Tree
  Care → 26 of 328. Company profile header shows its level chip. Derivation:
  new lib/company-level.ts (owner/seller contacts → lib/completeness scale,
  best level wins) — swaps to Lane C's server-side level when it lands.
- **HOTFIX: dev 500 on every page** — the brand pass's Google-Fonts @import
  sat AFTER `@import "tailwindcss"`; PostCSS inlines tailwind's rules, making
  the fonts import illegal (hard error in Turbopack dev, tolerated in prod
  build). Hoisted the fonts import above the tailwind import in globals.css.
- Did NOT reintroduce the $0.11 tier-2 tooltip (PM hot-fixed rate honored).

## 2026-07-13 — 🔥🔥🔥 Improvements dialogue (John's approve-with-eyes-open ask)

- **FeedbackThread** on every suggestion AND submitted-feedback card
  (💬 Open thread): comments render as a conversation — humans neutral,
  agents 🤖 purple, status changes italic, build plans sky-bordered,
  completion summaries green-bordered "what was actually done". Reply
  composer (John/Tom picker + dictation mic) posts to Lane C's
  `/api/feedback/[id]/comments` when live (it is — verified consuming a real
  dated agent revision) and falls back to the body-append "— X adds:" PATCH
  when not; the pseudo-thread parser renders legacy appended segments as
  dialogue either way. "⏳ agent reply pending" badge when a human spoke
  last. **"✓ Approve latest spec"** names exactly which revision it approves
  ("approves the 7/12 11:41 PM agent revision — that reply is the build
  contract"); plain Approve is gone.
- Verified live: 11 threads, composer + revision caption + styled agent
  bubbles. Did NOT post test replies into John's real threads.

## Lane B session setup

- Lane B works in a git worktree (`C:\Users\johnd\Pronghorn-frontend`, branch
  `lane/frontend`) because the main checkout had `lane/brokers` checked out —
  switching branches under a live Lane A session would cross-contaminate
  commits. Same repo, isolated working tree; PM merges the branch as normal.
