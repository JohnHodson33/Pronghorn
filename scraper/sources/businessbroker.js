// BusinessBroker.net adapter. Independent inventory (Franchise Ventures), unlike
// BizQuest which mirrors BizBuySell. Strategy: targeted crawl of keyword/industry
// pages matching the thesis (configured in sources.businessbroker.paths) rather
// than the whole-site firehose — the relevance filter still runs afterward.
//
// Extraction: DOM cards carry the detail link (/business-for-sale/<slug>/<id>.aspx)
// and "Asking Price / Cash Flow / Gross Revenue" text; the page's JSON-LD ItemList
// (LocalBusiness entries) supplies city/state/price by listing name as a fallback.

const cheerio = require('cheerio');
const SourceScraper = require('../core/source_base');

const DELAY_MS = 2500;

// Verified against the site's keyword/industry indexes 2026-07-10. No dedicated
// pest/HVAC/tree/roofing pages exist — those listings surface in landscaping,
// services-repair, and services-construction (relevance filter sorts them out).
const DEFAULT_PATHS = [
  '/keyword/landscaping-and-lawn-care-businesses-for-sale.aspx',
  '/keyword/lawn-care-businesses-for-sale.aspx',
  '/keyword/plumbing-businesses-for-sale.aspx',
  '/keyword/pool-service-and-repair-businesses-for-sale.aspx',
  '/keyword/electrician-businesses-for-sale.aspx',
  '/keyword/handyman-businesses-for-sale.aspx',
  '/keyword/carpet-cleaning-businesses-for-sale.aspx',
  '/keyword/maid-service-businesses-for-sale.aspx',
  '/industry/services-cleaning-businesses-for-sale.aspx',
  '/industry/services-landscaping-businesses-for-sale.aspx',
  '/industry/services-repair-businesses-for-sale.aspx',
  '/industry/services-construction-businesses-for-sale.aspx',
];

class BusinessBrokerScraper extends SourceScraper {
  async scrape() {
    const base = 'https://www.businessbroker.net';
    const paths = this.config.paths || DEFAULT_PATHS;
    const maxPages = this.config.max_pages_per_path || 5;
    const seen = new Set();
    const listings = [];
    let pagesOk = 0;
    let pageErrors = 0;

    await this.withBrowser(async (browser) => {
      const page = await browser.newPage();
      await page.setViewport({ width: 1280, height: 800 });

      for (const path of paths) {
        for (let pg = 1; pg <= maxPages; pg++) {
          const url = `${base}${path}${pg > 1 ? `?page=${pg}` : ''}`;
          this.info(`Scraping ${path} page ${pg}`);
          try {
            await page.goto(url, { waitUntil: 'networkidle2', timeout: 45000 });
            const title = await page.title();
            if (/no such page/i.test(title)) {
              this.warn(`${path} — page does not exist, skipping path`);
              break;
            }
            const html = await page.content();
            const pageListings = this.parsePage(html, path);
            if (pageListings.length === 0) {
              this.info(`${path} page ${pg}: no listings — end of results`);
              break;
            }
            let added = 0;
            for (const l of pageListings) {
              if (!seen.has(l.id)) { seen.add(l.id); listings.push(l); added++; }
            }
            this.info(`${path} page ${pg}: ${pageListings.length} found, ${added} new, ${listings.length} total`);
            pagesOk++;
            if (added === 0 && pg > 1) break; // repeating content — stop paging this path
          } catch (err) {
            this.error(`${path} page ${pg} failed: ${err.message}`);
            pageErrors++;
            break;
          }
          await this.sleep(DELAY_MS);
        }
      }
    });

    this.info(`Scrape complete — ${listings.length} unique listings (${pagesOk} pages ok, ${pageErrors} errors)`);
    return { listings, stats: { pagesOk, pageErrors } };
  }

  parsePage(html, path) {
    const $ = cheerio.load(html);

    // JSON-LD ItemList → name-keyed fallback for city/state/price
    const ldByName = new Map();
    $('script[type="application/ld+json"]').each((_, el) => {
      try {
        const j = JSON.parse($(el).html());
        const items = j.mainEntity?.itemListElement || [];
        for (const it of items) {
          const biz = it.item;
          if (biz?.name) {
            ldByName.set(biz.name.trim().toLowerCase(), {
              city: biz.address?.addressLocality || null,
              state: biz.address?.addressRegion || null,
              price: this.parseMoney(biz.makesOffer?.[0]?.price ?? biz.priceRange),
            });
          }
        }
      } catch { /* ignore */ }
    });

    // DOM cards: unique detail links, then the smallest ancestor with $ text
    const out = [];
    const seenIds = new Set();
    $('a[href*="/business-for-sale/"]').each((_, el) => {
      const href = $(el).attr('href') || '';
      const m = href.match(/\/(\d+)\.aspx$/);
      if (!m || seenIds.has(m[1])) return;
      const id = m[1];

      // find a card-sized ancestor containing financial text
      let card = $(el);
      let cardText = '';
      for (let i = 0; i < 8; i++) {
        card = card.parent();
        if (!card.length) break;
        const t = card.text().replace(/\s+/g, ' ').trim();
        if (/\$/.test(t) && t.length < 1500) { cardText = t; break; }
        if (t.length >= 1500) break;
      }

      const name = $(el).text().replace(/\s+/g, ' ').trim() || null;
      if (!name && !cardText) return;
      seenIds.add(id);

      const asking = this.matchMoney(cardText, /asking\s*price:?\s*\$\s*([\d,.]+)/i);
      const cashFlow = this.matchMoney(cardText, /cash\s*flow:?\s*\$\s*([\d,.]+)/i);
      const revenue = this.matchMoney(cardText, /(?:gross\s*revenue|revenue|gross\s*income):?\s*\$\s*([\d,.]+)/i);
      const locM = cardText.match(/([A-Za-z .'-]+),\s*([A-Z]{2})\b/);

      const ld = name ? ldByName.get(name.trim().toLowerCase()) : null;

      out.push(this.listing({
        source_listing_id: id,
        name,
        url: href.startsWith('http') ? href : `https://www.businessbroker.net${href}`,
        description: cardText ? cardText.slice(0, 500) : null,
        location: {
          city: locM?.[1]?.trim() || ld?.city || null,
          state: locM?.[2] || ld?.state || null,
          raw: locM ? `${locM[1].trim()}, ${locM[2]}` : null,
        },
        asking_price: asking ?? ld?.price ?? null,
        gross_revenue: revenue,
        cash_flow: cashFlow,
        cash_flow_type: cashFlow != null ? 'cash flow' : null, // site label is generic
        raw: { crawl_path: path },
      }));
    });

    return out;
  }

  matchMoney(text, re) {
    const m = text.match(re);
    return m ? this.parseMoney(m[1]) : null;
  }
}

module.exports = BusinessBrokerScraper;
