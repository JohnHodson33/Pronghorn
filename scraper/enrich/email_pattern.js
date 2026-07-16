// EMAIL PATTERN ENGINE — tier 2.5 (John 7/15, contact hit-rate program:
// "way too many blanks to actually source off this"; PM live-proved the
// method on treeprosaz.com: pattern={first}@, staff emails at 93-94 conf).
//
// Per company domain (once, cached forever in enrichment.email_pattern):
//   1. Hunter DOMAIN-SEARCH (1 quota search) → the domain's email pattern
//      + any published emails (role mailboxes stored as business channels)
//   2. CONSTRUCT the owner's email from pattern + owner first/last
//   3. VERIFY via Hunter email-verifier → ONLY a verified construction
//      writes owner_email; an unverifiable one lands in
//      enrichment.business_email with 'pattern-guess' provenance, never as
//      an owner channel (wrong > none).
//
// $0 marginal — Hunter Starter is a flat sub (500 searches + 1000
// verifications/mo, units metered). Webmail domains skipped (no pattern).
//
// Usage: node enrich/email_pattern.js [--limit 40] [--dry-run]
//   const { patternPass } = require('./email_pattern')   # cascade use

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const axios = require('axios');
const { supabase } = require('../core/db');
const { recordUsage } = require('../core/usage');

const WEBMAIL = /gmail|yahoo|hotmail|outlook|aol|icloud|comcast|msn|live\.|proton/i;
const ROLE_OR_GENERIC = /^(info|office|contact|sales|service|services|support|admin|hello|team|help|inquiries|dispatch)@|(hiring|careers?|recruit)/i;

const domainOf = (url) => String(url || '').replace(/^https?:\/\/(www\.)?/, '').split('/')[0].toLowerCase() || null;

function nameParts(full) {
  let n = String(full || '').trim();
  if (n.includes(',')) { const [last, first] = n.split(',').map((s) => s.trim()); n = `${(first || '').split(/\s+/)[0]} ${last}`; }
  const p = n.replace(/\b(jr|sr|ii|iii|iv)\.?$/i, '').trim().split(/\s+/);
  if (p.length < 2) return null;
  return { first: p[0].toLowerCase().replace(/[^a-z]/g, ''), last: p[p.length - 1].toLowerCase().replace(/[^a-z]/g, '') };
}

/** Render a Hunter pattern template ("{first}.{last}") for a person. */
function renderPattern(pattern, nm) {
  if (!pattern || !nm) return null;
  const local = pattern
    .replace('{first}', nm.first).replace('{last}', nm.last)
    .replace('{f}', nm.first[0] ?? '').replace('{l}', nm.last[0] ?? '');
  return /^[a-z0-9._-]+$/.test(local) ? local : null;
}

async function hunterDomainSearch(domain) {
  const { data } = await axios.get('https://api.hunter.io/v2/domain-search', {
    params: { domain, api_key: process.env.HUNTER_API_KEY, limit: 10 },
    timeout: 30000,
  });
  const d = data.data || {};
  return { pattern: d.pattern || null, emails: (d.emails || []).map((e) => ({ value: e.value, type: e.type, confidence: e.confidence })) };
}

async function hunterVerify(email) {
  const { data } = await axios.get('https://api.hunter.io/v2/email-verifier', {
    params: { email, api_key: process.env.HUNTER_API_KEY },
    timeout: 30000,
  });
  const d = data.data || {};
  return { status: d.status, score: d.score ?? null }; // valid | accept_all | webmail | disposable | invalid | unknown
}

/**
 * Pattern pass over leads (owner_name + own domain + no owner_email).
 * @returns {processed, patterns, ownerEmails, guesses}
 */
async function patternPass(leads, budget, log, { dryRun = false } = {}) {
  if (!process.env.HUNTER_API_KEY) { log?.warn('  email-pattern: no HUNTER_API_KEY'); return { processed: 0, patterns: 0, ownerEmails: 0, guesses: 0 }; }
  let processed = 0, patterns = 0, ownerEmails = 0, guesses = 0, searches = 0, verifications = 0;

  for (const l of leads) {
    if (processed >= budget) break;
    const domain = domainOf(l.website);
    const nm = nameParts(l.owner_name);
    if (!domain || !nm || WEBMAIL.test(domain)) continue;
    if (l.owner_email || l.enrichment?.email_pattern?.checked_at) continue; // once per lead
    processed++;

    try {
      const enrich = { ...(l.enrichment || {}) };
      const ds = await hunterDomainSearch(domain); searches++;
      await recordUsage('hunter', 'email_finding', 1, 0, { kind: 'domain_search', lead: l.id, domain });
      enrich.email_pattern = { checked_at: new Date().toISOString(), domain, pattern: ds.pattern };
      // published role emails → business channel (never owner)
      const pub = ds.emails.find((e) => e.value && !ROLE_OR_GENERIC.test(e.value)) || ds.emails[0];
      if (pub?.value && !enrich.business_email) enrich.business_email = pub.value;

      const patch = { enrichment: enrich };
      if (ds.pattern) {
        patterns++;
        const local = renderPattern(ds.pattern, nm);
        if (local) {
          const candidate = `${local}@${domain}`;
          const v = await hunterVerify(candidate); verifications++;
          await recordUsage('hunter', 'email_finding', 1, 0, { kind: 'verify', lead: l.id });
          enrich.email_pattern.candidate = candidate;
          enrich.email_pattern.verify = v;
          if (v.status === 'valid') {
            patch.owner_email = candidate; ownerEmails++;
            log?.info(`  ✓ ${l.name}: ${candidate} VERIFIED (${v.score})`);
          } else {
            // accept-all/unknown = plausible but unproven → business guess only
            enrich.email_pattern.provenance = 'pattern-guess';
            if (!enrich.business_email && v.status !== 'invalid') enrich.business_email = candidate;
            guesses++;
            log?.info(`  ~ ${l.name}: ${candidate} ${v.status} — stored as pattern-guess, NOT an owner channel`);
          }
        }
      }
      if (dryRun) continue;
      const { error } = await supabase.from('leads').update(patch).eq('id', l.id);
      if (error) log?.error(`  ${l.name}: ${error.message}`);
    } catch (e) {
      if (e.response?.status === 429) { log?.warn('  hunter rate-limited — stopping pass'); break; }
      log?.error(`  ${l.name}: ${e.response?.data?.errors?.[0]?.details || e.message}`);
    }
  }
  log?.info(`  email-pattern: ${processed} leads, ${patterns} domains w/ pattern, +${ownerEmails} VERIFIED owner emails, ${guesses} guesses (business only). Hunter: ${searches} searches + ${verifications} verifications ($0 marginal).`);
  return { processed, patterns, ownerEmails, guesses };
}

async function main() {
  const log = require('../utils/logger');
  const arg = (f, d) => { const i = process.argv.indexOf(f); return i > -1 ? Number(process.argv[i + 1]) : d; };
  const limit = arg('--limit', 40);
  const dryRun = process.argv.includes('--dry-run');

  const { data: leads } = await supabase.from('leads')
    .select('id,name,website,owner_name,owner_email,enrichment,off_target,status')
    .eq('status', 'enriched').is('owner_email', null).not('owner_name', 'is', null).not('website', 'is', null);
  const eligible = (leads || []).filter((l) => l.off_target !== true);
  log.info(`email-pattern backfill: ${eligible.length} IDENTIFIED leads w/ domain + owner name${dryRun ? ' [dry]' : ''}`);
  await patternPass(eligible, limit, log, { dryRun });
}

if (require.main === module) main().catch((e) => { console.error(e.message); process.exit(1); });
module.exports = { patternPass };
