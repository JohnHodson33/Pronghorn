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

## Lane B session setup

- Lane B works in a git worktree (`C:\Users\johnd\Pronghorn-frontend`, branch
  `lane/frontend`) because the main checkout had `lane/brokers` checked out —
  switching branches under a live Lane A session would cross-contaminate
  commits. Same repo, isolated working tree; PM merges the branch as normal.
