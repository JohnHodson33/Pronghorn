# Scrape Sources

Status: `candidate` → `adapter-built` → `live` → (`blocked` / `retired`)

## Tier 1 — Major aggregators (highest listing volume)

| Source | URL | Status | Notes |
|---|---|---|---|
| BizBuySell | bizbuysell.com | **adapter-built** | Working Puppeteer adapter in `scraper/sources/bizbuysell.js` (detail pages blocked — search results only). Weekly scheduled run live on old OneDrive copy until Phase 1 cutover. |
| BizQuest | bizquest.com | candidate | Same parent co. as BizBuySell |
| BusinessBroker.net | businessbroker.net | candidate | |
| DealStream | dealstream.com | candidate | Formerly MergerNetwork |
| BusinessesForSale.com | businessesforsale.com | candidate | International + US |
| LoopNet (business-for-sale section) | loopnet.com | candidate | CoStar-owned, aggressive anti-bot |
| Axial | axial.net | **blocked** | No API; SPA blocks automation. Email-teaser ingest only (firm rule: no blind teasers as deals). |

## Tier 2 — National brokerage networks (own listing pages)

| Source | URL | Status | Notes |
|---|---|---|---|
| Sunbelt Business Brokers | sunbeltnetwork.com | candidate | Largest franchise network |
| Transworld Business Advisors | tworld.com | candidate | |
| Murphy Business | murphybusiness.com | candidate | Existing relationship (Luis Zavala — Affordable Windows deal) |
| VR Business Brokers | vrbusinessbrokers.com | candidate | Existing relationship (Ramzi Daklouche, Atlanta) |
| First Choice Business Brokers | fcbb.com | candidate | |
| Website Closers / others | — | candidate | Evaluate fit |

## Tier 3 — Green-industry / sector specialists

| Source | URL | Status | Notes |
|---|---|---|---|
| Principium Group (White Oak) | principiumgroup.com | candidate | Ron Edmonds — green industry M&A specialist, existing relationship |
| The Advisory Investment Bank | — | candidate | Oliver Bogner — Landmark Pest deal |
| Three Sixty Seven Advisors | — | candidate | Existing broker contact |
| (brainstorm more green-industry brokers) | — | — | Landscape/tree/pest specialist shops |

## Backlog / to evaluate

- Synergy Business Brokers, Calder Capital, Peterson Acquisitions, Raincatcher,
  Viking Mergers, Woodbridge International, regional SBA-broker sites
- State business broker association directories (broker discovery, not listings)
- **Routine brainstorm cadence:** revisit this list monthly; every broker we meet
  gets their site checked for a listings page.
