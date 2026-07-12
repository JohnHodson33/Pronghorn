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

## Lane B session setup

- Lane B works in a git worktree (`C:\Users\johnd\Pronghorn-frontend`, branch
  `lane/frontend`) because the main checkout had `lane/brokers` checked out —
  switching branches under a live Lane A session would cross-contaminate
  commits. Same repo, isolated working tree; PM merges the branch as normal.
