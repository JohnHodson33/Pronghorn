require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const Anthropic = require('@anthropic-ai/sdk');
const log = require('../utils/logger');
const { locationString, enrich } = require('../core/listing');

const DEFAULT_MODEL = 'claude-haiku-4-5-20251001';
const DEFAULT_BATCH_SIZE = 10;
const DEFAULT_BATCH_DELAY_MS = 1000;

// Input token cost for Haiku: $0.80 per million input tokens
// Output token cost for Haiku: $4.00 per million output tokens
// Approximate per-listing tokens: ~400 input, ~80 output
const COST_PER_INPUT_TOKEN  = 0.80  / 1_000_000;
const COST_PER_OUTPUT_TOKEN = 4.00  / 1_000_000;

const SYSTEM_PROMPT = `You are a deal screener for Pronghorn Equity Partners, a committed-capital acquisition vehicle executing programmatic roll-up strategies in fragmented business services industries. Classify each listing into one of four tiers and classify its industry.

MANDATE:
- Verticals: Essential, non-discretionary home and property services with recurring or repeat revenue. Priority: recurring route-based services (pest control, pool service, chemical lawn care, lake/pond/water management); mechanical trades (HVAC, plumbing, electrical) favoring service/repair/replacement over new-construction install; exterior/property maintenance (roofing, landscaping, tree care, windows & doors). Open to other essential commercial/residential services with a recurring service base and heavy industry fragmentation.
- Size: Platforms ~$2M-$5M EBITDA; tuck-ins ~$500K-$2M EBITDA. Hard floor $300K SDE/EBITDA, hard cap $10M (a pre-filter enforces these on disclosed figures; if cash flow is undisclosed, judge plausible size from asking price and description).
- Geography: National mandate. Southwest/Sun Belt priority: AZ, NV, TX, UT, CO, NM, GA, NC, SC, TN — treat priority-state listings a notch more favorably on close calls.
- Revenue quality: Recurring service contracts, maintenance agreements, route density, and high-frequency repeat customers strongly preferred; service/repair revenue favored over project or new-construction work.
- Multiple: Flag above 5x but do not auto-reject — we care about spread between entry and scaled exit.
- Dealbreakers: Single-customer concentration above ~25% of revenue; heavy new-construction dependence; strong cyclicality or weak recession resistance. Owner-operator dependence is NOT a dealbreaker — professionalization is the model.

TIERS:
Tier 1 — Strong fit: Clears the mandate, worth full Deal Screening analysis immediately
Tier 2 — Watchlist: Interesting but one meaningful concern
Tier 3 — Pass: Does not fit the mandate, nothing egregiously wrong
Tier 4 — Hard pass: Clear disqualifier — dealbreaker present, wrong sector, or implausible financials

INDUSTRY — classify into exactly one of:
Pest Control | Pool Services | Lawn Care | Lake/Pond Management | Tree Care | Landscaping | HVAC | Plumbing | Electrical | Roofing | Windows & Doors | Cleaning/Janitorial | Restoration | Property Maintenance | Other Essential Services | Other

Infer business type and revenue quality from the description field — do not penalize listings for missing gross_revenue since detail pages are blocked.

REVENUE EXTRACTION — if gross_revenue is null but the description explicitly states an annual revenue/sales figure (e.g. "$2.4M in annual sales", "revenue of $3,100,000"), extract it as a plain number in "revenue". Only extract explicitly stated annual revenue — never infer, estimate, or extract EBITDA/SDE/asking-price figures as revenue. Use null when not stated.

OUTPUT — respond only with valid JSON, no other text:
{"tier": 1, "industry": "HVAC", "revenue": 2400000, "reasoning": "One sentence explaining the decision referencing specific listing details"}`;

function buildUserMessage(l) {
  return JSON.stringify({
    source:           l.source,
    name:             l.name,
    location:         locationString(l),
    priority_state:   l.priority_state || false,
    asking_price:     l.asking_price,
    gross_revenue:    l.gross_revenue,
    cash_flow:        l.cash_flow,
    cash_flow_type:   l.cash_flow_type,
    implied_multiple: l.implied_multiple,
    multiple_flag:    l.multiple_flag,
    description:      l.description,
  });
}

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

async function screenOne(client, model, filtersCfg, listing, tokenTracker) {
  try {
    const response = await client.messages.create({
      model,
      max_tokens: 250,
      system:     SYSTEM_PROMPT,
      messages:   [{ role: 'user', content: buildUserMessage(listing) }],
    });

    tokenTracker.inputTokens  += response.usage.input_tokens;
    tokenTracker.outputTokens += response.usage.output_tokens;

    const raw = response.content[0]?.text?.trim() || '';

    // Strip markdown code fences if the model wraps in ```json ... ```
    const jsonText = raw.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
    const parsed = JSON.parse(jsonText);

    const tier = Number(parsed.tier);
    if (![1, 2, 3, 4].includes(tier)) throw new Error(`Invalid tier value: ${parsed.tier}`);

    const result = {
      ...listing,
      tier,
      industry: parsed.industry || listing.industry,
      reasoning: parsed.reasoning || '',
    };

    // Revenue extracted from description text — fills gross_revenue only when the
    // source didn't provide it, then re-derives margin/multiple off the new figure
    const extractedRevenue = (typeof parsed.revenue === 'number' && parsed.revenue > 0) ? parsed.revenue : null;
    if (result.gross_revenue == null && extractedRevenue) {
      result.gross_revenue = extractedRevenue;
      result.raw = { ...result.raw, revenue_from_description: true };
      enrich(result, filtersCfg);
    }

    return result;

  } catch (err) {
    log.error(`Screener error for listing ${listing.id} (${listing.name}): ${err.message}`);
    return { ...listing, tier: 4, reasoning: 'Screening error — defaulted to Tier 4' };
  }
}

async function screenListings(listings, config = {}) {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY not set in .env file');
  }

  const model        = config.screener?.model || DEFAULT_MODEL;
  const batchSize    = config.screener?.batch_size || DEFAULT_BATCH_SIZE;
  const batchDelayMs = config.screener?.batch_delay_ms ?? DEFAULT_BATCH_DELAY_MS;

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const tokenTracker = { inputTokens: 0, outputTokens: 0 };
  const results = [];

  const totalBatches = Math.ceil(listings.length / batchSize);
  log.info(`Screening ${listings.length} listings in ${totalBatches} batches of ${batchSize} using ${model}`);

  for (let i = 0; i < listings.length; i += batchSize) {
    const batchNum   = Math.floor(i / batchSize) + 1;
    const batch      = listings.slice(i, i + batchSize);

    log.info(`  Batch ${batchNum}/${totalBatches} — screening listings ${i + 1}–${Math.min(i + batchSize, listings.length)}`);

    const batchResults = await Promise.all(
      batch.map((listing) => screenOne(client, model, config.filters || {}, listing, tokenTracker))
    );

    results.push(...batchResults);

    if (i + batchSize < listings.length) await sleep(batchDelayMs);
  }

  // Compute estimated cost
  const estimatedCost = (
    tokenTracker.inputTokens  * COST_PER_INPUT_TOKEN +
    tokenTracker.outputTokens * COST_PER_OUTPUT_TOKEN
  ).toFixed(4);

  // Tier counts
  const counts = { 1: 0, 2: 0, 3: 0, 4: 0 };
  results.forEach((r) => { if (counts[r.tier] !== undefined) counts[r.tier]++; });

  log.info('=== SCREENING SUMMARY ===');
  log.info(`Total listings screened: ${results.length}`);
  log.info(`Tier 1 — Forward to Deal Screening: ${counts[1]}`);
  log.info(`Tier 2 — Watchlist: ${counts[2]}`);
  log.info(`Tier 3 — Pass: ${counts[3]}`);
  log.info(`Tier 4 — Hard pass: ${counts[4]}`);
  log.info(`Estimated API cost this run: $${estimatedCost}`);
  log.info(`Run completed: ${new Date().toISOString()}`);
  log.info('========================');

  return results;
}

module.exports = { screenListings };
