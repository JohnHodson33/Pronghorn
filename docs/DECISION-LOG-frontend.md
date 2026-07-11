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

## Lane B session setup

- Lane B works in a git worktree (`C:\Users\johnd\Pronghorn-frontend`, branch
  `lane/frontend`) because the main checkout had `lane/brokers` checked out —
  switching branches under a live Lane A session would cross-contaminate
  commits. Same repo, isolated working tree; PM merges the branch as normal.
