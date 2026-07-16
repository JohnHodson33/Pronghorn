# River Guides — integration architecture (PM decision, 7/16 ~01:00)

**The third sourcing channel.** Exited operators (sold to a consolidator) recruited
as deal advisors / board members for EQUITY (never fees). They diligence deals,
open proprietary deal flow, and lend credibility. John's directive 7/16 ~00:50;
seed research is DONE (433 candidates, 6 industries, scored + banded).

**Source materials (LOCAL ONLY — see privacy rule below):**
`C:\Users\johnd\CRM Set up\river-guides\` →
`RIVER-GUIDES-HANDOFF.md` (context + 10 nuances) ·
`River-Guide-Archetype-Profiles.md` (canonical spec: schema §4, scoring §3,
lifecycle state machine, consolidator maps) ·
`river-guides-seed-all.csv` (433 rows, source of truth).

**🔒 PRIVACY RULE (PM, hard):** the repo is PUBLIC. The seed CSV and research
docs contain named private individuals with scores — **never commit them, or any
extract of them, to the repo.** Personal data lives ONLY in Supabase. Reference
the local path. (This also strengthens the go-private recommendation on John's
decision list.)

## Architecture: dedicated table + CRM linkage (John's anti-redundancy concern, resolved)

John's instinct — "maybe just slot them into Contacts with a river-guide tag" —
is half right. The resolution:

1. **`river_guides` table (migration 0016)** per spec §4. The channel-specific
   lifecycle (NEEDS_NAME → PENDING_T1 → … → VERIFIED), scoring components,
   priority bands, exit/verification status, and deal provenance do NOT belong
   on `contacts` — forcing them there would pollute the CRM contact model the
   same way listings don't live in `companies`. This mirrors how `leads` works
   for the proprietary channel: channel table first, CRM promotion second.
2. **CRM linkage on resolution (the non-redundant part):** when a row has
   `name_status=RESOLVED`, the ingest/worker creates-or-links:
   - a **`contacts` row** (contact_id FK on river_guides) with role/tag
     **`river_guide`** — so they appear in the normal Contacts CRM, filterable,
     with all standard contact features (notes, activities, inline edit);
   - a **`companies` row** for `their_company` (company_id FK) with
     `company_website`, so person ↔ former company ↔ website structure is native
     CRM (John's explicit ask); dedupe against existing companies by domain/name;
   - **PE-flag synergy:** that company gets `pe_owned=true`, `pe_owner=
     "<acquirer> (<sponsor>)"` — the 433 rows are ground-truth for Lane C's
     PE-ownership backfill (John called this out himself).
   - Contact↔company link carries relationship `former_owner_sold_<year>`.
3. **NO new scraping section** (John's redundancy worry was correct here): the
   consolidator-sweep refresh is a future Lane A job (query-generator per
   consolidator map, spec §7), not a new UI form. Sourcing UI = the River Guides
   page below, not a list-builder clone.
4. **Existing enrichment plumbing, person-mode:** the waterfall reuses the
   cascade tiers already built/being built — Hunter (domain-first, routed by
   `company_website_status`: LIVE→own domain, REDIRECTS→acquirer domain,
   DEFUNCT/NOT_FOUND→LinkedIn-first) and Tracerfy person-mode. Paid tier
   (Upwork/ZoomInfo) stays MANUAL export (VA handoff CSV), never automated spend.

## Build order (matches handoff §6; sequenced for John's "functional near-term")

| Step | What | Owner | Notes |
|---|---|---|---|
| 1 | Migration `0016_river_guides.sql` — table per spec §4 + contact_id/company_id FKs + indexes | Lane C | John runs it in his morning SQL pass (with any others outstanding) |
| 2 | `ingest_river_guides.js` — CSV → table (idempotent upsert on deal_id); RESOLVED rows also create/link contact + company (+ pe_owned) | Lane C | reads the LOCAL csv path; provenance columns kept verbatim |
| 3 | `/api/river-guides` GET (filters: industry, priority_band, enrichment_status, exit_status, state) + PATCH (inline edit, human wins) | Lane C | serve TIER_LABELS-style enums for chips |
| 4 | **River Guides page** under Proprietary Sourcing: table w/ band/industry/status filters + counts header, checkbox select → "Enrich selected (est. $X)", row → contact/company profile, CSV export (= VA handoff for paid tier), mobile parity | Lane B | reuse the shared list pattern + enrichment progress UI |
| 5 | **Status-verification worker** (LinkedIn re-check → `current_status_verified`, can flip EMPLOYED→EXITED) — REUSE the new verified-LinkedIn matcher (2+ corroborations) | Lane C | the single highest-leverage job (handoff nuance #1); re-run periodically |
| 6 | **Identity-resolution worker** for ~197 NEEDS_NAME rows (LinkedIn + SoS resolvers + acquirer press pages); NEVER guess (nuance #4) — unresolved stays TBD | Lane C | Mariani + Turf Masters are the biggest clusters |
| 7 | Enrichment waterfall wiring (Tier-1 free/owned only; failures flagged NEEDS_PAID for the VA export — no auto paid tier) | Lane C | screen_score recompute on data change per spec §3 |
| 8 | Contacts page: "River Guide" filter chip; contact profile shows the river-guide panel (band, exit status, former company link) | Lane B | |
| 9 | Consolidator-sweep refresh (periodic re-run of the acquisition-log queries) + Archetype B LinkedIn-recipe intake | Lane A / later | NOT tonight; separate intake path per spec §9 |

## Hard rules carried from the research (enforce in code)
- `exit_status` is AT-CLOSE, not current — nobody is contacted until
  `current_status_verified` (outreach eligibility = CALL_NOW + VERIFIED).
- No invented names/domains, ever — hallucination guard (nuance #4).
- Dedupe key = (person, company); vertical cross-listing is by design.
- Provenance (source_url, confidence) survives ingestion.
- All existing outreach guardrails apply: nothing SENDS; river-guide outreach
  drafts (spec §8 positioning: second-exit economics, equity-not-fees) only via
  the rules-gated draft engine AFTER John approves — separate template from the
  broker inquiry.

## Sequencing note (John): river-guide outreach comes BEFORE cold company
outreach — CALL_NOW+VERIFIED rows are the platform's first outbound priority
once John reviews. The xlsx (River-Guides-Multi-Industry-v2.xlsx) stays his
human review copy; the CSV is the machine source of truth.
