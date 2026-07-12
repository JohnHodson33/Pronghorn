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

// Mail → stage signals (John's ask 2026-07-11: "submitted the IOI" moves the
// deal). Only OUR OWN sent mail can advance a stage, and stages only move
// FORWARD — a reply quoting "attached IOI" can't regress or re-trigger anything
// because the advance is skipped unless the new stage outranks the current one.
const STAGE_ORDER = ['Sourced', 'Info Requested', 'Under Screening', 'IOI Submitted', 'LOI', 'Diligence', 'Closed'];
const STAGE_SIGNALS = [
  { re: /attached\s+(final\s+)?IOI|present .{0,40}IOI|IOI\s+(is\s+)?(attached|submitted|enclosed)/i, stage: 'IOI Submitted' },
  { re: /attached\s+(final\s+)?LOI|signed\s+LOI|LOI\s+(is\s+)?(attached|submitted|enclosed)/i, stage: 'LOI' },
];

async function maybeAdvanceStage(company, deal, m, log) {
  if (!deal || !INTERNAL.test(m.sender || '')) return; // only our own sent mail
  // 'Passed' is out-of-band (not in STAGE_ORDER) — a mail signal must never
  // resurrect a passed deal; un-passing is a deliberate human action.
  const text = `${m.subject || ''} ${m.summary || ''}`;
  const hit = STAGE_SIGNALS.find((s) => s.re.test(text));
  if (!hit) return;
  const { data: cur } = await supabase.from('deals').select('stage').eq('id', deal.id).single();
  if (!STAGE_ORDER.includes(cur.stage)) return; // Passed/unknown = terminal
  if (STAGE_ORDER.indexOf(hit.stage) <= STAGE_ORDER.indexOf(cur.stage)) return; // forward only
  const { error } = await supabase.from('deals').update({ stage: hit.stage }).eq('id', deal.id);
  if (error) { log.error(`stage advance ${company.name}: ${error.message}`); return; }
  await supabase.from('activities').insert({
    company_id: company.id, deal_id: deal.id, kind: 'note',
    body: `[auto] Stage advanced ${cur.stage} → ${hit.stage} — detected from sent mail "${m.subject}" (${(m.receivedDateTime || '').slice(0, 10)})`,
  });
  log.info(`  ${company.name}: stage ${cur.stage} → ${hit.stage} (mail signal)`);
}

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
      await maybeAdvanceStage(company, deal, m, log);

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
