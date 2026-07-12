// The Firm Business Brokerage (thefirmadv.com) adapter — large Omaha/Midwest
// firm, strong lower-middle-market service-business inventory. The /opportunities/
// page (Umbraco CMS) server-renders every active listing as a card:
//   .listing-title  → name + /Listing/<slug> link
//   .listing-subtitle → full description (location is named in the prose)
//   p.price → "PRICE $X  CASH FLOW $Y"
// All listings are on one page (no pagination). Plain HTTP + cheerio.

const cheerio = require('cheerio');
const SourceScraper = require('../core/source_base');
const { stateFromText } = require('../core/states');

const INDEX_URL = 'https://www.thefirmadv.com/opportunities/';
const ORIGIN = 'https://www.thefirmadv.com';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

class TheFirmScraper extends SourceScraper {
  async scrape() {
    let html;
    try {
      const res = await this.fetchRetry(INDEX_URL, { headers: { 'User-Agent': UA } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      html = await res.text();
    } catch (err) {
      this.error(`Fetch failed: ${err.message}`);
      return { listings: [], stats: { pagesOk: 0, pageErrors: 1 } };
    }

    const $ = cheerio.load(html);
    const listings = [];
    const seen = new Set();

    $('.listing-title').each((_, el) => {
      const title = $(el);
      const card = title.closest('li');
      const href = title.find('a[href*="/Listing/"]').attr('href')
        || card.find('a[href*="/Listing/"]').attr('href') || '';
      const slugM = href.match(/\/Listing\/([^/?#]+)/i);
      if (!slugM || seen.has(slugM[1])) return;
      const slug = slugM[1];
      seen.add(slug);

      const name = title.text().replace(/\s+/g, ' ').trim() || null;
      const desc = card.find('.listing-subtitle').text().replace(/\s+/g, ' ').trim() || null;
      const priceText = card.find('.price').first().text().replace(/\s+/g, ' ');
      const asking = this.parseMoney((priceText.match(/PRICE\s*\$?([\d,]+)/i) || [])[1]);
      const cashFlow = this.parseMoney((priceText.match(/CASH FLOW\s*\$?([\d,]+)/i) || [])[1]);

      listings.push(this.listing({
        source_listing_id: slug,
        name,
        url: href.startsWith('http') ? href : ORIGIN + href,
        description: desc ? desc.slice(0, 500) : null,
        location: { city: null, state: stateFromText(desc), raw: null },
        industry: null, // no explicit category; title/description name the trade
        asking_price: asking,
        gross_revenue: null,
        cash_flow: cashFlow,
        cash_flow_type: 'SDE',
        raw: {},
      }));
    });

    this.info(`Scrape complete — ${listings.length} listings`);
    return { listings, stats: { pagesOk: listings.length ? 1 : 0, pageErrors: 0 } };
  }
}

module.exports = TheFirmScraper;
