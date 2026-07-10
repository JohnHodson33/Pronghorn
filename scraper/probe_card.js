// Inspect the card structure around listing links + JSON-LD mainEntity + pagination.
// Usage: node probe_card.js <url>
require('dotenv').config();
const puppeteerExtra = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const cheerio = require('cheerio');
puppeteerExtra.use(StealthPlugin());

(async () => {
  const url = process.argv[2];
  const browser = await puppeteerExtra.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
    args: ['--no-sandbox'],
  });
  try {
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 45000 });
    const $ = cheerio.load(await page.content());

    // JSON-LD mainEntity detail
    $('script[type="application/ld+json"]').each((i, el) => {
      try {
        const j = JSON.parse($(el).html());
        if (j.mainEntity) console.log('mainEntity:', JSON.stringify(j.mainEntity).slice(0, 1500), '\n');
      } catch {}
    });

    // Walk up from the second listing link to a container that includes price text
    const links = $('a[href*="/business-for-sale/"]').toArray();
    if (links.length > 1) {
      let el = $(links[1]);
      for (let i = 0; i < 8; i++) {
        const parent = el.parent();
        if (!parent.length) break;
        el = parent;
        const t = el.text().replace(/\s+/g, ' ').trim();
        if (/\$/.test(t) && t.length < 900) {
          console.log(`--- container <${el.prop('tagName')}> class="${el.attr('class')}" ---`);
          console.log(t.slice(0, 700));
          console.log('\ninner HTML (truncated):');
          console.log(el.html().replace(/\s+/g, ' ').slice(0, 2000));
          break;
        }
      }
    }

    // Pagination
    const pag = new Set();
    $('a[href]').each((_, el) => {
      const h = $(el).attr('href');
      if (h && /page|pg=|-p\d/i.test(h)) pag.add(h);
    });
    console.log('\nPagination-like links:', [...pag].slice(0, 8).join('\n'));
  } finally {
    await browser.close();
  }
})();
