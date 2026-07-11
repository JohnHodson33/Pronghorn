# Listing → Pursuit → Deal flow (John's 2026-07-11 feedback)

## The gap
Broker listings are a searchable database, but pursuing one is a dead-end: John
clicks the brokerage link, gets bounced to BizBuySell/broker site, logs in,
re-types name/phone/email + a note, sometimes signs an NDA — and NONE of that is
reflected in the platform. The ACTION must (1) be as automated as possible and
(2) move the listing forward in a tracked pipeline state.

## The model — a listing IS pursuable without a company yet
Add a lightweight pursuit lifecycle to listings, BEFORE they become full CRM
companies/deals (which need a real name + financials from the CIM):

`listing_reviews.status` (already exists) becomes the pursuit tracker:
`new → interested → info_requested → nda_signed → cim_received → promoted → passed`

- **Pipeline view gains a pre-deal "Prospecting" lane** (or a toggle) that shows
  listings in info_requested / nda_signed / cim_received — even though they're
  still anonymized. This is John's "track which broker deals I've requested info on."
- When `cim_received` and John has the real name/financials → **one-click Promote**
  (existing flow) turns the listing into a company + deal, carrying the broker
  contact + all pursuit activities/timestamps over. No re-typing.

## Feature 1 — one-click broker outreach (Lane B + Lane C)
On a listing detail/row: **"Request info"** button. Behavior tiers by source:
- **Best case (broker email known):** we scraped broker email on many sources
  (BusinessBroker.net, Transworld, GABB, LINK). Button → pre-drafts an inquiry
  email (John's name/phone/std blurb, merge-fielded) → **queues for John's
  one-click send** (NEVER auto-send — outbound comms is a hard guardrail). Sending
  via the Outlook MCP or the outreach tool, but only on John's explicit click.
- **Form case (BizBuySell etc.):** can't fully automate login+form headlessly
  (bot detection, and it's John's account). Best automation = a **co-pilot**:
  open the listing's inquiry page in John's logged-in Chrome (browser MCP),
  pre-fill name/phone/email/note, and let John review + click submit. Store a
  reusable "inquiry profile" (name, phone, email, default note) so it's never
  re-typed.
- **NDA case:** can't auto-sign (legal). Surface the NDA link + track state; John
  signs; we detect the confirmation (Feature 2).
- Whichever path: clicking "Request info" immediately sets the listing to
  `info_requested` and logs an activity — so intent is captured even if the send
  is manual.

## Feature 2 — auto-detect pursuit from Outlook (Lane C) — the self-regulating part
The Outlook ingestion already reads John's mail. Extend it to **detect pursuit
signals and advance listing state automatically**:
- NDA confirmation / "executed" / DocuSign-complete emails → set matching listing
  `nda_signed`, log activity. (John already has several NDA confirmations in
  Outlook — backfill these now.)
- CIM / "attached is the offering memorandum" / data-room invite → `cim_received`,
  attach the doc link.
- Match emails to listings by broker email/domain + business name fuzzy match
  (same identity resolution we use elsewhere).
- When `cim_received` fires, create a **"ready to promote" queue** item so John
  (or Claude) fills the real name/financials and promotes to a deal.

## Feature 3 — frictionless enrich-on-promote (Lane B)
The Promote action opens a small form pre-filled with everything we DO know from
the listing (industry, geo, asking, any financials, broker) + blanks for the
post-NDA reveal (real company name [required], revenue, EBITDA, owner). Submit →
company + deal created, listing linked, pursuit history carried over.

## Data notes
- `listing_reviews` already exists (status/notes/reviewed_by). Extend its status
  enum + add `requested_at`, `nda_signed_at`, `cim_received_at` timestamps
  (migration). Add an `inquiry_profiles` singleton for John's std contact block.
- Guardrail: Claude never sends email or submits a form without John's explicit
  per-action click. Drafting/queuing/pre-filling = fine; sending = John's click.
