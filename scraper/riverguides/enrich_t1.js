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

// --- run state (John 7/16: the page must answer "is it working / when is it
// done / what did I get"). A run created by POST /api/river-guides/enrich is
// CLAIMED here; ad-hoc CLI passes just skip this (no run to update).
// ATOMIC claim — the local pass and the CI claim workflow both drain this
// queue, so select-then-update let BOTH grab the same run (seen live 7/16:
// one receipt said "40 processed, 0 emails" while the other process was
// finding 6 emails on overlapping rows). The conditional update below is the
// lock: only the process whose `state='queued'` predicate still matches gets
// a row back; the loser sees [] and moves on.
async function claimRun() {
  const { data: queued, error } = await supabase.from('river_guide_runs')
    .select('id, deal_ids').eq('state', 'queued').order('created_at', { ascending: true }).limit(1);
  if (error || !queued?.length) return null; // pre-0018 or nothing queued
  const { data: won } = await supabase.from('river_guide_runs').update({
    state: 'running', started_at: new Date().toISOString(),
    note: `Enriching 0/${queued[0].deal_ids?.length ?? 0}…`,
  }).eq('id', queued[0].id).eq('state', 'queued').select('*');
  return won?.length ? won[0] : null; // lost the race — another runner has it
}
async function updateRun(runId, counts, note) {
  if (!runId) return;
  await supabase.from('river_guide_runs').update({ counts, ...(note ? { note } : {}) }).eq('id', runId);
}

async function main() {
  const arg = (f, d) => { const i = process.argv.indexOf(f); return i > -1 ? process.argv[i + 1] : d; };
  const limit = Number(arg('--limit', 20));
  const band = arg('--band', null);
  const industry = arg('--industry', null); // e.g. TREE_CARE — John works one vertical at a time
  const dryRun = process.argv.includes('--dry-run');

  // a UI-queued run takes priority and defines the selection
  const run = dryRun ? null : await claimRun();
  let q = supabase.from('river_guides').select('*')
    .eq('enrichment_status', 'PENDING_T1').eq('name_status', 'RESOLVED')
    .order('screen_score', { ascending: false }).limit(run ? 500 : limit);
  if (run?.deal_ids?.length) q = q.in('deal_id', run.deal_ids);
  else {
    if (band) q = q.eq('priority_band', band);
    if (industry) q = q.eq('industry', industry);
  }
  const { data: guides, error } = await q;
  if (error) { console.error(`${error.message} — apply migration 0016 first`); process.exit(1); }
  if (!guides?.length) {
    if (run) await supabase.from('river_guide_runs').update({
      state: 'done', finished_at: new Date().toISOString(),
      note: 'Nothing to do — those rows were already enriched.',
    }).eq('id', run.id);
    log.info('No PENDING_T1 river guides.');
    return;
  }
  log.info(`tier-1 enrichment: ${guides.length} guides${run ? ` (run ${run.id.slice(0, 8)})` : ''}${dryRun ? ' [dry]' : ''}`);

  // phones only arrive via the Tracerfy tier (person-mode) — counted here so
  // the run receipt stays honest when that tier is wired to river guides
  let hunterUsed = 0, emails = 0, linkedins = 0, phones = 0, toPaid = 0, done = 0;
  const Anthropic = require('@anthropic-ai/sdk');
  const anthropic = new Anthropic();
  const { findVerifiedLinkedin } = require('../enrich/linkedin_match');

  for (const g of guides) {
    try {
      const nm = nameParts(g.full_name);
      if (!nm) continue;
      const contact = { ...(g.contact || {}) }; // live schema: contact jsonb {email, phone, linkedin_url}
      const patch = {};
      const status = g.company_website_status || 'NOT_FOUND';

      // email: domain-first routing
      if (!contact.email && process.env.HUNTER_API_KEY) {
        const domains = [];
        if (status === 'LIVE') domains.push(domainOf(g.company_website));
        if (status === 'REDIRECTS' || g.exit_status === 'EMPLOYED') domains.push(domainOf(g.acquirer_website));
        for (const d of domains.filter(Boolean)) {
          try {
            const r = await hunterFind(d, nm); hunterUsed++;
            await recordUsage('hunter', 'email_finding', 1, 0, { river_guide: g.deal_id, domain: d });
            if (r.email) { contact.email = r.email; emails++; break; }
          } catch (e) { if (e.response?.status === 429) break; }
        }
      }

      // linkedin: verified matcher (LinkedIn-first routes rely on this entirely)
      if (!contact.linkedin_url) {
        const v = await findVerifiedLinkedin(anthropic, {
          id: g.deal_id, name: g.their_company, owner_name: g.full_name,
          city: g.location_city, state: g.location_state, industry_verified: g.industry,
        }, { industry: g.industry }, log);
        if (v) { contact.linkedin_url = v.url; linkedins++; }
      }

      const gotAnything = contact.email || contact.linkedin_url || contact.phone;
      patch.contact = contact;
      patch.enrichment_status = gotAnything ? 'T1_DONE' : 'NEEDS_PAID';
      patch.updated_at = new Date().toISOString();
      if (!gotAnything) toPaid++;

      if (dryRun) { log.info(`  [dry] ${g.full_name} (${status}): ${JSON.stringify(patch)}`); continue; }
      const { error: uErr } = await supabase.from('river_guides').update(patch).eq('deal_id', g.deal_id);
      if (uErr) { log.error(`  ${g.full_name}: ${uErr.message}`); continue; }
      done++;

      // sync onto the CRM contact (fill blanks only)
      if (g.contact_id && (contact.email || contact.linkedin_url)) {
        const { data: c } = await supabase.from('contacts').select('email,linkedin').eq('id', g.contact_id).maybeSingle();
        const cPatch = {};
        if (contact.email && !c?.email) cPatch.email = contact.email;
        if (contact.linkedin_url && !c?.linkedin) cPatch.linkedin = contact.linkedin_url;
        if (Object.keys(cPatch).length) await supabase.from('contacts').update(cPatch).eq('id', g.contact_id);
      }
      log.info(`  ${gotAnything ? '✓' : '→paid'} ${g.full_name} (${status})${contact.email ? ' email ' + contact.email : ''}${contact.linkedin_url ? ' li' : ''}`);
      // live progress for the page (John: watching numbers move is the point)
      await updateRun(run?.id, {
        total: guides.length, processed: done, found_email: emails,
        found_linkedin: linkedins, found_phone: phones, escalated_paid: toPaid,
      }, `Enriching ${done}/${guides.length} — ${emails} emails, ${linkedins} LinkedIn found so far…`);
    } catch (e) { log.error(`  ${g.full_name}: ${e.message}`); }
  }

  const receipt = `Done: ${done} processed — ${emails} emails, ${linkedins} verified LinkedIn${phones ? `, ${phones} phones` : ''}${toPaid ? `, ${toPaid} need the paid tier` : ''}${emails + linkedins + phones === 0 ? ' — nothing new found on the free tier' : ''}. Hunter ${hunterUsed} lookups ($0 marginal).`;
  if (run) {
    await supabase.from('river_guide_runs').update({
      state: 'done', finished_at: new Date().toISOString(),
      counts: { total: guides.length, processed: done, found_email: emails, found_linkedin: linkedins, found_phone: phones, escalated_paid: toPaid },
      cost_actual: Number((linkedins * 0.0021).toFixed(3)), // serper+haiku per verified match
      note: receipt,
    }).eq('id', run.id);
  }
  log.info(`tier-1 ${receipt}`);
}

main().catch((e) => { console.error(e.message); process.exit(1); });
