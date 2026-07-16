// River-guide TIER-1 ENRICHMENT — the free/owned-tools waterfall (spec §5,
// John's cost rule: never pay for what Tier-1 returns). Routed by the
// acquired company's website status — the anchor that ties the person to the
// business they owned (handoff §4.8):
//
//   LIVE      → domain-first: Hunter email-finder on company_website
//   REDIRECTS → the person's current mail likely lives under the ACQUIRER's
//               domain (old domain still proves the historical tie)
//   DEFUNCT / NOT_FOUND → LinkedIn-first (v3 verified matcher)
//
// All routes also attempt the verified-LinkedIn match when missing. Tier-1
// failures move to NEEDS_PAID — the escalation queue John reviews for the
// paid tier (Upwork/ZoomInfo/Inven). NOTHING auto-pays.
// Results sync onto the linked CRM contact (fill-blanks only).
//
// Usage: node riverguides/enrich_t1.js [--limit 20] [--band CALL_NOW] [--dry-run]

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const axios = require('axios');
const { supabase } = require('../core/db');
const log = require('../utils/logger');
const { recordUsage } = require('../core/usage');

const HUNTER_MIN_SCORE = 70;

function nameParts(full) {
  const p = String(full || '').trim().split(/\s+/);
  return p.length >= 2 ? { first: p[0], last: p[p.length - 1] } : null;
}
const domainOf = (url) => String(url || '').replace(/^https?:\/\/(www\.)?/, '').split('/')[0] || null;

async function hunterFind(domain, nm) {
  const { data } = await axios.get('https://api.hunter.io/v2/email-finder', {
    params: { domain, first_name: nm.first, last_name: nm.last, api_key: process.env.HUNTER_API_KEY },
    timeout: 30000,
  });
  const r = data.data || {};
  return { email: r.email && (r.score ?? 0) >= HUNTER_MIN_SCORE ? r.email : null, score: r.score ?? null };
}

async function main() {
  const arg = (f, d) => { const i = process.argv.indexOf(f); return i > -1 ? process.argv[i + 1] : d; };
  const limit = Number(arg('--limit', 20));
  const band = arg('--band', null);
  const industry = arg('--industry', null); // e.g. TREE_CARE — John works one vertical at a time
  const dryRun = process.argv.includes('--dry-run');

  let q = supabase.from('river_guides').select('*')
    .eq('enrichment_status', 'PENDING_T1').eq('name_status', 'RESOLVED')
    .order('screen_score', { ascending: false }).limit(limit);
  if (band) q = q.eq('priority_band', band);
  if (industry) q = q.eq('industry', industry);
  const { data: guides, error } = await q;
  if (error) { console.error(`${error.message} — apply migration 0016 first`); process.exit(1); }
  if (!guides?.length) { log.info('No PENDING_T1 river guides.'); return; }
  log.info(`tier-1 enrichment: ${guides.length} guides${dryRun ? ' [dry]' : ''}`);

  let hunterUsed = 0, emails = 0, linkedins = 0, toPaid = 0, done = 0;
  const Anthropic = require('@anthropic-ai/sdk');
  const anthropic = new Anthropic();
  const { findVerifiedLinkedin } = require('../enrich/linkedin_match');

  for (const g of guides) {
    try {
      const nm = nameParts(g.full_name);
      if (!nm) continue;
      const patch = {};
      const status = g.company_website_status || 'NOT_FOUND';

      // email: domain-first routing
      if (!g.email && process.env.HUNTER_API_KEY) {
        const domains = [];
        if (status === 'LIVE') domains.push(domainOf(g.company_website));
        if (status === 'REDIRECTS' || g.exit_status === 'EMPLOYED') domains.push(domainOf(g.acquirer_website));
        for (const d of domains.filter(Boolean)) {
          try {
            const r = await hunterFind(d, nm); hunterUsed++;
            await recordUsage('hunter', 'email_finding', 1, 0, { river_guide: g.deal_id, domain: d });
            if (r.email) { patch.email = r.email; emails++; break; }
          } catch (e) { if (e.response?.status === 429) break; }
        }
      }

      // linkedin: verified matcher (LinkedIn-first routes rely on this entirely)
      if (!g.linkedin_url) {
        const v = await findVerifiedLinkedin(anthropic, {
          id: g.deal_id, name: g.their_company, owner_name: g.full_name,
          city: g.location_city, state: g.location_state, industry_verified: g.industry,
        }, { industry: g.industry }, log);
        if (v) { patch.linkedin_url = v.url; linkedins++; }
      }

      const gotAnything = patch.email || patch.linkedin_url || g.email || g.linkedin_url;
      patch.enrichment_status = gotAnything ? 'T1_DONE' : 'NEEDS_PAID';
      patch.updated_at = new Date().toISOString();
      if (!gotAnything) toPaid++;

      if (dryRun) { log.info(`  [dry] ${g.full_name} (${status}): ${JSON.stringify(patch)}`); continue; }
      const { error: uErr } = await supabase.from('river_guides').update(patch).eq('deal_id', g.deal_id);
      if (uErr) { log.error(`  ${g.full_name}: ${uErr.message}`); continue; }
      done++;

      // sync onto the CRM contact (fill blanks only)
      if (g.contact_id && (patch.email || patch.linkedin_url)) {
        const { data: c } = await supabase.from('contacts').select('email,linkedin').eq('id', g.contact_id).maybeSingle();
        const cPatch = {};
        if (patch.email && !c?.email) cPatch.email = patch.email;
        if (patch.linkedin_url && !c?.linkedin) cPatch.linkedin = patch.linkedin_url;
        if (Object.keys(cPatch).length) await supabase.from('contacts').update(cPatch).eq('id', g.contact_id);
      }
      log.info(`  ${gotAnything ? '✓' : '→paid'} ${g.full_name} (${status})${patch.email ? ' email ' + patch.email : ''}${patch.linkedin_url ? ' li' : ''}`);
    } catch (e) { log.error(`  ${g.full_name}: ${e.message}`); }
  }

  log.info(`tier-1 done: ${done} processed → +${emails} emails, +${linkedins} verified LinkedIn, ${toPaid} escalated to NEEDS_PAID (John's paid-tier review queue). Hunter searches: ${hunterUsed} ($0 marginal).`);
}

main().catch((e) => { console.error(e.message); process.exit(1); });
