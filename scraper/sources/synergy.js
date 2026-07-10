// Synergy Business Brokers adapter. Clean WordPress card markup:
//   .sale-list-item-content
//     a.sale-list-item-title (name + detail url; slug = external id)
//     .sale-list-item-price (asking)
//     h5 span "Annual Revenue: $X" / "Net Cash Flow: $Y"
//     .sale-list-category li (industries)
//     .sale-list-location-btn h6 ("Midland County, Texas")
// Pagination: WordPress /page/N/ pattern, probed empirically per run.

const cheerio = require('cheerio');
const SourceScraper = require('../core/source_base');
const { stateFromText } = require('../core/states');

const DELAY_MS = 2000;
const BASE = 'https://www.synergybb.com/businesses-for-sale/';

class SynergyScraper extends SourceScraper {
  async scrape() {
    const maxPages = this.config.max_pages || 10;
    const seen = new Set();
    const listings = [];
    let pagesOk = 0;
    let pageErrors = 0;

    await this.withBrowser(async (browser) => {
      const page = await browser.newPage();
      await page.setViewport({ width: 1280, height: 800 });

      for (let pg = 1; pg <= maxPages; pg++) {
        const url = pg === 1 ? BASE : `${BASE}page/${pg}/`;
        this.info(`Scraping page ${pg}: ${url}`);
        try {
          await page.goto(url, { waitUntil: 'networkidle2', timeout: 45000 });
          const title = await page.title();
          if (/not found|404/i.test(title)) {
            this.info(`Page ${pg} not found — end of results`);
            break;
          }
          const pageListings = this.parsePage(await page.content());
          if (pageListings.length === 0) {
            this.info(`Page ${pg}: no cards — end of results`);
            break;
          }
          let added = 0;
          for (const l of pageListings) {
            if (!seen.has(l.id)) { seen.add(l.id); listings.push(l); added++; }
          }
          this.info(`Page ${pg}: ${pageListings.length} cards, ${added} new, ${listings.length} total`);
          pagesOk++;
          if (added === 0 && pg > 1) break;
        } catch (err) {
          this.error(`Page ${pg} failed: ${err.message}`);
          pageErrors++;
          break;
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
    $('.sale-list-item-content').each((_, el) => {
      const card = $(el);
      const a = card.find('a.sale-list-item-title').first();
      const url = a.attr('href') || null;
      const name = a.text().trim() || null;
      if (!url || !name) return;
      const slug = (url.match(/\/listings\/([^/]+)\/?$/) || [])[1];
      if (!slug) return;

      const grab = (label) => {
        const span = card.find('h5 span').filter((_, s) => new RegExp(label, 'i').test($(s).text())).first();
        return span.length ? this.parseMoney(span.find('strong').text() || span.text()) : null;
      };

      const locText = card.find('.sale-list-location-btn h6').text().trim() || null;
      const industries = card.find('.sale-list-category li').map((_, li) => $(li).text().trim()).get();

      out.push(this.listing({
        source_listing_id: slug,
        name,
        url,
        description: card.find('.sale-list-item-content-dsec').text().trim().slice(0, 500) || null,
        location: {
          city: locText ? locText.split(',')[0].trim() : null, // often a county
          state: stateFromText(locText),
          raw: locText,
        },
        asking_price: this.parseMoney(card.find('.sale-list-item-price').first().text()),
        gross_revenue: grab('revenue'),
        cash_flow: grab('cash\\s*flow'),
        cash_flow_type: 'cash flow',
        industry: industries.join(', ') || null,
        raw: { industries },
      }));
    });
    return out;
  }
}

module.exports = SynergyScraper;
