# Enrichment strategy — getting to owner contact info for outreach

**The goal:** turn a company (from broker scrape or list-build) into a reachable
OWNER — name, personal/business email, phone, LinkedIn — cheaply and at scale, so
Tom & John can cold-email and cold-call owners directly for off-market deals.

## The enrichment funnel (cheapest first — most contacts never need the paid tail)
1. **Free / already-scraped (─$0):** business name, website, phone, address,
   rating, review count (Google/Serper, OSM, license boards). License boards +
   Secretary-of-State registries give the **owner/officer NAME** for free — this
   is the single most valuable free field and most vendors charge for it.
2. **Claude extraction (~$0.001–0.01/company):** scrape the company website
   (About/Team/Contact) + Google results + LinkedIn public snippet, have Claude
   pull owner name, role, business email pattern, years in business, PE-backed
   flag, recent news. Near-free, high coverage for name + business email.
3. **Email-finding API (~$0.02–0.05/verified email):** Hunter.io / Prospeo /
   Findymail to get + verify the owner's email from name + domain. Paid but cheap.
4. **VA last-mile (~$0.10–0.25/contact):** an Upwork researcher fills the hard
   fields — personal cell, LinkedIn URL, verified email — for the SHORTLIST you
   actually pursue. Jake's exact model. Higher quality + human judgment.

## Cost comparison (the question John asked)
| Path | Cost/contact | Best for |
|---|---|---|
| Claude + free sources | ~$0.001–0.01 | The bulk — name, business email, phone |
| Hunter/Prospeo email API | ~$0.02–0.05 | Verified owner email at volume |
| ZoomInfo/Apollo/Grata | $0.10–1+ (heavy subs) | ❌ skip — this is the Inven-class cost we're avoiding |
| **Upwork VA** | **~$0.10–0.25** | Personal cell + LinkedIn + verified email on the shortlist |

**Do we need an Upwork worker?** Yes — but not for everything. Automate the bulk
(steps 1–2, essentially free) to build the full list; use a VA only for the
**high-priority shortlist** you're actually going to call (step 4). A VA at
~$6/hr doing ~40 contacts/hr = ~$0.15/contact with better LinkedIn/cell coverage
than any API. Paying the VA beats paying per-seat data vendors for our volume.

## Recommendation (build order)
- **Now (free, in progress):** Lane C's free list-building (OSM + license boards +
  SoS) already returns owner NAMES. Add a Claude-extraction enrichment worker
  that runs on every lead (website + Google → owner/email/signals). ~Free.
- **Next (John adds keys):** Serper (business data) + one email-finder (Hunter or
  Prospeo, ~$50/mo) for verified owner emails.
- **Then (when pursuing):** an Upwork VA workflow — the app exports a shortlist
  CSV (blank owner-cell/LinkedIn), VA fills it, we re-import. Build the export/
  import loop now so it's ready.

## What this unlocks (the end-state)
Enriched owner contacts → automated cold-email sequences (Outreach Library) +
cold-call prep sheets (Cold Calling tab) → proprietary conversations with owners
before the deal ever hits a broker. That's the whole point of the system.

## Open decisions for John
- Email-finder choice: **Hunter.io** (simple, ~$34–49/mo) vs **Prospeo/Findymail**
  (cheaper per-credit). PM recommends starting Hunter free tier (25/mo) to test.
- Upwork VA: when ready, PM will draft the job post + the CSV export/import spec.
