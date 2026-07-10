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
