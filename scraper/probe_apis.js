// Probe association/broker sites for backing JSON APIs (like GABB's Webflow feed).
// Loads each listings page, captures XHR/fetch calls that look like data APIs.
require('dotenv').config();
const puppeteerExtra = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteerExtra.use(StealthPlugin());

const TARGETS = [
  ['cvbba', 'https://cvbba.com/business-listings/'],
  ['cvbba_alt', 'https://cvbba.com/listings/'],
  ['tabb', 'https://www.tabb.org/businesses-for-sale'],
  ['tabb_alt', 'https://www.tabb.org/listings'],
  ['azbba', 'https://azbba.org/businesses-for-sale/'],
  ['azbba_alt', 'https://azbba.org/business-listings/'],
  ['bbf', 'https://www.bbfmls.com/businesses-for-sale/'],
  ['mbbi', 'https://www.mbbi.org/businesses-for-sale/'],
  ['cabb', 'https://cabb.org/businesses-for-sale/'],
];

(async () => {
  const browser = await puppeteerExtra.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true, args: ['--no-sandbox'],
  });
  try {
    for (const [name, url] of TARGETS) {
      const page = await browser.newPage();
      const apis = new Set();
      page.on('request', (req) => {
        const u = req.url();
        if (/api|webhook|listing|\.json|graphql|search|feed|public/i.test(u)
            && !/\.(js|css|png|jpg|jpeg|webp|woff2?|svg|gif|ico|mp4)/i.test(u)
            && !/google|gstatic|facebook|doubleclick|analytics|hotjar|cloudflare/i.test(u)) {
          apis.add(`${req.method()} ${u.slice(0, 130)}`);
        }
      });
      try {
        const resp = await page.goto(url, { waitUntil: 'networkidle2', timeout: 35000 });
        await new Promise((r) => setTimeout(r, 3500));
        const status = resp ? resp.status() : '?';
        console.log(`\n=== ${name} (${status}) ${url}`);
        if (apis.size) [...apis].slice(0, 6).forEach((a) => console.log('  API: ' + a));
        else console.log('  no API-ish calls');
      } catch (err) {
        console.log(`\n=== ${name} ${url}\n  ERROR: ${err.message.slice(0, 70)}`);
      } finally {
        await page.close();
      }
    }
  } finally {
    await browser.close();
  }
})();
