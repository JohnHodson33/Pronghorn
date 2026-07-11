require('dotenv').config();
const p = require('puppeteer-extra');
const S = require('puppeteer-extra-plugin-stealth');
p.use(S());
(async () => {
  const b = await p.launch({ executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', headless: true, args: ['--no-sandbox'] });
  try {
    const pg = await b.newPage();
    await pg.goto('https://bizmls.com/bbf/businesses', { waitUntil: 'networkidle2', timeout: 45000 });
    await new Promise((r) => setTimeout(r, 1500));
    for (const qs of ['displayall=all&rpp=2000', 'displayall=all&PageIndex=2', 'displayall=all&rpp=9999', 'displayall=all&start=101']) {
      const out = await pg.evaluate(async (q) => {
        const r = await fetch(`/cgi-bin/a-bus2.asp?folder=bbfnew&org=bbf&state=Florida&${q}`);
        const t = await r.text();
        const listings = (t.match(/LIST_NUMBER=/g) || []).length;
        // grab distinct categories mentioned
        return `listings=${listings} len=${t.length}`;
      }, qs);
      console.log(`?${qs} -> ${out}`);
    }
  } finally { await b.close(); }
})();
