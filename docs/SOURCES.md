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
