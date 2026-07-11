# Dashboard & IA Vision — John's overnight directive (2026-07-11, ~eve)

Verbal guidance from John before logging off. This is END-STATE-GOAL context —
every lane should read it and bias its self-iterate work toward it. He returns
tomorrow morning (2026-07-12) to review decisions and give sharper feedback.

## 1. The dashboard (/) is not helpful today — make it VISUAL, not a listing

What John wants to see when he logs into a single dashboard:

- **Total pipeline, visually, across all industries** — where every opportunity
  sits at each stage. A funnel/kanban-density view, not a table.
- **Key actions I need to take** — anything that needs to be leveled up to John
  or Tom (decisions, approvals, NDA countersigns, queued emails awaiting
  one-click send, stale deals). Over time the dashboard should automate itself;
  the human-attention queue is the core surface.
- **Industry subsector visualization** — we operate across multiple green
  subsectors (landscape, tree care, pest, etc.) until we commit to one; show
  performance per subsector so that commitment decision is informed.
- **Deal funnel by industry** — e.g. per subsector: how many potential deals
  from the broker pipeline; how many proprietary targets fully enriched and
  ready for outreach (email or call). Broker vs proprietary split visible.

## 2. Sidebar / information architecture must reflect the TWO PRONGS

The two sourcing vectors are (a) scraping broker listings, (b) proprietary list
building → enrichment → cold outreach to owners. Structure:

1. **Overview layer (spans both prongs)**
   - Dashboard — everything at a high level
   - Market Multiples — across both brokered and proprietary
   - Screening Criteria — ONE consistent set across both funnels; sliding
     scales / refinement controls that both engines consume
2. **Two sourcing engines, side by side**
   - Broker Listings (+ scrape sources)
   - List Building → consider renaming to **"Proprietary Deal Flow"** (or
     "Proprietary Outreach"). Core: use the shared screening criteria to build
     lists of fitting companies per industry, enrich (company, financial or
     employee-count sizing, location, website, owner contact info)
3. **CRM** — everything enriched/engaged enough to log flows down into the CRM
   as companies/deals: brokered deals we're actively engaging with real info,
   and proprietary targets enriched enough to pursue.
4. **Outreach** — active pursuit: email campaigns + cold-call structures
   against what's in the CRM.

The flow reads top-to-bottom: criteria → two engines → CRM → outreach.

## 3. Standing instruction

Swing for the fences overnight. Keep iterating the site/builds/capabilities
toward the end state; when in doubt, ship improvements. Queue decisions needing
John in TASK-QUEUE "Decisions bubbled to John" — he'll clear them each morning
and we backtrack if a call was wrong. All sessions should run on Fable 5
(John re-selects it manually in each session if the app downgrades the model).

## Implementation mapping (PM, 2026-07-11)

- **PM (done in this pass):** Sidebar restructure per §2 — Overview / Broker
  Sourcing / Proprietary Sourcing / CRM / Outreach; "List Building" relabeled
  "Proprietary Deal Flow" (route unchanged at /list-building).
- **Lane B:** Dashboard v3 per §1 — see TASK-QUEUE Lane B (funnel-by-industry
  visual, key-actions widget, subsector cards). Unified criteria UX per §2.1.
- **Lane C:** aggregate data for the dashboard — funnel counts by
  stage × industry × prong (broker/proprietary), key-actions feed (NDA pending,
  queued emails, ready-to-promote, stale pursuits). Prefer SQL views the
  frontend can query directly.
