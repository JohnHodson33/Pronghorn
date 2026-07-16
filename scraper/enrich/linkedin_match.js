// Owner-LinkedIn matcher v3 (John 7/15 ~11:40 — "every representative example
// I look at seems to be wrong… I'd be trusting it for automated outreach").
// The token-overlap matchers (v1 Exa, v2 slug-guard) both failed his spot
// checks, so this REPLACES them:
//
//   1. Serper search: site:linkedin.com/in "{owner name}" "{company}"
//      (+ a geo variant when the company query returns nothing).
//   2. Claude VERIFIES the candidate snippets — a link is accepted ONLY with
//      2+ independent corroborations, one of which must be the company name
//      and one a geography or owner-role/title match. Same-name-different-
//      person is the failure mode being killed; uncertain = reject.
//   3. Compound names ("Gary Wilson Sr. and Gary Wilson Jr.") are SPLIT into
//      individual people and tried one at a time — never matched as a string.
//
// Accepted links get enrichment.linkedin_verified=true + a linkedin_verify
// provenance block. ONLY verified links count as owner channels (completeness
// math + outreach eligibility) — wrong > none is John's trust standard.
// Cost ≈ $0.003-0.005/lead (1-2 Serper queries + one Haiku verify).

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const axios = require('axios');
const { recordUsage } = require('../core/usage');

const SERPER_COST = 0.001;

/** Split an owner_name field into individual person names (compound-safe). */
function personsFrom(name) {
  let n = String(name || '').trim();
  if (!n) return [];
  const parts = n.split(/\s+(?:and|&)\s+/i).map((s) => s.trim()).filter(Boolean);
  return parts.map((p) => {
    if (p.includes(',')) {
      const [last, first] = p.split(',').map((s) => s.trim());
      p = `${(first || '').split(/\s+/)[0]} ${last}`;
    }
    p = p.replace(/\b(jr|sr|ii|iii|iv)\.?$/i, '').trim();
    // "Gary Wilson Sr. and Gary Wilson Jr." → after suffix strip both are "Gary Wilson"
    return p;
  }).filter((p, i, arr) => p.split(/\s+/).length >= 2 && arr.indexOf(p) === i)
    .filter((p) => !/\b(llc|inc|corp|company|holdings|trust|enterprises|group|services)\b/i.test(p));
}

async function serperSearch(q, log) {
  try {
    const { data } = await axios.post('https://google.serper.dev/search', { q, num: 8 },
      { headers: { 'X-API-KEY': process.env.SERPER_API_KEY, 'Content-Type': 'application/json' }, timeout: 20000 });
    return (data.organic || []).filter((r) => /linkedin\.com\/in\//.test(r.link || ''))
      .map((r) => ({ url: r.link.split('?')[0], title: r.title || '', snippet: r.snippet || '' }));
  } catch (e) { log?.warn(`    serper: ${e.response?.status || e.message}`); return []; }
}

const VERIFY_SYSTEM = `You verify whether a LinkedIn profile belongs to a SPECIFIC small-business owner. You get the person's name, their company, its location/industry, and LinkedIn search results (title + snippet per candidate).

Accept a candidate ONLY when the evidence shows 2+ INDEPENDENT corroborations, of which at least one is the COMPANY (company name or an obvious rebrand/parent appearing in the candidate's title/snippet as their affiliation) and at least one is GEOGRAPHY (their city/metro/state) or an OWNER-ROLE title (owner/founder/co-founder/president/CEO of that kind of business).

The failure mode you exist to kill: a different person with the same name. When evidence is thin, ambiguous, or merely "name matches" — REJECT. An empty result is always better than a wrong link.

Output JSON only:
{"url": "<the accepted candidate url or null>",
 "corroborations": ["company: …", "geo: …", "title: …"],
 "confidence": "high|medium|low",
 "why": "one line"}`;

/**
 * Find + verify the owner's LinkedIn. Returns
 * {url, corroborations, confidence, person} or null. Tries each person of a
 * compound name individually.
 */
async function findVerifiedLinkedin(anthropic, lead, ctx, log) {
  const persons = personsFrom(lead.owner_name);
  if (!persons.length) return null;
  let queries = 0;

  for (const person of persons) {
    let candidates = await serperSearch(`site:linkedin.com/in "${person}" "${lead.name}"`, log); queries++;
    if (!candidates.length) {
      const geo = [lead.city, lead.state].filter(Boolean).join(' ');
      candidates = await serperSearch(`site:linkedin.com/in "${person}" ${geo} ${ctx?.industry || ''}`.trim(), log); queries++;
    }
    if (!candidates.length) continue;

    try {
      const msg = await anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001', max_tokens: 400, system: VERIFY_SYSTEM,
        messages: [{ role: 'user', content: JSON.stringify({
          person, company: lead.name, city: lead.city, state: lead.state,
          industry: ctx?.industry || lead.industry_verified || null,
          candidates: candidates.slice(0, 6),
        }) }],
      });
      const m = msg.content[0].text.match(/\{[\s\S]*\}/);
      const v = JSON.parse(m[0]);
      // code-enforced acceptance: URL must be a real candidate, 2+ corroborations,
      // one company + one geo/title — the model can't talk its way past this
      const isCandidate = v.url && candidates.some((c) => c.url === v.url);
      const corr = Array.isArray(v.corroborations) ? v.corroborations : [];
      const hasCompany = corr.some((c) => /^company/i.test(c));
      const hasGeoOrTitle = corr.some((c) => /^(geo|title)/i.test(c));
      if (isCandidate && corr.length >= 2 && hasCompany && hasGeoOrTitle && v.confidence !== 'low') {
        await recordUsage('serper', 'enrichment', queries, queries * SERPER_COST, { kind: 'linkedin_verify', lead: lead.id });
        return { url: v.url, corroborations: corr, confidence: v.confidence, person };
      }
      log?.info(`    linkedin: rejected for ${person} @ ${lead.name} (${v.why || 'insufficient corroboration'})`);
    } catch (e) { log?.warn(`    linkedin verify: ${e.message}`); }
  }
  if (queries) await recordUsage('serper', 'enrichment', queries, queries * SERPER_COST, { kind: 'linkedin_verify_miss', lead: lead.id });
  return null;
}

module.exports = { findVerifiedLinkedin, personsFrom };
