# Credentials intake — deal networks & external systems

## Already connected (no action needed)
- **Notion** — connected via MCP (workspace "Pronghorn Equity"). Claude can read
  meeting notes / Deal Tracker / Broker Directory directly. NO token required.
- **HubSpot** — connected via MCP. Deals/companies/contacts readable. (Two-way
  push stays OFF until John approves.)
- **Outlook / Microsoft 365** — connected via MCP (email, calendar).
- **Supabase, Vercel** — keys in local `.env` files.

## Login networks — how to hand John's credentials over securely
Put credentials in **`C:\Users\johnd\Pronghorn\scraper\.env`** (local, gitignored —
never chat). PM syncs the file into the other worktrees. Convention:
```
AXIAL_EMAIL=            AXIAL_PASSWORD=
SMBCO_EMAIL=           SMBCO_PASSWORD=
SMBMARKET_EMAIL=       SMBMARKET_PASSWORD=
DEALFORCE_EMAIL=       DEALFORCE_PASSWORD=
PRIVSOURCE_EMAIL=      PRIVSOURCE_PASSWORD=
```

## Per-network automation approach (most-automated first)
| Network | Automation | Notes |
|---|---|---|
| **Axial** | Co-pilot browser sweep + CIM ingestion | No API; SPA blocks headless automation. Most automated = periodic co-pilot session (drive John's logged-in Chrome via the browser MCP) to pull ACTIVE/NDA'd deals + download CIMs, then parse CIM PDFs into the CRM. Highest-value: NDA'd deals with real CIMs. |
| **SMB.co** | Headless login → scrape (probe first) | Aggregates 19M+; check for API/export once logged in. If anti-bot, co-pilot. |
| **SMBmarket** | Headless login → scrape (probe first) | Confirm free vs paid. |
| **DealForce** | Headless login → scrape (probe first) | Generational Group buyer network. |
| **PrivSource** | Headless login → scrape (probe first) | Invite-only; may need John's invite. |

**Flow once credentials arrive:** Lane C (a) tries a headless login + scrape; if
blocked, (b) falls back to a scheduled co-pilot session John triggers. New deal
activity syncs into `listings`/`companies` with `source_id=<network>`, deduped
against existing via identity resolution. Axial CIMs → `activities` + document links.
