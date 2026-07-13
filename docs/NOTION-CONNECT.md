# Connecting Notion meeting notes to the Pronghorn CRM

The CRM sweeps Notion for AI meeting notes on a schedule, tags each note to
the right company/contact/deal, and posts it to that record's activity feed.
Notes stay PRIVATE in Notion — connecting an integration never makes a page
public; it only lets our (read-only) sweep see the pages you explicitly share
with it.

## One-time setup (~3 minutes) — John: DONE 7/13 · Tom: pending

1. Go to **https://www.notion.so/my-integrations** (signed into the account
   that owns your notes).
2. **+ New integration** → Name: `Pronghorn CRM` → Workspace: yours →
   Type: **Internal** → Save.
3. Copy the **Internal Integration Secret** (starts `ntn_`).
   - John: goes in `C:\Users\johnd\Pronghorn\scraper\.env` as
     `NOTION_TOKEN=...` (done).
   - Tom: send the token to John/the PM securely (it will live in the same
     .env as `NOTION_TOKEN_TOM=...`) — or paste it to the PM session in chat.
4. **Share the PARENT location, not individual notes:** open the page /
   section / database where your AI meeting notes accumulate → **•••** menu
   (top-right) → **Connections** → **Pronghorn CRM**. Children inherit
   access, so every FUTURE note in that location is swept automatically.
   Sharing one note at a time works but doesn't scale — new notes would each
   need manual sharing.

## How it behaves

- Read-only: the sweep never edits or moves anything in Notion.
- Each note lands once (idempotent by Notion URL) as a `meeting` activity on
  the matched company/contact/deal, with a link back to the Notion page.
- Notes the tagger can't match confidently go to a "needs tagging" review
  queue in the CRM — never silently dropped.
- People with contact info mentioned in notes (advisors, brokers, owners)
  are created/enriched as contacts (e.g., Dan Mello, 7/13).
