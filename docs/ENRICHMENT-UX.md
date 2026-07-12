# Enrichment UX — John's 7/11 ~23:40 feedback (THE most important flow)

John tried to use Proprietary Outreach + Enrichment and could not operate them.
Direct quote: "this is the most important part." Every lane prioritizes this.

## The intended operating flow (design contract)

1. **Build a list** (Proprietary Outreach tab)
   - Industry/service and Geography inputs get **typeahead**: as John types
     "pool serv…" suggest canonical industries ("Pool Services / Maintenance");
     as he types a city/metro/state, suggest real places. Select from
     suggestions, free text still allowed. Sources: a canonical industry
     taxonomy table (seed from our subsector map + license-board categories)
     and a static US city/metro/state list (no API needed).
2. **Free enrichment runs AUTOMATICALLY on every new list** — zero-cost pass:
   website URL capture, city/state fill from the source data (Serper/Places
   results already carry address — PERSIST it; today we throw location away,
   which is why John saw 66 tree companies with no location), license-board
   cross-reference, dedupe. Rule: if it doesn't burn paid credits, it runs
   without asking.
3. **Paid/full enrichment is explicit + selectable**: on a list detail or the
   Enrichment tab, John (or an agent) selects leads (checkboxes / whole list)
   → **"Enrich selected (est. $0.66)"** button with cost preview (~$0.01/lead)
   → POST /api/enrich queues an enrichment job → server-side runner processes
   it → statuses flip live (new → enriching → enriched). No CLI, no worker
   session required.
4. **Industry is VERIFIED, not inherited**: enrichment classifies what the
   company ACTUALLY does (website + snippets → Claude) into
   `leads.industry_verified` + confidence. A "Tree Musketeers Marketing LLC"
   on a tree-care list gets classified marketing and **flagged off-target**
   (filterable, excluded from list counts by default, one-click discard).
   The Enrichment tab's "list" column becomes an **Industry column**;
   list remains a filter, not the identity.
5. **Filters everywhere**: industry, state/metro, enrichment status, owner-
   found, email-found, off-target — on Enrichment, Leads, and list detail.
   (Shared table pattern already exists — extend it.)

## Implementation split
- **Lane C (backend):** (a) persist address/city/state from leadgen sources at
  ingest; (b) free-pass pipeline chained onto list build; (c)
  `enrichment_jobs` queue + POST /api/enrich (leadIds | listId) + a runner
  (worker loop now, GH Action when secrets land, Vercel route for small
  batches); (d) industry classification → industry_verified + off_target flag
  during enrichment (Haiku, ~free); (e) backfill industry_verified for
  existing enriched leads; (f) taxonomy table + /api/taxonomy for typeahead.
- **Lane B (frontend):** (a) typeahead inputs (industry + geography) on the
  list-build form; (b) checkbox selection + "Enrich selected ($est)" on
  Enrichment tab AND list detail; (c) Industry column replacing List column
  (list becomes filter); (d) off-target chip + filter + discard; (e) live
  status polling so John watches enrichment fill in.
- **PM:** Vercel env keys so API routes can enrich server-side; merges,
  deploys, and this doc.

## ROUND 2 — John's live feedback 7/12 ~12:15 ("close, but not there yet")

1. **ONE-CLICK CASCADING ENRICHMENT (Lane C, top — JOHN DECIDED 7/12 ~12:45,
   supersedes the two-click tier design):** ONE "Enrich" button runs the full
   cascade with early exit — Tier 1 (website + Exa + Claude extract); if
   owner name + email + phone + LinkedIn are complete, STOP; otherwise Tier 2
   fills only the gaps (Hunter email by name+domain, Exa LinkedIn hunt,
   phone hunting from site/GBP). Cost preview = "up to $X max" (worst case);
   actual spend is usually lower via early exit + fill-blanks-only. Track
   tiers-run in enrichment jsonb for the audit trail. Rationale: full-cascade
   worst case is ~5–15¢/company vs a ~$10k/yr data subscription — the two-
   click friction isn't worth the pennies saved. Re-clicking Enrich on an
   already-cascaded lead re-runs only still-empty fields.
2. **ROW CLICK → COMPANY PROFILE, not website (Lane B).** On the Enrichment
   tab, clicking a promoted lead (e.g., Hummingbird Tree Care) must open its
   CRM company profile (/companies/[id]) where the owner (Johnny Lopez)
   appears as a linked contact with whatever channels we hold. Website
   becomes a secondary ↗ icon. The company profile is the source of truth;
   the list is just the working surface.
3. **CONTACT-DOTS HONESTY BUG (Lane C data + Lane B display).** Sage Tree
   Care shows 1/3 owner-contact dots with NO owner name, and its CRM page
   shows no contact info. Two defects: (a) promotion only creates a contact
   row when owner_name exists — orphaned channels (e.g., a license-board
   phone with no name) vanish from the CRM view; surface them on the company
   profile as "owner phone (name unknown)" or create an Unknown-owner
   contact. (b) audit what fills owner_phone — if it's the COMPANY phone
   misattributed, stop counting it as an owner-contact dot. Dots must mean
   "usable owner channel," nothing less.
4. Acceptance test (John's own words): click a row → company profile →
   see the owner as a contact → see exactly which channels we have →
   "Enrich" escalates to fill the gaps at a previewed cost.

## Cost policy (John, verbatim intent)
Free sources: always, automatically, every list. Paid (~$0.01/lead incl. Exa
+ Haiku): only for selected lists/companies via the explicit button. Hunter
email lookups count as paid. Show the estimate before running.
