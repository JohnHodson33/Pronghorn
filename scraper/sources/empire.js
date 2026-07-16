// Empire Business Brokers (empirebizbroker.com) adapter — NC-based independent
// broker. SSR PHP site: businesses-for-sale.php lists ~34 detail links
// (businesses-for-sale-detail.php?listing_id=N); each detail page has an <h3>
// business name and .detail-label / .detail-value span pairs (Asking Price,
// Gross Income, Cash Flow, FF&E, Inventory, Real Estate, Year Established) plus
// a description. Plain HTTP + cheerio, no browser.

const cheerio = require('cheerio');
const SourceScraper = require('../core/source_base');
const { stateFromText, regionState } = require('../core/states');

const BASE = 'https://www.empirebizbroker.com';
const INDEX = `${BASE}/businesses-for-sale.php`;
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

class EmpireScraper extends SourceScraper {
  async scrape() {
    let ids;
    try {
      const res = await fetch(INDEX, { headers: { 'User-Agent': UA } });
      if (!res.ok) throw new Error(`index HTTP ${res.status}`);
      const $ = cheerio.load(await res.text());
      ids = [...new Set(
        $('a[href*="listing_id="]').map((_, a) => ($(a).attr('href').match(/listing_id=(\d+)/) || [])[1]).get().filter(Boolean)
      )];
      this.info(`Index: ${ids.length} listings`);
    } catch (err) {
      this.error(`Index failed: ${err.message}`);
      return { listings: [], stats: { pagesOk: 0, pageErrors: 1 } };
    }

    const listings = [];
    let pagesOk = 0;
    let pageErrors = 0;
    for (const id of ids) {
      const url = `${BASE}/businesses-for-sale-detail.php?listing_id=${id}`;
      try {
        const res = await fetch(url, { headers: { 'User-Agent': UA } });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const l = this.parseDetail(id, url, await res.text());
        if (l) listings.push(l);
        pagesOk++;
        await this.sleep(600);
      } catch (err) {
        this.error(`Detail ${id} failed: ${err.message}`);
        if (++pageErrors >= 8) { this.warn('Too many errors, stopping'); break; }
      }
    }

    this.info(`Scrape complete — ${listings.length} listings (${pageErrors} errors)`);
    return { listings, stats: { pagesOk, pageErrors } };
  }

  parseDetail(id, url, html) {
    const $ = cheerio.load(html);
    const fields = {};
    $('.detail-label').each((_, el) => {
      const label = $(el).text().replace(/\s+/g, ' ').replace(/:$/, '').trim().toLowerCase();
      const val = $(el).next('.detail-value').text().replace(/\s+/g, ' ').trim();
      if (label) fields[label] = val;
    });

    const name = $('.body-businesses-for-sale-detail h3, #body h3').first().text().replace(/\s+/g, ' ').trim() || null;
    if (name && /\bsold\b|-\s*sold/i.test(name)) return null; // skip sold listings
    // Description is the prose block after the field spans.
    const desc = $('.body-businesses-for-sale-detail p, #body p').first().text().replace(/\s+/g, ' ').trim() || null;
    const locRaw = fields['location'] || fields['area'] || fields['county'] || null;

    return this.listing({
      source_listing_id: id,
      name,
      url,
      description: desc ? desc.slice(0, 500) : null,
      location: { city: null, state: stateFromText(locRaw) || stateFromText(desc) || regionState(locRaw) || regionState(desc), raw: locRaw },
      industry: fields['category'] || fields['industry'] || null,
      asking_price: this.parseMoney(fields['asking price']),
      gross_revenue: this.parseMoney(fields['gross income'] || fields['gross revenue'] || fields['gross sales']),
      cash_flow: this.parseMoney(fields['cash flow']),
      cash_flow_type: fields['cash flow'] ? 'cash flow' : null,
      raw: {
        real_estate: this.parseMoney(fields['real estate']),
        ffe: this.parseMoney(fields['ff&e'] || fields['ffe']),
        inventory: this.parseMoney(fields['inventory']),
        year_established: fields['year established'] || null,
      },
    });
  }
}

module.exports = EmpireScraper;
