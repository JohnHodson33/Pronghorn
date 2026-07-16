# Build status — John's directives, done vs. overnight queue
_PM-compiled 7/16 ~00:45. ✅ = live on prod · 🔶 = partially done (data/policy done, code build queued) · 🔨 = queued, lanes working overnight._

## Your 7/15 directives

| # | Directive | Status | Owner | Detail |
|---|-----------|--------|-------|--------|
| 1 | **LinkedIn match overhaul** ("every example I check is wrong") | 🔶 | Lane C (top) | PM already ran the full audit: 138 links → 69 verified / 69 nulled (wrong > none). The CODE change — new Serper+Claude-verify matcher, 2+ corroborations, `linkedin_verified` flag, verified-only counting in FULL/CONTACTABLE — builds overnight. |
| 2 | **PE-ownership flag** ("PE-owned aren't good targets") | 🔶 | Lane C + B | PM hand-swept the Platform tier (Turf Masters roll-up caught, Sunday CO = VC-backed noted). Systematic build overnight: `pe_owned` detection during enrichment + backfill + excluded from auto-rules + filter/badge UI. |
| 3 | **US-presence check + TOO BIG tier** (Irrigation Excellence exemplar) | 🔶 | Lane C + B | Exemplar off-targeted by PM. Overnight: hq_us classification + backfill, `too_big` tier (editable threshold, seed >$10M EBITDA), conglomerate-signal detection, tier chip/filter UI. |
| 4 | **Company shortlist ★** ("so I'm not scrolling annually") | 🔨 | Lane C + B | Not started (lanes were down). Overnight: migration 0015 + API (Lane C), star toggle on every Companies row + profile + "★ Shortlisted" filter + who/when (Lane B). |
| 5 | **Companies table filter/sort overhaul** | 🔨 | Lane B | Industry chips → multi-select dropdown w/ counts; column-header dropdown filters (owner-reach, size tier, stage); sortable est. Revenue/EBITDA; URL-pinnable throughout. |
| 6 | **Inline edit everywhere** (via Lane A session) | 🔨 | Lane B | Click any field on any record detail → edit → save. Your manual entries WIN over future enrichment (fill-blanks never overwrites). |
| 7 | **Filter/sort persistence on back-nav, all lists** (via Lane A session) | 🔨 | Lane B | Pattern exists on Enrichment/Companies; extends to /listings, /brokers, /deals, /contacts — sort state included. |
| 8 | **Contact hit-rate: PHONE (Tracerfy)** | 🔶 | Lane C (top) | VALIDATED: your two batches ran — +18 owner phones, +10 emails, ~$1.60 total, ~931 credits left. Overnight: the in-cascade skip-trace tier (rules-gated, metered $0.02/hit, DNC flags informational-only per your posture). |
| 9 | **Contact hit-rate: EMAIL pattern engine** | 🔨 | Lane C | $0-marginal tier: Hunter domain-search → construct owner email from pattern → verify → only verified writes. PM live-proved the approach on treeprosaz.com. |
| 10 | **Size model amendment 4** (payroll-% as THE input, flat 20% margin, CPI-adjust) | 🔨 | Lane C + B | Restructure of assumptions + tab. Migration 0014 you ran tonight gives it durable tables. |
| 11 | **Broker-inquiry template (your verbatim words)** | 🔶 | Lane C | Identity already fixed (jhodson@pronghornequity.com, never gmail). Template application to co-pilot/outbox/request-info drafts builds overnight; old "private investor" copy dies. |
| 12 | **Painting/restoration screening keywords** | ✅ | done | Live in the screening profile (94-keyword set); nightly re-screens. |
| 13 | **Tracerfy compliance posture** (pull all, DNC informational, scrub out of cascade) | ✅ | done | Locked into the spec that governs build #8. |

## Also in the overnight queues (pre-7/15 approvals still pending build)

| Item | Owner | Notes |
|------|-------|-------|
| Auto-promote Tier-1 → pursuits (your 7/13 approval) | Lane A | Nightly job + "why it qualified" receipts; human touch = approve/reject. |
| Source-health drift alerting (your 7/13 approval) | Lane A | >25% count drop or null-financial spike → Key Actions digest. |
| Scrape the listing broker (BizBuySell "Business Listed By" block) | Lane A | Broker name/phone captured at ingest + backfill; feeds broker outreach. |
| Improvements thread UI polish on 0011 (real comments now live) | Lane B | Your migration tonight turned on real threads; pseudo-thread rendering retires. |
| Direct-to-storage uploads (>4.5MB CIMs) | Lane B | Vercel body-cap workaround via signed URLs. |
| Nightly digest seed + first receipt (0014 live now) | Lane C | Your migration unlocked it; zero auto_enrich_rules = zero spend until you create one. |

## What tonight does NOT touch (gated on you, tomorrow)
- 5 sample outreach drafts (card 611290ff) → approve + rule #1 → auto-drafting unlocks. Nothing SENDS regardless.
- Odulaire SPAM/OneHub check + IOI · AAFE IOI due 7/17 (PM will draft on your word).
- Repo public/private · VA hire (cohort datapoint: ~80–85% enrichment hit rate at ~$6/hr, from your Shore forum note).
- Your additional large edit — PM watching for it; it'll be triaged top-of-lane when it lands.
