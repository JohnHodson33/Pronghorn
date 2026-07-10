// Check a page for iframes / JS search apps / API calls. Usage: node probe_embed.js <url>
require('dotenv').config();
const puppeteerExtra = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
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
    const apiCalls = new Set();
    page.on('request', (req) => {
      const u = req.url();
      if (/api|search|listing|json/i.test(u) && !/\.(js|css|png|jpg|webp|woff|svg|gif)/i.test(u)) apiCalls.add(u.slice(0, 140));
    });
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
    await new Promise((r) => setTimeout(r, 5000));

    const iframes = await page.evaluate(() =>
      [...document.querySelectorAll('iframe')].map((f) => f.src).filter(Boolean)
    );
    console.log('iframes:', JSON.stringify(iframes, null, 2));
    console.log('\nAPI-ish network calls:');
    console.log([...apiCalls].slice(0, 20).join('\n'));

    const linkCount = await page.evaluate(() => document.querySelectorAll('a[href*="listing"]').length);
    console.log('\nlisting links after JS settle:', linkCount);
  } finally {
    await browser.close();
  }
})();
