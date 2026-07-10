// One-time (or re-auth) script for Microsoft Graph email authorization
// Run with: node auth_email.js
// This will print a URL and code — open the URL in your browser, enter the code,
// sign in with your Microsoft 365 account, and the token will be saved to .env automatically.

require('dotenv').config();
const { sendDigest } = require('./delivery/outlook');
const log = require('./utils/logger');

async function main() {
  if (!process.env.GRAPH_CLIENT_ID) {
    console.error('\nERROR: GRAPH_CLIENT_ID is not set in your .env file.');
    console.error('Add the line: GRAPH_CLIENT_ID=your-azure-app-client-id');
    console.error('See Session 3 setup instructions for how to get this.\n');
    process.exit(1);
  }

  // Temporarily clear any existing refresh token so device code flow is forced
  const hadToken = !!process.env.GRAPH_REFRESH_TOKEN;
  if (hadToken) {
    console.log('Existing token found — forcing re-authorization...\n');
    process.env.GRAPH_REFRESH_TOKEN = '';
  }

  // Sending a minimal test digest triggers the auth flow and confirms email delivery works
  console.log('Starting Microsoft Graph authorization...\n');
  const testListings = [{
    tier: 1,
    name: 'TEST — Authorization Successful',
    location: { city: 'Test Location', state: null, raw: 'Test Location' },
    asking_price: 500000,
    cash_flow: 150000,
    cash_flow_type: 'SDE',
    implied_multiple: 3.3,
    multiple_flag: false,
    reasoning: 'This is a test email confirming the Pronghorn Deal Sourcing Pipeline is authorized to send email via Microsoft Graph API.',
    url: null,
  }];

  await sendDigest(testListings, { total: 1, tier1: 1, tier2: 0, tier3: 0, tier4: 0 });
  console.log('\nAuthorization complete. Check your inbox for the test email.');
}

main().catch((err) => {
  console.error('\nAuth failed:', err.message);
  process.exit(1);
});
