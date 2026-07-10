// Sunbelt Business Brokers adapter. Largest franchise network. Two-level crawl:
// list cards carry only asking price, but DETAIL pages expose the full block —
// Asking Price / Cash Flow / Gross Revenue / Adjusted EBITDA — and are NOT
// login-gated (probed 2026-07-10). Adjusted EBITDA is high-value for the
// multiples engine, so the detail fetch is worth the extra requests.
//
// Detail financial DOM: .resultsBusiness__detailsFinancial--item, each with a
// label span .resultsBusiness__detailsFinancial--itemSpan; parent text is
// "$14,500,000 Asking Price". Detail-page id is the trailing -NNNNN/ in the URL.

const cheerio = require('cheerio');
const SourceScraper = require('../core/source_base');
const { stateFromText } = require('../core/states');

const DELAY_MS = 1800;
const BASE = 'https://www.sunbeltnetwork.com/business-search/business-results';

// Thesis-relevant category slugs (site's own category ids).
const DEFAULT_CATEGORIES = [
  'i-service-businesses-for-sale-16',
  'i-building-construction-for-sale-4',
  'i-agriculture-for-sale-1',
  'i-wholesale-distributors-for-sale-19',
  'i-manufacturing-for-sale-10',
];

class SunbeltScraper extends SourceScraper {
  async scrape() {
    const categories = this.config.categories || DEFAULT_CATEGORIES;
    const maxDetails = this.config.max_details ?? 120; // cap detail fetches/run
    const seen = new Set();
    const cards = []; // { id, url, askingCard }
    let pageErrors = 0;

    await this.withBrowser(async (browser) => {
      const page = await browser.newPage();
      await page.setViewport({ width: 1280, height: 800 });

      // --- Level 1: collect detail URLs from category pages ---
      for (const cat of categories) {
        const url = `${BASE}/${cat}/`;
        this.info(`Category: ${cat}`);
        try {
          await page.goto(url, { waitUntil: 'networkidle2', timeout: 45000 });
          const found = this.parseCategory(await page.content());
          let added = 0;
          for (const c of found) if (!seen.has(c.id)) { seen.add(c.id); cards.push(c); added++; }
          this.info(`  ${found.length} listings, ${added} new (${cards.length} total queued)`);
        } catch (err) {
          this.error(`Category ${cat} failed: ${err.message}`);
          pageErrors++;
        }
        await this.sleep(DELAY_MS);
      }

      // --- Level 2: fetch detail pages for full financials ---
      const toFetch = cards.slice(0, maxDetails);
      this.info(`Fetching ${toFetch.length} detail pages (cap ${maxDetails})`);
      var listings = [];
      for (const c of toFetch) {
        try {
          await page.goto(c.url, { waitUntil: 'networkidle2', timeout: 45000 });
          const l = this.parseDetail(await page.content(), c);
          if (l) listings.push(l);
        } catch (err) {
          this.warn(`Detail ${c.id} failed: ${err.message}`);
          pageErrors++;
          // still record card-level asking price so the listing isn't lost
          listings.push(this.listing({
            source_listing_id: c.id, name: c.name, url: c.url,
            asking_price: c.askingCard, location: { city: null, state: null, raw: null }, raw: {},
          }));
        }
        await this.sleep(DELAY_MS);
      }
      this._listings = listings;
    });

    const listings = this._listings || [];
    this.info(`Scrape complete — ${listings.length} listings (${pageErrors} errors)`);
    return { listings, stats: { pagesOk: listings.length, pageErrors } };
  }

  parseCategory(html) {
    const $ = cheerio.load(html);
    const out = [];
    const seen = new Set();
    $('a[href*="/listings/listing-details/"]').each((_, el) => {
      const url = ($(el).attr('href') || '').split('?')[0];
      const m = url.match(/-(\d+)\/?$/);
      if (!m || seen.has(m[1])) return;
      seen.add(m[1]);
      // asking price sometimes rendered near the button; best-effort from card
      let card = $(el);
      let askingCard = null;
      for (let i = 0; i < 6 && card.length; i++) {
        card = card.parent();
        const priceEl = card.find('.latestBusinesses__item--rightPrice').first();
        if (priceEl.length) { askingCard = this.parseSunbeltMoney(priceEl.text()); break; }
      }
      const name = url.match(/listing-details\/([^/]+?)-\d+\/?$/);
      out.push({
        id: m[1],
        url: url.startsWith('http') ? url : `https://www.sunbeltnetwork.com${url}`,
        askingCard,
        name: name ? this.slugToName(name[1]) : null,
      });
    });
    return out;
  }

  parseDetail(html, card) {
    const $ = cheerio.load(html);
    const fin = {};
    $('.resultsBusiness__detailsFinancial--item').each((_, el) => {
      const text = $(el).text().replace(/\s+/g, ' ').trim(); // "$14,500,000 Asking Price"
      const label = $(el).find('.resultsBusiness__detailsFinancial--itemSpan').text().trim().toLowerCase();
      const valPart = text.replace(new RegExp(label, 'i'), '').trim();
      const val = /n\/a/i.test(valPart) ? null : this.parseSunbeltMoney(valPart);
      if (label.includes('asking')) fin.asking = val;
      else if (label.includes('cash flow')) fin.cash = val;
      else if (label.includes('gross revenue')) fin.rev = val;
      else if (label.includes('adjusted ebitda')) fin.ebitda = val;
    });

    const title = ($('h1').first().text() || card.name || '').trim() || null;
    // location: URL prefix "/boca-raton-fl/..." or page text
    const urlLoc = card.url.match(/sunbeltnetwork\.com\/([a-z-]+)-([a-z]{2})\/buy-a-business/i);
    const bodyText = $('body').text().replace(/\s+/g, ' ');

    // Prefer explicit EBITDA basis when present, else cash flow.
    const cash = fin.ebitda ?? fin.cash;
    const cfType = fin.ebitda ? 'EBITDA' : fin.cash ? 'cash flow' : null;

    return this.listing({
      source_listing_id: card.id,
      name: title,
      url: card.url,
      description: bodyText.slice(bodyText.search(/business description|description/i), 500) || null,
      location: {
        city: urlLoc ? this.slugToName(urlLoc[1]) : null,
        state: urlLoc ? urlLoc[2].toUpperCase() : stateFromText(bodyText.slice(0, 4000)),
        raw: urlLoc ? `${this.slugToName(urlLoc[1])}, ${urlLoc[2].toUpperCase()}` : null,
      },
      asking_price: fin.asking ?? card.askingCard,
      gross_revenue: fin.rev,
      cash_flow: cash,
      cash_flow_type: cfType,
      raw: { adjusted_ebitda: fin.ebitda, reported_cash_flow: fin.cash },
    });
  }

  // Sunbelt writes "$14.500m" or "$14,500,000" or "$300k"
  parseSunbeltMoney(text) {
    if (!text) return null;
    const s = String(text).toLowerCase().replace(/[^0-9.mk]/g, '');
    if (!s) return null;
    if (s.endsWith('m')) return Math.round(parseFloat(s) * 1_000_000);
    if (s.endsWith('k')) return Math.round(parseFloat(s) * 1_000);
    return this.parseMoney(text);
  }

  slugToName(slug) {
    return slug.split('-').filter(Boolean).map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  }
}

module.exports = SunbeltScraper;
