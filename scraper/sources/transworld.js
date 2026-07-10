// Transworld Business Advisors adapter. Their search page ships a JSON-LD
// ItemList (numberOfItems ~3,529) with Product entries per listing, paginated
// via &page=N (~9/page). Financials are read from each card's DOM text.
// v1 crawls price-descending (site default sort) — front-loads platform-size
// deals; the sub-floor tail is filtered out by criteria anyway.

const cheerio = require('cheerio');
const SourceScraper = require('../core/source_base');
const { stateFromText } = require('../core/states');

const DELAY_MS = 2500;
// Their router requires the FULL filter object (all null fields present) —
// copied verbatim from the site's own pagination links.
const FILTER = encodeURIComponent(JSON.stringify({
  country: { value: 4 }, state: null, region: null, categories: null,
  sub_category: null, sort: { value: '-c_listing_price__c' },
  price_min: null, price_max: null, tribe_slug: null, assigned_to: null,
  down_payment_min: null, down_payment_max: null,
  discretionary_earnings_min: null, discretionary_earnings_max: null,
  franchisee_operation: null, relocatable: null,
  real_estate_available: null, real_estate_included: null,
  lender_prequalified: null,
}));

class TransworldScraper extends SourceScraper {
  pageUrl(pg) {
    return `https://www.tworld.com/buy-a-business/business-listing-search?listing=${FILTER}&page=${pg}`;
  }

  async scrape() {
    const maxPages = this.config.max_pages || 40;
    const seen = new Set();
    const listings = [];
    let pagesOk = 0;
    let pageErrors = 0;

    await this.withBrowser(async (browser) => {
      const page = await browser.newPage();
      await page.setViewport({ width: 1280, height: 800 });

      for (let pg = 1; pg <= maxPages; pg++) {
        this.info(`Scraping page ${pg}/${maxPages}`);
        try {
          await page.goto(this.pageUrl(pg), { waitUntil: 'networkidle2', timeout: 45000 });
          const pageListings = this.parsePage(await page.content());
          if (pageListings.length === 0) {
            this.info(`Page ${pg}: no listings — end of results`);
            break;
          }
          let added = 0;
          for (const l of pageListings) {
            if (!seen.has(l.id)) { seen.add(l.id); listings.push(l); added++; }
          }
          this.info(`Page ${pg}: ${pageListings.length} found, ${added} new, ${listings.length} total`);
          pagesOk++;
          if (added === 0 && pg > 1) break;
        } catch (err) {
          this.error(`Page ${pg} failed: ${err.message}`);
          pageErrors++;
          if (pageErrors >= 3) break;
        }
        await this.sleep(DELAY_MS);
      }
    });

    this.info(`Scrape complete — ${listings.length} listings (${pagesOk} pages, ${pageErrors} errors)`);
    return { listings, stats: { pagesOk, pageErrors } };
  }

  parsePage(html) {
    const $ = cheerio.load(html);
    const out = [];

    // JSON-LD ItemList → canonical name/url/category per listing
    const items = [];
    $('script[type="application/ld+json"]').each((_, el) => {
      try {
        const j = JSON.parse($(el).html());
        const list = j['@type'] === 'ItemList' ? j.itemListElement : j.mainEntity?.itemListElement;
        if (Array.isArray(list)) items.push(...list.map((x) => x.item).filter(Boolean));
      } catch { /* ignore */ }
    });

    // DOM card text per slug, for financials + location
    const cardText = new Map();
    $('a[href*="/buy-a-business/listings/"]').each((_, el) => {
      const href = ($(el).attr('href') || '').split('?')[0];
      const slug = (href.match(/\/listings\/([^/?]+)/) || [])[1];
      if (!slug || cardText.has(slug)) return;
      let card = $(el);
      for (let i = 0; i < 10; i++) {
        card = card.parent();
        if (!card.length) break;
        const t = card.text().replace(/\s+/g, ' ').trim();
        if (/\$/.test(t) && t.length < 1200) { cardText.set(slug, t); break; }
        if (t.length >= 1200) break;
      }
    });

    for (const it of items) {
      const url = (it.url || '').split('?')[0];
      const slug = (url.match(/\/listings\/([^/?]+)/) || [])[1];
      if (!slug) continue;
      const text = cardText.get(slug) || '';

      const num = (re) => {
        const m = text.match(re);
        return m ? this.parseMoney(m[1]) : null;
      };
      const cash = num(/cash\s*flow:?\s*\$\s*([\d,.]+)/i);
      const ebitda = num(/ebitda:?\s*\$\s*([\d,.]+)/i);
      const locM = text.match(/([A-Za-z .'-]{3,}),\s*([A-Z]{2})\b/);

      let category = null;
      try { category = JSON.parse(it.description || 'null'); } catch { category = it.description; }
      if (Array.isArray(category)) category = category.join(', ');

      out.push(this.listing({
        source_listing_id: slug,
        name: it.name || null,
        url,
        description: text.slice(0, 500) || it.name || null,
        location: {
          city: locM ? locM[1].trim() : null,
          state: locM ? locM[2] : stateFromText(text),
          raw: locM ? `${locM[1].trim()}, ${locM[2]}` : null,
        },
        asking_price: num(/asking\s*price:?\s*\$\s*([\d,.]+)/i) ?? num(/price:?\s*\$\s*([\d,.]+)/i),
        gross_revenue: num(/(?:gross\s*revenue|revenue|gross\s*sales):?\s*\$\s*([\d,.]+)/i),
        cash_flow: cash ?? ebitda,
        cash_flow_type: cash ? 'cash flow' : ebitda ? 'EBITDA' : null,
        industry: typeof category === 'string' ? category : null,
        raw: { category },
      }));
    }

    return out;
  }
}

module.exports = TransworldScraper;
