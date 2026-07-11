// GABB (Georgia Association of Business Brokers) adapter. The site's listing grid
// is fed by a public JSON API (Webflow CMS via a Railway webhook), so we hit that
// directly — structured fields, no HTML parsing, no browser. High value: includes
// broker names AND sold-transaction data (selling-price, cash-flow-at-sale,
// sold-date) — real closed multiples for the market-multiples engine.

const SourceScraper = require('../core/source_base');

const API = 'https://web-production-d3881.up.railway.app/webhook/public-listings';

class GabbScraper extends SourceScraper {
  async scrape() {
    this.info(`Fetching ${API}`);
    let payload;
    try {
      const res = await fetch(API, { headers: { Accept: 'application/json' } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      payload = await res.json();
    } catch (err) {
      this.error(`API fetch failed: ${err.message}`);
      return { listings: [], stats: { pagesOk: 0, pageErrors: 1 } };
    }

    const items = payload.listings || [];
    const listings = [];
    for (const it of items) {
      const f = it.fieldData || {};
      if (f['publish-listing'] === false) continue;
      const id = String(f['listing-id'] || f['listing-number'] || it.id || '');
      if (!id) continue;

      const cash = this.parseMoney(f['cash-flow']);
      const ebitda = this.parseMoney(f['ebitda']);
      const sold = !!f['sold-date'];

      listings.push(this.listing({
        source_listing_id: id,
        name: (f['name'] || f['summary-description'] || '').trim() || null,
        url: f['slug'] ? `https://gabb.org/listing/${f['slug']}` : null,
        description: this.stripHtml(f['full-description'] || f['summary-description']),
        location: {
          city: f['city'] || null,
          state: f['state'] || null,
          raw: [f['city'], f['state']].filter(Boolean).join(', ') || null,
        },
        industry: [f['industry-category-2'], f['industry-subcategory']].filter(Boolean).join(' / ') || null,
        asking_price: this.parseMoney(f['asking-price']),
        gross_revenue: this.parseMoney(f['annual-revenue']),
        cash_flow: cash ?? ebitda,
        cash_flow_type: cash ? 'cash flow' : ebitda ? 'EBITDA' : null,
        broker: f['broker-name'] ? { name: f['broker-name'], company: 'GABB member', phone: null, email: null } : null,
        date_listed: this.dateOnly(f['listing-date'] || f['first-posted']),
        raw: {
          sold,
          sold_date: f['sold-date'] || null,
          selling_price: this.parseMoney(f['selling-price']),
          revenue_at_sale: this.parseMoney(f['revenue-at-sale']),
          cash_flow_at_sale: this.parseMoney(f['cash-flow-at-sale']),
          ebitda: ebitda,
          naics: f['naics'] || null,
          year_established: f['year-established'] || null,
          county: f['county'] || null,
        },
      }));
    }

    this.info(`Scrape complete — ${listings.length} listings (${items.length} in feed)`);
    return { listings, stats: { pagesOk: 1, pageErrors: 0 } };
  }

  stripHtml(s) {
    if (!s) return null;
    return String(s).replace(/<[^>]+>/g, ' ').replace(/&nbsp;|&amp;/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 500) || null;
  }

  dateOnly(s) {
    if (!s) return null;
    const d = new Date(s);
    return isNaN(d) ? null : d.toISOString().slice(0, 10);
  }
}

module.exports = GabbScraper;
