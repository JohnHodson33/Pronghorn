require('dotenv').config();
const p = require('puppeteer-extra');
const S = require('puppeteer-extra-plugin-stealth');
const cheerio = require('cheerio');
p.use(S());
(async () => {
  const b = await p.launch({ executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', headless: true, args: ['--no-sandbox'] });
  try {
    const pg = await b.newPage();
    await pg.goto('https://bizmls.com/bbf/businesses', { waitUntil: 'networkidle2', timeout: 45000 });
    await new Promise((r) => setTimeout(r, 1500));
    const html = await pg.evaluate(async () => (await fetch('/cgi-bin/a-bus2.asp?folder=bbfnew&org=bbf&state=Florida&displayall=all')).text());
    const $ = cheerio.load(html);
    // Print full cell text of listing rows (those with LIST_NUMBER)
    let n = 0;
    $('tr').each((_, el) => {
      const has = $(el).find('a[onclick*="LIST_NUMBER"]').length > 0;
      if (has && n < 4) {
        n++;
        const cells = $(el).find('td').map((_, td) => $(td).text().replace(/\s+/g, ' ').trim()).get();
        console.log(`\nLISTING ${n} (${cells.length} cells):`);
        cells.forEach((c, i) => console.log(`  [${i}] ${c.slice(0, 50)}`));
      }
    });
  } finally { await b.close(); }
})();
