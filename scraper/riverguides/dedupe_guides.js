// RIVER-GUIDE DEDUPE + STATUS RECONCILIATION (PM 8/4, urgent: the sweep files
// a NEW row for a company already in the book instead of matching the existing
// person, and 3 of the outreach-ready cohort had a twin claiming the opposite
// exit_status — we would have emailed someone as a fresh exit while our own
// data said they still work for the acquirer).
//
// TWO DISTINCT CASES — collapsing them would destroy real data:
//   SAME DEAL   same person + same acquirer + near-identical company name
//               ("Cordwin Tree Service" vs "Cordwin Tree Services")
//               → MERGE into the richest row (never delete: the loser keeps its
//                 data + gets merged_into, and BOTH source_urls survive).
//   SERIAL SELLER  same person + same acquirer + genuinely DIFFERENT companies
//               (Tim Doyle: Concord Custom Lawn Care AND Seacoast Tree Care)
//               → KEEP BOTH. This is a second sale, which is a BUY SIGNAL
//                 (archetype SECOND_TIME_SELLER), not a duplicate.
//
// STATUS DISAGREEMENT (either case, because it's one person): we do NOT pick a
// winner — exit_status drops to UNKNOWN, current_status_verified goes false,
// both claims are recorded in status_conflict, and the person is queued in the
// review pen + re-verified. A confident wrong answer is worse than a known gap.
//
// Usage: node riverguides/dedupe_guides.js [--confirm]   (report-only default)

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { supabase } = require('../core/db');
const log = require('../utils/logger');

const DRY = !process.argv.includes('--confirm');

const nk = (x) => String(x || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
// company identity: strip suffixes/servicewords so near-identical names collide
const cslug = (x) => String(x || '').toLowerCase().replace(/&/g, ' and ')
  .replace(/\s*\([^)]*\)/g, '')
  .replace(/\b(inc|llc|ltd|co|corp|company|companies|services?|the)\b/g, '')
  .replace(/[^a-z0-9]/g, '');

// Industry/legal words carry no identity — "Heads Up Landscaping" and "Heads Up
// Landscape Contractors" are ONE company whose distinctive tokens are {heads,up}.
const GENERIC_TOKEN = /^(inc|llc|ltd|co|corp|company|companies|the|and|of|service|services|contractor|contractors|maintenance|management|group|holdings|solutions|lawn|lawns|tree|trees|care|landscape|landscaping|landscapes|turf|pest|control|pool|pools|spa|spas|fence|fencing|irrigation|sprinkler|nursery|outdoor|property|properties|business|businesses|kitchen|commercial|residential)$/i;
const distinctive = (name) => new Set(
  String(name || '').toLowerCase().replace(/&/g, ' and ').split(/[^a-z0-9]+/)
    .filter((t) => t && !GENERIC_TOKEN.test(t)));

/** Same deal? Bias to NO — a wrong merge loses data, a missed one just waits.
 *  Equal distinctive tokens, or a ≥2-token subset, or raw-slug containment. */
function sameDeal(a, b) {
  const x = cslug(a.their_company), y = cslug(b.their_company);
  if (!x || !y) return false;
  if (x === y) return true;
  const [shortS, longS] = x.length <= y.length ? [x, y] : [y, x];
  if (shortS.length >= 6 && longS.startsWith(shortS)) return true;
  const dx = distinctive(a.their_company), dy = distinctive(b.their_company);
  if (!dx.size || !dy.size) return false;
  const [small, big] = dx.size <= dy.size ? [dx, dy] : [dy, dx];
  const subset = [...small].every((t) => big.has(t));
  if (!subset) return false;
  // equal sets are safe; a subset is only trusted with ≥2 shared tokens
  // (a single shared word like "coast" is too weak to merge on)
  return small.size === big.size || small.size >= 2;
}

/** Acquirer variants are rife ("LawnPro" vs "LawnPRO Partners") — slug
 *  containment collapses them without merging genuinely different buyers
 *  (U.S. Fence Solutions vs Fencing Supply Group stay distinct). */
function sameAcquirer(a, b) {
  const x = cslug(a.acquirer), y = cslug(b.acquirer);
  if (!x || !y) return false;
  if (x === y) return true;
  const [short, long] = x.length <= y.length ? [x, y] : [y, x];
  return short.length >= 5 && long.startsWith(short);
}

/** Same human? Same name AND (same buyer OR same company) — a bare name match
 *  is not enough (two real "Mike Smith"s must not merge or cross-contaminate
 *  each other's verified status). */
const sameHuman = (a, b) => nk(a.full_name) === nk(b.full_name)
  && !!a.full_name && (sameAcquirer(a, b) || sameDeal(a, b));

const channels = (g) => ({
  email: g.contact?.email || null, phone: g.contact?.phone || null,
  linkedin_url: g.contact?.linkedin_url || null,
});
const channelCount = (g) => Object.values(channels(g)).filter(Boolean).length;

/** Richest row survives: most channels, then verified, then named, then oldest. */
function pickSurvivor(rows) {
  return [...rows].sort((a, b) =>
    channelCount(b) - channelCount(a)
    || (b.current_status_verified ? 1 : 0) - (a.current_status_verified ? 1 : 0)
    || (b.full_name ? 1 : 0) - (a.full_name ? 1 : 0)
    || String(a.created_at || '').localeCompare(String(b.created_at || '')))[0];
}

async function main() {
  const { data: all, error } = await supabase.from('river_guides').select('*');
  if (error) { console.error(error.message); process.exit(1); }
  // 0025 gives merged_into / status_conflict their own columns. Until John
  // applies it, the SAFETY-CRITICAL half still runs: a contradicted person
  // drops to exit_status UNKNOWN (existing column) and leaves the sendable
  // cohort immediately. Bookkeeping mirrors into the contact jsonb meanwhile.
  const has0025 = Object.prototype.hasOwnProperty.call(all?.[0] ?? {}, 'merged_into');
  if (!has0025) log.warn('migration 0025 not applied — writing merge/conflict bookkeeping into contact jsonb; exit_status safety fix still applies');
  const mergedOf = (r) => r.merged_into ?? r.contact?.merged_into ?? null;
  const rows = (all || []).filter((r) => !mergedOf(r)); // already-merged stay out

  // HUMAN groups: cluster named rows by sameHuman (name + buyer-or-company), so
  // acquirer spelling variants can't split one person into two books.
  const humanGroups = [];
  for (const r of rows.filter((x) => x.full_name)) {
    const hit = humanGroups.find((g) => g.some((x) => sameHuman(x, r)));
    (hit || humanGroups[humanGroups.push([]) - 1]).push(r);
  }
  // DEAL groups catch unnamed/TBD rows that name matching can never see
  const dealGroups = new Map();
  for (const r of rows) {
    const k = `${cslug(r.their_company)}|${cslug(r.acquirer)}`;
    if (!dealGroups.has(k)) dealGroups.set(k, []);
    dealGroups.get(k).push(r);
  }
  const groups = new Map();
  humanGroups.forEach((g, i) => { if (g.length > 1) groups.set(`person:${i}`, new Set(g)); });
  [...dealGroups.entries()].forEach(([k, g]) => { if (g.length > 1) groups.set(`deal:${k}`, new Set(g)); });

  const merges = [];      // {survivor, loser}
  const conflicts = [];   // {rows:[...], person}
  const serialSellers = [];
  const seenPair = new Set();

  for (const [key, set] of groups) {
    const g = [...set];
    if (g.length < 2) continue;

    // split the group into same-deal clusters
    const clusters = [];
    for (const r of g) {
      const hit = clusters.find((c) => c.some((x) => sameDeal(x, r)));
      (hit || clusters[clusters.push([]) - 1]).push(r);
    }

    for (const c of clusters) {
      if (c.length < 2) continue;
      const survivor = pickSurvivor(c);
      for (const loser of c) {
        if (loser.deal_id === survivor.deal_id) continue;
        const pair = [survivor.deal_id, loser.deal_id].sort().join('|');
        if (seenPair.has(pair)) continue;
        seenPair.add(pair);
        merges.push({ survivor, loser });
      }
      // a row can be grouped twice (once by person, once by deal) and end up
      // BOTH a survivor and a loser — that chain would leave a merged_into
      // pointing at a merged-away row. Resolve transitively below.
    }

    // a PERSON group whose clusters are genuinely different companies = serial seller
    if (key.startsWith('person:') && clusters.length > 1) {
      serialSellers.push({ person: g[0].full_name, rows: g });
    }

    // status disagreement anywhere in a PERSON group (one human, one truth)
    if (key.startsWith('person:')) {
      const claims = g.filter((r) => r.exit_status && r.exit_status !== 'UNKNOWN');
      if (new Set(claims.map((r) => r.exit_status)).size > 1) {
        conflicts.push({ person: g[0].full_name, rows: g });
      }
    }
  }

  // CHAIN RESOLUTION: follow survivor→survivor until a row that is not itself a
  // loser, so every merged_into points at a live row (never at a merged-away one)
  const loserOf = new Map(merges.map((m) => [m.loser.deal_id, m.survivor]));
  const byId = new Map(rows.map((r) => [r.deal_id, r]));
  const finalSurvivor = (r) => {
    let cur = r, hops = 0;
    while (loserOf.has(cur.deal_id) && hops++ < 10) cur = byId.get(loserOf.get(cur.deal_id).deal_id) || cur;
    return cur;
  };
  for (const m of merges) m.survivor = finalSurvivor(m.survivor);
  const resolved = merges.filter((m) => m.survivor.deal_id !== m.loser.deal_id);
  merges.length = 0; merges.push(...resolved);

  log.info(`dedupe: ${merges.length} same-deal merge(s), ${conflicts.length} status conflict(s), ${serialSellers.length} serial seller(s) [KEPT — second sale is a buy signal]${DRY ? ' [report-only]' : ''}`);
  for (const m of merges) log.info(`  MERGE ${m.loser.deal_id} → ${m.survivor.deal_id}  (${m.survivor.full_name || m.survivor.their_company})`);
  for (const c of conflicts) log.info(`  CONFLICT ${c.person}: ${c.rows.map((r) => `${r.deal_id}=${r.exit_status}${r.current_status_verified ? '(V)' : ''}`).join(' vs ')}`);
  for (const s of serialSellers) log.info(`  serial seller ${s.person}: ${s.rows.map((r) => r.their_company).join(' | ')}`);
  if (DRY) { log.info('report-only — pass --confirm to apply'); return; }

  // ---- apply merges: union channels + both source_urls onto the survivor ----
  let merged = 0;
  for (const { survivor, loser } of merges) {
    const contact = { ...(survivor.contact || {}) };
    for (const [k, v] of Object.entries(channels(loser))) if (v && !contact[k]) contact[k] = v;
    const urls = [...new Set([survivor.source_url, loser.source_url].filter(Boolean))];
    const patch = {
      contact,
      source_url: urls[0] || null,
      notes: [survivor.notes, `merged ${loser.deal_id} (same deal; sources: ${urls.join(' , ')})`].filter(Boolean).join('\n'),
      updated_at: new Date().toISOString(),
    };
    // NOTE: do NOT adopt the loser's company spelling onto the survivor — the
    // loser row is RETAINED (merge never deletes), so it still holds that
    // (full_name, their_company) pair and the 0016 unique index rejects the
    // rename. The alternate spelling is preserved in the merge note instead.
    const { error: e1 } = await supabase.from('river_guides').update(patch).eq('deal_id', survivor.deal_id);
    if (e1) { log.error(`  ${survivor.deal_id}: ${e1.message}`); continue; }
    const loserNote = [loser.notes, `merged into ${survivor.deal_id} on ${new Date().toISOString().slice(0, 10)} (duplicate deal; data preserved, row retained)`].filter(Boolean).join('\n');
    // ALWAYS write the jsonb mirror, even once the real column exists: consumers
    // that can't add `merged_into` to their select (PM-STATUS, any pre-0025
    // reader) rely on it, and a merge that's invisible to one surface is how the
    // 549-vs-529 split happened. Column too when available.
    const loserPatch = {
      contact: { ...(loser.contact || {}), merged_into: survivor.deal_id },
      notes: loserNote,
      updated_at: new Date().toISOString(),
      ...(has0025 ? { merged_into: survivor.deal_id } : {}),
    };
    const { error: e2 } = await supabase.from('river_guides').update(loserPatch).eq('deal_id', loser.deal_id);
    if (e2) { log.error(`  ${loser.deal_id}: ${e2.message}`); continue; }
    merged++;
  }

  // ---- apply conflicts: no winner picked; both claims kept; re-verify queued --
  let flagged = 0;
  for (const c of conflicts) {
    const claims = c.rows.map((r) => ({
      deal_id: r.deal_id, exit_status: r.exit_status,
      verified: !!r.current_status_verified, source_url: r.source_url || null,
    }));
    const conflict = { detected_at: new Date().toISOString(), claims };
    for (const r of c.rows) {
      const contact = { ...(r.contact || {}) };
      delete contact.verify_attempted_at; // re-verify NOW, don't wait out the rest window
      if (!has0025) contact.status_conflict = conflict;
      const patch = {
        exit_status: 'UNKNOWN',
        current_status_verified: false,
        contact,
        notes: [r.notes, `⚠ status conflict ${new Date().toISOString().slice(0, 10)}: ${claims.map((x) => `${x.deal_id}=${x.exit_status}`).join(' vs ')} — set UNKNOWN pending re-verification (no winner picked)`].filter(Boolean).join('\n'),
        updated_at: new Date().toISOString(),
      };
      if (has0025) patch.status_conflict = conflict;
      const { error: e } = await supabase.from('river_guides').update(patch).eq('deal_id', r.deal_id);
      if (e) log.error(`  ${r.deal_id}: ${e.message}`);
    }
    // surface in the pen John already reviews
    const { error: pErr } = await supabase.from('discovery_candidates').upsert({
      kind: 'status_conflict', acquirer: c.rows[0].acquirer || 'unknown',
      company: `${c.person} — ${claims.map((x) => x.exit_status).join(' vs ')}`,
      seller_name: c.person, source_url: claims.find((x) => x.source_url)?.source_url || null,
      confidence: 'MEDIUM',
    }, { onConflict: 'acquirer,company', ignoreDuplicates: true });
    // NB: the kind='status_conflict' value needs 0024's widened check
    // constraint. Report the failure — the constraint's NAME contains
    // "discovery_candidates", so a naive substring test swallowed it silently
    // (the exact silent-failure class this whole pass exists to kill).
    if (pErr) {
      log.warn(/kind_check/.test(pErr.message)
        ? `  pen: status-conflict card needs migration 0025 (widened kind constraint) — the guide row IS already set UNKNOWN, so outreach is safe meanwhile`
        : `  pen: ${pErr.message}`);
    }
    flagged++;
  }

  log.info(`dedupe applied: ${merged} row(s) merged (kept, flagged merged_into), ${flagged} person(s) set UNKNOWN + queued for re-verification. Serial sellers untouched.`);
}

main().catch((e) => { console.error(e.message); process.exit(1); });
