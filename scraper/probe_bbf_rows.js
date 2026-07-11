// Inspect BBF displayall=all result row structure. node probe_bbf_rows.js
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
    const html = await pg.evaluate(async () => {
      const r = await fetch('/cgi-bin/a-bus2.asp?folder=bbfnew&org=bbf&state=Florida&displayall=all');
      return await r.text();
    });
    const $ = cheerio.load(html);
    // find rows that look like listings (contain $ and a detail link)
    let shown = 0;
    $('tr').each((_, el) => {
      const t = $(el).text().replace(/\s+/g, ' ').trim();
      if (/\$[\d,]{3,}/.test(t) && shown < 4) {
        shown++;
        console.log(`\nROW ${shown}: ${t.slice(0, 200)}`);
        const links = $(el).find('a[href]').map((_, a) => $(a).attr('href')).get();
        console.log('  links:', links.slice(0, 3).join(' | '));
        console.log('  cells:', $(el).find('td').map((_, td) => $(td).text().replace(/\s+/g, ' ').trim().slice(0, 30)).get().filter(Boolean).join(' || '));
      }
    });
    // detail link pattern
    const detail = new Set();
    $('a[href]').each((_, el) => { const h = $(el).attr('href') || ''; if (/detail|showlist|bus.*\d|listno|id=/i.test(h)) detail.add(h.split('&').slice(0,2).join('&')); });
    console.log('\ndetail link patterns:', [...detail].slice(0, 5).join('\n'));
  } finally { await b.close(); }
})();
