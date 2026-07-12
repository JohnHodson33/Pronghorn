require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const axios = require('axios');
const fs    = require('path').resolve ? require('fs') : null;
const path  = require('path');
const log   = require('../utils/logger');
const { locationString } = require('../core/listing');

const ENV_PATH       = path.resolve(__dirname, '../.env');
// Single-tenant app registrations must auth against their own tenant, not /common
const TENANT_ID      = process.env.GRAPH_TENANT_ID || 'common';
const TOKEN_URL      = `https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/token`;
const AUTH_URL       = `https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/authorize`;
const GRAPH_SEND_URL = 'https://graph.microsoft.com/v1.0/me/sendMail';
// Mail.Read = scheduled pursuit auto-detect; Mail.ReadWrite = create drafts
// in John's Drafts folder (his chosen review-then-send flow, 7/11). One
// consent must capture everything — John should never re-auth twice.
const SCOPES         = 'Mail.Send Mail.Read Mail.ReadWrite User.Read offline_access';
const REDIRECT_URI   = 'http://localhost:3000/callback';

// ---------------------------------------------------------------------------
// .env file management — updates a single key, preserves all other entries
// ---------------------------------------------------------------------------
function updateEnv(key, value) {
  let content = '';
  if (require('fs').existsSync(ENV_PATH)) {
    content = require('fs').readFileSync(ENV_PATH, 'utf8');
  }
  const lines = content.split('\n').filter(Boolean);
  const idx   = lines.findIndex((l) => l.startsWith(`${key}=`));
  const newLine = `${key}=${value}`;
  if (idx >= 0) {
    lines[idx] = newLine;
  } else {
    lines.push(newLine);
  }
  require('fs').writeFileSync(ENV_PATH, lines.join('\n') + '\n');
  process.env[key] = value; // update in-process too
}

// ---------------------------------------------------------------------------
// Authorization code flow with localhost redirect — called once to get initial tokens
// Opens browser to Microsoft login, catches the redirect on localhost:3000
// ---------------------------------------------------------------------------
async function runAuthCodeFlow(clientId) {
  const http   = require('http');
  const { exec } = require('child_process');

  log.info('No refresh token found — starting browser authorization flow...');

  // Build the authorization URL
  const params = new URLSearchParams({
    client_id:     clientId,
    response_type: 'code',
    redirect_uri:  REDIRECT_URI,
    scope:         SCOPES,
    response_mode: 'query',
    prompt:        'select_account',
  });
  const loginUrl = `${AUTH_URL}?${params.toString()}`;

  console.log('\n' + '='.repeat(60));
  console.log('ACTION REQUIRED — Authorize Pronghorn to send email:');
  console.log('  Your browser will open automatically to Microsoft login.');
  console.log('  Sign in with: jhodson@pronghornequity.com');
  console.log('  Then click Accept when asked to grant permissions.');
  console.log('');
  console.log('  If the browser does not open, paste this URL manually:');
  console.log(`  ${loginUrl}`);
  console.log('='.repeat(60) + '\n');

  // Wait for the auth code on localhost:3000/callback
  const code = await new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const url  = new URL(req.url, 'http://localhost:3000');
      const code = url.searchParams.get('code');
      const err  = url.searchParams.get('error');

      if (err) {
        res.writeHead(400);
        res.end(`<h2>Authorization failed: ${err}</h2><p>${url.searchParams.get('error_description') || ''}</p>`);
        server.close();
        reject(new Error(`Auth error: ${err} — ${url.searchParams.get('error_description')}`));
        return;
      }

      if (code) {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(`
          <html><body style="font-family:sans-serif;text-align:center;padding:60px;">
            <h2 style="color:#16a34a;">✓ Authorization successful</h2>
            <p>You can close this tab and return to the terminal.</p>
          </body></html>
        `);
        server.close();
        resolve(code);
      }
    });

    server.listen(3000, () => {
      log.info('Listening on http://localhost:3000 — opening browser...');
      // Open the browser — works on Windows
      exec(`start "" "${loginUrl}"`, (err) => {
        if (err) log.warn('Could not open browser automatically — paste the URL above manually');
      });
    });

    // Timeout after 5 minutes
    setTimeout(() => {
      server.close();
      reject(new Error('Authorization timed out — re-run auth_email.js to try again'));
    }, 5 * 60 * 1000);
  });

  // Exchange the auth code for tokens
  const tokenRes = await axios.post(TOKEN_URL, new URLSearchParams({
    grant_type:   'authorization_code',
    client_id:    clientId,
    code,
    redirect_uri: REDIRECT_URI,
    scope:        SCOPES,
  }), { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });

  const { access_token, refresh_token } = tokenRes.data;
  updateEnv('GRAPH_REFRESH_TOKEN', refresh_token);
  log.info('Browser auth successful — refresh token saved to .env');
  return access_token;
}

// ---------------------------------------------------------------------------
// Token refresh — exchanges stored refresh token for a new access token
// ---------------------------------------------------------------------------
async function refreshAccessToken(clientId, refreshToken) {
  const res = await axios.post(TOKEN_URL, new URLSearchParams({
    grant_type:    'refresh_token',
    client_id:     clientId,
    refresh_token: refreshToken,
    scope:         SCOPES,
  }), { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });

  const { access_token, refresh_token: newRefresh } = res.data;

  // Microsoft rotates refresh tokens — always save the newest one
  if (newRefresh && newRefresh !== refreshToken) {
    updateEnv('GRAPH_REFRESH_TOKEN', newRefresh);
  }

  return access_token;
}

// ---------------------------------------------------------------------------
// Auth entry point — returns a valid access token
// ---------------------------------------------------------------------------
async function getAccessToken() {
  const clientId     = process.env.GRAPH_CLIENT_ID;
  const refreshToken = process.env.GRAPH_REFRESH_TOKEN;

  if (!clientId) {
    throw new Error(
      'GRAPH_CLIENT_ID not set in .env — add your Azure app registration Client ID'
    );
  }

  if (!refreshToken) {
    if (process.env.PRONGHORN_NONINTERACTIVE) {
      throw new Error('No refresh token and running non-interactively — run "node auth_email.js" manually to authorize');
    }
    return runAuthCodeFlow(clientId);
  }

  try {
    return await refreshAccessToken(clientId, refreshToken);
  } catch (err) {
    const status = err.response?.status;
    const errCode = err.response?.data?.error;

    if (status === 400 && errCode === 'invalid_grant') {
      log.warn('Refresh token expired or revoked — re-running browser auth flow');
      updateEnv('GRAPH_REFRESH_TOKEN', '');
      return runAuthCodeFlow(clientId);
    }
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Formatting helpers
// ---------------------------------------------------------------------------
function formatMoney(n) {
  if (n === null || n === undefined || n === '') return null;
  return '$' + Number(n).toLocaleString('en-US');
}

function formatMultiple(n) {
  if (n === null || n === undefined || n === '') return null;
  return Number(n).toFixed(1) + 'x';
}

function cashFlowLabel(l) {
  return { SDE: 'SDE', EBITDA: 'EBITDA', CASH_FLOW: 'Cash Flow' }[l.cash_flow_type] || 'EBITDA/SDE';
}

function formatPercent(n) {
  if (n === null || n === undefined || n === '') return null;
  return (Number(n) * 100).toFixed(0) + '%';
}

function brokerCell(l) {
  if (!l.broker) return '—';
  const parts = [l.broker.name, l.broker.company, l.broker.phone, l.broker.email].filter(Boolean);
  return parts.length ? parts.map(escHtml).join('<br>') : '—';
}

// ---------------------------------------------------------------------------
// HTML email builder — one structured table, all Tier 1/2 listings,
// sorted highest EBITDA/SDE to lowest (undisclosed cash flow last).
// ---------------------------------------------------------------------------
function buildHtml(tier1, tier2, runStats, dateStr) {
  const listings = [...tier1, ...tier2].sort((a, b) => (b.cash_flow ?? -1) - (a.cash_flow ?? -1));

  const th = 'padding:8px 7px;font-size:10px;font-weight:700;color:#ffffff;background:#1a1a1a;text-transform:uppercase;letter-spacing:0.5px;text-align:left;white-space:nowrap;';
  const td = 'padding:8px 7px;font-size:12px;color:#333333;border-bottom:1px solid #e5e7eb;vertical-align:top;';
  const tierBadge = (t) => t === 1
    ? '<span style="display:inline-block;padding:2px 7px;border-radius:10px;background:#1a56db;color:#fff;font-size:10px;font-weight:700;">T1</span>'
    : '<span style="display:inline-block;padding:2px 7px;border-radius:10px;background:#9061f9;color:#fff;font-size:10px;font-weight:700;">T2</span>';

  const rows = listings.map((l, i) => {
    const bg = i % 2 === 0 ? '#ffffff' : '#f6f8fa';
    const loc = escHtml(locationString(l) || '—') + (l.priority_state ? ' <span title="Priority state">&#11088;</span>' : '');
    const nameLink = l.url
      ? `<a href="${l.url}" style="color:#1a56db;text-decoration:none;font-weight:600;">${escHtml(l.name || 'Unnamed listing')}</a>`
      : `<span style="font-weight:600;">${escHtml(l.name || 'Unnamed listing')}</span>`;
    return `
      <tr style="background:${bg};">
        <td style="${td}">${tierBadge(l.tier)}</td>
        <td style="${td}min-width:180px;">${nameLink}<br>
          <span style="font-size:11px;color:#777;font-style:italic;">${escHtml(l.reasoning || '')}</span></td>
        <td style="${td}white-space:nowrap;">${escHtml(l.industry || '—')}</td>
        <td style="${td}white-space:nowrap;">${loc}</td>
        <td style="${td}text-align:right;white-space:nowrap;">${formatMoney(l.gross_revenue) || '—'}</td>
        <td style="${td}text-align:right;white-space:nowrap;">${formatMoney(l.cash_flow) || '—'}<br><span style="font-size:10px;color:#999;">${l.cash_flow ? escHtml(cashFlowLabel(l)) : ''}</span></td>
        <td style="${td}text-align:right;white-space:nowrap;">${formatMoney(l.asking_price) || '—'}</td>
        <td style="${td}text-align:right;">${formatPercent(l.ebitda_margin) || '—'}</td>
        <td style="${td}text-align:right;">${formatMultiple(l.implied_multiple) || '—'}${l.multiple_flag ? ' <span style="color:#dc2626;" title="Above multiple flag threshold">&#9888;</span>' : ''}</td>
        <td style="${td}white-space:nowrap;">${escHtml(l.source || '—')}</td>
        <td style="${td}">${brokerCell(l)}</td>
      </tr>`;
  }).join('');

  const table = listings.length === 0
    ? '<p style="color:#888;font-size:14px;padding:16px 0;">No Tier 1 or Tier 2 listings this week.</p>'
    : `
    <table cellpadding="0" cellspacing="0" style="border-collapse:collapse;width:100%;background:#ffffff;border:1px solid #e5e7eb;">
      <tr>
        <th style="${th}">Tier</th>
        <th style="${th}">Listing / Screener Note</th>
        <th style="${th}">Industry</th>
        <th style="${th}">Location</th>
        <th style="${th}text-align:right;">Revenue</th>
        <th style="${th}text-align:right;">EBITDA / SDE</th>
        <th style="${th}text-align:right;">Price</th>
        <th style="${th}text-align:right;">Margin</th>
        <th style="${th}text-align:right;">Multiple</th>
        <th style="${th}">Source</th>
        <th style="${th}">Broker</th>
      </tr>
      ${rows}
    </table>`;

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
  <div style="max-width:980px;margin:24px auto;background:#f5f5f5;padding:0 16px 32px 16px;">

    <!-- Header -->
    <div style="background:#1a1a1a;border-radius:6px 6px 0 0;padding:24px 24px 20px 24px;margin-bottom:0;">
      <p style="margin:0 0 4px 0;font-size:11px;font-weight:600;letter-spacing:1.5px;color:#999999;text-transform:uppercase;">Pronghorn</p>
      <h1 style="margin:0 0 12px 0;font-size:22px;font-weight:700;color:#ffffff;line-height:1.2;">Deal Sourcing Digest</h1>
      <p style="margin:0;font-size:13px;color:#aaaaaa;">${dateStr} &nbsp;·&nbsp; ${runStats.scraped ?? runStats.total} scraped &nbsp;·&nbsp; ${runStats.relevant ?? '—'} matched mandate &nbsp;·&nbsp; ${runStats.new ?? runStats.total} new this week &nbsp;·&nbsp; <span style="color:#6ee7b7;">${runStats.tier1} Tier 1</span> &nbsp;·&nbsp; <span style="color:#c4b5fd;">${runStats.tier2} Tier 2</span> &nbsp;·&nbsp; &#11088; = priority state</p>
    </div>

    <!-- Body -->
    <div style="background:#f9fafb;padding:16px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 6px 6px;">
      ${table}
    </div>

    <!-- Footer -->
    <p style="margin:20px 0 0 0;text-align:center;font-size:11px;color:#aaaaaa;">
      Powered by Pronghorn Deal Sourcing Pipeline &nbsp;·&nbsp; Sorted by EBITDA/SDE, highest first &nbsp;·&nbsp; Run completed ${new Date().toLocaleString('en-US', { timeZone: 'America/Phoenix' })} AZ
    </p>

  </div>
</body>
</html>`;
}

function escHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ---------------------------------------------------------------------------
// Exported function — called from run_daily.js
// ---------------------------------------------------------------------------
async function sendDigest(screenedListings, runStats) {
  const recipientEmail = process.env.GRAPH_RECIPIENT_EMAIL;
  if (!recipientEmail) {
    throw new Error('GRAPH_RECIPIENT_EMAIL not set in .env');
  }

  const tier1 = screenedListings.filter((l) => l.tier === 1);
  const tier2 = screenedListings.filter((l) => l.tier === 2);

  log.info(`Preparing digest email — ${tier1.length} Tier 1, ${tier2.length} Tier 2 listings`);

  const dateStr   = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const newPart   = runStats.new != null ? `${runStats.new} new — ` : '';
  const subject   = `Pronghorn Deal Digest — ${new Date().toISOString().slice(0, 10)} — ${newPart}${tier1.length} Tier 1 | ${tier2.length} Tier 2`;
  const htmlBody  = buildHtml(tier1, tier2, runStats, dateStr);

  let accessToken;
  try {
    accessToken = await getAccessToken();
  } catch (err) {
    log.error(`Email delivery skipped — auth failed: ${err.message}`);
    return false;
  }

  const payload = {
    message: {
      subject,
      body:       { contentType: 'HTML', content: htmlBody },
      toRecipients: [{ emailAddress: { address: recipientEmail } }],
    },
    saveToSentItems: true,
  };

  try {
    await axios.post(GRAPH_SEND_URL, payload, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });
    log.info(`Digest email sent to ${recipientEmail} — subject: "${subject}"`);
    return true;
  } catch (err) {
    const status = err.response?.status;
    if (status === 401) {
      log.error('Email delivery failed — 401 Unauthorized. Run node auth_email.js to refresh your token.');
    } else {
      log.error(`Email delivery failed — HTTP ${status}: ${JSON.stringify(err.response?.data || err.message)}`);
    }
    return false;
  }
}

module.exports = { sendDigest, buildHtml };
