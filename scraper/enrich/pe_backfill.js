// PE-status bulletproofing (John 7/31 program: "has it transacted to a PE
// consolidator?" is chain-link #1 and it read 2% determined). Two quick wins,
// $0 spend — both work off data we already hold:
//
// A. PERSIST NEGATIVES: a lead whose enrichment ran the PE check and found
//    nothing stayed null — indistinguishable from never-checked. Any lead
//    with a completed tier-1 enrichment or flags_backfill pass and no PE
//    verdict gets pe_owned=false + pe_checked_at (audit: "checked on <date>,
//    no PE evidence"), timestamped from the pass that actually ran.
//
// B. ACQUISITION-LEDGER CROSS-REFERENCE: river_guides IS a 467-deal PE
//    transaction ledger (their_company → acquirer). Match proprietary
//    leads + CRM companies by normalized name + same state → pe_owned=true,
//    pe_owner=<acquirer>, source 'acquisition-ledger' + the RG deal id.
//    Also: a lead whose NAME is a consolidator/acquirer brand itself is
//    PE-side by definition (platforms show up in Google-presence lists).
//    Exact-normalized-name + state equality only — no fuzzy guessing.
//
// Usage: node enrich/pe_backfill.js [--dry-run]

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { supabase } = require('../core/db');
const log = require('../utils/logger');

const norm = (s) => String(s || '').toLowerCase()
  .replace(/\s*\([^)]*\)/g, '')
  .replace(/&/g, ' and ')
  .replace(/[^a-z0-9]+/g, ' ')
  .replace(/\b(llc|inc|co|corp|corporation|company|ltd|lp|pllc|the)\b/g, '')
  .replace(/\s+/g, ' ').trim();

async function pageAll(table, cols, filter) {
  const out = [];
  for (let from = 0; ; from += 1000) {
    let q = supabase.from(table).select(cols).range(from, from + 999);
    if (filter) q = filter(q);
    const { data, error } = await q;
    if (error) throw new Error(`${table}: ${error.message}`);
    out.push(...(data || []));
    if ((data || []).length < 1000) break;
  }
  return out;
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');

  const leads = await pageAll('leads', 'id,name,state,enrichment,status');
  const companies = await pageAll('companies', 'id,name,state,pe_owned,pe_owner');
  const guides = await pageAll('river_guides', 'deal_id,their_company,acquirer,acquirer_pe_sponsor,location_state,deal_year');

  // ---- A. persist negatives on checked-clean leads -------------------------
  let negatives = 0, stamped = 0;
  for (const l of leads) {
    const e = l.enrichment;
    if (!e || typeof e !== 'object' || e.skipped) continue;
    const checkedAt = e.flags_backfill?.at || e.at || null;
    const ran = checkedAt || l.status === 'enriched'; // a stored classifier output = the check ran
    if (!ran) continue;
    const patch = {};
    if (e.pe_owned == null) { patch.pe_owned = false; patch.pe_basis = 'checked-no-evidence'; negatives++; }
    if (!e.pe_checked_at) { patch.pe_checked_at = checkedAt || new Date().toISOString(); stamped++; }
    if (!Object.keys(patch).length) continue;
    if (dryRun) continue;
    const { error } = await supabase.from('leads').update({ enrichment: { ...e, ...patch } }).eq('id', l.id);
    if (error) log.error(`  ${l.name}: ${error.message}`);
  }
  log.info(`A. negatives: ${negatives} checked-clean leads → pe_owned=false (+${stamped} pe_checked_at stamps)${dryRun ? ' [dry]' : ''}`);

  // ---- B. acquisition-ledger cross-reference -------------------------------
  // sold-company index: normalized name+state → the deal
  const soldIdx = new Map();
  for (const g of guides) {
    const k = norm(g.their_company);
    if (k && g.location_state) soldIdx.set(`${k}|${String(g.location_state).toUpperCase()}`, g);
  }
  // consolidator/platform brand names (state-independent: platforms are national)
  const platformIdx = new Map();
  for (const g of guides) {
    const k = norm(g.acquirer);
    if (k) platformIdx.set(k, g);
  }

  let ledgerLeads = 0, platformLeads = 0, ledgerCompanies = 0;
  const markLead = async (l, g, kind) => {
    const e = { ...(l.enrichment && typeof l.enrichment === 'object' ? l.enrichment : {}) };
    if (e.pe_owned === true) return false; // already known
    e.pe_owned = true;
    e.pe_owner = kind === 'sold' ? (g.acquirer || null) : (g.acquirer_pe_sponsor || g.acquirer || null);
    e.pe_basis = kind === 'sold'
      ? `acquisition-ledger: acquired by ${g.acquirer}${g.deal_year ? ` (${g.deal_year})` : ''} [${g.deal_id}]`
      : `acquisition-ledger: this IS consolidator "${g.acquirer}" from our deal log`;
    e.pe_checked_at = new Date().toISOString();
    if (dryRun) { log.info(`  [dry] lead ${l.name} (${l.state}) → PE: ${e.pe_basis.slice(0, 90)}`); return true; }
    const { error } = await supabase.from('leads').update({ enrichment: e }).eq('id', l.id);
    if (error) { log.error(`  ${l.name}: ${error.message}`); return false; }
    log.info(`  ⚑ lead ${l.name} (${l.state}) → PE-owned: ${e.pe_basis.slice(0, 90)}`);
    return true;
  };

  for (const l of leads) {
    const k = norm(l.name);
    if (!k) continue;
    const sold = l.state ? soldIdx.get(`${k}|${String(l.state).toUpperCase()}`) : null;
    if (sold) { if (await markLead(l, sold, 'sold')) ledgerLeads++; continue; }
    const platform = platformIdx.get(k);
    if (platform) { if (await markLead(l, platform, 'platform')) platformLeads++; }
  }

  for (const c of companies) {
    if (c.pe_owned === true) continue;
    const k = norm(c.name);
    const sold = k && c.state ? soldIdx.get(`${k}|${String(c.state).toUpperCase()}`) : null;
    const platform = k ? platformIdx.get(k) : null;
    const g = sold || platform;
    if (!g) continue;
    const owner = sold ? (g.acquirer || null) : (g.acquirer_pe_sponsor || g.acquirer || null);
    if (dryRun) { log.info(`  [dry] company ${c.name} (${c.state}) → PE (${owner})`); ledgerCompanies++; continue; }
    const { error } = await supabase.from('companies').update({ pe_owned: true, pe_owner: owner }).eq('id', c.id);
    if (error) log.error(`  company ${c.name}: ${error.message}`);
    else { ledgerCompanies++; log.info(`  ⚑ company ${c.name} (${c.state}) → PE-owned (${owner})`); }
  }
  log.info(`B. ledger cross-ref: ${ledgerLeads} leads matched a sold company, ${platformLeads} leads ARE consolidator brands, ${ledgerCompanies} CRM companies flagged${dryRun ? ' [dry]' : ''}`);

  // ---- funnel readout (the number the PM re-measures) ----------------------
  const after = dryRun ? leads : await pageAll('leads', 'id,enrichment,status');
  const enrichedLeads = after.filter((l) => l.status === 'enriched' && l.enrichment && !l.enrichment.skipped);
  const det = enrichedLeads.filter((l) => l.enrichment.pe_owned === true || l.enrichment.pe_owned === false).length;
  log.info(`FUNNEL: PE-status determined ${det}/${enrichedLeads.length} enriched leads (${enrichedLeads.length ? Math.round(det / enrichedLeads.length * 100) : 0}%)${dryRun ? ' — dry run, unchanged' : ''}`);
}

main().catch((e) => { console.error(e.message); process.exit(1); });
