# Outreach strategy — decisions & deliverability rules (discussion record)
_John 7/12: DISCUSSION ONLY so far — no site build until John + Tom finalize.
This doc records decided parameters so the build contract writes itself later._

## Decided (John 7/12 ~14:45)
1. **Volume:** ~100 outreaches/month at scale, possibly more. Quality over
   quantity, but sourcing is a numbers game — response rate is the limiting
   step, so outreach throughput matters. Never spray-and-pray.
2. **Sending identity:** John's and Tom's REAL pronghornequity.com addresses,
   provided it never endangers their day-to-day business email. If risk ever
   materializes, fall back to a lookalike sending domain.
3. (Earlier) Cold-calling is the primary channel; email is the credibility
   pre-touch + automated follow-ups; two-person plays (Tom sends, John
   replies over the top) are desired sequence steps.
4. (Earlier) In-house sequencing on our platform, drafts-first via Outlook;
   no Reply.io ($120-200/mo for 2 seats vs ~$10-20/mo in-house); revisit
   Instantly/Smartlead (~$40/mo) only as a sending engine if volume/
   deliverability demands.

## PM deliverability assessment for 100/mo from the real domain: SAFE, with rules
~100/month ≈ 3–5 sends/business day across two senders — an order of
magnitude below where cold-email trouble starts (sustained 50–100+/day per
mailbox from fresh domains). Personalized, verified, low-volume mail from an
aged domain with real correspondence is effectively normal business email.

**The rules that keep it that way (build requirements when we green-light):**
- **Authentication first:** SPF + DKIM + DMARC verified on pronghornequity.com
  before the first automated-assist send (one-time DNS check; PM can audit).
- **Verified-only recipients:** outreach-eligible gate = verified industry +
  owner name + Hunter-VERIFIED email. Bounce rate must stay <2–3%; auto-halt
  sends if it spikes (bounces are the #1 reputation killer).
- **Throttle:** cap 10–15 cold sends/day/mailbox, spread across business
  hours; ramp from 3–5/day over the first 2–3 weeks (behavioral warmup —
  no warmup network needed at this volume).
- **Send like a human:** plain-text style, no tracking pixels, minimal links,
  personalized first line from enrichment data, real signatures.
- **Opt-out hygiene:** honor any "not interested" instantly (suppression
  list in our DB); one-click mark-as-dead from the reply.
- **Monitor:** bounce + complaint + reply rates on the dashboard; ANY
  deterioration → pause + PM review; sustained growth >500/mo → revisit a
  dedicated lookalike sending domain.

## Still open before the build contract
- Q3: sequence shape (e.g., email → +3d follow-up → call vs 5-touch drip);
  how the two-person reply-over-the-top play is timed.
- Tom's input generally (he joins the site today).
- The prior "cold-email sending domain" open item is now SUPERSEDED by
  decision #2 (real domain at this volume) — keep lookalike as contingency.
