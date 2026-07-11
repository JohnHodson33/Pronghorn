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

## 2026-07-11 — loop iter: DealRelations expanded 3→8 brokers (+2nd template)

- `site:dealrelations.com` search revealed the platform serves independent
  brokers beyond Sunbelt. Added IAG Merger, VR Triangle NC, Sofranko PA, Valley,
  TeriCraft (+ existing 3 Sunbelt offices) = **8 offices, 116 listings, 72 new**.
- These non-Sunbelt brokers use a 2nd detail template (`.top-text`: Price/
  Revenue/Adjusted Cash Flow/Location) — added a fallback parse + humanized-slug
  names. Now handles both DealRelations layouts. 14/27 non-Sunbelt listings had
  disclosed financials (rest confidential); 2 Tier 1 incl. $3.1M-CF landscaping.
- ➡️ Easy future expansion: keep adding <office>.dealrelations.com subdomains
  (search surfaces them). Agent-name parsing works on template A (Sunbelt) only;
  template B has no agent block on the page.
- Totals: **18,574 listings, 105 T1 + 229 T2, 27 sources.** All parses healthy.

## 2026-07-11 — loop iter: DealRelations +2, vertical-coverage verification

- DealRelations expanded to **10 broker offices** (added Franchise Brokers
  Association, Seiler Tucker) = 145 listings. Platform is now near-exhausted:
  each broker caps ~15 listings (no pagination), so further subdomains yield
  ~15 each — low marginal value. Adapter supports both page templates.
- **Verified thesis-vertical coverage** (rather than build redundant sources):
  - Pool routes: dedicated route-broker sites (poolroutesales.com etc.) are
    inquiry-only marketing pages; National Pool Route Sales actually lists its
    ~110 routes on businessesforsale.com (already scraped). **86 pool listings
    already in DB** across 11 sources. No net-new source needed.
  - Pest control: specialist M&A firms (Cetane, PCO Bookkeepers, Preferred,
    Capstone) are sell-side ADVISORS with no public buy-side grids. Pest flows
    through aggregators. **31 pest listings already in DB.**
- Takeaway for PM: the green-industry verticals (pool/pest/HVAC/landscape) are
  well-covered by the aggregators + networks already live. Net-new source yield
  is diminishing; the higher-leverage frontier is now Phase 5 (proprietary
  owner list-building) — a Lane C/PM concern, not broker scraping.

## 2026-07-11 — loop iter: source health + dropped bizquest + build-vs-buy flag

- **Self-iterate health check**: re-ran synergy (20), viking (45), sunbelt (36)
  — all parse cleanly, 0 errors. No silent breakage. All 25 enabled sources
  healthy in source_quality.js (18,603 listings, 105 T1 + 229 T2).
- **Dropped bizquest** (source-quality "drop low-value"): pure BizBuySell mirror,
  1,597 listings, 0 thesis-fit, 0 CF, 100% mirror-dedup → disabled in config +
  DB. Saves ~30 pages/day for zero lost value.
- ⭐ **DECISION FOR JOHN — build vs. buy:** Kumo (withkumo.com) and BizScout
  aggregate **100,000+ / 20,000+** broker listings respectively — AI-deduped,
  CSV export, daily alerts — but are **paid, login-gated** (I did NOT attempt to
  scrape; credentials boundary). Our scraper now covers ~18.6k listings across
  27 sources for $0. A Kumo subscription would ~5x coverage instantly and dedupe
  across everything. Worth pricing out vs. the maintenance cost of 27 adapters.
  If John subscribes, Kumo's CSV export could feed the same Supabase pipeline.
- **Assessment:** free-broker-source discovery is effectively saturated. The
  green-industry verticals and all major aggregators/networks/associations/
  platforms are live. Further Lane A value is now (a) maintenance/health of
  existing adapters, (b) the Kumo build-vs-buy call, (c) shifting effort to
  Phase 5 proprietary owner list-building (Lane C).

## 2026-07-11 — loop iter: OPS AUTOMATION (4 GitHub Actions workflows) ✅

PM's 🔥 top Lane A task delivered. Four workflows in `.github/workflows/`
(Lane A owns), all `workflow_dispatch` + daily cron (America/Phoenix, no DST):
- **nightly-scrape.yml** — 06:00. Full pipeline: all enabled sources + mirror
  dedup + Claude screener. Inputs: source subset, no_screen.
- **delisting.yml** — 07:00. `mark_delisted.js` freshness pass (self-guarded;
  1h after scrape so last_run_at is fresh). Inputs: dry_run, grace_hours.
- **source-quality.yml** — 07:30. `source_quality.js` → uploaded report artifact
  (30-day retention) so PM/John see per-source yield without a checkout.
- **enrichment.yml** — 08:00 & 14:00. `enrich/run_enrichment.js` owner-contact
  ticks (Lane C's worker). Input: limit.

Implementation notes:
- CI is Linux but `puppeteer-core` has no bundled Chromium → each browser job
  installs Chrome (`browser-actions/setup-chrome`) and passes its path via a NEW
  **`CHROME_PATH` env fallback** added to `core/source_base.js` (backward-
  compatible: Windows default still used when the env is unset). ⚠️ This touches
  a shared core file — flagging for PM. It's additive/low-risk.
- All 4 YAML files validated with js-yaml. Pursuit ingest (`ingest_pursuit.js`)
  stays manual — it needs a file argument, not schedulable.

### 🔑 ACTION FOR JOHN — add these GitHub repo secrets
(GitHub → repo Settings → Secrets and variables → Actions → New repository secret)
Workflows are **dormant until these exist**; once added they run on schedule.
| Secret name | Value | Used by |
|---|---|---|
| `SUPABASE_URL` | Supabase project URL | all workflows |
| `SUPABASE_SERVICE_KEY` | Supabase service-role (secret) key | all workflows |
| `ANTHROPIC_API_KEY` | Claude API key | scrape (screener), enrichment |
| `EXA_API_KEY` | Exa key (already in .env) | enrichment |
| `HUNTER_API_KEY` | Hunter.io key | enrichment |

After adding: test each via GitHub → Actions → pick workflow → "Run workflow"
(workflow_dispatch) before trusting the cron. Recommend running
delisting.yml with dry_run=true first.

## 2026-07-11 — loop iter: health sweep clean + sunbelt coverage diagnosis

- **Health sweep:** re-ran murphy (456), fcbb (825), hedgestone (720) — all
  parse clean, 0 errors. `mark_delisted.js --dry-run` → 0 (correct; nothing
  stale yet). All 25 enabled sources confirmed healthy.
- **Sunbelt coverage diagnosis (not fixed — low ROI):** the national
  sunbeltnetwork.com service category alone renders **184 results**, but the
  `sunbelt` adapter collects only ~36 cards (page 1 of 5 thesis categories).
  The gap is **JS click-pagination** (`javascript:void(0)`, form POST to
  /business-results/, no working `?page=N` URL) — same class as the Transworld
  challenge. The detail-fetch cap (120) is NOT the binding constraint; card
  collection is. Considered a thesis-keyword detail-prioritization tweak but it
  was a no-op while cards(36) < cap(120), so reverted to avoid dead complexity.
  ➡️ Real fix = drive click-pagination per category (Transworld-style). LOW
  PRIORITY: sunbelt currently yields 0 Tier 1/2 from its 36, and the categories
  are broad (mostly off-thesis), so expected incremental thesis yield is small.
  Logged for the PM as a known coverage lever if the biggest network is worth a
  dedicated session later.

## 2026-07-11 — loop iter: health sweep CAUGHT + FIXED a bizben resilience bug

- **bizben was silently under-collecting.** Health-sweep re-run returned only
  757 listings (vs 4,433) — BizBen's AWS API Gateway throws intermittent HTTP
  500s under rapid pagination, and the adapter `break`s the whole token-chained
  pool on the first error. On a transient blip the daily run would lose ~80% of
  BizBen's inventory with no crash/alert.
- **Fixed:** added `fetchPage()` with exponential backoff (1.5s/3s/6s, 4 tries)
  on 429/5xx + network errors. Verified recovery, 0 errors. Committed.
- gabb health-checked: 200 listings, clean.
- ➡️ Note for PM: other token/page-chained fetch adapters (tupelomarket,
  dealrelations, fcbb) also break-on-first-error but are far less 500-prone
  (SSR/stable APIs). Left as-is; the bizben AWS gateway was uniquely fragile.
  If a daily run ever shows a source's count crater, this class of transient
  error is the first suspect — the source_quality report will surface it.
- **This is the value of the maintenance loop:** a silent data-loss bug that
  only surfaces under load, caught by rotating health sweeps.

## 2026-07-11 — loop iter: systematic resilience pass (fcbb + murphy)

- Health-swept businessesforsale (595), tupelomarket (335), sunbeltmidwest
  (139) — all clean, 0 errors, matching prior counts.
- Applied the bizben transient-500 fix to the other two paginated-API adapters
  with the same break-on-first-error pattern:
  - **fcbb** — `postJson()` retry/backoff; page-numbered pagination means a
    failed page is now skipped (up to a 4-error cap), not fatal.
  - **murphy** — `postText()` retry/backoff; same skip-not-fatal behavior.
  Both re-verified: fcbb 825, murphy 456, 0 errors.
- All paginated-API broker sources (bizben, fcbb, murphy) now survive transient
  429/5xx + network blips. SSR sources (sun, hedgestone, vr, calder, thefirm)
  are single-request or naturally page-independent; transworld/tupelomarket/
  dealrelations already tolerate multiple errors before stopping. The
  break-on-first-error data-loss class is now closed across the roster.

## 2026-07-11 — loop iter: FULL-ROSTER health verification (all clean)

- Ran source_quality.js + health-checked the last stale source (bizbuysell,
  browser-based): **1,583 listings, 30 pages, 0 errors, not Cloudflare-blocked.**
- **Entire roster now verified healthy this session** — all 25 enabled sources
  parse cleanly. bizben restored to 4,518 (retry fix confirmed working in the
  audit, up from the 757 transient-500 under-collection). No broken parses.
- Current totals: ~18,700 listings, 105 T1 + 229 T2, 27 sources (25 enabled;
  bizquest + certifiedbb disabled).
- **State of the broker prong: complete + hardened + self-maintaining.** Free-
  source discovery saturated, 3 reusable platforms, broker enrichment on the
  high-yield sources, delisting + source-quality jobs, 4 CI workflows (dormant
  pending John's secrets), all paginated-API adapters retry-resilient.
- Lengthening loop cadence to ~1h: the system is stable and healthy, so the
  marginal value of a 30-min health check is low. Still watching for PM
  merges/new tasks and opportunistic platforms; will tighten cadence again if
  something actionable appears.

## 2026-07-11 — loop iter: health check (bbf clean) + BayState/wpbdp probe

- Health: bbf re-run clean (2,102 listings, 0 errors). No new PM tasks in queue.
- HVAC-vertical hunt: specialist HVAC brokers (Cetane, Business Modification
  Group, ROI) are advisory-only (no public grids); the marketplaces (BizBuySell,
  BusinessBroker.net, Synergy, DealStream) are already covered or blocked.
- **BayState Business Brokers** (MA/CT/NH/RI regional) — WordPress
  `business-directory-plugin` (wpbdp). Listings render behind the plugin's own
  view (no wp-json route, no detail links on the /businesses-for-sale index).
  One small NE office — low volume, not a quick win. BUT wpbdp is a widely-used
  plugin → potential reusable pattern like DealRelations. ➡️ Logged as a
  candidate for a dedicated session: reverse the wpbdp listing view/AJAX once,
  then many brokers on that plugin become addable. Low priority (regional, small).

## 2026-07-11 — loop iter: 4th reusable platform — wpbdp adapter built

- Cracked the BayState/wpbdp lead from last iter into a **generic
  `wpbdp.js`** adapter (4th reusable platform after bizmls, Tupelo,
  DealRelations). WordPress business-directory-plugin: `?wpbdp_view=all_listings`
  index → detail pages with `wpbdp-field-*` rows (Revenue, Cash Flow, Asking,
  location, **Broker name**). Add directory URLs in config.
- Fixed 2 parse bugs before shipping: og:title for clean names; first-dollar
  extraction so parenthetical amounts don't concatenate (was producing
  $14.6M from "$146,000 (add'l $48K…)").
- First broker (BayState, New England): 13 listings, 6 brokers linked, 0 thesis
  this batch (current inventory = liquor/ecommerce/auto). Value is the pattern.
- ➡️ Expansion note: web search does NOT index the wpbdp footprint well
  (technical param). More wpbdp brokers will be added as encountered, or via a
  footprint search (e.g. PublicWWW/BuiltWith for "business-directory-plugin" +
  "for sale") — a good ad-hoc task for John if he wants to scale this platform.
- Health: bbf re-verified clean (2,102, 0 errors) this iter.
- **4 reusable platforms now live** (bizmls, Tupelo, DealRelations, wpbdp) +
  ~28 sources.

## 2026-07-11 — loop iter: HVAC-specialist broker added to DealRelations

- Health: vr (366) + calder (37) re-run clean, 0 errors.
- Opportunistic win: **Business Modification Group** (HVAC/plumbing-exclusive
  M&A specialist) lists on DealRelations → added as an 11th subdomain. All 15
  listings are thesis-vertical (HVAC/heating-and-air/plumbing by region).
  Financials confidential (a 3rd DealRelations detail template with no public
  $ values), so no tier hits, but they lifted the source's thesis-relevant
  count 12→27 — captured as green-industry leads.
- Reinforces the DealRelations platform value: specialist green-industry
  brokers (not just generalists) use it. Worth periodically searching
  "<vertical> dealrelations.com/listings" for more thesis-specialist subdomains.

## 2026-07-11 — loop iter: green-vertical DealRelations search (none new) + linkbusiness health

- Searched landscape/pool/pest/tree "dealrelations.com/listings" — hits were on
  subdomains already configured (sunbeltnaples) or blocked aggregators
  (DealStream). No new specialist subdomain this round.
- Health: linkbusiness re-run clean (482 listings, 21 pages, 0 errors).
- No new PM tasks. System remains complete + healthy; iterations increasingly
  confirm "all clean" — the honest state of a saturated, well-maintained prong.

## 2026-07-11 — loop iter: +2 DealRelations FL brokers (KMF, Crowne Atlantic)

- Cheap recurring win worked: "restoration/cleaning/roofing dealrelations.com"
  search surfaced 2 NEW subdomains — **kmfbusinessadvisors** (carpet cleaning)
  and **crowneatlantic** (roofing), both FL, both thesis-vertical. Added → 13
  DealRelations broker offices, 190 listings, +30 new.
- Health: thefirm re-run clean (29, 0 errors). No new PM tasks.
- The DealRelations subdomain-hunt continues to yield ~1-2 green-relevant
  brokers per varied-vertical search — a reliable low-cost expansion lane.

## 2026-07-11 — loop iter: pool/pest DealRelations search (none new) + VestedBB probe

- Rotated vertical search (pool/pest/septic/irrigation/fencing) — no NEW
  DealRelations subdomain (hits were BizBuySell/DealStream, already covered/blocked).
- Probed **VestedBB.com** (surfaced in results): NYC-focused broker,
  listings JS-rendered (index HTML has 0 detail links), inventory skews urban
  retail/food (bars, barber shops, restaurants). Low green-industry relevance +
  JS-render effort → deprioritized. Noted as a probed candidate.
- Health: hedgestone re-run clean (720, 0 errors). No new PM tasks.

## 2026-07-11 — loop iter (terse): health clean, no new source
- Health: businessesforsale re-run clean (595, 40 pages, 0 errors). No new PM tasks.
- Vertical search (electrical/tree/painting/concrete/paving): only DealStream
  (DataDome-blocked) + BizBuySell (covered). No new DealRelations subdomain.
- Note: DealStream recurs with strong green-industry inventory (paving/electrical/
  pest) but stays captcha-walled — a standing "worth a paid/manual approach?"
  question for John if he wants that inventory (can't scrape unattended).

## 2026-07-11 — loop iter: NEW source Empire Business Brokers (NC)

- Restoration-vertical search surfaced a NEW platform: **Empire Business
  Brokers** (empirebizbroker.com, NC). Built `empire.js` — SSR PHP, index →
  detail pages with clean .detail-label/.detail-value pairs. 26 active listings
  (8 sold skipped), full financials (Asking/Gross/CashFlow/RealEstate), LMM
  sizes. **3 relevant, 2 Tier 1** (incl. niche electrical contractor). Good hit
  rate for a single independent broker.
- Health: gabb re-run clean (200). No new PM tasks.
- Reminder for the hunt: vertical searches occasionally surface a NEW standalone
  broker (not just DealRelations subdomains) — worth probing those too, not only
  the platform subdomains.
- Source count now ~29 (empire added).

## 2026-07-11 — loop iter (terse): health clean, no new source
- Health: tupelomarket clean (335, 0 errors). No new PM tasks.
- Cleaning/janitorial vertical: only DealStream (blocked) + BizBuySell/BizQuest
  (covered/mirror). No new DealRelations subdomain or standalone broker.
