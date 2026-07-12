// Lead → Company promotion (John 7/11: "very important"). An enriched lead
// with an owner NAME + at least one contact channel (email or phone) is a
// real proprietary target — promote it into the CRM: companies row
// (origin='lead') + owner contact, and link the lead (leads.company_id).
//
// Idempotent: leads already linked are skipped; companies are deduped by
// normalized name+state (an existing company gets linked, not duplicated).
// Single-lead promotion for the UI button lives at POST /api/leads/promote.
//
// Usage: node promote_leads.js [--dry-run] [--limit N]

const { supabase } = require('./core/db');
const log = require('./utils/logger');

const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const limitIdx = process.argv.indexOf('--limit');
  const limit = limitIdx > -1 ? Number(process.argv[limitIdx + 1]) : 500;

  const { data: leads, error } = await supabase.from('leads')
    .select('id, name, website, phone, address, city, state, owner_name, owner_email, owner_phone, owner_linkedin, source_tags, lead_list_id, company_id, enrichment')
    .is('company_id', null)
    .not('owner_name', 'is', null)
    .or('owner_email.not.is.null,owner_phone.not.is.null')
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
        industry: industryOf.get(l.lead_list_id) || null,
        origin: 'lead', lead_id: l.id,
        notes: [overview, `Proprietary target · sources: ${(l.source_tags || []).join(', ')}`].filter(Boolean).join(' | '),
      }).select('id').single();
      if (cErr) { log.error(`  ${l.name}: ${cErr.message}`); continue; }
      companyId = co.id;
      companyKey.set(key, companyId);
      created++;
    } else linked++;

    // owner contact (skip if one already exists for this company)
    const { data: exOwner } = await supabase.from('contacts')
      .select('id').eq('company_id', companyId).eq('role', 'owner').maybeSingle();
    if (!exOwner) {
      const { error: ctErr } = await supabase.from('contacts').insert({
        company_id: companyId, role: 'owner', name: l.owner_name,
        email: l.owner_email, phone: l.owner_phone, linkedin: l.owner_linkedin,
        notes: `Owner of ${l.name} · from proprietary list-building enrichment`,
      });
      if (!ctErr) contacts++;
    }

    await supabase.from('leads').update({ company_id: companyId }).eq('id', l.id);
    log.info(`  promoted: ${l.name} → ${l.owner_name} (${l.owner_email || l.owner_phone})`);
  }
  log.info(`Promotion: ${created} companies created, ${linked} linked to existing, ${contacts} owner contacts added`);
}

main().catch((e) => { console.error(e.message); process.exit(1); });
