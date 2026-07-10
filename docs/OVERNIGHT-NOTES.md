# Overnight Build Report — night of 2026-07-09 → 07-10

> Autonomous session while John slept. Everything here is committed and pushed.
> Read top to bottom over coffee; the **Questions** section is what I need from you.

## What got built and verified

1. **Phase 1 port — DONE.** The scraper now writes to Supabase instead of
   CSV/email: new listings inserted with first/last-seen timestamps, repeat
   sightings refreshed, `listing_events` emitted (new / price_change / relisted),
   Claude screener results (tier + reasoning + normalized industry + extracted
   revenue) written onto rows, cross-source duplicate links resolved, source
   last-run stamps updated. New entry point: `scraper/run_supabase.js`
   (flags: `--pages N`, `--source x`, `--no-screen`). Legacy `run_daily.js`
   untouched and still functional.
2. **Criteria now live in the database.** The pipeline loads the default
   `screen_profiles` row at the start of every run — config.json no longer owns
   investment criteria. **Your requirement is now real: edit criteria in the UI,
   next scrape obeys.**
3. **Test scrape (2 pages, your pre-approval)**: 107 listings in 41s. Field
   mapping verified clean. 3 passed relevance → screened: 1 Tier 1 (Colorado
   Springs roofing, 30% margin, 2.5×, priority state ★), reasoning quality high.
   Cost: $0.0035.
4. **Full 30-page pull** ran after test verification (was still finishing at
   report time — final stats appended at bottom).
5. **Frontend is live-wired.** Broker Listings reads from Supabase ("● LIVE
   DATA" badge), with a new "Thesis-fit only" toggle (default ON — shows what
   passed your criteria; toggle off to audit everything kept in the DB).
   Dashboard header shows live DB counts. Deal pipeline/charts remain sample
   data until the CRM migration (labeled as such).
6. **Screen Criteria editor page built and verified** (sidebar → Screen
   Criteria): keywords, states, size guardrails, multiple flag — loads your
   Green Industry Default profile, saves back to the DB (round-trip tested).

## Decisions I made without you (flag anything you'd reverse)

| # | Decision | Reasoning |
|---|---|---|
| 1 | Store ALL scraped listings in the DB, not just thesis-fit ones | Carries over the old pipeline's annotate-don't-delete audit philosophy; UI defaults to thesis-fit view so noise stays hidden |
| 2 | Dropped CSV/JSON file outputs in the new runner | The DB *is* the record now; `raw` JSONB on each row keeps the full scraped payload |
| 3 | Frontend uses the secret key server-side, local only | Fastest path to live data tonight. **Hard blocker added: Supabase Auth must land before any Vercel deploy** |
| 4 | Listing review status not wired yet (all show "new") | Review workflow needs user accounts (you/Tom) to record who reviewed what — auth first |
| 5 | Delisting detection deferred | Needs a "seen in full run" concept; proposal in Q2 below |
| 6 | Criteria editor edits the single default profile | Multi-profile support (e.g. per-thesis profiles) is schema-ready but UI-deferred |
| 7 | Kept the old OneDrive scraper + Monday schedule untouched | Safety net until you approve cutover (Q1) |

## Questions for the morning

1. **Cutover:** the old Monday 6am email-digest run still points at the OneDrive
   copy. Options: (a) retire it now, (b) run both in parallel 1–2 weeks as a
   safety net (my recommendation), (c) repoint the scheduled task at
   `run_supabase.js` and keep an email digest as a notification layer. Which?
2. **Delisting rule:** propose marking a listing `delisted` after it's missed
   from 2 consecutive full scrapes (~2 weeks at weekly cadence), with a
   `delisted` event. Approve/adjust?
3. **Cadence:** now that runs are cheap (~$0.05 API + a few minutes), I'd move
   BizBuySell from weekly to **daily**. New listings would hit the dashboard
   every morning. Approve?
4. **Auth:** to deploy to Vercel (and give Tom access + enable review workflow)
   I need to build Supabase Auth login. What email should Tom's account use?
5. **HubSpot bridge:** while the custom CRM matures, want Tier 1 listings
   auto-pushed into the HubSpot Deal Sourcing pipeline (respecting the
   no-blind-teaser rule), or keep systems separate until migration?
6. **Adapter #2:** build order says BizQuest next (same parent as BizBuySell).
   Confirm, or reprioritize (e.g. BBF Florida MLS for priority-state depth)?
7. **Key rotation (carryover):** still open — rotate the Supabase secret key
   (Settings → API → roll), then update `scraper/.env` AND `web/.env.local`
   (same line in both), then we re-run `node scraper/check_db.js`.

## Full-pull results ✅

**1,592 listings scraped (30 pages, 0 errors, 7 min). 1,485 new + 107 refreshed**
(the test rows updated, not duplicated — upsert path proven). Funnel: 1,592 →
39 thesis-fit → 36 screened. **6 Tier 1, 16 Tier 2.** API cost: $0.0413.

### Your Tier 1 board this morning (7 total incl. test run)

| Deal | Location | Industry | Ask | Cash flow | Multiple |
|---|---|---|---|---|---|
| Stable HVAC Co w/ Consistent Cash Flow | Oklahoma City, OK | HVAC | $6.2M | $1.42M | 4.4× |
| Premier Roofing & Storm Restoration | Douglas County, CO ★ | Roofing | $3.15M | $1.07M | 3.0× |
| All-Season Landscape Provider | St. Charles County, MO | Landscaping | $2.19M | $650K | 3.4× |
| Turnkey 35-Year HVAC Co, No Debt | Tampa, FL | HVAC | $2.5M | $620K EBITDA | 4.0× |
| 20+ Year HVAC Co, strong earnings | Pooler, GA ★ | HVAC | $1.58M | $535K | 3.0× |
| Established FL HVAC Business | Port St. Lucie, FL | HVAC | $550K | $447K | 1.2× |
| Co Springs Service Biz, 30% margin | Colorado Springs, CO ★ | Roofing | $790K | $310K EBITDA | 2.5× |

(All visible now at localhost:3000/listings with the thesis-fit filter — hover
rows for the screener's reasoning. The $550K-ask/1.2× FL HVAC and the 4.4× OKC
one are worth a skeptical first look for opposite reasons.)

## Post-report additions (kept pushing after the write-up above)

### Adapter #2 shipped: BusinessBroker.net ✅

- **BizQuest probed first and KILLED** — it's a near-total mirror of BizBuySell
  (same CoStar feed, identical product IDs in identical order). Zero incremental
  inventory; deprioritized in SOURCES.md. Five minutes of probing saved a wasted
  adapter. New rule + reusable tool: `node scraper/probe.js <url>` before building.
- **BusinessBroker.net built instead** (independent inventory). Different crawl
  strategy: the site has keyword/industry pages, so we crawl **thesis-targeted
  pages** (landscaping, lawn care, plumbing, pool service & repair, electrician,
  cleaning, repair, construction — verified against their indexes) instead of a
  firehose. Result: **61% relevance rate vs BizBuySell's 2.4%.**
- Run results: 672 listings, 208 screened → **14 Tier 1, 61 Tier 2** (~$0.44 API
  for both runs on this source).

### Adapter #3 recon: BBF Florida MLS

Their listings live in an embedded iframe app (`bizmls.com` — an old ASP CGI
system). A direct hit on the endpoint returned empty; it needs the iframe's form
POST flow. **Medium difficulty, needs a dedicated session** — still worth it
(hundreds of FL brokerages behind one adapter).

### UX fixes shipped along the way

Listing names now link out to the source listing (↗), Tier 1s sort to the top,
and a Supabase 1,000-row response cap was found and fixed with pagination.

## GRAND TOTALS — your database this morning

| | |
|---|---|
| Listings in database | **2,264** (BizBuySell 1,592 · BusinessBroker.net 672) |
| **Tier 1 — review now** | **37 (16 in priority states** after the state-repair runs**)** |
| Tier 2 — watchlist | 113 |
| Change events logged | 2,264 (every listing's history starts tonight) |
| Total Claude API cost for the night | ~$0.48 |

Open localhost:3000/listings → "Thesis-fit only" is on by default, Tier 1s on
top, click any name to open the source listing. That's your morning review queue.

### One more question (#8)

8. **Crawl strategy per source:** BusinessBroker.net uses targeted keyword pages
   (fast, cheap, high hit-rate) rather than BizBuySell's scrape-everything
   approach. Tradeoff: targeted crawls could miss mislabeled listings. Default
   going forward: firehose where cheap, targeted where the site is huge? Or
   always firehose for completeness?

---

# Second wave (after your pre-bed directives)

You asked for: source/list-building toggles in the UI, everything integrated
into the CRM company profile, and Notion/Granola meeting-note capture. Built:

1. **Scrape Sources page** (sidebar → Scrape Sources): all 37 roster sources
   grouped by tier with on/off toggles, "scraper built" badges, and live
   last-run status. **The toggles are real** — the pipeline reads them at run
   start and skips anything switched off.
2. **Listings → CRM bridge**: a "→ CRM" button on every live listing row. It
   prompts for the REAL company name (firm no-anonymized-records rule enforced
   server-side), then creates company + deal (stage Sourced) + activity log
   entry, links the listing, and the Pipeline board flips to LIVE data.
   Tested end-to-end with a throwaway record, then cleaned up — pipeline is
   sample data again until you promote your first real one.
3. **Companies page live** (sidebar → Companies): the canonical CRM entity
   list — empty until first promotion, with instructions on-screen.
4. **Data-quality bugs found & fixed** in the BusinessBroker adapter (some rows
   swallowed whole card text as the name; "Not Disclosed" parsed as a city).
   Fixed the parser, made re-runs repair existing rows, repair run executed.
5. **Meeting notes design** → docs/MEETING-NOTES-DESIGN.md. Recommendation:
   a scheduled Notion→activities sync (Granola rides through its Notion export,
   so one pipe covers both), plus an in-app "Log meeting" paste box as the
   day-one manual path. Notes attach to companies; both of you see everything.

### Third wave: company profile page (the CRM hub)

**`/companies/<id>` is live** — click any company name: financial tiles, deal
stage, link back to the source listing, and the **shared activity feed** with a
"Log meeting" box (meeting/call/email/note + optional Notion/CIM link). This is
the day-one manual path for your meeting-notes requirement — paste from
Notion/Granola and it's attached to the company, visible to Tom. Verified
end-to-end (test note logged and rendered, then test data deleted). The
automated Notion sync (design doc) layers on top once you provide the token.

### Data-quality saga (honest report)

The BusinessBroker adapter shipped with parsing bugs I found during testing:
whole-card text swallowed as listing names, and "Not Disclosed" parsed as a
city. My first fix (take the shortest link text per card) backfired — it grabbed
the cards' "Read More" buttons, briefly renaming all 672 rows "Read More." The
name fix then broke state extraction (it had been keyed off the old names).
Final state, all verified: names derived from URL slugs with junk-text
filtering (**0 junk names**), states from slug tails + normalized JSON-LD
matching (**667/672 = 99.3% state coverage**, better than the original run).

Two durable improvements came out of the mess: (1) re-runs now repair
names/cities/annotations in place, so parser improvements retroactively fix old
rows; (2) **criteria edits are retroactive** — change the screen profile in the
UI and the next run re-annotates every existing listing against it, not just
new arrivals.

### More questions (9–12)

9. **Notion token:** create an integration at notion.so/my-integrations, share
   your meeting-notes database with it, and paste the token into a local file
   (I'll walk you through — same pattern as the Supabase key, NOT in chat).
   Also: which Notion database holds the AI meeting notes?
10. **Granola:** if/when you switch, enable Granola→Notion export and the same
    pipe carries it. Any reason to prefer a direct Granola path?
11. **Promote flow contacts:** when promoting a listing, should the prompt also
    ask for broker name/firm (creates the broker + contact records right then)?
    Currently it only asks for the company name.
12. **Tier 1 alerting:** want new Tier 1 listings pushed to you (email/phone
    notification) when a scrape lands them, or is the dashboard enough?
