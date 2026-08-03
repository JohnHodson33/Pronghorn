# Lane C update — 7/31 (session #4, back after the 10-day gap)

## TL;DR
- **River guides finally have phones: +28 owner phones (channel had 0), +12 emails, for $0.62.**
- **Found why enrichment looked dead: the Serper account is OUT OF CREDITS since ~7/22.** Needs your top-up at serper.dev — everything resumes on its own after.
- **/intake is tested and ready for the first real VA file** — including a fix so VA results land on the guide rows themselves.

## 1. The Tracerfy dead-end is broken — guide phones are live
The 7/20 probe proved Tracerfy needs a street address that guides didn't have. Fixed by going through their **former company's public record**:
- New address tier: Google Places lookup of the former company (name + city + state), accepted **only** when corroborated — website domain matches the one we already store, or every distinctive word of the company name matches, plus same state and a real street line. Never guessed; place_id provenance stored. **177 of 255 phone-less guides got a corroborated address ($0 — covered by the Places free credit).**
- New phone tier: Tracerfy batch person-mode over those addresses (same proven engine as the leads cascade; landlord-trap-safe, one attempt per guide ever). **162 traced → 31 hits → +28 phones, +12 emails, $0.62 total.** Hits fill the guide row, promote it to ENRICHED, and sync the CRM contact.
- Both run nightly now (40/night each), so new guides keep getting addressed + traced automatically.
- The dry run caught two name bugs before spending: multi-person rows ("Blake Crawford, Keith Mahan…") would have traced a fabricated person, and "Swinski family" isn't a traceable name. Both rejected now.

## 2. Serper is out of credits — the silent killer of the last 9 days
- Every Serper call since ~7/22 returns "Not enough credits." That's why status-verify sat at 25/467: the nightly CI looked green because every step is continue-on-error.
- Affected until top-up: status verification, LinkedIn matching, /discover sweeps. NOT affected: Hunter, Places, Tracerfy, Claude (that's why today's phone work could run).
- **Your action: top up Serper credits at serper.dev.** Workers resume without any restart.
- So this class of failure is never silent again: workers now beacon account-level API failures, and the dashboard raises a **"serper API is failing" Key Action card** (it's live right now showing this outage). Verify passes also abort immediately on a dead account instead of burning the nightly cap on guaranteed errors.

## 3. Verify throughput fixed (was 25/467)
The cap wasn't the only problem — the nightly pass re-checked the same top-30-by-score inconclusive guides every night. Now every attempt is stamped, never-attempted guides go first, inconclusive ones rest 14 days, and the cap is 60/night. Once Serper has credits, the whole unverified base (261 guides) gets a first pass in ~4-5 nights.

## 4. /intake shakedown — VA return path verified end-to-end
Ran a realistic messy VA-results file (mixed phone formats, "not found" cells, a duplicate row, an unknown person, a blank row) through upload → preview → confirm against the live engine. Three real fixes came out:
- **VA guide files now land on the guide rows.** Before, contact info could only fill the CRM contacts table — the River Guides page would still show "no phone." Enrichment-fill now targets river guides directly (and still syncs the CRM contact).
- "not found" / "n/a" / "none" cells are treated as blank, never stored as values.
- VA notes always append (with the intake provenance stamp) — they were silently dropped when a guide already had notes.
Confirmed safe behaviors: a real guide's Tracerfy phone survived as a surfaced conflict (not overwritten), the intra-file duplicate was skipped, the audit receipt committed. Test rows cleaned up.

## Open items for you (nothing new except #1)
1. **Top up Serper credits** — unblocks verify/LinkedIn/discover.
2. Confirm: should YTD *variable* spend also start 7/1 like subs? (I build it the moment you say yes.)
3. VA workflow: /intake is ready for the first real batch — 47 NEEDS_PAID guides remain after today's phone hits.
4. Unchanged/parked: sample-drafts card 611290ff, repo visibility.

*Everything committed + pushed on lane/integrations (7293ba4, 3136eb0). Details in docs/DECISION-LOG-integrations.md HANDOFF.*
