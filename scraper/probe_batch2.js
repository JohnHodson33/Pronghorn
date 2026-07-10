// Two-hop discovery: load a seed page, find nav links that look like listing
// browses, visit the best one, report listing-link density + financial text.
require('dotenv').config();
const puppeteerExtra = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const cheerio = require('cheerio');
puppeteerExtra.use(StealthPlugin());

const TARGETS = [
  ['sunbelt', 'https://www.sunbeltnetwork.com/business-search/'],
  ['transworld', 'https://www.tworld.com/'],
  ['murphy', 'https://murphybusiness.com/'],
  ['vr_brokers', 'https://www.vrbusinessbrokers.com/'],
  ['viking', 'https://vikingmergers.com/'],
  ['businessesforsale', 'https://us.businessesforsale.com/us'],
  ['gabb_georgia', 'https://gabb.org/'],
  ['cvbba_carolinas', 'https://cvbba.com/'],
  ['azbba_arizona', 'https://azbba.org/'],
  ['tabb_texas', 'https://www.tabb.org/'],
];

const NAV_RE = /(listing|business.{0,15}(for.{0,3})?sale|buy.{0,5}(a.{0,3})?business|search|opportunit)/i;
const LISTING_RE = /(listing|business.{0,12}for.{0,3}sale|opportunit)/i;

async function analyze(page, url) {
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 40000 });
  await new Promise((r) => setTimeout(r, 2000));
  const title = await page.title();
  const html = await page.content();
  const $ = cheerio.load(html);
  const listingLinks = new Set();
  $('a[href]').each((_, el) => {
    const h = $(el).attr('href') || '';
    if (LISTING_RE.test(h) && (/\d{3,}/.test(h) || /\/listings?\/[a-z0-9-]{8,}/i.test(h))) listingLinks.add(h.split('?')[0]);
  });
  const iframes = [];
  $('iframe[src]').each((_, el) => { const s = $(el).attr('src'); if (s && !/recaptcha|addtoany|youtube|vimeo|about:blank/i.test(s)) iframes.push(s); });
  const text = $('body').text();
  const fin = ['cash flow', 'asking price', 'ebitda'].filter((k) => new RegExp(k, 'i').test(text));
  const navCandidates = new Set();
  $('a[href]').each((_, el) => {
    const h = $(el).attr('href') || '';
    const t = $(el).text().trim();
    if (NAV_RE.test(h + ' ' + t) && !/facebook|linkedin|twitter|mailto|tel:|\.pdf/i.test(h)) {
      const abs = h.startsWith('http') ? h : new URL(h, url).href;
      if (new URL(abs).hostname.replace('www.', '') !== new URL(url).hostname.replace('www.', '') ) {
        navCandidates.add('EXTERNAL:' + abs.split('?')[0]);
      } else navCandidates.add(abs.split('?')[0]);
    }
  });
  return { title, listingLinks, iframes, fin, navCandidates };
}

(async () => {
  const browser = await puppeteerExtra.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
    args: ['--no-sandbox'],
  });
  try {
    for (const [name, seed] of TARGETS) {
      const page = await browser.newPage();
      try {
        await page.setViewport({ width: 1280, height: 800 });
        const a = await analyze(page, seed);
        console.log(`\n=== ${name}`);
        console.log(`  seed: ${seed} → "${a.title.slice(0, 60)}" | listings: ${a.listingLinks.size} | fin: ${a.fin.join(',') || '-'}`);
        if (a.iframes.length) console.log(`  iframes: ${a.iframes.slice(0, 2).join(' | ').slice(0, 130)}`);

        // pick up to 2 nav candidates that aren't the seed and look browsy
        const cands = [...a.navCandidates]
          .filter((c) => !c.startsWith('EXTERNAL:') && c !== seed && /listing|sale|search|buy/i.test(c))
          .slice(0, 2);
        const externals = [...a.navCandidates].filter((c) => c.startsWith('EXTERNAL:')).slice(0, 3);
        if (externals.length) console.log(`  external portals: ${externals.join(' | ').slice(0, 160)}`);

        for (const c of cands) {
          try {
            const b = await analyze(page, c);
            console.log(`  hop: ${c.slice(0, 80)} → "${b.title.slice(0, 50)}" | listings: ${b.listingLinks.size} | fin: ${b.fin.join(',') || '-'}${b.listingLinks.size ? ' | e.g. ' + [...b.listingLinks][0].slice(0, 80) : ''}`);
            if (b.iframes.length) console.log(`    iframes: ${b.iframes.slice(0, 2).join(' | ').slice(0, 120)}`);
          } catch (e) {
            console.log(`  hop: ${c.slice(0, 80)} → ERROR ${e.message.slice(0, 60)}`);
          }
        }
      } catch (err) {
        console.log(`\n=== ${name}\n  ERROR: ${err.message.slice(0, 100)}`);
      } finally {
        await page.close();
      }
    }
  } finally {
    await browser.close();
  }
})();
