require('dotenv').config();
const p = require('puppeteer-extra');
const S = require('puppeteer-extra-plugin-stealth');
p.use(S());

(async () => {
  const b = await p.launch({ executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', headless: true, args: ['--no-sandbox'] });
  try {
    const pg = await b.newPage();
    await pg.goto('https://www.tworld.com/buy-a-business/business-listing-search', { waitUntil: 'networkidle2', timeout: 45000 });
    await new Promise((r) => setTimeout(r, 3000));
    const out = await pg.evaluate(async () => {
      const xsrf = decodeURIComponent((document.cookie.match(/XSRF-TOKEN=([^;]+)/) || [])[1] || '');
      const body = { page: 1, per_page: null, country: { value: 4, name: 'United States' }, state: null, region: null, categories: null, sub_category: null, sort: { value: '-c_listing_price__c' } };
      const r = await fetch('https://www.tworld.com/api/listings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'X-XSRF-TOKEN': xsrf, 'X-Requested-With': 'XMLHttpRequest' },
        body: JSON.stringify(body),
      });
      const t = await r.text();
      let j = null; try { j = JSON.parse(t); } catch {}
      return {
        status: r.status,
        keys: j ? Object.keys(j) : null,
        meta: j && (j.meta || j.total || j.last_page) ? JSON.stringify({ total: j.total, last_page: j.last_page, per_page: j.per_page, current: j.current_page, meta: j.meta }).slice(0, 200) : null,
        first: j && j.data ? JSON.stringify(j.data[0]).slice(0, 500) : t.slice(0, 300),
      };
    });
    console.log(JSON.stringify(out, null, 2));
  } finally {
    await b.close();
  }
})();
