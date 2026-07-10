# Meeting Notes → CRM: Notion / Granola integration design

**John's requirement (2026-07-10):** meetings about deals are recorded in Notion
AI notes (possibly switching to Granola). Notes must (a) attach to the right
company in the CRM with near-zero effort, (b) be visible to both John and Tom,
(c) all be catalogued permanently.

## Where notes live in our schema (already built)

The `activities` table is the landing zone: `kind='meeting'`, `body` (the note),
`company_id` / `deal_id` / `contact_id` links, `doc_url` (link back to the Notion
page), `created_by`. The Companies page grows an activity feed per company —
both partners see everything the moment it's attached. No schema change needed.

## Ingestion design (recommended: Option A)

### Option A — Scheduled sync agent (recommended)
A scheduled job (same pattern as the existing 7am `crm-deal-contact-sync` agent,
or a GitHub Action once deployed) that:
1. Pulls new/updated meeting notes from the Notion API (needs a **Notion
   integration token** — John creates at notion.so/my-integrations, shares the
   meeting-notes database with it)
2. Matches each note to a company: explicit tag if present (see below), else
   fuzzy name match against `companies` + Claude adjudication (same identity-
   resolution muscle as listings/leads)
3. Inserts an `activities` row (kind=meeting, doc_url=Notion page URL,
   body=note summary) — idempotent on the Notion page id
4. Unmatched notes land in a review queue in the UI ("attach this note to…")

### Option B — In-app paste box
A "Log meeting" button on the company page: paste raw notes, Claude cleans and
summarizes, activity saved. Zero integration needed — works day one, and remains
the manual fallback forever.

### Option C — Granola
Granola has no public API yet (as of mid-2026) but supports auto-export of note
docs to Notion — so **the Notion pipe covers Granola too** if John enables
Granola→Notion sync. Decision: build the Notion pipe; Granola rides through it.

## Matching convention (makes step 2 reliable)

Ask the AI note-taker template to include a line `Company: <name>` (or a Notion
database property). When present, matching is exact; when absent, fuzzy+Claude.
John/Tom habit: say the company name at the top of the meeting.

## What I need from John (morning)

1. Notion integration token + share the meeting-notes database with it
2. Confirm which Notion database holds AI meeting notes (name/URL)
3. Granola: enable its Notion export if/when he switches
4. Cadence: sync every 30 min? hourly? (cheap either way)
