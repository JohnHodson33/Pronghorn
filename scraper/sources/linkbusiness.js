// LINK Business adapter (US). ~484 listings. Rich list cards — no detail fetch:
//   .vertical-listing
//     h3 > a         name + detail url (/businesses-for-sale/HT00227/slug)
//     Price: $X   Profit*: $Y (SDE)   Sales: $Z (revenue)
//     City / State / Industry / Broker
// Profit* is explicitly Seller's Discretionary Earnings (site tooltip), so
// cash_flow_type = SDE. Paginated via ?page=N.

const cheerio = require('cheerio');
const SourceScraper = require('../core/source_base');
const { stateFromText } = require('../core/states');

const DELAY_MS = 2000;

class LinkBusinessScraper extends SourceScraper {
  async scrape() {
    const maxPages = this.config.max_pages || 25;
    const seen = new Set();
    const listings = [];
    let pagesOk = 0;
    let pageErrors = 0;

    await this.withBrowser(async (browser) => {
      const page = await browser.newPage();
      await page.setViewport({ width: 1280, height: 800 });

      for (let pg = 1; pg <= maxPages; pg++) {
        const url = `https://linkbusiness.com/businesses-for-sale${pg > 1 ? `?page=${pg}` : ''}`;
        this.info(`Scraping page ${pg}/${maxPages}`);
        try {
          await page.goto(url, { waitUntil: 'networkidle2', timeout: 45000 });
          const pageListings = this.parsePage(await page.content());
          if (pageListings.length === 0) {
            this.info(`Page ${pg}: no cards — end of results`);
            break;
          }
          let added = 0;
          for (const l of pageListings) if (!seen.has(l.id)) { seen.add(l.id); listings.push(l); added++; }
          this.info(`Page ${pg}: ${pageListings.length} cards, ${added} new, ${listings.length} total`);
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
    $('.vertical-listing').each((_, el) => {
      const card = $(el);
      const a = card.find('h3 a').first();
      const href = (a.attr('href') || '').split('?')[0];
      const m = href.match(/\/businesses-for-sale\/([A-Z]{1,3}\d{3,})/i);
      if (!m) return;
      const id = m[1];
      const name = a.text().replace(/\s+/g, ' ').trim() || null;
      const text = card.text().replace(/\s+/g, ' ').trim();

      const money = (re) => { const mm = text.match(re); return mm ? this.parseMoney(mm[1]) : null; };
      const grab = (re) => { const mm = text.match(re); return mm ? mm[1].trim() : null; };

      const city = grab(/City:\s*(.+?)\s+State:/i);
      const stateName = grab(/State:\s*(.+?)\s+Industry:/i);
      let industry = grab(/Industry:\s*(.+?)\s+(?:business for sale\s+)?Broker:/i);
      if (industry) industry = industry.replace(/\s*business for sale\s*$/i, '').trim();

      out.push(this.listing({
        source_listing_id: id,
        name,
        url: href.startsWith('http') ? href : `https://linkbusiness.com${href}`,
        description: null,
        location: {
          city: city || null,
          state: stateFromText(stateName) || null,
          raw: [city, stateName].filter(Boolean).join(', ') || null,
        },
        industry: industry || null,
        asking_price: money(/Price:\s*\$?\s*([\d,]+)/i),
        gross_revenue: money(/Sales:\s*\$?\s*([\d,]+)/i),
        cash_flow: money(/Profit\*?:\s*\$?\s*([\d,]+)/i),
        cash_flow_type: 'SDE', // site tooltip: Profit* = Seller's Discretionary Earnings
        broker: (() => { const b = grab(/Broker:\s*(.+?)\s+Shared:/i); return b ? { name: b, company: 'LINK Business', phone: null, email: null } : null; })(),
        raw: {},
      }));
    });
    return out;
  }
}

module.exports = LinkBusinessScraper;
