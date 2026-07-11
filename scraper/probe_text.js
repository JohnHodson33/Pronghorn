// Dump visible text + forms of a page. node probe_text.js <url>
require('dotenv').config();
const p = require('puppeteer-extra');
const S = require('puppeteer-extra-plugin-stealth');
const cheerio = require('cheerio');
p.use(S());
(async () => {
  const b = await p.launch({ executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', headless: true, args: ['--no-sandbox'] });
  try {
    const pg = await b.newPage();
    await pg.goto(process.argv[2], { waitUntil: 'networkidle2', timeout: 45000 });
    await new Promise((r) => setTimeout(r, 2000));
    const $ = cheerio.load(await pg.content());
    console.log('URL now:', pg.url());
    console.log('--- forms ---');
    $('form').each((i, el) => {
      const action = $(el).attr('action'); const method = $(el).attr('method');
      const inputs = $(el).find('input,select').map((_, x) => `${$(x).attr('name')||'?'}[${$(x).attr('type')||x.tagName}]`).get().slice(0, 20);
      console.log(`form[${i}] ${method||'GET'} ${action} :: ${inputs.join(' ')}`);
    });
    console.log('--- frames ---');
    $('frame,iframe').each((_, el) => console.log('frame src:', $(el).attr('src')));
    console.log('--- text sample ---');
    console.log($('body').text().replace(/\s+/g, ' ').trim().slice(0, 600));
    console.log('--- tables/rows ---');
    console.log('tables:', $('table').length, '| tr:', $('tr').length, '| links w/ digits:', $('a[href*="detail"],a[href*="listing"],a[href*=".asp"]').length);
  } finally { await b.close(); }
})();
