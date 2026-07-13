// Push queued outbox drafts → John's Outlook Drafts folder (John authorized
// draft creation in chat 7/12; autonomy order: remove clicks). Turns the whole
// queued-outbox into real Outlook drafts in ONE pass so John opens Outlook and
// finds them ready to review + send — no per-draft click in the app.
//
// HARD GUARDRAIL: creates DRAFTS only (Graph POST /me/messages). It cannot and
// does not send. Requires Mail.ReadWrite (John's one-time consent, scopes
// staged); refuses tokens without it and degrades with a clear message.
//
// Usage: node push_drafts_to_outlook.js [--limit 50]

require('dotenv').config({ path: require('path').resolve(__dirname, './.env') });
const axios = require('axios');
const { supabase } = require('./core/db');
const log = require('./utils/logger');

async function draftToken() {
  const { GRAPH_CLIENT_ID, GRAPH_TENANT_ID, GRAPH_REFRESH_TOKEN } = process.env;
  if (!GRAPH_CLIENT_ID || !GRAPH_TENANT_ID || !GRAPH_REFRESH_TOKEN) {
    throw new Error('GRAPH_* not set in scraper/.env');
  }
  let res;
  try {
    res = await axios.post(
      `https://login.microsoftonline.com/${GRAPH_TENANT_ID}/oauth2/v2.0/token`,
      new URLSearchParams({
        grant_type: 'refresh_token', client_id: GRAPH_CLIENT_ID,
        refresh_token: GRAPH_REFRESH_TOKEN,
        scope: 'Mail.ReadWrite User.Read offline_access', // drafts only — NOT Mail.Send
      }).toString(),
      { headers: { 'content-type': 'application/x-www-form-urlencoded' }, timeout: 30000 },
    );
  } catch (e) {
    throw new Error(`Graph consent lacks Mail.ReadWrite (${e.response?.data?.error || e.message}) — John runs \`node auth_email.js\` once (scopes staged)`);
  }
  if (!String(res.data.scope || '').toLowerCase().includes('mail.readwrite')) {
    throw new Error('Token lacks Mail.ReadWrite — re-auth with the staged scopes');
  }
  return res.data.access_token;
}

async function main() {
  const limitIdx = process.argv.indexOf('--limit');
  const limit = limitIdx > -1 ? Number(process.argv[limitIdx + 1]) : 50;

  const { data: queued, error } = await supabase.from('outbox_emails')
    .select('id, to_email, to_name, subject, body, listing_id')
    .eq('status', 'queued').limit(limit);
  if (error) throw new Error(error.message);
  if (!queued.length) { log.info('No queued drafts to push.'); return; }

  const token = await draftToken(); // throws with instructions if not consented
  log.info(`Pushing ${queued.length} queued drafts to Outlook Drafts…`);

  let pushed = 0;
  for (const m of queued) {
    try {
      const { data: draft } = await axios.post(
        'https://graph.microsoft.com/v1.0/me/messages',
        {
          subject: m.subject,
          body: { contentType: 'Text', content: m.body },
          toRecipients: [{ emailAddress: { address: m.to_email, name: m.to_name || undefined } }],
        },
        { headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' }, timeout: 30000 },
      );
      await supabase.from('outbox_emails').update({ status: 'drafted_to_outlook' }).eq('id', m.id);
      if (m.listing_id) {
        await supabase.from('listing_events').insert({
          listing_id: m.listing_id, event_type: 'inquiry_drafted_to_outlook',
          detail: { outbox_id: m.id, to: m.to_email, graph_id: draft.id, at: new Date().toISOString() },
        });
      }
      pushed++;
    } catch (e) {
      log.error(`  ${m.to_email}: ${e.response?.status || ''} ${e.response?.data?.error?.message || e.message}`);
    }
  }
  log.info(`Pushed ${pushed}/${queued.length} drafts to John's Outlook Drafts (review + send there — nothing sent by this job).`);
}

main().catch((e) => { console.error(e.message); process.exit(1); });
