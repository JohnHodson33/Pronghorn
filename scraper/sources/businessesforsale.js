// BusinessesForSale.com adapter (US). ~16,800 listings. Each search page ships a
// JSON-LD ItemList of Product entries with name/url/location/price and an
// additionalProperty array carrying Asking Price / Revenue / Cash Flow (values
// or "On request"). Structured, no per-listing detail fetch needed. Paginated
// via ?page=N (~15/page). Region strings look like "California - South".

const cheerio = require('cheerio');
const SourceScraper = require('./bizbuysell'); // reuse withBrowser + createListing plumbing
const { stateFromText } = require('../core/states');

// Extend BizBuySellScraper only for its class plumbing? No — cleaner to extend
// the base. Re-require the base to avoid inheriting BizBuySell's parse logic.
const BaseScraper = require('../core/source_base');

const DELAY_MS = 2500;

class BusinessesForSaleScraper extends BaseScraper {
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
        const url = `https://us.businessesforsale.com/us/search/businesses-for-sale?page=${pg}`;
        this.info(`Scraping page ${pg}/${maxPages}`);
        try {
          await page.goto(url, { waitUntil: 'networkidle2', timeout: 45000 });
          const pageListings = this.parseJsonLd(await page.content());
          if (pageListings.length === 0) {
            this.info(`Page ${pg}: no listings — end of results`);
            break;
          }
          let added = 0;
          for (const l of pageListings) if (!seen.has(l.id)) { seen.add(l.id); listings.push(l); added++; }
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

  parseJsonLd(html) {
    const $ = cheerio.load(html);
    const out = [];

    $('script[type="application/ld+json"]').each((_, el) => {
      let json;
      try { json = JSON.parse($(el).html()); } catch { return; }
      const lists = [];
      const collect = (node) => {
        if (!node) return;
        if (Array.isArray(node)) return node.forEach(collect);
        if (node['@type'] === 'ItemList' && node.itemListElement) lists.push(node);
        if (node.mainEntity) collect(node.mainEntity);
        if (node['@graph']) collect(node['@graph']);
      };
      collect(json);

      for (const list of lists) {
        for (const li of list.itemListElement) {
          const p = li.item;
          if (!p || !p.productId) continue;

          const props = {};
          for (const ap of p.offers?.additionalProperty || p.additionalProperty || []) {
            props[String(ap.name).toLowerCase()] = ap.value;
          }
          const addr = p.offers?.availableAtOrFrom?.address || {};
          const region = addr.addressRegion || '';
          const state = stateFromText(region.split(/[-–]/)[0].trim()) || stateFromText(region);

          const asking = this.parseMoney(props['asking price']) ?? this.parseMoney(p.offers?.price);
          const revenue = this.onRequest(props['revenue']);
          const cash = this.onRequest(props['cash flow']);

          out.push(this.listing({
            source_listing_id: String(p.productId),
            name: p.name || null,
            url: p.url || null,
            description: (p.description || '').slice(0, 500) || null,
            location: {
              city: addr.addressLocality || null,
              state,
              raw: [addr.addressLocality, region].filter(Boolean).join(', ') || null,
            },
            asking_price: asking,
            gross_revenue: revenue,
            cash_flow: cash,
            cash_flow_type: cash != null ? 'cash flow' : null,
            raw: { region },
          }));
        }
      }
    });

    return out;
  }

  // "On request" / "N/A" → null; otherwise parse the money value
  onRequest(v) {
    if (v == null || /on request|n\/a|undisclosed|request/i.test(String(v))) return null;
    return this.parseMoney(v);
  }
}

module.exports = BusinessesForSaleScraper;
