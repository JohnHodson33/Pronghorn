// Batch structural probe: assess many candidate sources in one pass.
// For each URL: title, JSON-LD types, listing-link count, financial text,
// embedded iframes (external listing platforms), JS-app hints.
// Usage: node probe_batch.js   (edit TARGETS below)
require('dotenv').config();
const puppeteerExtra = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const cheerio = require('cheerio');
puppeteerExtra.use(StealthPlugin());

const TARGETS = [
  ['sunbelt', 'https://www.sunbeltnetwork.com/business-search/'],
  ['transworld', 'https://www.tworld.com/buy-a-business/business-listings/'],
  ['dealstream', 'https://www.dealstream.com/businesses-for-sale'],
  ['businessesforsale', 'https://us.businessesforsale.com/us'],
  ['murphy', 'https://murphybusiness.com/buy-a-business/'],
  ['vr_brokers', 'https://www.vrbusinessbrokers.com/business-listings/'],
  ['viking', 'https://vikingmergers.com/listings/'],
  ['synergy', 'https://www.synergybb.com/businesses-for-sale/'],
  ['gabb_georgia', 'https://gabb.org/business-listings/'],
  ['cvbba_carolinas', 'https://cvbba.com/listings/'],
  ['azbba_arizona', 'https://azbba.org/listings/'],
  ['tabb_texas', 'https://www.tabb.org/buy-a-business'],
];

(async () => {
  const browser = await puppeteerExtra.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
    args: ['--no-sandbox'],
  });
  try {
    for (const [name, url] of TARGETS) {
      const page = await browser.newPage();
      try {
        await page.setViewport({ width: 1280, height: 800 });
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 40000 });
        await new Promise((r) => setTimeout(r, 2500));
        const title = await page.title();
        const html = await page.content();
        const $ = cheerio.load(html);

        const ldTypes = [];
        $('script[type="application/ld+json"]').each((_, el) => {
          try {
            const j = JSON.parse($(el).html());
            ldTypes.push(j['@type'] || (j['@graph'] ? 'graph' : '?'));
            if (j.about?.length) ldTypes.push(`about[${j.about.length}]`);
            if (j.mainEntity?.itemListElement?.length) ldTypes.push(`itemList[${j.mainEntity.itemListElement.length}]`);
          } catch { ldTypes.push('unparseable'); }
        });

        const links = new Set();
        $('a[href]').each((_, el) => {
          const h = $(el).attr('href') || '';
          if (/(listing|business.{0,12}for.{0,3}sale|opportunit)/i.test(h) && /\d{3,}|detail/i.test(h)) links.add(h.split('?')[0]);
        });

        const iframes = [];
        $('iframe[src]').each((_, el) => iframes.push($(el).attr('src')));

        const text = $('body').text();
        const fin = ['cash flow', 'asking price', 'ebitda', 'revenue'].filter((k) => new RegExp(k, 'i').test(text));

        console.log(`\n=== ${name} — ${url}`);
        console.log(`  title: ${title.slice(0, 80)}`);
        console.log(`  json-ld: ${ldTypes.join(', ') || 'none'}`);
        console.log(`  listing links: ${links.size}${links.size ? ' | e.g. ' + [...links][0].slice(0, 90) : ''}`);
        if (iframes.length) console.log(`  iframes: ${iframes.slice(0, 2).join(' | ').slice(0, 140)}`);
        console.log(`  financial text: ${fin.join(', ') || 'none'}`);
      } catch (err) {
        console.log(`\n=== ${name} — ${url}\n  ERROR: ${err.message.slice(0, 100)}`);
      } finally {
        await page.close();
      }
    }
  } finally {
    await browser.close();
  }
})();
