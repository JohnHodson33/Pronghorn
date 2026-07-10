// General structural probe for candidate scrape sources.
// Usage: node probe.js <url>
// Dumps: title, JSON-LD block types (+ SearchResultsPage samples), listing-like
// links, common card selectors, financial-text presence.
require('dotenv').config();
const puppeteerExtra = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const cheerio = require('cheerio');
puppeteerExtra.use(StealthPlugin());

(async () => {
  const url = process.argv[2];
  if (!url) { console.error('Usage: node probe.js <url>'); process.exit(1); }

  const browser = await puppeteerExtra.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
    args: ['--no-sandbox'],
  });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
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
        console.log(`  [${i}] @type=${type} keys=${Object.keys(j).slice(0, 10).join(',')}`);
        if (j.about?.length) console.log(`      about[]=${j.about.length} sample: ${JSON.stringify(j.about[0]).slice(0, 500)}`);
        if (Array.isArray(j.itemListElement) && j.itemListElement.length)
          console.log(`      itemListElement=${j.itemListElement.length} sample: ${JSON.stringify(j.itemListElement[0]).slice(0, 500)}`);
      } catch { console.log(`  [${i}] unparseable`); }
    });

    const hrefs = new Set();
    $('a[href]').each((_, el) => {
      const h = $(el).attr('href');
      if (h && /(business|listing).*(sale|opportunit)|\/listing\//i.test(h) && /\d{3,}/.test(h)) hrefs.add(h.split('?')[0]);
    });
    console.log('\nListing-like links:', hrefs.size);
    console.log([...hrefs].slice(0, 6).join('\n'));

    for (const sel of ['[class*="listing"]', '[class*="result"]', '[class*="card"]', '[itemtype*="Product"]', '[itemtype*="Offer"]']) {
      const n = $(sel).length;
      if (n) console.log(`Selector ${sel}: ${n}`);
    }
    const text = $('body').text();
    console.log('Mentions — cash flow:', /cash\s*flow/i.test(text), '| asking price:', /asking\s*price/i.test(text), '| revenue:', /revenue|gross/i.test(text));
  } finally {
    await browser.close();
  }
})();
