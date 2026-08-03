// GABB (Georgia Association of Business Brokers) adapter — REBUILT 2026-08-03.
// The old Webflow site + Railway webhook JSON API was decommissioned ~7/22
// (endpoint returns 404 "Application not found"; source went dark and all rows
// aged out). gabb.org is now a Next.js app:
//   /businesses-for-sale?page=N   → 12 server-rendered cards per page
//   /businesses-for-sale/<slug>   → detail page with a schema.org Product
//     JSON-LD block: sku (SAME listing-number id space as the old API, so old
//     rows relist and update in place), offers.price, seller (broker person +
//     firm), category, place ("City, County, GA"), and additionalProperty
//     financials (Annual Revenue / Cash Flow / EBITDA when published).
// Plain HTTP + cheerio + JSON.parse — no browser.

const cheerio = require('cheerio');
const SourceScraper = require('../core/source_base');
const { stateFromText } = require('../core/states');

const BASE = 'https://www.gabb.org/businesses-for-sale';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

class GabbScraper extends SourceScraper {
  async scrape() {
    const maxPages = this.config.max_pages || 30;
    const slugs = [];
    const seen = new Set();
    let pagesOk = 0;
    let pageErrors = 0;

    for (let pg = 1; pg <= maxPages; pg++) {
      try {
        const res = await this.fetchRetry(pg === 1 ? BASE : `${BASE}?page=${pg}`, { headers: { 'User-Agent': UA } });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const $ = cheerio.load(await res.text());
        const before = seen.size;
        $('a[href^="/businesses-for-sale/"]').each((_, a) => {
          const m = ($(a).attr('href') || '').match(/^\/businesses-for-sale\/([a-z0-9-]+)$/);
          if (m && !seen.has(m[1])) { seen.add(m[1]); slugs.push(m[1]); }
        });
        pagesOk++;
        // a page past the end either has no cards or repeats the last page
        if (seen.size === before) break;
        await this.sleep(600);
      } catch (err) {
        this.error(`Index page ${pg} failed: ${err.message}`);
        if (++pageErrors >= 3) break;
      }
    }
    this.info(`Index crawl: ${slugs.length} listings across ${pagesOk} pages`);

    const listings = [];
    let detailErrors = 0;
    for (const slug of slugs) {
      try {
        const res = await this.fetchRetry(`${BASE}/${slug}`, { headers: { 'User-Agent': UA } });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const l = this.parseDetail(slug, await res.text());
        if (l) listings.push(l);
        await this.sleep(600);
      } catch (err) {
        this.error(`${slug} failed: ${err.message}`);
        if (++detailErrors >= 8) { this.warn('Too many detail errors, stopping'); break; }
      }
    }

    this.info(`Scrape complete — ${listings.length} listings (${pageErrors + detailErrors} errors)`);
    return { listings, stats: { pagesOk, pageErrors: pageErrors + detailErrors } };
  }

  parseDetail(slug, html) {
    const $ = cheerio.load(html);
    let prod = null;
    $('script[type="application/ld+json"]').each((_, el) => {
      try {
        const j = JSON.parse($(el).html());
        if (j['@type'] === 'Product') prod = prod || j;
      } catch { /* not the block we want */ }
    });
    if (!prod || !prod.sku) return null;

    // "Lawrenceville, Gwinnett, GA" — city, county, state; shorter forms occur.
    const placeRaw = (prod.offers?.availableAtOrFrom?.name || '').trim();
    const parts = placeRaw.split(',').map((s) => s.trim()).filter(Boolean);
    const state = stateFromText(placeRaw) || null;
    const city = parts.length >= 2 ? parts[0] : null;

    // additionalProperty carries whatever financials the broker published.
    const fin = {};
    for (const p of prod.additionalProperty || []) {
      const v = this.parseMoney(p.value);
      if (v == null || v === 0) continue;
      if (/annual revenue|gross revenue|revenue|sales/i.test(p.name)) fin.revenue = fin.revenue ?? v;
      else if (/cash ?flow|sde|discretionary/i.test(p.name)) { fin.cf = fin.cf ?? v; fin.cfType = fin.cfType ?? p.name; }
      else if (/ebitda/i.test(p.name)) { fin.ebitda = fin.ebitda ?? v; }
    }

    const seller = prod.offers?.seller || {};
    const sold = /SoldOut|OutOfStock/i.test(prod.offers?.availability || '');

    return this.listing({
      source_listing_id: String(prod.sku),
      name: (prod.name || '').trim() || null,
      url: `${BASE}/${slug}`,
      description: (prod.description || '').replace(/\s+/g, ' ').trim().slice(0, 500) || null,
      location: { city, state, raw: placeRaw || null },
      industry: prod.category || null,
      asking_price: this.parseMoney(prod.offers?.price) || null,
      gross_revenue: fin.revenue ?? null,
      cash_flow: fin.cf ?? fin.ebitda ?? null,
      cash_flow_type: fin.cf ? (fin.cfType || 'cash flow') : fin.ebitda ? 'EBITDA' : null,
      broker: seller.name
        ? { name: seller.name, company: seller.worksFor?.name || 'GABB member', phone: null, email: null }
        : null,
      raw: {
        sold,
        county: parts.length >= 3 ? parts[1] : null,
        broker_profile: seller.url || null,
        ebitda: fin.ebitda ?? null,
      },
    });
  }
}

module.exports = GabbScraper;
