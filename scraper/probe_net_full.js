// Capture ALL network responses (incl. same-origin) with sizes, to find the
// data call behind a JS app. node probe_net_full.js <url> [scrollN]
require('dotenv').config();
const p = require('puppeteer-extra');
const S = require('puppeteer-extra-plugin-stealth');
p.use(S());

(async () => {
  const url = process.argv[2];
  const b = await p.launch({ executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', headless: true, args: ['--no-sandbox'] });
  try {
    const pg = await b.newPage();
    const hits = [];
    pg.on('response', async (res) => {
      try {
        const req = res.request();
        const type = req.resourceType();
        if (!['xhr', 'fetch', 'document'].includes(type)) return;
        const ct = res.headers()['content-type'] || '';
        if (!/json|html/.test(ct)) return;
        const len = res.headers()['content-length'] || '?';
        const u = res.url();
        if (/googletag|analytics|cookieyes|mixpanel|hotjar|vibe|mgln|gorilladash.*header/i.test(u)) return;
        hits.push(`${req.method()} ${res.status()} ${type} ${String(len).padStart(7)} ${ct.split(';')[0]}  ${u.slice(0, 110)}`);
      } catch { /* ignore */ }
    });
    await pg.goto(url, { waitUntil: 'networkidle2', timeout: 45000 });
    await new Promise((r) => setTimeout(r, 4000));
    // scroll to trigger lazy loads
    for (let i = 0; i < (Number(process.argv[3]) || 0); i++) {
      await pg.evaluate(() => window.scrollBy(0, document.body.scrollHeight));
      await new Promise((r) => setTimeout(r, 1500));
    }
    console.log(hits.join('\n'));
  } finally {
    await b.close();
  }
})();
