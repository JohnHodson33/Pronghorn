// Calder Capital / Calder M&A (caldergr.com) adapter — Michigan-based lower-
// middle-market firm. The /businesses-for-sale/ page server-renders all active
// listings as `.snippet-overlay` cards:
//   .listing-status → "For Sale" / "Sold"
//   p.location → state
//   h3 > a → title + /business_listing/<slug>/ link
//   .fin-detail spans → "Revenue: $X", "Cash Flow: $Y", "Real Estate Value: $Z"
// Single page (WP search-filter renders all). Plain HTTP + cheerio.

const cheerio = require('cheerio');
const SourceScraper = require('../core/source_base');
const { stateFromText } = require('../core/states');

const INDEX_URL = 'https://www.caldergr.com/businesses-for-sale/';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

class CalderScraper extends SourceScraper {
  async scrape() {
    let html;
    try {
      const res = await this.fetchRetry(INDEX_URL, { headers: { 'User-Agent': UA } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      html = await res.text();
    } catch (err) {
      this.error(`Fetch failed after retries: ${err.message}`);
      return { listings: [], stats: { pagesOk: 0, pageErrors: 1 } };
    }

    const $ = cheerio.load(html);
    const listings = [];
    const seen = new Set();

    $('.snippet-overlay').each((_, el) => {
      const card = $(el);
      const link = card.find('h3 a[href*="/business_listing/"]').first();
      const href = link.attr('href') || '';
      const slugM = href.match(/\/business_listing\/([^/?#]+)/);
      if (!slugM || seen.has(slugM[1])) return;
      const slug = slugM[1];
      seen.add(slug);

      const status = card.find('.listing-status').text().replace(/\s+/g, ' ').trim();
      if (/sold/i.test(status)) return; // keep active inventory

      const name = link.text().replace(/\s+/g, ' ').trim() || null;
      const locRaw = card.find('p.location').text().replace(/\s+/g, ' ').trim() || null;
      const finText = card.find('.fin-detail').map((_, s) => $(s).text()).get().join(' ');
      const revenue = this.parseMoney((finText.match(/Revenue:\s*\$?([\d,]+)/i) || [])[1]);
      const cashFlow = this.parseMoney((finText.match(/Cash Flow:\s*\$?([\d,]+)/i) || [])[1]);
      const realEstate = this.parseMoney((finText.match(/Real Estate Value:\s*\$?([\d,]+)/i) || [])[1]);

      listings.push(this.listing({
        source_listing_id: slug,
        name,
        url: href,
        description: null,
        location: { city: null, state: stateFromText(locRaw), raw: locRaw },
        industry: null, // title names the trade; no explicit category field
        asking_price: null, // Calder lists revenue/cash flow, not an asking price
        gross_revenue: revenue,
        cash_flow: cashFlow,
        cash_flow_type: cashFlow ? 'SDE' : null,
        raw: { real_estate_value: realEstate, status: status || null },
      }));
    });

    this.info(`Scrape complete — ${listings.length} listings`);
    return { listings, stats: { pagesOk: listings.length ? 1 : 0, pageErrors: 0 } };
  }
}

module.exports = CalderScraper;
