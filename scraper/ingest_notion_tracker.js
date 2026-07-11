// Notion Deal Tracker + Broker Directory sync — Notion → Supabase, read-only.
// The Notion tracker (pre-platform system of record) holds financials the
// HubSpot import lacked (revenue/EBITDA/employees/LOI price/listing URLs) and
// the Broker Directory holds phones + real names + two OWNER cell contacts.
// Fill-blanks-only: platform values are never overwritten by Notion.
//
// Usage: node ingest_notion_tracker.js <dump.json>
//   { "deals":   [{ name, status, city_state, owner_name, asking, revenue,
//                   ebitda, loi_price, employees, listing_url, notion_url }],
//     "brokers": [{ name, company, email, phone, city, notion_url,
//                   owner_of: "<company name>" | null }] }
//   Dumps come from Notion MCP data-source queries (scratchpad, not repo).

const fs = require('fs');
const { supabase } = require('./core/db');
const log = require('./utils/logger');

const norm = (s) => String(s || '').toLowerCase().replace(/[‘’]/g, "'").replace(/[^a-z0-9']+/g, ' ').trim();

async function main() {
  const file = process.argv[2];
  if (!file || !fs.existsSync(file)) { console.error('Usage: node ingest_notion_tracker.js <dump.json>'); process.exit(1); }
  const { deals = [], brokers = [] } = JSON.parse(fs.readFileSync(file, 'utf8'));

  const { data: companies } = await supabase.from('companies').select('id, name, revenue, ebitda, notes');
  const byName = new Map(companies.map((c) => [norm(c.name), c]));
  const findCompany = (name) => byName.get(norm(name)) || companies.find((c) => norm(c.name).includes(norm(name)) || norm(name).includes(norm(c.name)));

  let dealsUpdated = 0, contactsUpdated = 0, contactsAdded = 0;

  for (const d of deals) {
    const co = findCompany(d.name);
    if (!co) { log.warn(`No company for Notion deal "${d.name}"`); continue; }
    const crumb = `[notion-tracker]`;

    const patch = {};
    if (co.revenue == null && d.revenue) patch.revenue = d.revenue;
    if (co.ebitda == null && d.ebitda) patch.ebitda = d.ebitda;
    const noteBits = [];
    if (d.employees) noteBits.push(`${d.employees} employees`);
    if (d.listing_url && /^https?:/.test(d.listing_url)) noteBits.push(`Listing: ${d.listing_url}`);
    if (d.status) noteBits.push(`Notion status: ${d.status}`);
    const newBits = noteBits.filter((b) => !(co.notes || '').includes(b));
    if (newBits.length && !(co.notes || '').includes(crumb)) {
      patch.notes = [co.notes, `${crumb} ${newBits.join(' · ')}`].filter(Boolean).join(' | ');
    }
    if (Object.keys(patch).length) {
      const { error } = await supabase.from('companies').update(patch).eq('id', co.id);
      if (error) { log.error(`${d.name}: ${error.message}`); continue; }
    }
    // LOI price → deals.our_valuation (what we actually offered; post-mortem gold)
    if (d.loi_price) {
      const { data: deal } = await supabase.from('deals').select('id, our_valuation').eq('company_id', co.id).maybeSingle();
      if (deal && deal.our_valuation == null) await supabase.from('deals').update({ our_valuation: d.loi_price }).eq('id', deal.id);
    }
    dealsUpdated++;
  }

  const { data: contacts } = await supabase.from('contacts').select('id, name, email, phone, role, company_id, notes');
  const contactByEmail = new Map(contacts.filter((c) => c.email).map((c) => [c.email.toLowerCase(), c]));
  const contactByName = new Map(contacts.map((c) => [norm(c.name), c]));

  for (const b of brokers) {
    const isOwner = !!b.owner_of;
    const cleanName = b.name.replace(/^X\s+/, '').replace(/\s*\(Owner\)\s*$/i, '').replace(/,\s*CFA$/i, '').trim();
    const match = (b.email && contactByEmail.get(b.email.toLowerCase())) || contactByName.get(norm(cleanName));

    if (match) {
      const patch = {};
      if (!match.phone && b.phone) patch.phone = b.phone;
      if (b.email && !match.email) patch.email = b.email.toLowerCase();
      // upgrade bare-email display names ("bparra@tworld.com" → "Bogart Parra-Granados")
      if (match.name?.includes('@') && cleanName && !cleanName.includes('@')) patch.name = cleanName;
      if (Object.keys(patch).length) {
        const { error } = await supabase.from('contacts').update(patch).eq('id', match.id);
        if (!error) { contactsUpdated++; log.info(`  contact enriched: ${patch.name || match.name} ${patch.phone ? '(+phone)' : ''}`); }
      }
      continue;
    }

    const co = isOwner ? findCompany(b.owner_of) : null;
    const { error } = await supabase.from('contacts').insert({
      company_id: co?.id ?? null,
      role: isOwner ? 'owner' : 'broker',
      name: cleanName, email: b.email?.toLowerCase() || null, phone: b.phone || null,
      notes: `${isOwner ? `Owner of ${b.owner_of}` : b.company || 'Broker'} · from Notion Broker Directory`,
    });
    if (!error) { contactsAdded++; log.info(`  contact added: ${cleanName} (${isOwner ? 'owner' : 'broker'})${b.phone ? ' +phone' : ''}`); }
  }

  log.info(`Notion tracker sync: ${dealsUpdated} companies/deals enriched, ${contactsUpdated} contacts enriched, ${contactsAdded} added`);
}

main().catch((e) => { console.error(e.message); process.exit(1); });
