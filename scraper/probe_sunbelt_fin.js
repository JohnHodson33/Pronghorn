// Precisely dump Sunbelt detail financial items. node probe_sunbelt_fin.js <url>
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
    console.log('=== .resultsBusiness__detailsFinancial--item (outerHTML each) ===');
    $('.resultsBusiness__detailsFinancial--item').each((i, el) => {
      console.log(`[${i}] ${$.html(el).replace(/\s+/g, ' ').trim().slice(0, 300)}`);
    });
    console.log('\n=== the itemSpan labels + their siblings ===');
    $('.resultsBusiness__detailsFinancial--itemSpan').each((i, el) => {
      const parent = $(el).parent();
      console.log(`[${i}] label="${$(el).text().trim()}" | parentHTML=${parent.html().replace(/\s+/g, ' ').trim().slice(0, 200)}`);
    });
  } finally {
    await b.close();
  }
})();
