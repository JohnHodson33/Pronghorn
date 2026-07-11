# List-building API setup — John's step-by-step

Total realistic cost at our volume (a few list-builds/week, a few hundred leads
each): **~$50–75/month** — vs. $10k+/yr for Inven/ZoomInfo/Grata. Start free,
add paid when you want more volume/quality.

## Phase 1 — FREE, no accounts needed (Lane C builds these now)
No action from John. These run without keys:
- **OpenStreetMap (Overpass API)** — business locations, free.
- **State license boards** — pest/contractor registries (AZ, TX, GA, NC, SC, TN,
  FL…). Complete legal-operator lists.
- **Secretary of State registries** — owner names + entity age.
- **Better Business Bureau** — accreditation grades.
- **Trade associations** — NALP, TCIA, NPMA, PHTA, ACCA directories.

## Phase 2 — PAID (cheap, pay-as-you-go). Set up when ready; put keys in
`C:\Users\johnd\Pronghorn\scraper\.env`.

### 1. Serper.dev  — Google Local/Maps/Web (the core signal)  ⭐ do first
- **Cost:** 2,500 free credits to start (valid 6 mo). Then **$50/mo Starter =
  50,000 searches** ($1 per 1,000; 1 credit = 1 search, 10 results). Our volume
  fits comfortably in Starter.
- **Steps:** go to **serper.dev** → Sign up (Google login) → Dashboard shows your
  API key → copy it. Free credits are active immediately; add the $50 plan later.
- **Put in .env:** `SERPER_API_KEY=...`

### 2. Google Places API (official) — rescue/structured
- **Cost:** **free $200/month credit** via Google Cloud (covers our rescue usage;
  effectively $0). Requires a billing account on file but won't charge under $200.
- **Steps:** **console.cloud.google.com** → create a project ("Pronghorn") →
  APIs & Services → Enable "Places API (New)" → Credentials → Create API key →
  restrict it to Places API.
- **Put in .env:** `GOOGLE_PLACES_API_KEY=...`

### 3. Exa.ai — AI company search (rescue, thin markets)
- **Cost:** **1,000 free searches/month**, then ~**$5–7 per 1,000** (pay-as-you-go,
  ~$0.005–0.007/search). Cents at our volume.
- **Steps:** **exa.ai** → Sign up → Dashboard → API Keys → create → (add a card
  for pay-as-you-go beyond the free 1k).
- **Put in .env:** `EXA_API_KEY=...`

### 4. Parallel.ai — AI entity search (rescue)
- **Cost:** **$0.005 per request** (Base $4/1k; Pro $9/1k). Pure pay-as-you-go.
- **Steps:** **parallel.ai** → Sign up → API keys → add billing.
- **Put in .env:** `PARALLEL_API_KEY=...`

## Phase 3 — ENRICHMENT (company → owner email/phone/LinkedIn)
### 5. Hunter.io — owner email finder + verifier  ⭐ do this
- **Cost:** **free tier 25 searches + 50 verifications/mo**, then Starter ~$34/mo
  (500 searches). Cheap; upgrade only when volume demands.
- **Steps:** **hunter.io** → Sign up → Dashboard → API → copy the API key.
- **Put in .env:** `HUNTER_API_KEY=...`
- (Free owner NAMES already come from license boards + Secretary-of-State; Hunter
  turns name+domain into a verified email.)

## Phase 4 — OUTREACH (automated cold email)
### 6. Cold-email sender — Instantly / Smartlead / Reply.io
- **Cost:** Instantly ~$37/mo, Smartlead ~$39/mo, Reply.io ~$60+/mo. Instantly/
  Smartlead are built for cold-email deliverability + inbox rotation + warmup;
  Reply.io works too (you named it). Pick one.
- **Steps:** sign up → Settings → API key. **Put in .env:** `OUTREACH_API_KEY=...`
  (and note which tool, e.g. `OUTREACH_TOOL=instantly`).
- **IMPORTANT before sending real email:** cold outreach needs a **separate
  sending domain** (NOT pronghornequity.com — protects your main domain's
  reputation). Buy a look-alike (e.g. getpronghorn.com / pronghorncap.com),
  add 2–3 mailboxes, and warm them up ~2 weeks. The app will build/queue the
  sequences; SENDING waits on this + John's go (guardrail: Claude never sends).

## Phase 5 — COLD CALLING (later; no key tonight)
Phone numbers come from enrichment. A power-dialer (Nooks) is optional later.

## Tonight's priority order
1. **Serper** (list building core, ~$50/mo) — the biggest single unlock.
2. **Hunter.io** (owner emails, free tier) — turns names into reachable contacts.
3. **Google Places** (free $200 credit) — rescue coverage at $0.
4. **Parallel** (in progress) + **Exa** ✅ — thin-market rescue, cents.
5. **Instantly/Smartlead/Reply.io** — outreach sequencer (sending domain is a
   separate ~2-week setup, so grab the account but real sends come later).

After you add ANY key to `scraper\.env`, tell the PM session — I sync it to the
worktrees and that capability goes live.
