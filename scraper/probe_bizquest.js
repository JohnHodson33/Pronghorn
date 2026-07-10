// One-page structural probe of BizQuest — what does their search page expose?
// Polite: single page, same stealth stack as production.
require('dotenv').config();
const puppeteerExtra = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const cheerio = require('cheerio');
puppeteerExtra.use(StealthPlugin());

(async () => {
  const browser = await puppeteerExtra.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
    args: ['--no-sandbox'],
  });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    const url = 'https://www.bizquest.com/businesses-for-sale/page-1/';
    console.log('Loading', url);
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 45000 });
    console.log('Title:', await page.title());

    const html = await page.content();
    const $ = cheerio.load(html);

    console.log('\nJSON-LD blocks:');
    $('script[type="application/ld+json"]').each((i, el) => {
      try {
        const j = JSON.parse($(el).html());
        const type = j['@type'] || (Array.isArray(j) ? j.map((x) => x['@type']).join(',') : '?');
        console.log(`  [${i}] @type=${type} keys=${Object.keys(j).slice(0, 8).join(',')}`);
        if (j['@type'] === 'SearchResultsPage' && j.about) {
          console.log(`      about[] length=${j.about.length}`);
          console.log('      sample item:', JSON.stringify(j.about[0]).slice(0, 600));
        }
        if (Array.isArray(j.itemListElement)) {
          console.log(`      itemListElement length=${j.itemListElement.length}`);
          console.log('      sample:', JSON.stringify(j.itemListElement[0]).slice(0, 600));
        }
      } catch { console.log(`  [${i}] unparseable`); }
    });

    // Listing-looking anchors
    const hrefs = new Set();
    $('a[href*="/business-for-sale/"], a[href*="business-opportunity"]').each((_, el) => {
      const h = $(el).attr('href');
      if (h) hrefs.add(h.split('?')[0]);
    });
    console.log('\nListing-like links:', hrefs.size);
    console.log([...hrefs].slice(0, 5).join('\n'));

    // Common card containers
    for (const sel of ['app-listing-showcase', '.listing', '[class*="listing"]', '[class*="result"]']) {
      const n = $(sel).length;
      if (n) console.log(`Selector "${sel}": ${n} matches`);
    }
  } finally {
    await browser.close();
  }
})();
