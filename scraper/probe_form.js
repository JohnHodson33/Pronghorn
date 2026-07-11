// Dump a form's field name=value pairs + submit it, showing result rows.
// node probe_form.js <url>
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
    await new Promise((r) => setTimeout(r, 1500));
    let $ = cheerio.load(await pg.content());
    console.log('--- form fields (name = value) ---');
    $('form input, form select').each((_, el) => {
      const name = $(el).attr('name'); if (!name) return;
      const type = $(el).attr('type') || el.tagName;
      const val = $(el).attr('value') ?? '';
      const checked = $(el).attr('checked') != null ? ' CHECKED' : '';
      console.log(`  ${name} [${type}] = ${String(val).slice(0, 40)}${checked}`);
    });
    // Submit the form (theForm) and see what comes back
    console.log('\n--- submitting theForm ---');
    await pg.evaluate(() => { if (document.theForm) document.theForm.submit(); });
    await new Promise((r) => setTimeout(r, 4000));
    $ = cheerio.load(await pg.content());
    console.log('URL now:', pg.url());
    console.log('tables:', $('table').length, '| tr:', $('tr').length);
    const links = $('a[href]').map((_, el) => $(el).attr('href')).get().filter((h) => /detail|listing|bus.*\d|\?.*id=/i.test(h));
    console.log('detail-ish links:', links.length, links.slice(0, 4).join(' | '));
    console.log('text sample:', $('body').text().replace(/\s+/g, ' ').trim().slice(0, 400));
  } finally { await b.close(); }
})();
