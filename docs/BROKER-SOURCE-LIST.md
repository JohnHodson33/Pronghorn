# Broker Source List — for John's manual review

Every source we have NOT connected, with a link and my read on it. Grouped by
type. **The big opportunity you flagged is Section D (login/paid deal networks)** —
that's where Jake's "50 sources" volume and off-market quality likely live, and
it's the gap in our current 10 (all free, no-login).

Legend: ✅ live · ⛔ blocked (captcha) · 🔒 login/paid · 🛠 buildable (needs work) ·
🚫 off-thesis

---

## A. Free sites, buildable but need a dedicated JS/ASP build (diminishing quick-win)

| Source | Link | My read |
|---|---|---|
| Murphy Business | https://murphybusiness.com/business-brokerage/view-our-listings/ | 🛠 Listings via embedded widget, no linkable URLs. Real network, worth a dedicated build |
| VR Business Brokers | https://www.vrbusinessbrokers.com/businesses-for-sale/ | 🛠 Listings scattered across per-franchise domains (vrmiamicenter.com etc.); homepage had odd injected scripts — inspect before building |
| First Choice Business Brokers | https://www.fcbb.com/businesses-for-sale | 🛠 Duda CMS, JS-rendered; needs headless DOM scrape |
| Sun Acquisitions | https://sunacquisitions.com/featured-business-listings/ | 🛠 Chicago M&A; only a "featured" page surfaced — find full listings URL |
| BizBen (California) | https://www.bizben.com/ | 🛠 5,000+ CA listings but postings interaction-gated; CA-only (lower priority) |

## B. State broker-association MLS platforms (one adapter = many brokerages)

| Source | Link | My read |
|---|---|---|
| Business Brokers of Florida (BBF) | https://www.bbfmls.com/businesses-for-sale/ | 🛠 **Highest broker count of any single target.** Embedded bizmls.com ASP app — needs the search form-POST flow reverse-engineered. Worth it (FL is a priority-adjacent market) |
| AZBBA (Arizona) | https://azbba.org/about-azbba/azbba-listings/ | 🛠 Home state. Embedded listings.azbba.org MLS platform (Akamai-protected) |
| CVBBA (Carolinas-Virginia) | https://cvbba.com/ | 🛠 Priority states NC/SC; listings page not yet located |
| CABB (California) | https://cabb.org/ | 🛠 CA-only |
| MBBI (Midwest) | https://www.mbbi.org/ | 🛠 |
| TABB (Texas) | https://www.tabb.org/ | 🚫 Just re-embeds BizBuySell — no new data (skip) |

## C. Blocked (bot-protection) — hard/not worth it

| Source | Link | My read |
|---|---|---|
| DealStream | https://dealstream.com/ | ⛔ DataDome captcha. Thousands of mid-market listings — only via login/paid path |
| LoopNet (businesses) | https://www.loopnet.com/biz/businesses-for-sale/ | ⛔ CoStar anti-bot. Overlaps aggregators we have |
| GlobalBX | https://www.globalbx.com/ | ⛔ Cloudflare challenge |

## D. Login / paid deal networks — THE VOLUME OPPORTUNITY (your call on each)

These need memberships/credentials (and some cost money), which is exactly why we
haven't touched them. This is likely where Jake got his breadth and off-market
quality. For each: you'd sign up, then we automate ingestion behind your login
(co-pilot browser sessions or, where allowed, API/email).

| Platform | Link | What it is / my read |
|---|---|---|
| **Axial** | https://www.axial.net/ | 🔒 The Axial-like standard. 20,000+ LMM members. We know it: no API, SPA blocks automation → email-teaser ingest + co-pilot sessions only. Membership-gated deal flow |
| **PrivSource** | https://www.privsource.com/ | 🔒 Invite-only, vetted LMM marketplace. Axial competitor — likely similar scrape constraints but worth a membership |
| **SMB.co** | https://smb.co/ | 🔒 Aggregates 19M+ on/off-market small businesses, AI buyer matching. High potential for bulk ingest — check for API/export |
| **SMBmarket** | https://smbmarket.com/ | 🔒 SMB marketplace (the "SMB market" you mentioned) — evaluate inventory + access |
| **DealForce (Generational Group)** | https://www.dealforce.io/ | 🔒 Generational Group's buyer network (250+ advisors). Verify the exact URL when you log in |
| **BizNexus** | https://www.biznexus.com/ | 🔒 Aggregator + concierge sourcing; membership tiers |
| **Grata** | https://grata.com/ | 💲 Paid buy-side search engine (company data, not just for-sale). Powerful for proprietary sourcing — overlaps our Phase 5 list-building; evaluate vs. Exa/Parallel cost |
| **CAPTARGET / ProxDeal / Dealonomy / KUMO** | https://www.captarget.com/ · https://www.withkumo.com/ | 💲 Buy-side sourcing services/tools — more "done-for-you deal origination" than a scrapeable list |

## E. Online-business marketplaces — mostly OFF our green-industry thesis

| Source | Link | My read |
|---|---|---|
| Acquire.com | https://acquire.com/ | 🚫 SaaS/e-commerce |
| Flippa | https://flippa.com/search | 🚫 Online businesses |
| Quiet Light | https://quietlight.com/listings/ | 🚫 Online businesses |
| Website Closers | https://www.websiteclosers.com/businesses-for-sale/ | 🚫 Online/e-commerce |
| BusinessMart | https://www.businessmart.com/ | 🚫 FSBO-by-owner, financials off-index |
| Raincatcher | https://raincatcher.com/business-listings/ | 🔒 Listings behind login |
| BizForSale.co | https://bizforsale.co/ | 🛠 Newer marketplace — worth a quick look for green-industry inventory |

---

## My recommendation
The remaining FREE sites (Sections A/B) are real but low-yield-per-effort. **The
step-change is Section D** — if you're open to a few memberships, that's how we
match Jake's breadth AND get off-market deals. Tell me which you'll sign up for
and I'll build the ingestion (co-pilot sessions where automation is blocked). BBF
Florida (Section B) is the best free target left given its broker density.
