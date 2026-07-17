// Canonical add-on-acquisition extractor for the river-guides consolidator
// sweep — ONE prompt, ONE guard, shared so there is one place to fix (PM 7/17).
// Ported from Lane C's battle-tested discovery route (web/app/api/river-guides/
// discover/route.ts), whose corroboration guard the PM live-probed with a
// fabricated consolidator ("Test Sweep Probe") and confirmed it files nothing.
//
// Callers:
//   · scraper/river_guides_sweep.js  — batch over all known consolidators
//   · web/app/api/river-guides/discover/route.ts — on-demand single consolidator
//     (Lane C: replace its inline extractor+guard with this module; it mirrors
//      score.js today, so either import this or mirror it — coordinated via 📣)
//
// GUARD (hard law, spec §6.1 — a fabricated/mis-attributed deal is worse than
// none). Enforced in CODE, not just the prompt:
//   1. the queried consolidator must literally appear (ALL distinctive tokens)
//      in the cited result's own text — not merely in the same search
//   2. the model's acquirer_quote must be real text from that cited result
//   3. a seller NAME is stored only when a cited result literally names them;
//      else the row is TBD/NEEDS_NAME (never guessed)
// The model reads the results and reports; nothing it returns is trusted until
// it clears these checks, so a fabricated name cannot be filed.

const MODEL = 'claude-haiku-4-5-20251001';

const EXTRACT_SYSTEM = `You extract ADD-ON ACQUISITIONS **by one specific named consolidator** from web search results. This feeds an outreach list — a fabricated deal, acquirer, or seller is worse than none.

THE ACQUIRER TEST (most important): include an acquisition ONLY if the cited result literally shows THAT consolidator (the exact company we asked about) acquiring that business. Search engines return generic industry results for unknown names — if the results are simply about the industry, or about a DIFFERENT acquirer, return an empty list. Do not attribute a real deal to the queried consolidator because it appeared in the same search.

Then per acquisition: the acquired company name, the year if stated, and the seller/owner name ONLY IF a result literally names them as the owner/founder who sold.

NEVER include: deals merely implied; a deal whose actual acquirer is someone else; sellers inferred from company names; people in other roles (acquirer execs, brokers); anything you know from memory but the results don't show.

Output JSON only:
{"acquisitions": [{"company": "...", "year": 2023 or null,
  "acquirer_quote": "the sentence/snippet fragment from the cited result that shows THIS consolidator acquiring it",
  "seller_name": "First Last or null", "seller_result_index": 0 or null,
  "city": "or null", "state": "2-letter or null", "result_index": 0}]}`;

function norm(s) {
  return String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

async function callClaude(results, consolidator, industry, apiKey) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1500,
      system: EXTRACT_SYSTEM,
      messages: [{ role: 'user', content: JSON.stringify({ consolidator, industry: industry || '', results }) }],
    }),
  });
  if (!res.ok) throw new Error(`extraction HTTP ${res.status}`);
  const ai = await res.json();
  try {
    return JSON.parse(ai.content[0].text.match(/\{[\s\S]*\}/)[0]).acquisitions ?? [];
  } catch { return []; }
}

/**
 * THE GUARD — pure + synchronous so it is unit-testable against the known-bad
 * cases independently of any model call. Returns a corroborated acquisition
 * ({company, deal_year, seller_name|null, resolved, source_url}) or null.
 */
function corroborate(a, results, consolidator) {
  if (!a || !a.company) return null;
  // A seller name counts only if the model cited a result that exists.
  const sellerOk = a.seller_name && a.seller_result_index != null && results[a.seller_result_index];
  const srcIdx = sellerOk ? a.seller_result_index : a.result_index;
  const cited = results[srcIdx];
  const source = cited && cited.url;
  if (!source) return null;                         // no provenance, no row

  // The cited result must literally name this consolidator (every distinctive
  // token — guards "Perimeter Solutions" vs a stray "Perimeter"), AND the
  // model's quote must be real text from that result, not a summary it wrote.
  const citedText = `${cited.title || ''} ${cited.snippet || ''}`;
  const tokens = norm(consolidator).split(' ').filter((t) => t.length > 2);
  const mentions = tokens.length > 0 && tokens.every((t) => norm(citedText).includes(t));
  const quoteIsReal = a.acquirer_quote ? norm(citedText).includes(norm(a.acquirer_quote).slice(0, 40)) : false;
  if (!mentions || !quoteIsReal) return null;

  // The add-on must not BE the consolidator restated.
  if (norm(a.company) === norm(consolidator)) return null;

  const resolved = Boolean(sellerOk);
  return {
    company: a.company,
    deal_year: Number.isInteger(a.year) ? a.year : null,
    seller_name: resolved ? a.seller_name : null,
    resolved,
    city: a.city || null,
    state: a.state || null,
    source_url: source,
  };
}

/**
 * Fetch → extract → corroborate. `results` = [{url,title,snippet}]. Returns the
 * corroborated acquisitions (may be []). Never throws on a bad model response.
 */
async function extractAcquisitions({ results, consolidator, industry, apiKey }) {
  if (!results || !results.length) return [];
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY required for extraction');
  const acquisitions = await callClaude(results, consolidator, industry, apiKey);
  const out = [];
  for (const a of acquisitions) {
    const v = corroborate(a, results, consolidator);
    if (v) out.push(v);
  }
  return out;
}

module.exports = { extractAcquisitions, corroborate, norm, EXTRACT_SYSTEM, MODEL };
