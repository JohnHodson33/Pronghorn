// Lead → Company promotion (John 7/11: "very important"; bar RELAXED per
// John 7/12 ~00:00: "any company we're pulling the name for via enrichment
// should be made into a company profile" — name + website/location is
// enough; owner name/contact ENRICH the profile when found, never gate it).
// Eligible: any enriched lead, or any lead with an owner name. Creates the
// companies row (origin='lead'), an owner contact when we have one, and
// links the lead (leads.company_id).
//
// Idempotent: leads already linked are skipped; companies are deduped by
// normalized name+state (an existing company gets linked, not duplicated).
// Single-lead promotion for the UI button lives at POST /api/leads/promote.
//
// Usage: node promote_leads.js [--dry-run] [--limit N]

const { supabase } = require('./core/db');
const log = require('./utils/logger');

const { snapIndustry } = require('./core/industry_taxonomy');
const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const limitIdx = process.argv.indexOf('--limit');
  const limit = limitIdx > -1 ? Number(process.argv[limitIdx + 1]) : 500;

  const { data: leads, error } = await supabase.from('leads')
    .select('id, name, website, phone, address, city, state, status, owner_name, owner_email, owner_phone, owner_linkedin, source_tags, lead_list_id, company_id, enrichment')
    .is('company_id', null)
    .or('status.eq.enriched,owner_name.not.is.null')
    .limit(limit);
  if (error) throw new Error(error.message);
  if (!leads.length) { log.info('No promotion-eligible leads.'); return; }

  const { data: lists } = await supabase.from('lead_lists').select('id, query_industry');
  const industryOf = new Map((lists || []).map((l) => [l.id, l.query_industry]));
  const { data: companies } = await supabase.from('companies').select('id, name, state');
  const companyKey = new Map((companies || []).map((c) => [`${norm(c.name)}|${(c.state || '').toUpperCase()}`, c.id]));

  log.info(`${leads.length} promotion-eligible leads${dryRun ? ' (dry run)' : ''}`);
  let created = 0, linked = 0, contacts = 0;

  for (const l of leads) {
    const key = `${norm(l.name)}|${(l.state || '').toUpperCase()}`;
    let companyId = companyKey.get(key);
    const overview = l.enrichment?.overview;

    if (dryRun) { log.info(`  would promote: ${l.name} (${l.owner_name}) → ${companyId ? 'link existing' : 'new company'}`); continue; }

    if (!companyId) {
      const { data: co, error: cErr } = await supabase.from('companies').insert({
        name: l.name, website: l.website, city: l.city, state: l.state,
        // prefer the lead's VERIFIED industry (canonical); snap either to taxonomy
        industry: snapIndustry(l.enrichment?.industry_verified || industryOf.get(l.lead_list_id)) || null,
        origin: 'lead', lead_id: l.id,
        notes: [overview, `Proprietary target · sources: ${(l.source_tags || []).join(', ')}`].filter(Boolean).join(' | '),
      }).select('id').single();
      if (cErr) { log.error(`  ${l.name}: ${cErr.message}`); continue; }
      companyId = co.id;
      companyKey.set(key, companyId);
      created++;
    } else linked++;

    // owner contact when we have a name (skip if one already exists).
    // CONTACT-CARRY (John 7/12, Sage Tree Care case): orphaned owner CHANNELS
    // without a name must still reach the company — as an Unknown-owner
    // contact, never dropped.
    // LinkedIn flows to contacts ONLY when verified (John 7/15: wrong > none)
    const verifiedLi = l.owner_linkedin && l.enrichment?.linkedin_verified === true ? l.owner_linkedin : null;
    const hasChannels = l.owner_email || l.owner_phone || verifiedLi;
    const { data: exOwner } = (l.owner_name || hasChannels) ? await supabase.from('contacts')
      .select('id').eq('company_id', companyId).eq('role', 'owner').maybeSingle() : { data: true };
    if (!exOwner) {
      const { error: ctErr } = await supabase.from('contacts').insert({
        company_id: companyId, role: 'owner',
        name: l.owner_name || `Unknown owner (${l.name})`,
        email: l.owner_email, phone: l.owner_phone, linkedin: verifiedLi,
        notes: l.owner_name
          ? `Owner of ${l.name} · from proprietary list-building enrichment`
          : `Owner channels found for ${l.name} but name unknown — VA/tier-2 fills the name`,
      });
      if (!ctErr) contacts++;
    }

    await supabase.from('leads').update({ company_id: companyId }).eq('id', l.id);
    log.info(`  promoted: ${l.name}${l.owner_name ? ` → ${l.owner_name} (${l.owner_email || l.owner_phone || 'no contact yet'})` : ' (no owner yet)'}`);
  }
  log.info(`Promotion: ${created} companies created, ${linked} linked to existing, ${contacts} owner contacts added`);
}

main().catch((e) => { console.error(e.message); process.exit(1); });
