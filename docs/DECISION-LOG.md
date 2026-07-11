# Decision Log — autonomous-work decisions for John's review

> Per John's 2026-07-11 mandate: Claude works continuously and makes best-guess
> decisions rather than waiting. This is the running list to review one-by-one
> when he's back. Newest first. Each: what I decided, why, how to reverse.

## 2026-07-11 (evening autonomous session)

0. **Built a Broker catalog (new /brokers page + DB persistence).**
   Why: your feedback — capture broker names/contact + what industries & deals
   they cover, before we have company names. Scraper now dedupes brokers into the
   `brokers` table and links listings; the page shows each broker's listing count,
   industries, and states. Broker names currently come from GABB + LINK Business
   (Transworld's list API has no broker field; it's detail-page only — deferred).
   Populates fully on the next GABB/LINK run. Reverse: sidebar "Brokers" → hide.

1. **Market Multiples now leads with thesis verticals; everything else is a
   collapsed "Other industries — reference only" section.**
   Why: John said seeing Retail first was confusing; prioritize industries we
   actually work in. Thesis order (editable in `lib/analytics.ts` THESIS_INDUSTRIES):
   Landscaping, Lawn Care, Tree Care, Pool Services, Pest Control, Wildlife/Animal
   Control, Fencing, HVAC, Plumbing, Electrical, Irrigation, Roofing, Lake/Pond,
   Windows & Doors, Property Maintenance, Restoration, Cleaning/Janitorial.
   Reverse/adjust: edit that array (order = display priority).

2. **Removed the "→ CRM" button from Broker Listings.**
   Why: John — broker listings are anonymized, never have a real company name, so
   one-click-to-CRM doesn't belong there. Reverse: it's in git history (commit
   before this). CRM promotion will live where records are enriched enough
   (proprietary lists / engaged deals) — see Open Questions.

3. **Expanded the industry classifier taxonomy** to add Wildlife/Animal Control,
   Fencing, Irrigation (thesis verticals John named that were missing), and
   triggered a **full reclassification of all ~7,300 listings** (~$5–7 Haiku) so
   those categories populate. Why: multiples page should reflect the real thesis
   verticals. Reverse: harmless; can re-run.

4. **Listings page fetches only the ~459 screened thesis-fit rows** (not all
   7,300) to fix a 21s→~5s load. Why: performance. Trade-off: the "show all raw
   listings" view is gone from that page (raw universe still powers Market
   Multiples). Reverse: adjust `web/lib/listings.ts` fetch filter. Open question:
   do you want a paginated "browse everything" view too?

## Open questions for John (need your input; not blocking)

- **Broker catalog (planned, not built):** capture broker names + contact info +
  which industries/deals they cover, from the listings that carry broker data
  (GABB, LINK, Transworld already scrape broker names). Then tag brokers to deals
  later. Want this next, and how much broker contact enrichment?
- **One-click CRM button — where?** Agreed it belongs on enriched company
  profiles / proprietary leads, not broker listings. Confirm the trigger points.
- **Login/paid deal networks** (Axial, PrivSource, SMB.co, DealForce, etc.):
  which to pursue? Most need memberships/credentials. See docs/BROKER-SOURCE-LIST.md.
- **Size bands / multiple views:** current bands are <300K / 300K–1M / 1M–3M / 3M+
  on cash flow. Want EBITDA-vs-SDE separated views, or geography cuts?
