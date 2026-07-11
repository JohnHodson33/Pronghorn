// Dump the most common href path patterns on a page, to reverse listing URLs.
// node probe_hrefs.js <url>
require('dotenv').config();
const p = require('puppeteer-extra');
const S = require('puppeteer-extra-plugin-stealth');
const cheerio = require('cheerio');
p.use(S());

(async () => {
  const url = process.argv[2];
  const b = await p.launch({ executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', headless: true, args: ['--no-sandbox'] });
  try {
    const pg = await b.newPage();
    await pg.goto(url, { waitUntil: 'networkidle2', timeout: 45000 });
    await new Promise((r) => setTimeout(r, 3000));
    const $ = cheerio.load(await pg.content());
    const patterns = {};
    $('a[href]').each((_, el) => {
      let h = ($(el).attr('href') || '').split('?')[0];
      if (!h || h.startsWith('#') || /^(mailto|tel|javascript)/.test(h)) return;
      // normalize digits to # to group patterns
      const key = h.replace(/https?:\/\/[^/]+/, '').replace(/\d+/g, '#');
      patterns[key] = (patterns[key] || 0) + 1;
    });
    const sorted = Object.entries(patterns).sort((a, b) => b[1] - a[1]).slice(0, 25);
    for (const [k, n] of sorted) console.log(`${n}\t${k}`);
  } finally {
    await b.close();
  }
})();
