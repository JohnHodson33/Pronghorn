# Lead-Gen Source Stack (off-market prong)

Jake's 10 sources (see TRANSCRIPT-NOTES.md) are the baseline. This doc is OUR
stack: his sources kept, plus additions tailored to Pronghorn's verticals
(landscape, tree care, pest, pool, HVAC/plumbing/electrical, windows & doors)
and Sun Belt priority states (AZ NV TX UT CO NM GA NC SC TN). Jake's license
boards and associations were picked for HIS markets — ours must match OUR thesis.

## Keep from Jake's stack

| Source | Cost | Notes |
|---|---|---|
| Google Local + Maps + Web (via **Serper.dev**) | ~$0.30–1/1k queries | Serper over SerpApi — same data, ~10x cheaper |
| Google Places official API | free ($200/mo credit) | Rescue tier |
| Parallel.ai entity search | ~$0.005/search | Rescue/thin markets |
| Exa.ai | cheap | Rescue tier only |
| OpenStreetMap Overpass | free | Long-tail trades |
| Better Business Bureau | free | A+/A/B grade + accreditation = quality signal |

## ADD — license boards matched to OUR priority states

Jake covers western states only. Pest control and contracting are licensed
everywhere — these registries are literally complete lists of every legal
operator, free:

| Registry | States/vertical | Notes |
|---|---|---|
| Structural pest control boards | AZ (PMD), TX (SPCS), GA (Dept of Ag), NC, SC (Clemson DPR), TN (Dept of Ag), FL (FDACS) | **Complete pest-control operator lists** — highest-value single addition for the pest thesis |
| State contractor license boards | AZ ROC, NV SCB, TN, NM, UT, SC LLR, NC LBGC | HVAC/plumbing/electrical/roofing operators |
| Pesticide applicator licenses (lawn care) | state ag departments | Chemical lawn care operators (TruGreen competitors) |
| FL DBPR | FL | If Florida enters the map |

## ADD — trade associations matched to OUR verticals

Jake fires AFA/ACCA/PHTA for his trades. Ours:

| Association | Vertical | Notes |
|---|---|---|
| NALP member directory | landscape | National Assoc. of Landscape Professionals |
| TCIA accredited companies | tree care | Accreditation = professionalized shop (fits thesis) |
| ISA certified arborist directory | tree care | Individual certs → company discovery |
| NPMA + state pest assocs (e.g. AZPPO) | pest control | QualityPro accreditation flag |
| PHTA (keep from Jake) | pool | |
| ACCA (keep from Jake) | HVAC | |
| Irrigation Association directory | irrigation/landscape | |

## ADD — other free/cheap discovery sources

| Source | Cost | Why |
|---|---|---|
| **Secretary of State business registries** | free (most states) | Entity age, registered agent, **officer/owner names** — gets owner names BEFORE the VA step, cutting enrichment cost. AZ eCorp, GA, NC, TN searchable free; TX SOSDirect ~$1/search |
| Yelp Fusion API | free 500 calls/day | Review count/rating; strong for home services |
| Foursquare Places API | free tier | Cross-check/dedupe against Google |
| Angi / HomeAdvisor / Thumbtack / Houzz pro directories | free (scrape) | Pre-categorized home-services pros with review volume |
| Chamber of Commerce directories | free (scrape) | Established local businesses; membership = stability signal |
| Facebook Pages | free (careful scraping) | Counterexample to "everything is on Google": smallest trades are often FB-only — matters for tuck-in targets |

## ADD — enrichment signals (per-company, after list build)

- **Review velocity** (Google/Yelp review count ÷ business age) — free size proxy
- **Wayback Machine** first-snapshot date — business age when SOS data is thin
- **County assessor records** — does the owner own the shop/yard real estate?
  (Real estate in the deal changes the acquisition conversation)
- **SOS registration date + officer names** — owner tenure; retirement-age
  owners are the sellers we want
- Claude API: website scrape → services mix (recurring vs project), PE-backed
  flag, news (Jake's approach — keep)

## Design rules (carry over from Jake + our improvements)

- Every source is a toggle with a cost badge (free/paid/rescue) and API-key status
- Rescue sources fire only when primaries miss the lead target
- Per-run cost estimate before running; month-to-date spend widget
- Owner contact fields stay blank at list-build stage by design (VA/enrichment fills)
- Log which source found each lead (`source_tags`) → source-quality analytics
  so we can drop underperforming paid sources
