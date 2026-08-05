// River-guide IDENTITY RESOLUTION — the ~197 NEEDS_NAME rows are real, sourced
// deals where the press never named the seller (handoff §4.3: deliberate
// queue, not missing data). This worker searches acquisition announcements,
// company about-pages and state filings for the owner's name.
//
// HARD RULE (handoff §4.4, spec §6.1): NEVER fabricate. The research phase
// repeatedly caught search engines hallucinating names (fake Juniper CEO,
// three unrelated O'Donnells conflated). A name is accepted ONLY when a
// result explicitly ties person ↔ company ↔ sale, with the source URL kept
// as provenance. Anything less stays TBD.
//
// On resolution: name_status=RESOLVED, enrichment_status=PENDING_T1, score
// recomputed (name bonus), CRM contact + company minted (same as ingest).
//
// Usage: node riverguides/resolve_names.js [--limit 25] [--dry-run]
// Cost ≈ $0.004/row attempted.

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const axios = require('axios');
const Anthropic = require('@anthropic-ai/sdk');
const { supabase } = require('../core/db');
const log = require('../utils/logger');
const { recordUsage } = require('../core/usage');
const { rescore } = require('./score');

async function serper(q) {
  const { data } = await axios.post('https://google.serper.dev/search', { q, num: 8 },
    { headers: { 'X-API-KEY': process.env.SERPER_API_KEY, 'Content-Type': 'application/json' }, timeout: 20000 });
  return (data.organic || []).map((r) => ({ url: r.link, title: r.title || '', snippet: r.snippet || '' }));
}

const SYSTEM = `You identify the OWNER WHO SOLD a specific company to a specific acquirer, from web search results. This feeds an outreach list, so a wrong name is far worse than no name.

Accept a name ONLY when a result EXPLICITLY connects that person to THIS company as owner/founder/president AND (ideally) to the sale itself. Typical acceptable evidence: acquisition press release naming the seller, the company's own about page naming the founder, an M&A advisor tombstone.

REJECT (return null) when: results are about a different company with a similar name; the person's tie is generic (an employee, a broker, the acquirer's exec); or the connection is inferred rather than stated. Search engines hallucinate — same-name different-company is the failure mode you exist to prevent.

Output JSON only:
{"owner_name": "First Last or null", "role": "Founder/Owner/President or null",
 "source_url": "the result URL that names them, or null",
 "confidence": "high|medium|low", "why": "one line"}`;

async function main() {
  const arg = (f, d) => { const i = process.argv.indexOf(f); return i > -1 ? process.argv[i + 1] : d; };
  const limit = Number(arg('--limit', 25));
  const dryRun = process.argv.includes('--dry-run');

  const { data: allTbd, error } = await supabase.from('river_guides').select('*')
    .eq('name_status', 'TBD')
    .order('screen_score', { ascending: false });
  if (error) { console.error(`${error.message} — apply migration 0016 first`); process.exit(1); }
  // FOCUS GATE (John 8/4): resolution credits go to in-focus industries only
  const { loadFocus, applyFocus, notMerged } = require('../core/focus');
  const focus = await loadFocus();
  // merged duplicates never re-enter a worker (they'd re-create contradictions)
  const { rows: inFocus, skipped } = applyFocus(notMerged(allTbd || []), focus, (g) => g.industry);

  // ATTEMPT TRACKING (8/4 — the same leak fixed in verify_status on 7/31, found
  // here by inspection after a 126-row batch): score-ordering alone re-processed
  // the SAME top-N TBD rows every nightly run, so the cap burned on proven dead
  // ends (~$0.10/night, forever) while lower-scored rows never got a first look.
  // Never-attempted first; a row that stayed TBD rests 30 days — owner-name
  // evidence for a historical acquisition is essentially static, so re-asking
  // tomorrow buys nothing.
  const REST_MS = 30 * 24 * 3600e3;
  const attemptedAt = (g) => (g.contact?.resolve_attempted_at ? Date.parse(g.contact.resolve_attempted_at) : null);
  const due = inFocus.filter((g) => { const at = attemptedAt(g); return !at || Date.now() - at > REST_MS; });
  const guides = due
    .sort((a, b) => (attemptedAt(a) ?? 0) - (attemptedAt(b) ?? 0)
      || (b.screen_score ?? 0) - (a.screen_score ?? 0))
    .slice(0, limit);
  const resting = inFocus.length - due.length;
  if (!guides?.length) { log.info(`No NEEDS_NAME river guides due (${skipped} out-of-focus gated, ${resting} resting after a recent inconclusive attempt).`); return; }
  log.info(`identity resolution: ${guides.length} of ${inFocus.length} in-focus TBD (never-attempted first${skipped ? `; ${skipped} out-of-focus gated` : ''}${resting ? `; ${resting} resting` : ''})${dryRun ? ' [dry]' : ''}`);

  const anthropic = new Anthropic();
  const totals = { in: 0, out: 0, serper: 0 };
  let resolved = 0;

  // an attempt that ends TBD still consumed the lookups — stamp it so the next
  // pass moves on to never-attempted rows instead of re-asking the same ones
  const markAttempted = async (g) => {
    if (dryRun) return;
    await supabase.from('river_guides')
      .update({ contact: { ...(g.contact || {}), resolve_attempted_at: new Date().toISOString() } })
      .eq('deal_id', g.deal_id);
  };

  for (const g of guides) {
    try {
      const results = [
        ...await serper(`"${g.acquirer}" ${/acqui/i.test(g.acquirer || '') ? '' : 'acquires'} "${g.their_company}" owner OR founder OR president`),
        ...await serper(`"${g.their_company}" ${g.location_state || ''} founder OR owner ${g.deal_year || ''}`),
      ];
      totals.serper += 2;
      if (!results.length) { log.info(`  – ${g.their_company}: no results`); await markAttempted(g); continue; }

      const msg = await anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001', max_tokens: 400, system: SYSTEM,
        messages: [{ role: 'user', content: JSON.stringify({
          company: g.their_company, acquirer: g.acquirer, deal_year: g.deal_year,
          city: g.location_city, state: g.location_state, industry: g.industry,
          results: results.slice(0, 12),
        }) }],
      });
      totals.in += msg.usage.input_tokens; totals.out += msg.usage.output_tokens;
      const v = JSON.parse(msg.content[0].text.match(/\{[\s\S]*\}/)[0]);

      // code-enforced no-guess bar: name + source URL + non-low confidence
      if (!v.owner_name || !v.source_url || v.confidence === 'low' ||
          String(v.owner_name).trim().split(/\s+/).length < 2) {
        log.info(`  – ${g.their_company}: stays TBD (${(v.why || 'no explicit owner evidence').slice(0, 90)})`);
        await markAttempted(g);
        continue;
      }

      if (dryRun) { log.info(`  [dry] ${g.their_company} → ${v.owner_name} (${v.confidence}) ${v.source_url}`); resolved++; continue; }

      const patch = {
        full_name: v.owner_name, name_status: 'RESOLVED',
        role: v.role || null,
        source_url: v.source_url, source_confidence: v.confidence.toUpperCase(),
        enrichment_status: 'PENDING_T1',
        notes: [g.notes, `name resolved ${new Date().toISOString().slice(0, 10)}: ${v.why}`].filter(Boolean).join('\n'),
      };
      Object.assign(patch, rescore({ ...g, ...patch }));

      // mint CRM records (same path as ingest)
      const { mintCrmRecords } = require('./ingest_river_guides');
      let crm = { companyId: g.company_id, contactId: g.contact_id };
      try { crm = await mintCrmRecords({ ...g, ...patch }, false); } catch (e) { log.warn(`  crm mint: ${e.message}`); }

      const { error: uErr } = await supabase.from('river_guides')
        .update({ ...patch, contact_id: crm.contactId ?? g.contact_id, company_id: crm.companyId ?? g.company_id })
        .eq('deal_id', g.deal_id);
      if (uErr) { log.error(`  ${g.their_company}: ${uErr.message}`); continue; }
      resolved++;
      log.info(`  ✓ ${g.their_company} → ${v.owner_name} (${v.confidence}; ${v.source_url.slice(0, 60)})`);
    } catch (e) { log.error(`  ${g.their_company}: ${e.message}`); }
  }

  const cost = totals.in * 0.8e-6 + totals.out * 4e-6 + totals.serper * 0.001;
  if (!dryRun && totals.serper) {
    const { industryBreakdown } = require('../core/focus');
    await recordUsage('serper', 'classification', totals.serper, cost, {
      river_guide_resolve: resolved,
      industries: industryBreakdown(guides, (g) => g.industry), // burn-by-industry (8/4 gate)
    });
  }
  log.info(`identity resolution done: ${resolved} of ${guides.length} resolved (rest stay TBD — never guessed). Cost ≈ $${cost.toFixed(2)}.`);
}

main().catch((e) => { console.error(e.message); process.exit(1); });
