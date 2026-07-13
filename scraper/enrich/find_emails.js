// Owner email finder via Hunter.io — ENRICHMENT-STRATEGY step 3 (the paid
// tail: ~$0.02–0.05/verified email; free tier = 25 searches/MONTH, so this
// runs on demand with a conservative default cap, highest-value leads first).
//
// Picks enriched leads that have an owner NAME + website but no personal
// owner email (or only a generic info@/office@ mailbox), asks Hunter's
// email-finder for <owner_name>@<domain>, and stores results scoring ≥70.
// Generic mailboxes are preserved in enrichment.business_email.
//
// Usage: node enrich/find_emails.js [--limit 5] [--min-score 70]

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const axios = require('axios');
const { supabase } = require('../core/db');
const log = require('../utils/logger');

const GENERIC = /^(info|office|contact|sales|service|services|support|admin|hello|customerservice|servicetoday)@/i;

/** "OPPELT, EDDY RAY" (license-board style) → "Eddy Oppelt" */
function normalizeName(name) {
  let n = String(name || '').trim();
  if (n.includes(',')) {
    const [last, first] = n.split(',').map((s) => s.trim());
    n = `${first.split(/\s+/)[0]} ${last}`;
  }
  return n.toLowerCase().replace(/\b[a-z]/g, (c) => c.toUpperCase());
}

async function main() {
  const key = process.env.HUNTER_API_KEY;
  if (!key) { console.error('HUNTER_API_KEY not set in scraper/.env'); process.exit(1); }
  const arg = (f) => { const i = process.argv.indexOf(f); return i > -1 ? Number(process.argv[i + 1]) : null; };
  // Default lifted from 5 (free-tier guard) — Hunter Starter approved 7/12.
  const limit = arg('--limit') || Number(process.env.HUNTER_RUN_BUDGET) || 50;
  const minScore = arg('--min-score') || 70;

  const { data: leads, error } = await supabase.from('leads')
    .select('id, name, website, owner_name, owner_email, enrichment')
    .eq('status', 'enriched')
    .not('owner_name', 'is', null)
    .not('website', 'is', null)
    .limit(200);
  if (error) throw new Error(error.message);

  const targets = leads
    .filter((l) => !l.owner_email || GENERIC.test(l.owner_email))
    .filter((l) => !l.enrichment?.hunter) // one Hunter attempt per lead, ever
    .slice(0, limit);
  if (!targets.length) { log.info('No leads need email finding.'); return; }
  log.info(`Hunter email-finder: ${targets.length} leads (cap ${limit}, min score ${minScore})`);

  let found = 0, quota = null;
  for (const l of targets) {
    const domain = l.website.replace(/^https?:\/\/(www\.)?/, '').split('/')[0];
    const fullName = normalizeName(l.owner_name);
    try {
      const { data, headers } = await axios.get('https://api.hunter.io/v2/email-finder', {
        params: { domain, full_name: fullName, api_key: key }, timeout: 30000,
      });
      quota = headers['x-rate-limit-remaining'] ?? quota;
      const r = data.data || {};
      const hunter = { email: r.email || null, score: r.score ?? null, at: new Date().toISOString() };
      const patch = { enrichment: { ...(l.enrichment || {}), hunter } };
      if (r.email && (r.score ?? 0) >= minScore) {
        if (l.owner_email && GENERIC.test(l.owner_email)) {
          patch.enrichment.business_email = l.owner_email;
        }
        patch.owner_email = r.email;
        found++;
        log.info(`  ${l.name}: ${fullName} → ${r.email} (score ${r.score})`);
      } else {
        log.info(`  ${l.name}: no confident email (score ${r.score ?? '—'})`);
      }
      await supabase.from('leads').update(patch).eq('id', l.id);
    } catch (e) {
      const msg = e.response?.data?.errors?.[0]?.details || e.message;
      log.warn(`  ${l.name}: ${msg}`);
      if (e.response?.status === 429) { log.warn('Hunter quota exhausted — stopping.'); break; }
      // record the attempt so we don't burn quota retrying hopeless domains
      await supabase.from('leads').update({ enrichment: { ...(l.enrichment || {}), hunter: { error: msg, at: new Date().toISOString() } } }).eq('id', l.id);
    }
  }
  log.info(`Email finder: ${found}/${targets.length} verified emails${quota != null ? ` (Hunter quota remaining: ${quota})` : ''}`);
  const { recordUsage } = require('../core/usage');
  // Hunter is a FLAT monthly subscription (the sub IS the cash cost). Book $0
  // marginal so variable spend isn't double-counted against the sub; keep
  // units so the badge can show "searches used / cap" (John 7/12 fix).
  await recordUsage('hunter', 'email_finding', targets.length, 0,
    { found, plan: 'subscription', quota_remaining: quota });
}

main().catch((e) => { console.error(e.message); process.exit(1); });
