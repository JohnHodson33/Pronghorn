# Working with Claude on this project — John's guide

## Session workflow

1. **Open Claude Code in `C:\Users\johnd\Pronghorn`** (not the old "CRM Set up"
   folder). Claude reads CLAUDE.md automatically and should read docs/ROADMAP.md
   first thing.
2. **One goal per session.** "Build the BizBuySell adapter" beats "work on the
   scraper." Focused sessions produce better work and cleaner handoffs.
3. **End sessions deliberately.** Before quitting (or when the conversation feels
   long), say: *"Wrap up — update the roadmap and commit."* Claude updates
   docs/ROADMAP.md and commits to git. The next session starts fresh with zero
   lost context.
4. **Fresh session > long session.** When Claude's context gets long it gets
   compressed and details blur. A fresh session that reads the roadmap is sharper
   than hour four of an old one.

## Token usage (Max 20x plan)

- Usage windows reset every 5 hours; there's also a weekly cap. On 20x you have
  lots of room — but big scraper-building sessions are the heavy hitters.
- Practical rules: don't run multiple heavy Claude sessions simultaneously;
  let one build finish before starting another; scheduled agents (like the
  morning HubSpot sync) count against the same budget.
- Check usage anytime with `/usage` in Claude Code.

## Plan mode

For big features, press Shift+Tab to enter **plan mode** — Claude researches and
proposes an approach before writing code, and you approve it first. Use it whenever
the task is fuzzy or crosses multiple parts of the system.

## Git = save points

Every commit is a snapshot we can roll back to. Claude handles the commands;
you just need the concept: commit early, commit often, push to GitHub so it's
backed up off this laptop and visible to Tom.

## What Claude needs from you (can't do itself)

- Account signups and payment details (GitHub, Supabase, Vercel, Anthropic Console)
- Approving anything that sends outreach or touches live HubSpot data
- Judgment calls on deal fit — the tools rank and draft; you decide
