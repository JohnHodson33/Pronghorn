// HedgeStone Business Advisors (hedgestone.com) adapter. WordPress (SAE listings
// plugin) with server-rendered cards under /businesses-for-sale/page/N/. Each
// `.single-listing` card carries title, "City, State" location, asking price,
// and cashflow, plus a /business-opportunity/<id>/<slug>/ detail link. Plain
// HTTP + cheerio; ~48 cards/page over ~17 pages. General brokerage (service,
// retail, ecommerce) so green-industry listings surface in the mix.

const cheerio = require('cheerio');
const SourceScraper = require('../core/source_base');
const { stateFromText, regionState } = require('../core/states');

const BASE = 'https://www.hedgestone.com/businesses-for-sale/';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

class HedgestoneScraper extends SourceScraper {
  async scrape() {
    const maxPages = this.config.max_pages || 25;
    const listings = [];
    const seen = new Set();
    let pagesOk = 0;
    let pageErrors = 0;

    for (let page = 1; page <= maxPages; page++) {
      const url = page === 1 ? BASE : `${BASE}page/${page}/`;
      try {
        const res = await fetch(url, { headers: { 'User-Agent': UA } });
        if (res.status === 404) break; // ran past the last page
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const cards = this.parse(await res.text(), seen);
        if (cards.length === 0) break;
        listings.push(...cards);
        pagesOk++;
        this.info(`Page ${page}: ${cards.length} listings (total ${listings.length})`);
        await this.sleep(900);
      } catch (err) {
        this.error(`Page ${page} failed: ${err.message}`);
        pageErrors++;
        break;
      }
    }

    this.info(`Scrape complete — ${listings.length} listings (${pageErrors} errors)`);
    return { listings, stats: { pagesOk, pageErrors } };
  }

  parse(html, seen) {
    const $ = cheerio.load(html);
    const out = [];

    $('.single-listing').each((_, el) => {
      const card = $(el);
      const href = card.find('a[href*="/business-opportunity/"]').first().attr('href') || '';
      const idM = href.match(/\/business-opportunity\/(\d+)\b/);
      if (!idM || seen.has(idM[1])) return;
      const id = idM[1];
      seen.add(id);

      const name = card.find('.listing-title').text().replace(/\s+/g, ' ').trim() || null;
      const locRaw = card.find('.listing-location').text().replace(/\s+/g, ' ').trim() || null;
      const asking = this.parseMoney(card.find('.listing-price .value').text());
      const cashFlow = this.parseMoney(card.find('.listing-cashflow .value').text());
      const excerpt = card.find('.listing-excerpt').text().replace(/\s+/g, ' ').trim() || null;

      out.push(this.listing({
        source_listing_id: id,
        name,
        url: href,
        description: excerpt ? excerpt.slice(0, 500) : null,
        location: {
          city: locRaw ? locRaw.split(',')[0].trim() : null,
          state: stateFromText(locRaw) || regionState(locRaw),
          raw: locRaw,
        },
        industry: null, // cards carry no explicit category; title/excerpt name the trade
        asking_price: asking,
        gross_revenue: null,
        cash_flow: cashFlow,
        cash_flow_type: 'SDE',
        raw: {},
      }));
    });

    return out;
  }
}

module.exports = HedgestoneScraper;
