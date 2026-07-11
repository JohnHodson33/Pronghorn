// Outlook deal-correspondence ingestion — Outlook → Supabase activities/contacts.
// READ-ONLY on the mailbox; nothing is sent or modified in Outlook. Ever.
//
// Usage: node ingest_outlook.js <dump.json>
//   [{ "company": "<platform company name>",
//      "messages": [{ subject, sender, receivedDateTime, summary, webLink,
//                     internetMessageId }] }]
//   The dump comes from Outlook MCP searches today; once John re-authorizes
//   Microsoft Graph with Mail.Read scope (current token is Mail.Send-only,
//   scope cannot be widened via refresh), a fetch mode can go on the schedule.
//
// Behavior:
//   - one `activities` row per email (kind='email'), linked to company + deal,
//     doc_url = Outlook webLink, idempotent on a [msg:<internetMessageId>]
//     breadcrumb in the body
//   - unknown external senders become `contacts` (role 'other') with the deal
//     context in notes; internal senders (Pronghorn) are never contacts
//   - email PII stays out of the repo: dumps live in gitignored/scratch paths

const fs = require('fs');
const { supabase } = require('./core/db');
const log = require('./utils/logger');

const INTERNAL = /pronghornequity\.com|mba2026\.hbs\.edu|^\/O=EXCHANGELABS/i;

async function main() {
  const file = process.argv[2];
  if (!file || !fs.existsSync(file)) {
    console.error('Usage: node ingest_outlook.js <dump.json>');
    process.exit(1);
  }
  const groups = JSON.parse(fs.readFileSync(file, 'utf8'));

  const { data: contacts, error: cErr } = await supabase.from('contacts').select('id, email');
  if (cErr) throw new Error(cErr.message);
  const knownEmails = new Set(contacts.filter((c) => c.email).map((c) => c.email.toLowerCase()));

  let acts = 0, newContacts = 0, skipped = 0;
  for (const g of groups) {
    const { data: company } = await supabase
      .from('companies').select('id, name').ilike('name', `%${g.company}%`).maybeSingle();
    if (!company) { log.warn(`No company matches "${g.company}" — skipped ${g.messages.length} messages`); continue; }
    const { data: deal } = await supabase
      .from('deals').select('id').eq('company_id', company.id).maybeSingle();

    // existing breadcrumbs for this company (idempotency)
    const { data: existing } = await supabase
      .from('activities').select('body').eq('company_id', company.id).eq('kind', 'email');
    const seen = new Set((existing || []).flatMap((a) => a.body?.match(/\[msg:[^\]]+\]/g) || []));

    for (const m of g.messages) {
      const crumb = `[msg:${m.internetMessageId}]`;
      if (seen.has(crumb)) { skipped++; continue; }
      const senderLabel = INTERNAL.test(m.sender) ? 'Pronghorn (internal)' : m.sender;
      const when = (m.receivedDateTime || '').slice(0, 10);
      const body = `[Outlook ${when}] ${m.subject}\nFrom: ${senderLabel}\n${(m.summary || '').trim()}\n${crumb}`;
      const { error } = await supabase.from('activities').insert({
        company_id: company.id, deal_id: deal?.id ?? null, kind: 'email',
        body, doc_url: m.webLink || null,
      });
      if (error) { log.error(`${company.name} / ${m.subject}: ${error.message}`); continue; }
      acts++;

      // unknown external sender → contact
      const email = (m.sender || '').toLowerCase();
      if (email.includes('@') && !INTERNAL.test(email) && !knownEmails.has(email)) {
        const { error: iErr } = await supabase.from('contacts').insert({
          company_id: company.id, role: 'other', name: email.split('@')[0], email,
          notes: `Outlook correspondent on ${company.name} (auto-extracted; review name/role)`,
        });
        if (!iErr) { knownEmails.add(email); newContacts++; }
      }
    }
  }
  log.info(`Outlook ingest: ${acts} email activities added, ${newContacts} new contacts, ${skipped} already present`);
}

main().catch((e) => { console.error(e.message); process.exit(1); });
