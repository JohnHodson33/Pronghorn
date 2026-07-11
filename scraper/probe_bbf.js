// Try to trigger "show all" on the BBF bizmls form. node probe_bbf.js
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

    // Set displayall + a broad category radio, then submit
    const result = await pg.evaluate(async () => {
      const f = document.theForm;
      if (!f) return 'no form';
      try { f.displayall.value = 'all'; } catch {}
      try { f.list.value = 'all'; } catch {}
      // pick "combined" category radio if present
      const radios = document.querySelectorAll('input[name="disp_cat"]');
      radios.forEach((r) => { if (r.value === 'comb') r.checked = true; });
      f.submit();
      return 'submitted';
    });
    await new Promise((r) => setTimeout(r, 5000));
    let $ = cheerio.load(await pg.content());
    console.log('after displayall submit — url:', pg.url());
    console.log('tr:', $('tr').length, '| tables:', $('table').length);

    // If still no rows, try direct query variants (session is set now)
    for (const qs of ['displayall=all', 'process=display&displayall=all', 'list=all&process=search', 'displayall=1&process=search']) {
      const out = await pg.evaluate(async (q) => {
        const r = await fetch(`/cgi-bin/a-bus2.asp?folder=bbfnew&org=bbf&state=Florida&${q}`, { method: 'GET' });
        const t = await r.text();
        const trCount = (t.match(/<tr/gi) || []).length;
        const listingIsh = (t.match(/listing\s*(no|number|#)/i) || []).length + (t.match(/\$[\d,]{4,}/g) || []).length;
        return `${r.status} trs=${trCount} moneyish=${listingIsh} len=${t.length}`;
      }, qs);
      console.log(`  ?${qs} -> ${out}`);
    }
  } finally { await b.close(); }
})();
