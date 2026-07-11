# Broker Scrape Sources — target roster

Goal: 50+ live sources. Status: `candidate` → `adapter-built` → `live` → (`blocked` / `retired`).
Every source also gets a row in the `scrape_sources` table (candidates seeded disabled).
**Standing rules:** every broker we meet gets their site checked for a listings page;
revisit this roster monthly; source-quality analytics (listings/week per source)
decide which adapters are worth maintaining.

## Tier 1 — Major aggregators / marketplaces

| Source | URL | Status | Notes |
|---|---|---|---|
| BizBuySell | bizbuysell.com | **adapter-built** | Working Puppeteer adapter (`scraper/sources/bizbuysell.js`); weekly run live on old copy until cutover |
| BizQuest | bizquest.com | **deprioritized** | Probed 2026-07-10: near-total MIRROR of BizBuySell (identical JSON-LD, same product IDs, same order — shared CoStar feed). ~Zero incremental inventory |
| BusinessBroker.net | businessbroker.net | **adapter-built** | Live 2026-07-10 (`scraper/sources/businessbroker.js`). Independent inventory. Targeted keyword/industry-page crawl; no dedicated pest/HVAC pages — they surface in landscaping/repair/construction pages |
| DealStream | dealstream.com | candidate | Formerly MergerNetwork |
| BusinessesForSale.com | businessesforsale.com | candidate | International + US |
| BusinessMart | businessmart.com | candidate | |
| BizBen | bizben.com | candidate | California-focused |
| GlobalBX | globalbx.com | candidate | Free listing site |
| LoopNet (business-for-sale) | loopnet.com | candidate | CoStar — aggressive anti-bot, expect hard |
| BizNexus | biznexus.com | candidate | Aggregates other sources — evaluate overlap value |
| Acquire.com | acquire.com | candidate | Mostly online businesses — low priority |
| Axial | axial.net | **blocked** | Email-teaser ingest only (no blind teasers as deals) |

## Tier 2 — National brokerage networks (own listing pages)

| Source | URL | Status | Notes |
|---|---|---|---|
| Sunbelt Business Brokers | sunbeltnetwork.com | candidate | Largest franchise network |
| Transworld Business Advisors | tworld.com | candidate | |
| Murphy Business | murphybusiness.com | candidate | Existing relationship (Luis Zavala) |
| VR Business Brokers | vrbusinessbrokers.com | candidate | Existing relationship (Ramzi Daklouche) |
| First Choice Business Brokers | fcbb.com | candidate | |
| Link Business | linkbusiness.com | candidate | |
| Calhoun Companies | calhouncompanies.com | candidate | Upper Midwest |
| Peterson Acquisitions | petersonacquisitions.com | candidate | |
| Raincatcher | raincatcher.com | candidate | |
| Viking Mergers & Acquisitions | vikingmergers.com | candidate | Southeast — priority-state coverage |
| Synergy Business Brokers | synergybb.com | candidate | |
| Woodbridge International | woodbridgegrp.com | candidate | |
| Benchmark International | benchmarkintl.com | candidate | Lower middle market |
| Sun Acquisitions | sunacquisitions.com | candidate | Chicago/Midwest |
| Hedgestone Business Advisors | hedgestone.com | candidate | |
| Website Closers | websiteclosers.com | candidate | Some services businesses — low priority |

## Tier 3 — State/regional broker association MLS portals

These are multi-broker listing databases — one adapter covers many brokerages.
High value per adapter.

| Source | URL | Status | Notes |
|---|---|---|---|
| Business Brokers of Florida (BBF) | bbfmls.com | candidate | True MLS — largest state association |
| Texas Assoc. of Business Brokers (TABB) | tabb.org | candidate | Priority state |
| Georgia Assoc. of Business Brokers (GABB) | gabb.org | candidate | Priority state |
| California Assoc. of Business Brokers (CABB) | cabb.org | candidate | |
| Carolinas-Virginia Business Brokers (CVBBA) | cvbba.com | candidate | Priority states NC/SC |
| Midwest Business Brokers & Intermediaries (MBBI) | mbbi.org | candidate | |
| Arizona Business Brokers Assoc. (AZBBA) | azbba.org | candidate | Home priority state |
| M&A Source member listings | masource.org | candidate | Lower middle market |
| IBBA member directory | ibba.org | candidate | Broker discovery more than listings |

## Tier 4 — Green-industry / sector specialists

| Source | URL | Status | Notes |
|---|---|---|---|
| Principium Group (White Oak) | principiumgroup.com | candidate | Ron Edmonds — green industry M&A; existing relationship |
| The Advisory Investment Bank | — | candidate | Oliver Bogner — Landmark Pest deal |
| Three Sixty Seven Advisors | — | candidate | Existing broker contact |
| PCO M&A Specialists (pest) | — | candidate | Pest-control-specific intermediary — research |
| Landscape/tree/pool specialist shops | — | research | Brainstorm monthly; harvest from broker meetings |

## Tier 5 — Franchise resale (route/service businesses surface here)

| Source | URL | Status | Notes |
|---|---|---|---|
| Franchise Resales | franchiseresales.com | candidate | Lawn/pest franchises resell here |
| FranchiseGator resales | franchisegator.com | candidate | Low priority |

## Probe intelligence (2026-07-10 batch sweep) — build difficulty & gatekeeping

**Key finding for John: NO login walls found anywhere in the probed roster.**
Everything below is build-work, not credentials. Axial remains the only
credentialed source (no unattended scrape possible — email ingest + co-pilot
browser sessions only).

| Source | Verdict | Detail |
|---|---|---|
| Synergy | ✅ **LIVE** | Clean cards; 20 listings |
| Viking Mergers | ✅ **LIVE** | 45 listings, EBITDA-forward, Southeast priority states; 1 Tier 1 on first run |
| Sunbelt | ✅ **LIVE** | Two-level crawl: category pages → detail pages for full financials incl. Adjusted EBITDA. Not login-gated. 36 listings/run (cap 120), 33 with clean cash flow |
| Transworld | 🟡 WIP (adapter drafted, disabled) | Client-side app: `listing=` filter param cold-loads GLOBAL inventory (junk); pagination needs in-page JS routing (click next / intercept XHR) not URL loads; cards render post-JSON-LD so financial walk found nothing. 3,529 US listings behind it — worth a dedicated session. Junk test rows deleted |
| VR Business Brokers | 🟡 medium | Corporate page aggregates, but listings live on per-franchise domains (vrmiamicenter.com etc.) — crawl fan-out needed |
| Murphy Business | 🟡 medium | Listings page is a JS search app — needs network-request probe |
| BusinessesForSale.com | ✅ **LIVE** | `/us/search/businesses-for-sale?page=N` — JSON-LD ItemList w/ asking/revenue/cash flow + region per card. ~16,800 US listings (biggest source). Region "California - South" → state-mapped |
| GABB (Georgia) | ✅ **LIVE (API)** | Public JSON API (Webflow CMS via Railway webhook) — 199 structured listings incl. broker names + **SOLD transaction comps** (real closed multiples). No browser needed, 8s/run. Georgia priority state. **Pattern to reuse: other state assocs may expose the same Webflow API** |
| CVBBA / AZBBA / TABB | 🟡 unknown | Listing portals not found on first pass — likely external platforms (bizmls-style) |
| BBF Florida MLS | 🟡 medium | Embedded bizmls.com ASP app; needs form-flow work (highest volume of the associations) |
| DealStream | 🔴 **blocked** | DataDome captcha interstitial — same class as LoopNet; deprioritize |
| Axial | 🔴 no unattended access | Email ingest + co-pilot sessions only (platform limitation) |

## Adapter build order (updated 2026-07-10 after probes)

1. ~~BizQuest~~ — deprioritized (mirror of BizBuySell, no incremental inventory)
2. ~~BusinessBroker.net~~ — ✅ built, live
3. BBF Florida MLS (one adapter, hundreds of brokers)
4. Transworld + Sunbelt (biggest network inventories)
5. TABB / GABB / CVBBA / AZBBA (priority-state MLS coverage)
6. DealStream, BusinessesForSale.com
7. Everything else by measured yield

Lesson from BizQuest: **probe before building** (`scraper/probe.js <url>`) — five
minutes of probing can kill or confirm an adapter. Also check whether candidate
sources share a parent company/feed with an existing source.

Lesson from GABB: **check the network tab for a JSON API** (`probe_embed.js`
lists API-ish XHR calls). Many "hard" JS sites are actually fed by a clean public
API — far better than HTML scraping. GABB, and likely other Webflow-based broker
sites, expose structured data incl. sold comps this way.

## Live sources (8): bizbuysell, bizquest (mirror), businessbroker, synergy,
## viking, sunbelt, gabb (API), businessesforsale (~16.8k listings).
##
## Benched / needs work:
## - Transworld (JS routing), AZBBA + BBF Florida (JS/Akamai MLS platforms),
##   TABB (just embeds BizBuySell — skip), GlobalBX + DealStream + LoopNet
##   (Cloudflare/DataDome), Murphy (JS app), VR (per-franchise domains).
## Next tractable: BusinessMart (HTML), other state-assoc Webflow APIs.
