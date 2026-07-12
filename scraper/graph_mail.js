// Microsoft Graph mail READER — powers scheduled pursuit detection and email
// ingestion once John's re-auth (scopes already staged by PM) grants Mail.Read.
// READ-ONLY by construction: requests only Mail.Read; refuses tokens without
// it; the sole Graph call is GET /me/messages.

require('dotenv').config({ path: require('path').resolve(__dirname, './.env') });
const axios = require('axios');

async function accessToken() {
  const { GRAPH_CLIENT_ID, GRAPH_TENANT_ID, GRAPH_REFRESH_TOKEN } = process.env;
  if (!GRAPH_CLIENT_ID || !GRAPH_TENANT_ID || !GRAPH_REFRESH_TOKEN) {
    throw new Error('GRAPH_* not set in scraper/.env');
  }
  let res;
  try {
    res = await axios.post(
      `https://login.microsoftonline.com/${GRAPH_TENANT_ID}/oauth2/v2.0/token`,
      new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: GRAPH_CLIENT_ID,
        refresh_token: GRAPH_REFRESH_TOKEN,
        scope: 'Mail.Read User.Read offline_access', // reading only
      }).toString(),
      { headers: { 'content-type': 'application/x-www-form-urlencoded' }, timeout: 30000 },
    );
  } catch (e) {
    const code = e.response?.data?.error;
    throw new Error(`Graph consent doesn't include Mail.Read yet (${code || e.message}) — John runs \`node auth_email.js\` once in scraper/ (scopes staged) to grant it`);
  }
  const scope = String(res.data.scope || '').toLowerCase();
  if (!scope.includes('mail.read')) {
    throw new Error('Token lacks Mail.Read — John runs `node auth_email.js` once (scopes staged) to grant it');
  }
  return res.data.access_token;
}

/** Recent messages in ingest_pursuit/ingest_outlook dump shape. */
async function fetchRecentMail(sinceIso, max = 50) {
  const token = await accessToken();
  const { data } = await axios.get('https://graph.microsoft.com/v1.0/me/messages', {
    headers: { authorization: `Bearer ${token}` },
    params: {
      $filter: `receivedDateTime ge ${sinceIso}`,
      $orderby: 'receivedDateTime desc',
      $top: Math.min(max, 100),
      $select: 'subject,from,receivedDateTime,bodyPreview,webLink,internetMessageId',
    },
    timeout: 30000,
  });
  return (data.value || []).map((m) => ({
    subject: m.subject,
    sender: m.from?.emailAddress?.address || '',
    receivedDateTime: m.receivedDateTime,
    summary: m.bodyPreview,
    webLink: m.webLink,
    internetMessageId: m.internetMessageId,
  }));
}

module.exports = { fetchRecentMail };
