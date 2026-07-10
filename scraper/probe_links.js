// Dump all hrefs matching a pattern from a page. Usage: node probe_links.js <url> <regex>
require('dotenv').config();
const puppeteerExtra = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const cheerio = require('cheerio');
puppeteerExtra.use(StealthPlugin());

(async () => {
  const [url, pattern] = process.argv.slice(2);
  const re = new RegExp(pattern || 'for-sale', 'i');
  const browser = await puppeteerExtra.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
    args: ['--no-sandbox'],
  });
  try {
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 45000 });
    const $ = cheerio.load(await page.content());
    const hrefs = new Set();
    $('a[href]').each((_, el) => {
      const h = $(el).attr('href');
      if (h && re.test(h)) hrefs.add(h.split('?')[0]);
    });
    console.log([...hrefs].slice(0, 40).join('\n'));
  } finally {
    await browser.close();
  }
})();
