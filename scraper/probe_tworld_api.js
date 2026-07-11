// Capture Transworld's listings API call precisely, then replay it in-browser.
require('dotenv').config();
const p = require('puppeteer-extra');
const S = require('puppeteer-extra-plugin-stealth');
p.use(S());

(async () => {
  const b = await p.launch({ executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', headless: true, args: ['--no-sandbox'] });
  try {
    const pg = await b.newPage();
    const apiCalls = [];
    pg.on('request', (req) => {
      const u = req.url();
      if (/tworld\.com\/api\/.*listing/i.test(u)) {
        apiCalls.push(`${req.method()} ${u}  BODY:${(req.postData() || '').slice(0, 200)}`);
      }
    });
    await pg.goto('https://www.tworld.com/buy-a-business/business-listing-search', { waitUntil: 'networkidle2', timeout: 45000 });
    await new Promise((r) => setTimeout(r, 5000));
    console.log('=== listing API calls seen ===');
    console.log(apiCalls.join('\n') || 'none captured on load');

    // Try replaying likely endpoints IN-BROWSER (inherits cookies/headers)
    console.log('\n=== in-browser fetch tests ===');
    const tests = [
      ['GET', 'https://www.tworld.com/api/listings/countries/4/listings?page=1'],
      ['GET', 'https://www.tworld.com/api/listings?country=4&page=1'],
      ['POST', 'https://www.tworld.com/api/listings/search', JSON.stringify({ country: { value: 4 }, page: 1 })],
      ['POST', 'https://www.tworld.com/api/listings', JSON.stringify({ country: 4, page: 1 })],
    ];
    for (const [method, url, body] of tests) {
      const out = await pg.evaluate(async (m, u, bd) => {
        try {
          const r = await fetch(u, { method: m, headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: bd || undefined });
          const t = await r.text();
          return `${r.status} len=${t.length} :: ${t.slice(0, 160)}`;
        } catch (e) { return 'ERR ' + e.message; }
      }, method, url, body);
      console.log(`${method} ${url}\n  -> ${out}`);
    }
  } finally {
    await b.close();
  }
})();
