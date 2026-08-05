# Pronghorn — open items for John
_Rewritten 8/5 10:20 by PM (prior version was 7/16 and badly stale) · Single
source of truth for everything awaiting you. Ask "what's open?" anytime._

## ⏳ ON YOU — 2 REAL ITEMS

### 1. 🚨 RUN TWO SQL FILES — this is BLOCKING the outreach list
Supabase SQL editor, **0024 first, then 0025** (both are order-safe, but run
them in that order):
- `supabase/migrations/0024_possible_duplicate_candidates.sql`
- `supabase/migrations/0025_guide_dedupe.sql`

WHY IT MATTERS: the consolidator sweep files a second row for a company
already in the book, so the same person exists twice — **22 duplicated names
live right now**. That inflates every guide count, double-spends Serper
verifying the same person twice, and will keep growing until the insert-time
guard can run. The code is written and merged; it is inert until the columns
exist. The site already hides dupes at read time (why it shows 529 guides
while PM-STATUS says 549); the underlying rows are still there.

**CORRECTION (PM, 8/5 — I overstated this on 8/4).** I told you 3 of the 20
outreach-ready people had a *contradictory* twin and we were about to email
someone our own data said was still employed. That was wrong, and Lane C
caught it with row-level evidence. The actual state: Steve Stanley and Scott
Emery each have a twin reading UNKNOWN/unverified — an unverified "we don't
know" does not contradict a verified EXITED — and Dan Mello's twin reads
EXITED/verified, i.e. it *agrees*. There is exactly **one** true
EXITED-vs-EMPLOYED contradiction in the whole book (Damon Schrosk), and he is
**not sendable** (LinkedIn only), so he was never at risk of being emailed.
**All 20 outreach-ready people are safe to contact.** Suppressing those 3
would have cost you 15% of your sendable list for no reason. Duplicates get an
informational badge, not a block — flags, not blocks, per your standing rule.
The SQL is still worth running for the count/credit reasons above; it is no
longer an outreach-safety emergency.

### 2. 📝 RIVER-GUIDE OUTREACH TEMPLATE — co-develop with me
**20 people are outreach-ready (18 in your focus industries) and blocked only
on approved copy.** Your read on the old auto-drafts was that they'd "burn
more leads than it helps," and I agree — so I'm not generating another one
cold. All I need to start: **the one email you'd actually send to Dan Mello
tomorrow, even two rough sentences.** I'll build the template around your
voice (short, peer-to-peer, one concrete fact per guide, equity-not-fees),
bring you a redline, and nothing sends until you sign off.

## 🟡 WORTH A DECISION WHEN YOU HAVE A MINUTE
- **The VA hire is now the highest-leverage unblock.** Lane C proved Serper
  has hit its ceiling on status verification for the current cohort (of 52
  "one call away" rows, 48 were already-attempted inconclusives; only 3 new
  exits came back). **126 named guides sit in the paid/VA queue.** The $6/hr
  Upwork hire you parked is the remaining lever for converting them.
- **16 MEDIUM-confidence sweep candidates** are deliberately unfiled (every
  past data defect came from a MEDIUM source). They're human-confirmable from
  their source URLs — want them in the review pen, or left out?

## ✅ RUNNING FOR YOU (no action needed)
- **Serper focus gate is LIVE** (your 8/4 narrowing): tree care primary;
  landscape, irrigation, lawn care, pest ancillary. First full nightly under
  the gate spent **100% in-focus** — attributed burn shows 0 out-of-focus
  units. Yesterday 1,539 credits; today 406 by 10am. Nothing was deleted —
  out-of-focus rows keep their data and one config flag re-widens it.
- **Broker asking-price coverage**: southernmergers 4%→79%, and it passed its
  first unattended nightly. Tupelo/DealRelations fixes from 8/3 holding.
- **Deal desk**: AAFE Passed (franchise ROFR + EBITDA quality) · Landmark IOI
  submitted · Monster Tree + NatureScapes at CIM Received.
- Nightly scrape, river-guides workers, leadgen, outlook sync, auto-integrator
  and the 6-hourly PM watchdog all green on CI — they survive a dead session.

## 📊 THE NUMBERS (PM-verified against the DB 8/5 10:15, not lane self-reports)
- Funnel: PE-status **100%** ✅ · sized **100%** ✅ · owner named **47%**
  (target 80%) · owner contactable **28%** (target 60%) · n=536.
- River guides: 549 rows / 529 after dedupe-at-read · 386 named · 169
  verified · **20 outreach-ready (18 in-focus)** · 126 in the VA queue.
- Serper: 48,055 credits left. The "~40 days" on PM-STATUS is a trailing
  average that predates the gate — real runway is materially longer and I'll
  republish once a full week of gated burn is in.

## Communication note (standing)
If a chat reply seems missing or truncated, say "resend" — substantive state
always lives here and in PM-STATUS.md.
