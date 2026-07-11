// Probe association/broker sites for backing JSON APIs (like GABB's Webflow feed).
// Loads each listings page, captures XHR/fetch calls that look like data APIs.
require('dotenv').config();
const puppeteerExtra = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteerExtra.use(StealthPlugin());

const TARGETS = [
  ['transworld', 'https://www.tworld.com/buy-a-business/business-listing-search'],
  ['murphy', 'https://murphybusiness.com/business-brokerage/view-our-listings/'],
  ['vr', 'https://www.vrbusinessbrokers.com/businesses-for-sale/'],
  ['bizben', 'https://www.bizben.com/business-for-sale/california'],
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
