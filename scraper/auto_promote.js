// AUTO-PROMOTE Tier-1 → pursuits (John approved 7/13; build re-authorized in
// John's 7/15 lane-restart directive). Opens a pursuit (listing_reviews.status
// = 'new') for every Tier-1 listing that clears ALL hard criteria, each with a
// "why it qualified" receipt in notes + a listing_events entry. Human touch
// becomes approve/reject (Pass action) — never data entry.
//
// HARD CRITERIA (all required):
//   tier = 1                        · Haiku screen already ranked it forward
//   priority_state = true           · AZ/NV/TX/UT/CO/NM/GA/NC/SC/TN
//   cash_flow in [$300K, $10M]      · firm size box (explicit, not proxy)
//   delisted_at IS NULL             · still on market
//   duplicate_of IS NULL            · not a mirror-dup row
//   thesis keyword match            · config.relevance.industry_keywords_include
//                                     over name+industry+description (whole-word)
//
// GUARDRAILS: never contacts anyone (pure internal record creation, reversible
// via Pass). Existing listing_reviews rows are NEVER touched — already-reviewed
// listings (any status, incl. 'passed') are skipped, so a Pass stays passed.
// Bounded per run (--limit, default 25) so an unattended pass can't flood.
//
// Usage: node auto_promote.js [--dry-run] [--limit N]
// Also runs inside the nightly via run_supabase.js when config.auto_promote.enabled.

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { supabase } = require('./core/db');
const log = require('./utils/logger');

const CF_MIN = 300000;
const CF_MAX = 10000000;

// Whole-word thesis matcher — same semantics as core/filters.js compilePatterns.
function thesisPatterns() {
  const cfg = JSON.parse(fs.readFileSync(path.join(__dirname, 'config.json'), 'utf8'));
  return (cfg.relevance?.industry_keywords_include || []).map(
    (k) => new RegExp('\\b' + String(k).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'i'),
  );
}

async function fetchCandidates() {
  const out = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from('listings')
      .select('id, name, industry_raw, description, source_id, state, cash_flow, asking_price')
      .eq('tier', 1)
      .eq('priority_state', true)
      .is('delisted_at', null)
      .is('duplicate_of', null)
      .gte('cash_flow', CF_MIN)
      .lte('cash_flow', CF_MAX)
      .range(from, from + 999);
    if (error) throw new Error(error.message);
    out.push(...data);
    if (data.length < 1000) break;
  }
  return out;
}

async function runAutoPromote({ dryRun = false, limit = 25 } = {}) {
  const DRY = dryRun;
  const LIMIT = Math.max(1, limit);
  const patterns = thesisPatterns();
  const candidates = await fetchCandidates();
  log.info(`Auto-promote: ${candidates.length} Tier-1 candidates clear the DB criteria (priority state, CF $300K–$10M, active, non-dup)`);

  // Skip anything that already has a review row — including 'passed'.
  const ids = candidates.map((c) => c.id);
  const reviewed = new Set();
  for (let i = 0; i < ids.length; i += 200) {
    const { data, error } = await supabase.from('listing_reviews').select('listing_id').in('listing_id', ids.slice(i, i + 200));
    if (error) throw new Error(error.message);
    for (const r of data) reviewed.add(r.listing_id);
  }

  let promoted = 0;
  let skippedReviewed = 0;
  let skippedKeyword = 0;
  for (const l of candidates) {
    if (promoted >= LIMIT) { log.info(`Run cap ${LIMIT} reached — remainder next run`); break; }
    if (reviewed.has(l.id)) { skippedReviewed++; continue; }
    const text = [l.name, l.industry_raw, l.description].filter(Boolean).join(' ');
    const hit = patterns.find((p) => p.test(text));
    if (!hit) { skippedKeyword++; continue; }
    const keyword = hit.source.replace(/^\\b|\\b$/g, '').replace(/\\/g, '');

    const receipt =
      `[auto-promote ${new Date().toISOString().slice(0, 10)}] Why it qualified: Tier 1 (screen) · ` +
      `priority state ${l.state} · cash flow $${Number(l.cash_flow).toLocaleString()} (box $300K–$10M) · ` +
      `thesis keyword "${keyword}" · source ${l.source_id} · active, not a mirror-dup. ` +
      `Auto-opened pursuit — approve (advance) or Pass.`;

    if (DRY) {
      log.info(`[dry-run] would promote: ${(l.name || l.id).slice(0, 70)} — ${receipt}`);
      promoted++;
      continue;
    }
    const { error: revErr } = await supabase.from('listing_reviews')
      .insert({ listing_id: l.id, status: 'new', notes: receipt, reviewed_at: new Date().toISOString() });
    if (revErr) { log.error(`review insert failed (${l.id}): ${revErr.message}`); continue; }
    await supabase.from('listing_events').insert({
      listing_id: l.id, event_type: 'auto_promoted',
      detail: { receipt, criteria: { tier: 1, state: l.state, cash_flow: l.cash_flow, keyword, source: l.source_id } },
    });
    promoted++;
    log.info(`promoted: ${(l.name || l.id).slice(0, 70)} [${l.state}, CF $${Number(l.cash_flow).toLocaleString()}]`);
  }

  log.info(`Auto-promote complete — ${promoted} ${DRY ? 'would be ' : ''}opened, ${skippedReviewed} already reviewed, ${skippedKeyword} no keyword hit`);
  return { promoted, skippedReviewed, skippedKeyword };
}

module.exports = { runAutoPromote };

if (require.main === module) {
  const limIdx = process.argv.indexOf('--limit');
  runAutoPromote({
    dryRun: process.argv.includes('--dry-run'),
    limit: limIdx > -1 ? Number(process.argv[limIdx + 1]) || 25 : 25,
  }).catch((err) => { log.error(err.message); process.exit(1); });
}
