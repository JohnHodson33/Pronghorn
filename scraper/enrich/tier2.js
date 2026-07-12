// Tier-2 enrichment — the cascade's second stage (ENRICHMENT-UX ROUND 2 §1,
// John 7/12: one click cascades tiers with EARLY EXIT when the owner record is
// complete). Runs on leads that already have tier-1 enrichment but are missing
// owner channels:
//   email    → Hunter finder (owner name + domain, score ≥ 70, quota-capped)
//   linkedin → Exa search scoped to linkedin.com/in, owner-name token match
//   phone    → only what tier 1 extracted or the VA fills — no low-confidence
//              guessing, and NEVER the company main line (attribution rule)
// Fields fill blanks only; everything metered.

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const axios = require('axios');
const { supabase } = require('../core/db');
const { recordUsage } = require('../core/usage');

const HUNTER_MIN_SCORE = 70;

/** "OPPELT, EDDY RAY" → "Eddy Oppelt" */
function normalizeName(name) {
  let n = String(name || '').trim();
  if (n.includes(',')) {
    const [last, first] = n.split(',').map((s) => s.trim());
    n = `${first.split(/\s+/)[0]} ${last}`;
  }
  return n.toLowerCase().replace(/\b[a-z]/g, (c) => c.toUpperCase());
}

function isComplete(l) {
  return !!(l.owner_name && l.owner_email && (l.owner_phone || l.owner_linkedin));
}

async function hunterEmail(lead, budget, log) {
  if (budget.hunter <= 0 || !process.env.HUNTER_API_KEY) return null;
  if (lead.enrichment?.hunter) return null; // one attempt per lead, ever
  const domain = (lead.website || '').replace(/^https?:\/\/(www\.)?/, '').split('/')[0];
  if (!domain) return null;
  budget.hunter--;
  try {
    const { data } = await axios.get('https://api.hunter.io/v2/email-finder', {
      params: { domain, full_name: normalizeName(lead.owner_name), api_key: process.env.HUNTER_API_KEY },
      timeout: 30000,
    });
    await recordUsage('hunter', 'email_finding', 1, 0, { tier: 2, lead: lead.id });
    const r = data.data || {};
    return { hunter: { email: r.email || null, score: r.score ?? null, at: new Date().toISOString() },
             email: r.email && (r.score ?? 0) >= HUNTER_MIN_SCORE ? r.email : null };
  } catch (e) {
    if (e.response?.status === 429) budget.hunter = 0;
    log?.warn(`    hunter: ${e.response?.data?.errors?.[0]?.details || e.message}`);
    return null;
  }
}

async function exaLinkedin(lead, budget, log) {
  if (budget.exa <= 0 || !process.env.EXA_API_KEY) return null;
  budget.exa--;
  try {
    const { data } = await axios.post('https://api.exa.ai/search', {
      query: `${normalizeName(lead.owner_name)} ${lead.name}`,
      numResults: 3,
      includeDomains: ['linkedin.com'],
    }, { headers: { 'x-api-key': process.env.EXA_API_KEY, 'content-type': 'application/json' }, timeout: 30000 });
    await recordUsage('exa', 'enrichment', 1, 0.006, { tier: 2, lead: lead.id, kind: 'linkedin' });
    const tokens = normalizeName(lead.owner_name).toLowerCase().split(/\s+/).filter((t) => t.length > 2);
    for (const r of data.results || []) {
      if (!/linkedin\.com\/in\//.test(r.url || '')) continue;
      const hay = `${r.title || ''} ${r.url}`.toLowerCase();
      if (tokens.some((t) => hay.includes(t))) return r.url.split('?')[0];
    }
  } catch (e) { log?.warn(`    exa/linkedin: ${e.response?.status || e.message}`); }
  return null;
}

/**
 * Cascade tier 2 over a set of leads (already tier-1 enriched, incomplete).
 * @param leads rows with id,name,website,owner_name,owner_email,owner_phone,owner_linkedin,enrichment
 * @param budget { hunter, exa } per-run caps (protects quotas)
 * @param onProgress optional (i, patchApplied) callback
 * @returns { processed, emails, linkedins }
 */
async function runTier2(leads, budget, log, onProgress) {
  let processed = 0, emails = 0, linkedins = 0;
  for (const l of leads) {
    processed++;
    if (isComplete(l) || !l.owner_name) { onProgress?.(processed, false); continue; } // early exit / needs tier 1 first
    const patch = {};
    const enrich = { ...(l.enrichment || {}) };

    if (!l.owner_email) {
      const r = await hunterEmail(l, budget, log);
      if (r) { enrich.hunter = r.hunter; if (r.email) { patch.owner_email = r.email; emails++; } }
    }
    if (!l.owner_linkedin) {
      const url = await exaLinkedin(l, budget, log);
      if (url) { patch.owner_linkedin = url; linkedins++; }
    }
    enrich.tier2 = { at: new Date().toISOString(), got: Object.keys(patch) };
    patch.enrichment = enrich;
    const { error } = await supabase.from('leads').update(patch).eq('id', l.id);
    if (error) log?.error(`    ${l.name}: ${error.message}`);
    else if (patch.owner_email || patch.owner_linkedin) log?.info(`    tier2 ${l.name}: ${[patch.owner_email, patch.owner_linkedin].filter(Boolean).join(' · ')}`);
    onProgress?.(processed, true);
  }
  return { processed, emails, linkedins };
}

module.exports = { runTier2, isComplete };
