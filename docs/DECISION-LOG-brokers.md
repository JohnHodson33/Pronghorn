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

## 2026-07-11 — loop iter (terse): dealrelations health (resilient to 404), no new source
- Health: dealrelations 190 listings; 1 detail 404 (a listing removed between
  index+detail fetch on seilertucker) — adapter tolerated + continued (working
  as designed). No new PM tasks.
- Tree/arborist/nursery/irrigation vertical: only covered aggregators + blocked
  DealStream. No new subdomain/broker.

## 2026-07-11 — loop iter: NEW source Southern Mergers (NC/SC priority states)

- Fencing-vertical search surfaced 2 new standalone brokers. Built the better
  one: **Southern Mergers** (southernmergers.com) — Carolinas (NC/SC priority) +
  FL. ASP LID pages; detail markup entity-escaped (decode→parse resultsBusiness
  template). 21 listings, 2 relevant (fence co + handyman franchise). Most
  listings keep financials confidential — names captured as priority-state leads.
- Also probed **CIBB** (SW FL, cibb.com) — clean /listings/<slug>/ with
  Asking/Owner-Benefit but only 5 listings → deprioritized (too small; noted as
  candidate if it grows).
- Health: bizmls clean (143). No new PM tasks. Source count ~30.

## 2026-07-11 — loop iter (terse): painting/concrete vertical — Canadian subdomain skipped
- Health: empire clean (26, 0 errors). No new PM tasks.
- Painting/concrete/paving search: 1 new DealRelations subdomain **scottmckenzie**
  but it's a BC/Canada broker (Fraser Valley) — all 15 listings off US thesis
  (no US state). SKIPPED to avoid geo-filtered clutter. Rest were DealStream
  (blocked) + BizBuySell/bizben (covered).
- Note: DealRelations includes Canadian brokers; dedupe-check geography before
  adding (US-thesis only).

## 2026-07-11 — loop iter: NEW source Business Brokers of Arizona (HOME priority state!)

- Switched search angle from DealRelations-verticals to "AZ green-industry
  broker" → found **Business Brokers of Arizona (BBAZ)**, azbusinessbrokers.com.
  Built azbb.js: Squarespace /search-listings, og:title name + body-text
  financials. 20 listings, **2 Tier 1** — AZ commercial electrical contractor
  ($1.3M CF) + 22yr AZ commercial plumbing co ($725K CF), plus pool construction.
  AZ = John's HOME priority state → high-value coverage.
- Hit Squarespace 429 rate-limiting → added retry/backoff (2.5/5/10s) + 1.5s
  delay; clean full run (20/20, 2 Tier 1).
- Health: wpbdp clean (13). No new PM tasks. Source count ~31.
- Lesson: priority-state + vertical searches ("<state> <vertical> broker
  listings") find home-turf brokers the DealRelations-only search misses.
  Other AZ candidates seen: cgkbusinesssales (outdoor/home-services LMM focus),
  businessbrokers-az, Cox Business Brokers AZ — probe next iters.

## 2026-07-11 — loop iter (terse): azbb stable; AZ candidates lack public grids
- Health: azbb re-run clean (20/20; retry absorbed a 429). Resilience confirmed
  on the new Squarespace source. No new PM tasks.
- Probed next AZ candidates (angle B): cgkbusinesssales (buy-side advisory, no
  public listings grid) + businessbrokers-az (confidential, no grid). Neither
  is a scrapeable source. Cox Business Brokers AZ still untried.

## 2026-07-11 — loop iter (terse): TX green-trade brokers — none usable
- Health: southernmergers clean (21, 0 errors). No new PM tasks.
- Angle B (TX green-trade specialists): Maverick Business Advisors (txmaverick.com)
  = DNS-fails/unresolvable; Lion Business Brokers = sell-side (no buy-side grid);
  rest DealStream (blocked) + BizBuySell/BizQuest (covered). No new source.

## 2026-07-12 — loop iter: shared fetchRetry (calder blip) + resurface open items

**Resilience:** health sweep caught calder failing with undici "fetch failed"
(transient blip; curl + retry both 200). Added SourceScraper.fetchRetry() and
wired calder/thefirm/sun. All single-request SSR sources can now survive a
network blip during the nightly run.

### 📌 FOR PM → pull into JOHN-OPEN-ITEMS.md (Lane A items not yet surfaced there)
1. **Screen-keyword gap (recovers ~15-25 real targets already in the DB):** the
   Green Industry Default screen profile's include-keywords miss common trade
   words — add **"painting"/"painters"**, **"restore"** (have "restoration" but
   not the bare "restore" ServiceMaster/CertaPro use), and **"fence"/"fencing"**.
   Editable in the Screen Criteria UI (screen_profiles) — a John/PM UI edit, not
   a code change. Would re-tier home-services listings already scraped.
2. **We Sell Restaurants (open decision):** clean public API, OFF-thesis
   (restaurants). Build for restaurant-vertical multiples coverage, or skip to
   keep the DB thesis-focused? Unbuilt pending John's call.
3. **Source count refresh for JOHN-OPEN-ITEMS Part 7:** Lane A is now **~31
   sources** (was "12 new today"). New standalone adapters this session: Empire
   (NC), Southern Mergers (NC/SC), BBAZ (AZ home state, 2 Tier1), wpbdp platform,
   Tupelo marketplace (18 Tier1). DealRelations grown to 13 broker subdomains.
   All committed to lane/brokers awaiting PM merge.

## 2026-07-12 — loop iter (terse): bizben resilient-clean, no new source (septic vertical)
- Health: bizben 4,396 listings, 0 errors (retry resilience holding). No new PM tasks.
- Septic/sewer/waste vertical: only DealStream (blocked) + BizQuest (disabled) +
  BizBuySell (covered). No new DealRelations subdomain or standalone broker.

## 2026-07-12 — loop iter: NEW source Alliant/Nashville Business Brokers (TN)
- Angle B (TN/GA green-industry search) → **Alliant Brokers** (Nashville TN,
  priority state). Built alliant.js: WP custom listing post type, /listing/<slug>/
  detail w/ h1 name + body-text Asking/CashFlow/GrossRevenue, status-suffix strip,
  shared fetchRetry. 11 listings, 2 relevant (electrical/generator installer +
  TN Valley fencing co). Source count ~32.
- Health: empire clean (26, 0 errors). No new PM tasks.
- Priority-state broker searches (angle B) now yielding: BBAZ (AZ), Alliant (TN),
  Empire (NC), Southern Mergers (NC/SC) — home-turf standalone brokers w/ grids.

## 2026-07-12 — loop iter (terse): GA broker search — none usable; alliant clean
- Health: alliant clean (11, 0 errors). No new PM tasks.
- Angle B (GA green-industry): North Atlanta Business Brokers = JS marketing
  page, no listings feed (only census/analytics XHR). FCBB Atlanta already
  covered via fcbb API; BMG already a DealRelations subdomain. No new source.

## 2026-07-12 — loop iter (terse): vr clean, no new source (electrical vertical)
- Health: vr clean (366, 0 errors). No new PM tasks.
- Electrical vertical DealRelations search: only DealStream (blocked) +
  BizBuySell/BizQuest/BusinessBroker/Synergy (covered). No new subdomain.

## 2026-07-12 — loop iter: NEW source InterMountain Business Brokers (CO)
- Angle B (CO green-industry) → **InterMountain Business Brokers** (Denver CO,
  priority state). Built intermountain.js: WP /businesses-for-sale-2 (the -1
  index 500s) → /business/<slug>; h1 name + K/M-aware PROSE financial parsing.
  8 listings, 3 relevant, **1 Tier 1 + 1 Tier 2** (home-based plumbing w/ full
  financials, residential HVAC). Source count ~33.
- Health: fcbb clean (825, 0 errors). No new PM tasks.
- Angle B priority-state tally: BBAZ(AZ), Alliant(TN), Empire(NC), Southern
  Mergers(NC/SC), InterMountain(CO) — 5 home-turf brokers built this session.

## 2026-07-12 — loop iter: NEW source Zion Business Brokers (UT — Wix-cracked)
- Angle B (UT green-industry) → **Zion Business Brokers** (Utah priority state,
  HVAC/landscaping focus). Wix site — cracked by parsing the SSR'd
  .wixui-rich-text blocks (Price/Revenues/SDE/Location/Title), grouping at
  "Price:" markers. 4 listings, all full financials + thesis (roofing/window,
  commercial landscaping, window cleaning). 1 Tier 1 (commercial landscaping).
  Source count ~34. Note: Wix rich-text parsing is a new reusable technique for
  other Wix broker sites.
- Health: intermountain clean (8, 0 errors). No new PM tasks.
- Angle B priority-state tally now 6: BBAZ(AZ), Alliant(TN), Empire(NC),
  Southern Mergers(NC/SC), InterMountain(CO), Zion(UT).

## 2026-07-12 — loop iter (terse): zion clean, no new source (NV)
- Health: zion clean (4, 0 errors). No new PM tasks.
- Angle B (NV green-industry): no clean standalone broker w/ public grid —
  results were BizBuySell/BMG (covered), Sunbelt Las Vegas (covered), IBBA/Procore
  directories. NV is Sunbelt+aggregator-dominated. No new source.

## 2026-07-12 — loop iter (terse): hedgestone clean, no new source (pool/gutter)
- Health: hedgestone clean (720, 0 errors). No new PM tasks.
- Pool/gutter/chimney DealRelations search: hits on already-configured subdomains
  (smallbusinessdeal, crowneatlantic) + covered aggregators. No new subdomain.

## 2026-07-12 — loop iter: full audit healthy (19,271 listings, 113 T1); NM probed
- **Full source-quality audit:** 19,271 listings, **113 Tier 1 + 234 Tier 2**
  across ~34 sources (up ~670 from the 6 new priority-state brokers this
  session). All sources present w/ data, no broken parses. bizquest (disabled,
  stale rows) + linkbusiness still the only low-fit flags.
- Angle B (NM): **Sam Goldenberg & Associates** (Santa Fe/ABQ, NM priority) —
  wp-views AJAX listings (the $ figures were a price-range FILTER, not listings);
  no SSR grid. Small NM market → not worth wp-views AJAX reverse-engineering.
  Synergy ABQ already covered. NM effectively covered/aggregator-dominated.

## 2026-07-12 — loop iter (terse): health checks clean (viking, azbb)
- Health: viking clean (45, 0 errors); azbb clean (20/20 — retry absorbed 429s
  to 0 net errors, resilience confirmed under real Squarespace rate-limiting).
  No new PM tasks. No new-source probe this iter (frontier explored; maintenance-weighted).

## 2026-07-12 — loop iter: linkbusiness low-fit flag investigated (RESOLVED, keep as comps)
- **Full source-quality audit run:** 19,271 listings, 113 T1 + 234 T2, all
  enabled sources re-scraped 07-12 (nightly path healthy). Only linkbusiness +
  (disabled) bizquest carry the low-value flag.
- **Ran down the linkbusiness 0-thesis-fit flag** (483 active, 0 T1/T2). Probed
  the DB: parse is HEALTHY — 0 null industries, well-categorized, 204/483 w/ CF.
  The 0-fit is GENUINE, not a bug: LINK-US inventory skews restaurant/food (128),
  retail (89), professional services (38), manufacturing (31), hospitality (24),
  healthcare (22). Green tail is real but thin (~22: cleaning×8, property
  maint×5, plumbing×2, tree care×2, hvac×2, restoration/pool/fence×1) AND those
  are small sub-$300K-SDE shops that can't clear the screen.
- **Decision: KEEP (do not disable).** Unlike bizquest (pure BizBuySell mirror),
  linkbusiness is 483 UNIQUE US listings w/ 204 CF-bearing comps across many
  industries — real denominator value for the market-multiples engine + broker
  contacts. Cutting unique comp data is a PM call, not a lane cleanup. Reclassify
  mentally as a comps-only source, not a deal-surfacing one.
- **For PM/John:** if browser-run cost (puppeteer, ~25 pages nightly) ever needs
  trimming, linkbusiness is the first comps-only source to cut — but only if the
  multiples engine doesn't want the extra US comps. No action taken.

## 2026-07-12 — loop iter (terse): dealrelations + calder clean; merged PM enrichment
- Merged origin/main (PM's one-click cascading enrichment + graph_mail.js — other
  lanes, no Lane A change). No new Lane A tasks.
- Health: dealrelations 190 across all 13 subdomains (10 w/ agent contacts),
  calder 37 — clean. One `cannabinoid` detail 404 = benign listing-level
  delisting churn (a slug on an index whose detail page is gone), not a
  subdomain/config issue; cannabis listing, non-thesis regardless.

## 2026-07-12 — loop iter: closed intake half of the painting/restore keyword gap
- **Config intake fix (Lane A-owned):** added `painting`, `painters`,
  `painting contractor`, and bare `restore` to
  `relevance.industry_keywords_include`. Confirmed filters.js:60 is a HARD drop —
  a listing matching no include-keyword never reaches the DB — so painting-only
  listings were being discarded at intake, upstream of (and separate from) the
  PM-owned screen_profiles tiering gap I flagged 7/11.
- Whole-word `\b..\b` case-insensitive matcher (filters.js:14–23) → `restore`
  won't false-match `restoration`/`restaurant`; additive change only widens
  intake (size + geo + Haiku tiering still apply). JSON validated.
- **Justification (not speculative):** DB already holds 50+ painting listings
  that slipped in via adjacent keywords (Property Maintenance / Restoration /
  Construction-Contractor), incl. an Orlando painting co at $450K+ SDE (clears
  the $300K floor). Painting-only listings that matched nothing were lost.
  Recovery lands on the next full scrape.
- **Still open for PM (unchanged):** the screen_profiles "Green Industry Default"
  profile (UI-editable, shared DB) also lacks painting/restore → even recovered
  intake won't be Tier-1/2'd until John adds them via the Screen Criteria editor.
  Intake (mine) is now fixed; tiering (PM) still pending.

## 2026-07-12 — loop iter (terse): verified painting/restore intake fix; PM merged it to main
- PM fast-forwarded lane/brokers → my painting/restore config commit is now on
  main. PM also added docs/OUTREACH-STRATEGY.md (sending-side; no Lane A action).
- **Verified the intake fix** via unit test against live config: painting-only,
  "Five Star Painters", "ServiceMaster Restore", "CertaPro" all now KEEP (would
  have dropped pre-7/12); generic control DROPs; "Downtown Restaurant" DROPs —
  confirming bare `restore` does NOT false-match `restaurant` (whole-word bound).

## 2026-07-12 — loop iter (terse): TABB probed → BizBuySell mirror, skipped
- Up to date, no new PM tasks. New-source probe (angle: TX state broker assoc).
- **Texas Assoc of Business Brokers (tabb.org)** — TX priority state, oldest US
  broker assoc (1979). Listings page (/bizbuysell.php) is an `<iframe src=
  bizbuysell.com/search/tabb/...>` — a broker-filtered subset of BizBuySell,
  which we already scrape in full. Zero unique inventory → SKIP (mirror, same
  call as disabled bizquest). Other assoc MLS (WA CommercialMLS) = non-priority.

## 2026-07-12 — loop iter: broker-contact gap investigated → structural, not a parse miss
- Full audit clean: 19,271 listings, 113 T1 + 234 T2, all enabled sources fresh
  07-12, no drift. (painting/restore intake recovery lands on next full scrape.)
- Ran down the persistent **broker-contact gap** (audit flags 9 sources w/ ≥3
  thesis-fit but 0 brokers: tupelomarket, bizbuysell, fcbb, bbf, murphy,
  hedgestone, businessesforsale, vr, empire). Checked whether it's fixable:
  - **tupelomarket:** Tupelo public API exposes firm but NO individual agent
    name (tupelo.js:66 already documents this) → can't seed a person row.
  - **bbf (best case — assoc MLS):** detail pages (a-bus-d.asp) DO carry contact,
    but only **office brokerage + direct/cell phone + office address** (e.g.
    "Sunbelt Business Brokers of South FL", (561) 832-9222). Individual agent
    NAME is not published; email is form-gated (no plaintext @).
- **Conclusion — structural, not neglect:** the established enrichment convention
  (businessbroker.js:133 — "only seed brokers table when there's a real person
  name; else keep in raw") means office-only contact can't populate broker rows.
  These MLS/aggregator pages deliberately withhold individual agent PII. So the
  gap isn't a parse bug and isn't closeable under current rules. NOT building a
  browser detail-fetch that only writes office phone to raw (low value + partly
  redundant with the national `sunbelt` source).
- **For PM/John (decision needed):** cold-calling is the primary channel, so
  office/brokerage phone IS useful. If you want it, that's a deliberate
  data-model change: allow FIRM/office contacts (company + phone, no person) into
  the brokers table. Say the word and I'll build gated detail-fetch enrichment
  for bbf + fcbb + the bizmls national source (office phone → brokers, flagged
  is_firm=true). Until then the "person-name-only" rule stands and the gap is WAI.

## 2026-07-13 — loop iter (terse): zion + southernmergers health clean (parse quality verified)
- Merged origin/main (PM owner-name cascade: Hunter $49 approved, SoS/corp-registry
  free unlocks — enrichment lane, no Lane A change). No new Lane A tasks.
- Health: southernmergers 21/0 errors, zion 4 — counts match DB. Spot-checked
  zion Wix parse QUALITY (not just count): clean names + asking/rev/SDE + UT on
  all 4 (incl. roofing co. $499K SDE = T1). Fragile rich-text grouping holds, no drift.

## 2026-07-13 — loop iter (terse): green-specialist probe → BBF member, already covered
- Up to date, no new PM tasks. New-source probe (angle A + B, green verticals).
- Angle A: "dealrelations.com landscaping/lawn/pest/tree" → only hit is
  sunbeltnaples (already subdomain #1). No new DealRelations subdomain.
- Angle B: **acquisitionexperts.net** (FL lawn-care/landscaping specialist broker)
  — listings are an `<iframe src=bbms.info/listings/bbf-170/...>`, i.e. BBF member
  broker #170's feed off the Business Brokers of Florida MLS, which our `bbf`
  source already scrapes in full (all ~2,115 FL member listings). Subset, no
  unique inventory → SKIP. Signal: FL green-vertical specialists route through
  BBF (already covered), so they're not a productive new-source frontier.

## 2026-07-13 — loop iter (terse): fcbb + intermountain health clean
- Up to date, no new PM tasks. Health: fcbb 825/0 errors (matches DB), intermountain
  8/0 errors. Spot-checked intermountain K/M prose parse: names/state/asking clean;
  full financials extracted where prose states them (home-based plumbing $800K ask /
  $1.19M rev / $465K SDE = T1). Rev/CF nulls elsewhere = teaser pages w/o stated
  financials (WAI per adapter design), not drift. Both parsers holding.

## 2026-07-13 — AUTONOMY NIGHT: shipped freshness-alerting; 2 brain suggestions drafted (posting BLOCKED)
- New PM directive merged (0ac79d3): AUTONOMY NIGHT ORDER — each lane posts ≥2
  brain suggestions + ships ≥1 unprompted automation that removes human clicks.
- **SHIPPED (self-iterate quota, automation):** source_quality.js now auto-flags
  ENABLED sources with no rows in >48h (or missing from DB) as 🔴 STALE/BROKEN —
  the automated replacement for hand-checking each scraper; only exceptions
  surface. Verified: "✅ all 30 enabled sources fresh within 48h" (disabled
  bizquest/certifiedbb correctly excluded). Feeds the nightly source-quality CI
  artifact so John sees broken scrapers without anyone running them by hand.
- **BLOCKED — 2 brain suggestions could not be posted.** Writing to the shared
  `feedback` table (POST /api/feedback) was denied by the write guardrail: an
  agent publishing under its own identity to a shared UI, authorized only by
  TASK-QUEUE content, needs John's explicit OK / a permission rule. Did NOT
  route around it. The two "bigger-swing" suggestions, preserved here for John to
  post or approve:
  1. **Auto-promote Tier-1 listings → pursuit pipeline** (remove the triage
     click): nightly job opens a pursuit for any T1 clearing HARD criteria
     (priority state + CF $300K–$10M + thesis keyword + not delisted + not
     mirror-dup), stage 'new', w/ a "why it qualified" receipt. Human touch
     becomes approve/reject, never data entry. Never contacts anyone; reversible.
  2. **Automated source-health alerting** (bigger version of what shipped
     tonight): trailing-7-run baseline per source; flag >25% count drop or
     null-financial-rate spike (silent parse break) → compact digest to the
     brain / Key Actions. Removes the manual health sweep entirely.
- ACTION FOR JOHN/PM: approve me writing agent 'suggestion' rows to /api/feedback
  (or add a permission rule), or post these two yourself. Until then they live here.

## 2026-07-13 — loop iter (terse): murphy + empire health clean; AUTONOMY suggestions still pending
- Merged big AUTONOMY-NIGHT origin/main (other lanes' approved suggestions:
  call-prep one-pager, owner-language mirroring, scraper/auto_draft_owners.js =
  enrichment lane [queues owner drafts, never sends] — not Lane A, no conflict).
  Lane A queue unchanged; my 2 brain suggestions still un-triaged (John offline).
- Health: murphy 456/0 err (95% CF, 89% state — high completeness), empire 26/0
  err (100% CF; state 1/26 = inherent to empire's blind M&A profiles, not drift).
  Both parsers holding.

## 2026-07-13 — loop iter (terse): alliant + vr health clean; morning brief reflects Lane A
- Merged origin/main (Lane C Outlook/deal-mail automation — scraper/ but not
  broker-sources, no conflict). No Lane A tasks; my 2 brain suggestions still
  un-triaged/un-approved (PM morning brief line 57 shows feedback queue = 0 agent
  items → confirms my blocked write; log entry stands as the pickup path).
- Health: vr 366/0 err, alliant 11/0 err. alliant glued-label parse + name-based
  state inference verified clean (TN fencing co $399K SDE, electrical/generator
  installer $249K KY — quality thesis inventory). No drift.
