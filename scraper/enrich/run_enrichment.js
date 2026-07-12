// Enrichment worker — turn a lead into a reachable OWNER (ENRICHMENT-STRATEGY.md
// steps 1–2, the ~free bulk tier): scrape the company website (home/about/
// contact), pull Exa web+LinkedIn snippets, and have Claude extract owner name/
// title/email/phone/LinkedIn + business signals. Writes to leads.owner_* (only
// filling blanks — license-board owner names are ground truth and never
// overwritten), leads.enrichment (jsonb audit), status new → enriched.
//
// READ-ONLY externally: fetches public pages; sends nothing, contacts no one.
//
// Usage:
//   node enrich/run_enrichment.js                 # up to --limit new leads (default 25)
//   node enrich/run_enrichment.js --list <uuid>   # only leads from one lead list
//   node enrich/run_enrichment.js --limit 100
//
// Cost: Haiku ~$0.001–0.003/lead; Exa ~$0.006/search (only fired when the
// website is missing/thin). Both logged per run.

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const axios = require('axios');
const cheerio = require('cheerio');
const Anthropic = require('@anthropic-ai/sdk');
const { supabase } = require('../core/db');
const log = require('../utils/logger');

const MODEL = 'claude-haiku-4-5-20251001';
const COST_IN = 0.80 / 1e6, COST_OUT = 4.00 / 1e6, EXA_COST = 0.006;
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';

const INDUSTRIES = 'Pest Control | Pool Services | Lawn Care | Lake/Pond Management | Tree Care | Landscaping | HVAC | Plumbing | Electrical | Roofing | Windows & Doors | Cleaning/Janitorial | Restoration | Property Maintenance | Irrigation | Other Essential Services | Other';

const SYSTEM = `You extract owner/decision-maker contact intelligence for a small-business acquisition firm from scraped public pages. Extract ONLY what the text supports — never invent emails, phones, or names. Use null when not found.

Also classify what the company ACTUALLY does — many list hits are mismatches (e.g. "Tree Musketeers Marketing LLC" on a tree-care list is a marketing firm). Classify industry_verified into exactly one of:
${INDUSTRIES}
Compare against target_industry: on_target=false when the real business does not belong on that list.

OUTPUT — valid JSON only:
{"owner_name": "First Last or null", "owner_title": "Owner/President/... or null",
 "owner_email": "explicitly shown email of the owner or null",
 "business_email": "general company email (info@/office@) or null",
 "owner_phone": "a phone explicitly identified as the owner's/cell, else null",
 "owner_linkedin": "linkedin.com/in/... URL if present, else null",
 "city": "HQ city if stated, else null", "state": "2-letter state if stated, else null",
 "industry_verified": "one value from the list", "industry_confidence": "high|medium|low",
 "on_target": true/false,
 "years_in_business": 12 or null, "pe_backed": true/false/null,
 "overview": "1-2 sentences: what the company does, service mix, recurring-revenue signals",
 "signals": ["notable acquisition-relevant facts: owner near retirement, second location, fleet size, family-owned, hiring, awards"],
 "confidence": "high|medium|low"}`;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchPage(url) {
  try {
    const { data } = await axios.get(url, { headers: { 'User-Agent': UA }, timeout: 12000, maxRedirects: 3, responseType: 'text' });
    const $ = cheerio.load(data);
    $('script, style, noscript, svg, nav, footer').remove();
    return $('body').text().replace(/\s+/g, ' ').trim();
  } catch { return null; }
}

/** Homepage + best-effort about/team/contact pages, capped. */
async function scrapeWebsite(website) {
  const base = website.replace(/\/+$/, '');
  const pages = [];
  const home = await fetchPage(base);
  if (home) pages.push(`[HOME] ${home.slice(0, 4000)}`);
  for (const path of ['/about', '/about-us', '/our-team', '/contact']) {
    if (pages.join('').length > 9000) break;
    const t = await fetchPage(base + path);
    if (t && t.length > 200) pages.push(`[${path}] ${t.slice(0, 2500)}`);
  }
  return pages.join('\n\n');
}

const JUNK_DOMAINS = /yelp|angi|thumbtack|houzz|facebook|bbb\.org|yellowpages|linkedin|instagram|twitter|x\.com|mapquest|manta\.com|dnb\.com|buzzfile|zoominfo|chamberofcommerce|porch\.com|homeadvisor|nextdoor|bizapedia|opencorporates|glassdoor|indeed/i;

/** Website discovery for leads without one (license-board rows): Exa search the
 * company name + location, keep the first non-directory hit whose title or
 * domain actually matches the company. Persisted to leads.website so every
 * later step (enrichment, outreach, VA) benefits. */
async function discoverWebsite(lead, totals, log) {
  const key = process.env.EXA_API_KEY;
  if (!key) return null;
  const where = [lead.city, lead.state].filter(Boolean).join(' ');
  try {
    const { data } = await axios.post('https://api.exa.ai/search', {
      query: `${lead.name} ${where}`,
      numResults: 4,
    }, { headers: { 'x-api-key': key, 'Content-Type': 'application/json' }, timeout: 30000 });
    totals.exa++;
    const nameTokens = lead.name.toLowerCase().replace(/[^a-z0-9 ]/g, '').split(/\s+/)
      .filter((t) => t.length > 3 && !['inc', 'llc', 'corp', 'company', 'services', 'service'].includes(t));
    for (const r of data.results || []) {
      if (!r.url || JUNK_DOMAINS.test(r.url)) continue;
      const domain = r.url.split('/')[2]?.toLowerCase() || '';
      const title = (r.title || '').toLowerCase();
      const hit = nameTokens.some((t) => domain.includes(t) || title.includes(t));
      if (hit) {
        const site = r.url.split('/').slice(0, 3).join('/');
        log?.info(`    website discovered: ${site}`);
        return site;
      }
    }
  } catch (e) { log?.warn(`  website discovery: ${e.response?.status || e.message}`); }
  return null;
}

/** Exa web + LinkedIn snippets when the website is missing or thin. */
async function exaSnippets(lead) {
  const key = process.env.EXA_API_KEY;
  if (!key) return { text: '', searches: 0 };
  const where = [lead.city, lead.state].filter(Boolean).join(' ');
  try {
    const { data } = await axios.post('https://api.exa.ai/search', {
      query: `"${lead.name}" ${where} owner founder`,
      numResults: 5,
      contents: { text: { maxCharacters: 800 } },
    }, { headers: { 'x-api-key': key, 'Content-Type': 'application/json' }, timeout: 30000 });
    const text = (data.results || [])
      .map((r) => `[${r.url}] ${r.title || ''} — ${(r.text || '').replace(/\s+/g, ' ')}`)
      .join('\n').slice(0, 5000);
    return { text, searches: 1 };
  } catch (e) {
    log.warn(`  exa: ${e.response?.status || e.message}`);
    return { text: '', searches: 0 };
  }
}

async function enrichLead(anthropic, lead, totals, log) {
  if (!lead.website) {
    const site = await discoverWebsite(lead, totals, log);
    if (site) {
      lead.website = site;
      await supabase.from('leads').update({ website: site }).eq('id', lead.id);
    }
  }
  let context = '';
  if (lead.website) context = await scrapeWebsite(lead.website);
  let exaUsed = 0;
  if (context.length < 500) {
    const { text, searches } = await exaSnippets(lead);
    exaUsed = searches;
    totals.exa += searches;
    if (text) context += `\n\n=== WEB/LINKEDIN SEARCH RESULTS ===\n${text}`;
  }
  if (context.trim().length < 200) {
    return { skip: 'no usable public context (no website, thin search results)' };
  }

  const user = JSON.stringify({
    company: lead.name, city: lead.city, state: lead.state,
    target_industry: lead._target_industry || null, // the list this lead came from
    known_owner_name: lead.owner_name || null, // from license board / SoS if present
    website: lead.website, phone: lead.phone,
  }) + `\n\n=== SCRAPED CONTEXT ===\n${context.slice(0, 14000)}`;

  const msg = await anthropic.messages.create({
    model: MODEL, max_tokens: 500, system: SYSTEM,
    messages: [{ role: 'user', content: user }],
  });
  totals.tokIn += msg.usage.input_tokens;
  totals.tokOut += msg.usage.output_tokens;
  const jsonMatch = msg.content[0].text.match(/\{[\s\S]*\}/); // model may fence or append prose
  let out;
  try { out = JSON.parse(jsonMatch ? jsonMatch[0] : ''); } catch { return { skip: 'unparseable model output' }; }
  out._sources = { website: !!lead.website, exa_searches: exaUsed, enriched_at: new Date().toISOString() };
  return { out };
}

async function main() {
  const arg = (f) => { const i = process.argv.indexOf(f); return i > -1 ? process.argv[i + 1] : null; };
  const limit = Number(arg('--limit')) || 25;
  const listId = arg('--list');

  const retrySkipped = process.argv.includes('--retry-skipped');
  const idsIdx = process.argv.indexOf('--ids');
  const ids = idsIdx > -1 ? process.argv[idsIdx + 1].split(',').filter(Boolean) : null;
  let q = supabase.from('leads')
    .select('id, name, website, phone, city, state, owner_name, owner_email, owner_phone, owner_linkedin, enrichment, status, lead_list_id')
    .eq('status', 'new').order('created_at', { ascending: true }).limit(limit);
  // default: untouched leads; --retry-skipped: re-run ones that had no context
  q = retrySkipped ? q.not('enrichment->skipped', 'is', null) : q.is('enrichment', null);
  if (ids) q = q.in('id', ids); // explicit job selection (run_jobs.js)
  if (listId) q = q.eq('lead_list_id', listId);
  const { data: leads, error } = await q;
  if (error) throw new Error(error.message);
  if (!leads.length) { log.info('No un-enriched leads.'); return; }
  // the list a lead came from = the classification target
  const { data: lists } = await supabase.from('lead_lists').select('id, query_industry');
  const listIndustry = new Map((lists || []).map((l) => [l.id, l.query_industry]));
  for (const l of leads) l._target_industry = listIndustry.get(l.lead_list_id) || null;
  log.info(`Enriching ${leads.length} leads (limit ${limit})`);

  const anthropic = new Anthropic();
  const totals = { tokIn: 0, tokOut: 0, exa: 0 };
  let enriched = 0, skipped = 0;
  const jobIdx = process.argv.indexOf('--job');
  const jobId = jobIdx > -1 ? process.argv[jobIdx + 1] : null;
  let processed = 0, foundOwner = 0, foundEmail = 0;

  for (const lead of leads) {
    try {
      const { out, skip } = await enrichLead(anthropic, lead, totals, log);
      if (skip) {
        await supabase.from('leads').update({ enrichment: { skipped: skip, at: new Date().toISOString() } }).eq('id', lead.id);
        skipped++;
        continue;
      }
      const patch = { enrichment: out, status: 'enriched' };
      // fill blanks only — license-board owner names are ground truth
      if (!lead.owner_name && out.owner_name) patch.owner_name = out.owner_name;
      if (!lead.owner_email && (out.owner_email || out.business_email)) patch.owner_email = out.owner_email || out.business_email;
      if (!lead.owner_phone && out.owner_phone) patch.owner_phone = out.owner_phone;
      if (!lead.owner_linkedin && out.owner_linkedin) patch.owner_linkedin = out.owner_linkedin;
      if (!lead.city && out.city) { patch.city = out.city; patch.state = lead.state || out.state; }
      // verified industry columns are migration 0008; jsonb carries them until then
      if (main.hasIndustryCols === undefined) {
        const { error: probe } = await supabase.from('leads').select('industry_verified').limit(1);
        main.hasIndustryCols = !probe;
      }
      if (main.hasIndustryCols && out.industry_verified) {
        patch.industry_verified = out.industry_verified;
        patch.off_target = out.on_target === false;
      }
      const { error: uErr } = await supabase.from('leads').update(patch).eq('id', lead.id);
      if (uErr) { log.error(`  ${lead.name}: ${uErr.message}`); continue; }
      enriched++;
      log.info(`  ${lead.name}: owner=${patch.owner_name || lead.owner_name || '—'} email=${patch.owner_email || '—'} (${out.confidence})`);
      // live progress for the UI (John: clicking Enrich must never feel dead)
      processed++;
      if (patch.owner_name || lead.owner_name) foundOwner++;
      if (patch.owner_email) foundEmail++;
      if (jobId && processed % 3 === 0) {
        await supabase.from('enrichment_jobs').update({
          counts: { total: leads.length, processed, found_owner: foundOwner, found_email: foundEmail, phase: 'tier1' },
        }).eq('id', jobId);
      }
      await sleep(300);
    } catch (e) {
      log.error(`  ${lead.name}: ${e.message}`);
    }
  }

  const cost = totals.tokIn * COST_IN + totals.tokOut * COST_OUT + totals.exa * EXA_COST;
  log.info(`Enrichment: ${enriched} enriched, ${skipped} skipped (no context). Cost ≈ $${cost.toFixed(3)} (Claude ${totals.tokIn}/${totals.tokOut} tok, Exa ${totals.exa})`);
  const { recordUsage } = require('../core/usage');
  if (totals.tokIn) await recordUsage('claude', 'enrichment', totals.tokIn + totals.tokOut, totals.tokIn * COST_IN + totals.tokOut * COST_OUT, { leads: enriched });
  if (totals.exa) await recordUsage('exa', 'enrichment', totals.exa, totals.exa * EXA_COST, { leads: enriched });
}

main().catch((e) => { console.error(e.message); process.exit(1); });
