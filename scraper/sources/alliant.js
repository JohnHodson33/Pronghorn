// Alliant Brokers / Nashville Business Brokers (alliantbrokers.com) — TN
// (priority state) LMM broker. WordPress (wp-views/types custom "listing" post
// type): /businesses-for-sale-4/ links /listing/<slug>/ detail pages. Each
// detail page's <h1> is the business name (sometimes with a "– UNDER CONTRACT"/
// "– SOLD" status suffix) and the body carries "Asking Price:<n>",
// "Cash Flow:<n>", "Gross Revenue:<n>" (label glued to value). Location isn't a
// structured field — inferred from the name. Plain HTTP + cheerio.

const cheerio = require('cheerio');
const SourceScraper = require('../core/source_base');
const { stateFromText } = require('../core/states');

const BASE = 'https://alliantbrokers.com';
const INDEX = `${BASE}/businesses-for-sale-4/`;
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

class AlliantScraper extends SourceScraper {
  async scrape() {
    let urls;
    try {
      const res = await this.fetchRetry(INDEX, { headers: { 'User-Agent': UA } });
      if (!res.ok) throw new Error(`index HTTP ${res.status}`);
      const $ = cheerio.load(await res.text());
      urls = [...new Set(
        $('a[href*="/listing/"]').map((_, a) => $(a).attr('href')).get()
          .filter((h) => /\/listing\/[a-z0-9-]+\/?$/i.test(h))
          .map((h) => (h.startsWith('http') ? h : BASE + h))
      )];
      this.info(`Index: ${urls.length} listings`);
    } catch (err) {
      this.error(`Index failed: ${err.message}`);
      return { listings: [], stats: { pagesOk: 0, pageErrors: 1 } };
    }

    const listings = [];
    let pagesOk = 0;
    let pageErrors = 0;
    for (const url of urls) {
      const slug = url.replace(/\/$/, '').split('/').pop();
      try {
        const res = await this.fetchRetry(url, { headers: { 'User-Agent': UA } });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const l = this.parseDetail(slug, url, await res.text());
        if (l) listings.push(l);
        pagesOk++;
        await this.sleep(700);
      } catch (err) {
        this.error(`Detail ${slug} failed: ${err.message}`);
        if (++pageErrors >= 8) { this.warn('Too many errors, stopping'); break; }
      }
    }

    this.info(`Scrape complete — ${listings.length} listings (${pageErrors} errors)`);
    return { listings, stats: { pagesOk, pageErrors } };
  }

  parseDetail(slug, url, html) {
    const $ = cheerio.load(html);
    let rawName = $('h1').first().text().replace(/\s+/g, ' ').trim();
    // Strip trailing status flags (– UNDER CONTRACT / – SOLD / – PENDING).
    const status = (rawName.match(/[–-]\s*(UNDER CONTRACT|SOLD|PENDING|NEW)\s*$/i) || [])[1] || null;
    if (status && /sold/i.test(status)) return null; // drop sold
    const name = rawName.replace(/\s*[–-]\s*(UNDER CONTRACT|SOLD|PENDING|NEW)\s*$/i, '').trim() || null;

    const body = $('body').text().replace(/\s+/g, ' ');
    const grab = (label) => this.parseMoney((body.match(new RegExp(`${label}:\\s*\\$?([\\d,]+)`, 'i')) || [])[1]);

    return this.listing({
      source_listing_id: slug,
      name,
      url,
      description: null,
      // No structured location field — infer state from the name (e.g.
      // "Alabama Pipe…", "Middle Tennessee Coffee…"); default TN (Nashville broker).
      location: { city: null, state: stateFromText(name) || 'TN', raw: null },
      industry: null,
      asking_price: grab('Asking Price'),
      gross_revenue: grab('Gross Revenue') || grab('Gross Sales') || grab('Revenue'),
      cash_flow: grab('Cash Flow') || grab('SDE'),
      cash_flow_type: /cash flow/i.test(body) ? 'cash flow' : null,
      raw: { status },
    });
  }
}

module.exports = AlliantScraper;
