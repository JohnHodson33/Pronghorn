// Probe a listing DETAIL page for financials + login gating. node probe_detail.js <url>
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
    const title = await pg.title();
    const $ = cheerio.load(await pg.content());
    const body = $('body').text().replace(/\s+/g, ' ');
    const find = (re) => { const m = re.exec(body); return m ? m[0] : null; };
    console.log('title:', title.slice(0, 70));
    console.log('asking:', find(/asking\s*price[:\s]*\$?[\d,.]+\s*m?/i) || 'none');
    console.log('cash flow:', find(/cash\s*flow[:\s]*\$?[\d,.]+\s*m?/i) || 'NONE');
    console.log('EBITDA:', find(/ebitda[:\s]*\$?[\d,.]+\s*m?/i) || 'none');
    console.log('revenue:', find(/(gross\s*revenue|revenue|gross\s*sales)[:\s]*\$?[\d,.]+\s*m?/i) || 'none');
    console.log('login/register gate:', /register to view|sign in to view|log in to view|members only/i.test(body));
    // labeled financial rows
    const labels = [];
    $('[class*="detail"],[class*="financ"],dt,th,strong,.label').each((_, el) => {
      const t = $(el).text().trim();
      if (/cash flow|revenue|ebitda|asking|gross|earnings|sde/i.test(t) && t.length < 40) labels.push(t);
    });
    console.log('financial labels found:', [...new Set(labels)].slice(0, 10).join(' | ') || 'none');
  } finally {
    await b.close();
  }
})();
