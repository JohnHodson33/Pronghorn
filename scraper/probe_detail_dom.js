// Dump the DOM around financial labels on a detail page. node probe_detail_dom.js <url>
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
    const $ = cheerio.load(await pg.content());
    $('*').each((_, el) => {
      const own = $(el).clone().children().remove().end().text().trim();
      if (/^(asking price|cash flow|gross revenue|adjusted ebitda|ebitda|revenue|location|category|industry)$/i.test(own)) {
        const parent = $(el).parent();
        console.log(`LABEL "${own}" <${el.tagName}.${$(el).attr('class') || ''}>`);
        console.log(`   parent text: ${parent.text().replace(/\s+/g, ' ').trim().slice(0, 120)}`);
      }
    });
  } finally {
    await b.close();
  }
})();
