# Lane A (Brokers) — decision log for PM/John

Worker session appends here; PM concatenates into DECISION-LOG.md.

## 2026-07-10 — bizmls crack applied via NATIONAL search, not per-org probing

- Probed 38 org-code guesses at `bizmls.com/<org>/businesses`: only `bbf` and
  `gabb` exist. GABB's bizmls area is a **member login portal** (aw-login.asp),
  not public listings — its public inventory is the Webflow API we already
  scrape. No other state association has a public bizmls org page.
- Better find: `folder=BIZMLS&state=ALL` (the bizmls.com homepage search)
  returns the ENTIRE cross-state member inventory in one GET — 2,256 rows.
  Shipped as source `bizmls` (reuses generalized `sources/bbf.js`), excluding
  FL rows since `bbf` is authoritative there. **+143 listings (84 Texas), 1 new
  Tier 1 on first run.**
- ➡️ Queue task "apply bizmls crack to other state associations" is COMPLETE in
  spirit: the national search already carries every member listing; there are
  no other public per-association portals to crack. PM can mark it done.
