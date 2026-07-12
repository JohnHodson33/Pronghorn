# Pronghorn — work completed 2026-07-11 (overnight + full day)

All live at pronghorn-green.vercel.app (password: pronghorn-green-2026).
~34 PM integration cycles, 10+ production deploys, zero broken builds.

## 1. Dashboard & site structure (your overnight voice notes)
- **Dashboard V3 "Command Center"**: Key Actions queue (needs-you/Tom) on top,
  total pipeline funnel with broker + proprietary prongs side by side, deal
  flow by industry subsector. Backed by a new /api/dashboard aggregates layer.
- **Sidebar restructured to the two-prong model**: Overview (Dashboard, Market
  Multiples, Screening Criteria) → Broker Sourcing → Proprietary Sourcing
  (renamed **"Proprietary Outreach"** per your pick) → CRM → Outreach.

## 2. Pursuit flow (your "broker listing dead-end" feedback) — LIVE end to end
- "Request info" on any listing → status advances → Claude-drafted inquiry
  queued in the new **/outbox** page (edit/cancel; nothing ever auto-sends).
- **Outlook auto-detect shipped + backfilled**: your two FCBB NDAs were
  detected and advanced automatically. 🎉 **First full pursuit cycle closed
  hands-free**: Tree Service 327-24860 went info_requested → NDA countersigned
  → Confidential Business Profile received → **cim_received**, all from your
  inbox, zero manual tracking. It's #1 in the ready-to-promote queue.
- Per your decision: send stays OFF; next build is "create draft in your
  Outlook" (review + send yourself) and gated form-autofill.

## 3. Your midday live feedback — shipped same day
- **Deals tab** (/deals): search/filter/export every deal ever, incl. Passed,
  with company → owner → broker chain. Wired into sidebar.
- **Passed stage**: Pass action + reason; passed deals leave the pipeline
  board, stay searchable forever. (The 14 old nail-salon "Closed" deals still
  need your one-word OK to migrate — permission gate.)
- **Brokers vs Contacts explained + fix queued**: Brokers tab = auto-scraped
  directory (hundreds, cold); Contacts = curated CRM (18 promoted brokers).
  Coming: "Add to Contacts" per broker row + broker filter on Contacts.

## 4. Proprietary engine (your #1 priority) — the chain now exists
- **Lead → Company promotion SHIPPED and RAN**: 23 enriched proprietary
  targets became real Companies with owner contacts attached (Companies tab:
  18 → 41). Chain is now scrape → enrich → company+owner → outreach → deal.
- **Enrichment worker live** (~$0.01/lead): owner name/title/email/phone/
  LinkedIn via website + Exa + Claude. Hunter email-finder wired. Website-
  discovery pass unlocks license-board leads.
- **Lead-list runner workflow landed**: pending list builds run automatically
  once GitHub secrets are added. "Needs key" badges are a UI bug — Serper,
  Places, Hunter, Exa are all LIVE; only Parallel is missing. Fix queued.

## 5. Broker scraper
- **12 new sources today** (VR ~366 listings, Sunbelt Midwest 139, Tupelo ×2,
  Calder, The Firm, Franchise Resales, DealRelations platform w/ 13 offices,
  Empire NC, Southern Mergers Carolinas, BBAZ Arizona…). Now **~27 healthy
  sources, ~18.6k listings**. bizquest dropped (worthless mirror). Multiple
  resilience fixes from self-run health sweeps.
- Verdict: free-source discovery is saturated → **Kumo Pro ($30/mo recurring,
  100k+ deals, CSV export) is the next coverage lever. I recommend yes.**

## 6. Ops automation
- 5 GitHub Actions workflows (nightly scrape, delisting, source quality,
  enrichment, leadgen) — **dormant/failing until you add the 6 repo secrets**
  (this is also what your failure emails were: jobs dying in 11s looking for
  credentials; no data ever touched).

## NEEDED FROM YOU (in order)
1. Say **"yes, migrate them"** → I flip the 14 Closed deals to Passed.
2. **Supabase SQL editor**: run migrations 0004, 0005, 0006 in order (~5 min).
3. **GitHub → Settings → Secrets and variables → Actions**: add SUPABASE_URL,
   SUPABASE_SERVICE_KEY, ANTHROPIC_API_KEY, EXA_API_KEY, HUNTER_API_KEY,
   SERPER_API_KEY (values from scraper/.env).
4. **Kumo go/no-go** ($30/mo).
5. Restart the **Frontend** and **CRM/Data** worker sessions if you want full
   3-lane speed overnight (both look context-dead; PM keeps covering).
6. Standing: ⚠️ rotate the Supabase key, Outlook re-auth (Mail.Read +
   Mail.ReadWrite), HubSpot Private App token, Parallel key.
7. FYI: Jack Williams (William Blair) logged as a contact — proposed Tue
   3–4pm CT.
