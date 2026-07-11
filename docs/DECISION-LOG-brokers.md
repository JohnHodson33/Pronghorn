# Lane A (Brokers) — decision log for PM/John

Worker session appends here; PM concatenates into DECISION-LOG.md.

## 2026-07-10 — bizmls crack applied via NATIONAL search, not per-org probing

- Probed 38 org-code guesses at `bizmls.com/<org>/businesses`: only `bbf` and
  `gabb` exist. GABB's bizmls area is a **member login portal** (aw-login.asp),
  not public listings — its public inventory is the Webflow API we already
  scrape. No other state association has a public bizmls org page.
- Better find: `folder=BIZMLS&state=ALL` (the bizmls.com homepage search)
  returns the ENTIRE cross-state member inventory in one GET — 2,256 rows.
  Shipped as source `bizmls` (reuses generalized `sources/bbf.js`), excluding
  FL rows since `bbf` is authoritative there. **+143 listings (84 Texas), 1 new
  Tier 1 on first run.**
- ➡️ Queue task "apply bizmls crack to other state associations" is COMPLETE in
  spirit: the national search already carries every member listing; there are
  no other public per-association portals to crack. PM can mark it done.

## 2026-07-10 — 4 benched sources UNBLOCKED (all had hidden JSON/AJAX backends)

Probing "check the network tab first" paid off — four sources the roster had
benched for dedicated JS sessions turned out to have clean data feeds:

| Source | New adapter | Backend found | Listings | Tier 1/2 |
|---|---|---|---|---|
| Murphy Business | `murphy.js` | WP admin-ajax (`ajax_new_business_search_result`), per-load api_token | 456 | 1 / 14 |
| Sun Acquisitions | `sun.js` | SSR index + detail crawl (no asking price; EBITDA lines) | 6 | 1 / 0 |
| BizBen | `bizben.js` | Public AWS API Gateway JSON (`Prod/top-business`); 2 pools (fast_track true/false) | 4,433 | 5 / 9 |
| First Choice (FCBB) | `fcbb.js` | JSON API behind Duda (`api.fcbb.com/Fcbb/GetListings`, static header tokens) | 825 | 8 / 10 |

- **BizBen pagination gotcha**: `pagination_token` param takes the DOUBLE-JSON-
  encoded `nextPageKey`; no guessed param name worked — had to capture the
  site's own XHR. Two disjoint pools (`fast_track=true`≈300 paid, `false`≈4,100)
  that never auto-transition — adapter runs both.
- **BizBen + FCBB both ship broker contact** (name/phone/email/license) →
  1,000+ broker rows synced. Useful for Phase 5/6 outreach, not just multiples.
- **Lesson reinforced**: `probe_net_full.js <url>` before assuming a JS site
  needs headless rendering. 4/4 benched "hard" sources were actually API-fed.
- ➡️ SOURCES.md "BENCHED" table is now stale for Murphy, Sun Acquisitions,
  BizBen, FCBB — PM should move them to LIVE (adapter count 10 → 15, incl.
  `bizmls`). ~4k of the new listings are CA/other market-multiples data;
  ~40 new relevant thesis-fit listings, 15 Tier 1.

## 2026-07-10 — new-source hunt: HedgeStone built; recon of ~18 candidates

Built **HedgeStone** (`hedgestone.js`) — first net-new source beyond the
roster. SSR WordPress SAE-listings plugin, 720 listings, 3 Tier 1 + 8 Tier 2.

Recon on the rest (two `probe_new_sources` batches), all NOT built:
- **We Sell Restaurants** — clean public API
  (`api.wesellrestaurants.com/wsr-rebuild-prod/api/restaurants/business-for-sale`),
  would be a ~1hr adapter. OFF-THESIS (restaurants) but the strategy note says
  brokers = max-coverage multiples intel at min cost. ⬆️ **DECISION FOR JOHN/PM:**
  build it for restaurant-vertical multiples data, or skip to keep the DB
  thesis-focused? I left it unbuilt pending that call.
- **Morgan & Westfield** — clean `.business-for-sale` SSR cards, thesis-sized
  deals ($1–6M, disclosed revenue/cash flow) BUT only 7 public listings (M&A
  advisor, most deals confidential). Too low-volume to justify an adapter now;
  revisit if they grow their public board.
- **Peterson Acquisitions** — big $ figures on page ($15M–$68M) but listings
  aren't exposed as crawlable links/API (JS-embedded). Needs a dedicated
  session; deal sizes skew above thesis. Benched.
- **Calhoun, Benchmark, Principium, Empire, Neumann, CBC, Certified BB** — no
  public listings grid (404s, advisor landing pages, or dead host). Confirmed
  no-go, matching roster's "M&A advisors, no public grid" note.
- Sunbelt Atlanta uses per-city subdomains w/ callrail widgets — the national
  `sunbelt` adapter already covers this network; no incremental value.

## 2026-07-10 — Lane A session summary (for PM merge)

Entire Lane A queue cleared. Branch `lane/brokers`, 9 commits, ready to merge.

**New adapters (6):** `bizmls` (national bizmls, +143), `murphy` (456),
`sun` (6), `bizben` (4,433), `fcbb` (825), `hedgestone` (720 — net-new source).
**Enrichment:** `transworld` now pulls broker contacts on thesis-fit listings.

**DB impact:** ~7,000 new listing rows (bulk = CA/national market-multiples
data), ~40 new thesis-relevant, ~20 new Tier 1. ~1,100 new broker contacts
(BizBen/FCBB/Transworld) — usable for Phase 5/6 outreach.

**New `scrape_sources` rows** (added directly to DB, so a fresh `run_supabase`
picks them up): bizmls, murphy, sunacquisitions, bizben, fcbb, hedgestone.
Adapter count 10 → 16.

**PM action items:**
1. Merge `lane/brokers` → main; the config.json additions + 6 new
   `sources/*.js` are self-contained (no web/ or Sidebar.tsx touched).
2. SOURCES.md is stale: move Murphy/Sun/BizBen/FCBB out of BENCHED → LIVE;
   add HedgeStone + bizmls; note Transworld broker enrichment.
3. **Decision for John:** build We Sell Restaurants (clean API, off-thesis
   restaurant multiples) — yes/no? (see above).
4. Daily-run cost/time: Transworld enrichment adds ~4.5 min (150 detail
   fetches). BizBen full run ~3 min. All within a nightly window but worth
   knowing. Consider lowering `max_detail_enrich` if the 6am job gets tight.

## 2026-07-10 (cont.) — post-merge round: VR + Franchise Resales

After PM merged the first 6 adapters to main, continued the source hunt.

- **VR Business Brokers** (`vr.js`) — UNBENCHED. The corporate
  /businesses-for-sale/ page DOES aggregate all franchise-office inventory
  (roster note said "per-franchise domains only" — wrong). SSR cards, WP Views
  pagination. 366 listings, 3 Tier 2. No cash flow on cards (asking/coverage
  data). The homepage "suspicious injected scripts" note was a false alarm.
- **Franchise Resales** (`franchiseresales.js`) — NEW. Franchise-resale board,
  74 green/home-services resales crawled (of 606 total; green_only filter).
  JSON-LD price + brand, body-text cash flow.
  ⚠️ **RELEVANCE-CONFIG NOTE FOR JOHN:** only 1 of 74 passed the thesis screen.
  Many green franchises were dropped because the DB screen keyword list
  (screen_profiles, UI-editable) lacks common trade terms — notably **"painting"
  / "painters"** and **"restore"** (list has "restoration" but not the bare
  "restore" that ServiceMaster/CertaPro use). Adding those to the Green Industry
  Default profile would recover ~15–20 real home-services targets already in the
  DB (not just from this source). I did NOT edit screen_profiles (shared data) —
  flagging for John/PM to update via the Screen Criteria editor.
- Recon also cleared (no public grid / off-thesis / parked): BusinessMart,
  BizNexus (GoHighLevel funnel), Principium (green M&A ADVISOR — no public
  listings, educational content only), Truforte, Crowne Atlantic, Apex, The
  Firm, Calder (cert error). Sunbelt search-page 404 (national `sunbelt`
  adapter already covers it).

**Adapter count now 16 → 18** (vr, franchiseresales). Branch has 15 commits.

## 2026-07-11 — post-merge round 2: 5 sources + analytics + enrichment + delisting

Continuing per John's SELF-ITERATE / never-stop directive (TASK-QUEUE top).

**5 more NEW sources (adapter count 18 → 23):**
| Source | Backend | Listings | Notes |
|---|---|---|---|
| VR Business Brokers (`vr`) | SSR WP Views cards | 366 | Unbenched; corporate page aggregates all offices |
| Franchise Resales (`franchiseresales`) | sitemap + JSON-LD | 74 | Green home-services franchise resales only |
| Certified BB Houston (`tupelo`) | Tupelo SMB public API | 16 | **Generic reusable platform adapter** (org_id param) |
| The Firm / Omaha (`thefirm`) | Umbraco SSR cards | 29 | 7 relevant, 1 T1+1 T2 — high hit rate |
| Calder Capital (`calder`) | WP search-filter SSR | 37 | Revenue/CashFlow/RealEstate, Midwest LMM |

**Source-quality analytics** (`source_quality.js`) — ranks all sources by
thesis-fit yield + flags gaps. First run: **17,975 listings, 83 T1 + 216 T2.**
Top thesis source = businessbroker (127 fit). Flagged bizquest + linkbusiness
as low-value; flagged 8 sources with thesis-fit but zero broker contacts.

**Broker-contact enrichment** (the outreach end-state goal):
- `businessbroker` detail pages embed JSON-LD Organization (founder=broker,
  email, phone). Added bounded enrichment (cash flow ≥ floor, cap 150).
  Run: **120 enriched → 61 new brokers synced + 76 listings linked.** Only
  seeds brokers table with real person names (raw contact stashed otherwise).
- Brokers table now ~1,260 rows (was ~1,100) — real names+emails+phones for
  cold outreach.

**Delisting/freshness** (`mark_delisted.js`) — marks listings delisted after
~2 missed full crawls (keeps row+financials for Market Multiples), emits
'delisted' events. Excludes targeted/mirror sources (businessbroker,
franchiseresales, bizquest) where absence ≠ delisting. Verified logic; live
effect starts on subsequent daily runs.

**PM action items:**
1. Merge lane/brokers (23 sources + 3 new scripts). All scraper-only.
2. **Wire `node mark_delisted.js` into the daily job** (after run_supabase).
3. `source_quality.js` is a good weekly PM report — consider surfacing on a
   Source Health dashboard tile (Lane B).
4. bizquest is confirmed dead weight (1,597 listings, 0 CF, 0 fit — pure
   BizBuySell mirror). Recommend disabling to cut ~1,600 junk rows + run time.
5. Relevance-keyword gap still open (add "painting"/"restore" to Green Industry
   Default screen profile — would recover ~15-20 real targets already in DB).

## 2026-07-11 — round 3: Tupelo Marketplace platform-wide (best yield of session)

- Web-search-driven discovery: **Tupelo SMB has a platform-wide marketplace**
  (tupelosmb.com/marketplace) aggregating EVERY broker on the CRM. Built
  `tupelomarket` — 50 state SSR pages, ~335 listings. First run: **18 Tier 1 +
  8 Tier 2** — the best thesis yield/run of the whole session. Green-industry
  (HVAC/plumbing/landscaping) surfaces across the platform. Disabled the narrow
  per-org `certifiedbb` (superseded; same Tupelo cuids).
- **Lesson: web-search for the PLATFORM behind a broker.** bizmls, Tupelo, and
  (earlier) GABB/Webflow are all multi-tenant platforms where one adapter yields
  many brokers. Worth periodically searching "business broker CRM/marketplace".
- Updated totals: **18,319 listings, 101 Tier 1 + 226 Tier 2, 23 sources.**
- Broker-enrichment walls hit: remaining gap sources are blocked —
  bizbuysell (Cloudflare on detail), fcbb (office-level only, no agent name),
  tupelomarket (broker gated behind NDA form), bbf (bizmls, thin). The
  well-structured broker sources (transworld, bizben, businessbroker, gabb)
  are already enriched. Owner-level contact is the Phase-5 proprietary channel,
  not broker sites — flagged as the real gap toward the END-STATE GOAL.

**Standing:** working continuously per John's never-stop directive. This session
added 12 sources + broker enrichment + source-quality analytics + delisting job.

## 2026-07-11 — loop iteration notes
- Re-probed GlobalBX (42k listings advertised): still Cloudflare-blocked (403
  "Just a moment"). Confirmed roster SKIP status; not fighting anti-bot evasion.
- BizNexus: GoHighLevel funnel, no public listings grid (re-confirmed). Skip.
- Next platform angles to try: regional Sunbelt sites (sunbeltmidwest.com has a
  dedicated green-industry /landscaping page; main sunbelt adapter under-scrapes
  the network — only ~36/run). Worth deeper Sunbelt-network coverage next.

## 2026-07-11 — loop iter: Sunbelt Midwest (139 listings + 33 agents)

- **Sunbelt Midwest** (`sunbeltmidwest.js`) — the MN/WI/IL Sunbelt group has
  its own inventory (separate from sunbeltnetwork.com). Next.js/Sanity embeds
  the FULL dataset in __NEXT_DATA__ — one fetch, no browser. 139 listings,
  **137 with listing-agent names → 33 new brokers linked**, 2 T1 + 2 T2.
- Other Sunbelt regionals probed (sunbeltsfl, sunbeltofflorida, sunbeltmd,
  sunbeltlasvegas): listing grids are JS-widget/interaction-gated with no
  API surfaced; each is maybe 20–50 listings — diminishing returns, skipped.
- Re-probed GlobalBX: still Cloudflare-blocked (roster SKIP confirmed).
- Running totals: **18,458 listings, 103 T1 + 228 T2, 25 sources** (24 enabled).

## 2026-07-11 — loop iter: DealRelations platform (3rd reusable platform)

- **DealRelations** (`dealrelations.js`) — multi-tenant broker CRM used by many
  Sunbelt regional offices. Per-broker subdomain (<sub>.dealrelations.com):
  /listings index + SSR detail pages w/ spec table (Price, Disc Earn=SDE,
  Sales=revenue, County, State) + **agent name + office phone**. Generic
  adapter; configured 3 subdomains (Naples FL, Pasadena CA, Atlanta GA) = 44
  listings, 6 brokers. More subdomains can be appended freely.
  ➡️ PM/future: web-search more <office>.dealrelations.com subdomains to expand
  (each Sunbelt office is one). thesunbeltbrokers uses /pages/listings (diff
  structure) — not yet supported.
- Explored + rejected this iter: CABB (/listings just proxies BizBuySell —
  already have it); MBBI (re-embeds BizBuySell); CVBBA (no public portal);
  Deal Studio (per-broker WordPress, no shared marketplace); other Sunbelt
  regionals (sunbeltsfl/md — JS widgets, no feed).
- **Three reusable platforms now cracked: bizmls, Tupelo, DealRelations** — the
  highest-leverage pattern for adding many brokers per adapter.
