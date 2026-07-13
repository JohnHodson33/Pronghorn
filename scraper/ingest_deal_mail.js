// Live deal-correspondence ingestion (Lane C, 7/12 — closes the gap the live
// pursuit scan surfaced: Oliver's "Data Room Invite" for Landmark was unmatched
// because the CRM DEAL isn't a scraped listing). Reads recent Outlook mail via
// Graph Mail.Read, matches each message to a KNOWN DEAL by broker email →
// contact → company → deal, and logs it as an `activity` on that deal.
//
// READ-ONLY: fetches mail, writes activities. It does NOT auto-advance a live
// deal's stage (too risky on John's real deals) — instead it FLAGS pursuit
// signals (NDA/CIM/data-room) in the activity + a note so John sees "materials
// arrived" and moves the stage himself. Idempotent on internetMessageId.
//
// Usage: node ingest_deal_mail.js [--hours 48]

require('dotenv').config({ path: require('path').resolve(__dirname, './.env') });
const { supabase } = require('./core/db');
const log = require('./utils/logger');
const { fetchRecentMail } = require('./graph_mail');

const INTERNAL = /pronghornequity\.com|mba2026\.hbs\.edu/i;
const SIGNAL = /(nda|non-disclosure|data ?room|confidential information memorandum|offering memorandum|\bcim\b|process letter|management presentation|IOI|LOI|due diligence)/i;

async function main() {
  const hoursIdx = process.argv.indexOf('--hours');
  const hours = hoursIdx > -1 ? Number(process.argv[hoursIdx + 1]) : 48;
  const since = new Date(Date.now() - hours * 3600e3).toISOString();

  const messages = await fetchRecentMail(since, 100);
  log.info(`Deal-mail: ${messages.length} messages since ${since.slice(0, 10)}`);

  // broker/contact email → { company_id, deal_id, deal_name }
  const { data: contacts } = await supabase
    .from('contacts').select('email, company_id, companies(name, deals(id, name))').not('email', 'is', null);
  const byEmail = new Map();
  for (const c of contacts || []) {
    if (!c.company_id) continue;
    const co = Array.isArray(c.companies) ? c.companies[0] : c.companies;
    const deal = co?.deals && (Array.isArray(co.deals) ? co.deals[0] : co.deals);
    if (deal) byEmail.set(c.email.toLowerCase(), { company_id: c.company_id, deal_id: deal.id, name: co.name });
  }

  let logged = 0, flagged = 0, skipped = 0, unmatched = 0;
  for (const m of messages) {
    const from = (m.sender || '').toLowerCase();
    if (!from || INTERNAL.test(from)) continue;
    const match = byEmail.get(from);
    if (!match) { unmatched++; continue; }

    // idempotency: message id breadcrumb on this deal's activities
    const { data: seen } = await supabase.from('activities')
      .select('id').eq('deal_id', match.deal_id).ilike('body', `%[msg:${m.internetMessageId}]%`).limit(1);
    if (seen?.length) { skipped++; continue; }

    const isSignal = SIGNAL.test(`${m.subject} ${m.summary}`);
    const when = (m.receivedDateTime || '').slice(0, 10);
    const body = `[Outlook ${when}] ${m.subject}\nFrom: ${m.sender}\n${(m.summary || '').trim()}` +
      (isSignal ? `\n⚑ pursuit signal — review deal stage` : '') + `\n[msg:${m.internetMessageId}]`;
    const { error } = await supabase.from('activities').insert({
      company_id: match.company_id, deal_id: match.deal_id,
      kind: isSignal ? 'note' : 'email', body, doc_url: m.webLink || null,
    });
    if (error) { log.error(`${match.name}: ${error.message}`); continue; }
    logged++;
    if (isSignal) { flagged++; log.info(`  ⚑ ${match.name}: "${m.subject}" — deal-stage review flagged`); }
  }
  log.info(`Deal-mail: ${logged} activities logged (${flagged} pursuit-signal flags), ${skipped} already present, ${unmatched} from non-deal senders.`);
}

main().catch((e) => { console.error(e.message); process.exit(1); });
