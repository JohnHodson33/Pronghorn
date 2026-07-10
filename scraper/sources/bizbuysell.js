// BizBuySell adapter. Hybrid extraction: JSON-LD SearchResultsPage blocks give
// id/name/price/location/description; a DOM walk recovers the cash-flow figure
// that JSON-LD omits. Detail pages are Cloudflare-blocked, so gross_revenue,
// business_type, broker, and date_listed stay null on index pages.

const cheerio = require('cheerio');
const SourceScraper = require('../core/source_base');

const DELAY_MS = 2500;

class BizBuySellScraper extends SourceScraper {
  // Overridable by mirror-site subclasses (BizQuest shares the JSON-LD format)
  pageUrl(pg) {
    return `https://www.bizbuysell.com/businesses-for-sale/${pg}/`;
  }

  async scrape() {
    const maxPages = this.config.max_pages || 10;
    const seen = new Set();
    const listings = [];
    let successCount = 0;
    let errorCount = 0;

    await this.withBrowser(async (browser) => {
      const page = await browser.newPage();
      await page.setViewport({ width: 1280, height: 800 });
      await page.setExtraHTTPHeaders({ 'Accept-Charset': 'utf-8' });

      for (let pg = 1; pg <= maxPages; pg++) {
        const url = this.pageUrl(pg);
        this.info(`Scraping page ${pg}/${maxPages}: ${url}`);

        try {
          await page.goto(url, { waitUntil: 'networkidle2', timeout: 45000 });

          const title = await page.title();
          if (title === 'Access Denied' || title === '') {
            this.warn(`Page ${pg} blocked or empty — stopping pagination`);
            break;
          }

          const cfMap = await this.getDomCashFlowMap(page);
          const html = await page.content();
          const pageListings = this.parseJsonLd(html, cfMap);

          if (pageListings.length === 0) {
            this.info(`No listings found on page ${pg} — end of results`);
            break;
          }

          let newCount = 0;
          for (const l of pageListings) {
            if (!seen.has(l.id)) {
              seen.add(l.id);
              listings.push(l);
              newCount++;
            }
          }

          this.info(`Page ${pg}: ${pageListings.length} found, ${newCount} new (${pageListings.length - newCount} dupes), ${listings.length} total`);
          successCount++;
        } catch (err) {
          this.error(`Page ${pg} failed: ${err.message}`);
          errorCount++;
        }

        if (pg < maxPages) await this.sleep(DELAY_MS);
      }
    });

    this.info(`Scrape complete — ${listings.length} unique listings from ${successCount} pages (${errorCount} page errors)`);
    return { listings, stats: { pagesOk: successCount, pageErrors: errorCount } };
  }

  // Walk up from each cash-flow element to its card, return a map of listingId → cashFlowRaw
  getDomCashFlowMap(page) {
    return page.evaluate(() => {
      const map = {};
      document.querySelectorAll('p.cash-flow.show-on-mobile').forEach((cfEl) => {
        let el = cfEl;
        for (let i = 0; i < 20; i++) {
          el = el.parentElement;
          if (!el) break;
          if (el.tagName.toLowerCase().startsWith('app-')) {
            const link = el.querySelector('a[href*="business-opportunity"]');
            if (link) {
              const m = link.href.match(/\/(\d+)\/?$/);
              if (m) map[m[1]] = cfEl.textContent.trim();
            }
            break;
          }
        }
      });
      return map;
    });
  }

  // Parse the SearchResultsPage JSON-LD block for all listings on the page
  parseJsonLd(html, cfMap) {
    const $ = cheerio.load(html);
    const listings = [];

    $('script[type="application/ld+json"]').each((_, el) => {
      try {
        const json = JSON.parse($(el).html());
        if (json['@type'] !== 'SearchResultsPage' || !json.about) return;

        json.about.forEach((item) => {
          const prod = item.item;
          if (!prod || !prod.productId) return;

          const addr = prod.offers?.availableAtOrFrom?.address || {};
          const city = (addr.addressLocality || '').trim() || null;
          const state = (addr.addressRegion || '').trim() || null;

          const cfRaw = cfMap[prod.productId] || null;
          const cfLabel = cfRaw ? cfRaw.split(':')[0].trim() : null;
          const cashFlow = cfRaw ? this.parseMoney(cfRaw.replace(/^[^:]+:\s*/i, '')) : null;

          listings.push(this.listing({
            source_listing_id: prod.productId,
            name:              prod.name || null,
            url:               prod.url || null,
            description:       prod.description || null,
            location: {
              city,
              state,
              raw: [city, state].filter(Boolean).join(', ') || null,
            },
            asking_price:      this.parseMoney(prod.offers?.price),
            cash_flow:         cashFlow,
            cash_flow_type:    cfLabel, // normalized to SDE/EBITDA/CASH_FLOW by createListing
            raw:               { cash_flow_raw: cfRaw },
          }));
        });
      } catch (e) {
        this.warn(`JSON-LD parse error: ${e.message}`);
      }
    });

    return listings;
  }
}

module.exports = BizBuySellScraper;
