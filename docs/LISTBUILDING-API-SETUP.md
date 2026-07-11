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

## Recommendation
Do **Serper (#1) + Google Places (#2)** first — that's the 80/20 (Google
coverage for ~$50/mo all-in, Places effectively free). Add Exa/Parallel only if
thin-market rescue is needed. The free Phase-1 sources run regardless and give
the license-board/SoS owner data that's uniquely valuable for outreach.

After you add any key to `.env`, tell the PM session — I'll sync it to the
worktrees and the List Building tab's sources go live.
