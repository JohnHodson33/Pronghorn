# Decision log — Lane B (Frontend/Tabs)

Per-lane log per PARALLEL-SESSIONS.md; the PM/integrator folds these into
DECISION-LOG.md and wires routes into Sidebar.tsx.

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
