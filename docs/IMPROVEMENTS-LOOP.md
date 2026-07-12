# Improvements Loop — Tom onboarding + in-site feedback → agent pipeline
_John's directive 7/12 ~13:15: Tom joins TODAY; John must not be the
bottleneck for feedback. This doc is the design contract._

## The core mechanic
Feedback typed into the WEBSITE becomes agent work WITHOUT John relaying it:

1. **/improvements page (Lane B)** — sidebar entry, three panels:
   a. **Submit**: form (type: bug / idea / change · which page · description ·
      submitted-by John|Tom) → POST /api/feedback → `feedback` table.
      Optional v2: a small Claude-powered refine step ("discuss this idea")
      that asks 1-2 clarifying questions and structures the ticket before
      saving (Haiku, ~free) — this is Tom's direct interface to the agents.
   b. **Status board**: every feedback item with its lifecycle
      (submitted → triaged → building → shipped → verified) + link to what
      shipped. Tom SEES his ideas move — that's what makes him use it.
   c. **Agent self-review + roadmap**: the standing SELF-ITERATE critiques
      each lane already writes, published as an honest "what we think is
      weak / what we're building next" section (PM curates from TASK-QUEUE).
2. **`feedback` table (Lane C)** — id, created_at, author, type, page,
   body, status, task_ref, shipped_ref. POST /api/feedback + PATCH status.
3. **Agent pickup (Lane C + PM rule)** — every lane's /loop iteration polls
   `feedback` for status='submitted' items touching its lane, triages into
   TASK-QUEUE (tagging the feedback id), flips status='triaged'. PM enforces:
   John-decision items get bubbled to Decisions; everything else just gets
   built. Status flips propagate back so the site stays truthful.
4. **Attribution**: every submission carries author=Tom or John — priority
   parity; disagreements bubble to the Decisions queue for John.

## Tom access — what's needed (and cost truth)
- **Today**: the site works for Tom immediately with the shared password
  (basic auth). Zero setup, zero cost — site VISITORS cost nothing on any
  tier; only dashboard/team seats cost money.
- **Cost honesty (per the new baseline policy):** Vercel's free Hobby tier is
  licensed for personal, non-commercial use. A two-partner deal business
  running on it daily is commercial use — **add Vercel Pro $20/mo as a
  'planned' subscription line** on the cost badge; activate when convenient.
  Supabase free tier is fine at current volume (usage-based, second user
  negligible) — watch line, not a planned line.
- **Later (queued, not blocking)**: per-user logins (name attribution flows
  from login instead of a dropdown), so "submitted by Tom" is automatic and
  actions are auditable per person.

## What this does NOT do (honest limits)
The build agents run on John's Claude sessions/machine. Tom's feedback is an
asynchronous pipeline to them, not a live chat with the builders; the
optional Haiku refine step gives him interactive shaping of a ticket. If Tom
ever needs full agent access, that's a separate Claude subscription decision.
