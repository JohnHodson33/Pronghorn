// Viking Mergers & Acquisitions adapter. Southeast-focused (priority states),
// EBITDA-forward listings. Elementor markup — extraction is text-regex over
// each /listing/ link's card container. All listings on one page (~73).
// Card text: "Title #2057 Category Price: $X|Market Price Revenues: $Y
//             Cash Flow: $Z Location: Charlotte, NC More Info"

const cheerio = require('cheerio');
const SourceScraper = require('../core/source_base');
const { stateFromText } = require('../core/states');

const URL = 'https://www.vikingmergers.com/businesses-for-sale/';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

class VikingScraper extends SourceScraper {
  async scrape() {
    let listings = [];
    let pageErrors = 0;

    await this.withBrowser(async (browser) => {
      const page = await browser.newPage();
      await page.setViewport({ width: 1280, height: 800 });
      this.info(`Scraping ${URL}`);
      try {
        await page.goto(URL, { waitUntil: 'networkidle2', timeout: 45000 });
        await this.sleep(2500); // Elementor lazy bits
        listings = this.parsePage(await page.content());
      } catch (err) {
        this.error(`Failed: ${err.message}`);
        pageErrors++;
      }
    });

    if (this.config.enrich_details) await this.enrichBrokers(listings);

    this.info(`Scrape complete — ${listings.length} listings (${pageErrors} errors)`);
    return { listings, stats: { pagesOk: pageErrors ? 0 : 1, pageErrors } };
  }

  // Listing advisor (John 7/15 directive). Detail pages embed a Person schema
  // ("name" + "jobTitle") naming the deal's advisor — present on ~half of them.
  // PHONE, deliberately omitted: the only number on the page is Viking's
  // corporate line (704.676.0940, identical across listings). Storing it as the
  // advisor's phone would repeat the "company main line inflates contactable"
  // error Lane C had to unwind on owner_phone (7/15). Name + firm only.
  async enrichBrokers(listings) {
    const minCash = this.config.enrich_min_cash_flow ?? 300000;
    const cap = this.config.max_detail_enrich ?? 60;
    const targets = listings
      .filter((l) => l.cash_flow != null && l.cash_flow >= minCash && l.url)
      .slice(0, cap);
    if (targets.length === 0) { this.info('Broker enrichment: no listings meet threshold'); return; }
    this.info(`Broker enrichment: ${targets.length} listing(s) (cash flow ≥ ${minCash}, cap ${cap})`);

    let enriched = 0;
    let errors = 0;
    for (const l of targets) {
      try {
        const res = await this.fetchRetry(l.url, { headers: { 'User-Agent': UA } });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const html = (await res.text()).replace(/[\r\n]+/g, ' ');
        const m = html.match(/"name":\s*"([^"]{3,40})",\s*"jobTitle":\s*"([^"]{3,40})"/);
        if (m && /^[A-Za-z][A-Za-z.'-]+(\s+[A-Za-z][A-Za-z.'-]+)+$/.test(m[1].trim())) {
          l.broker = { name: m[1].trim(), company: 'Viking Mergers & Acquisitions', phone: null, email: null };
          l.raw = { ...l.raw, advisor_title: m[2].trim() };
          enriched++;
        }
        await this.sleep(700);
      } catch (err) {
        if (errors < 2) this.warn(`Broker enrichment ${l.source_listing_id}: ${err.message}`);
        if (++errors >= 8) { this.warn('Broker enrichment: too many errors, stopping'); break; }
      }
    }
    this.info(`Broker enrichment complete — ${enriched} enriched (${errors} errors)`);
  }

  parsePage(html) {
    const $ = cheerio.load(html);
    const out = [];
    const seen = new Set();

    $('a[href*="/listing/"]').each((_, el) => {
      const href = ($(el).attr('href') || '').split('?')[0];
      const slug = (href.match(/\/listing\/([^/]+)\/?$/) || [])[1];
      if (!slug || seen.has(slug)) return;

      // smallest ancestor whose text includes the financial block
      let card = $(el);
      let text = '';
      for (let i = 0; i < 10; i++) {
        card = card.parent();
        if (!card.length) break;
        const t = card.text().replace(/\s+/g, ' ').trim();
        if (/cash\s*flow/i.test(t) && t.length < 1200) { text = t; break; }
        if (t.length >= 1200) break;
      }
      if (!text) return;
      seen.add(slug);

      const num = (re) => {
        const m = text.match(re);
        return m ? this.parseMoney(m[1]) : null;
      };
      // "Title #2057 Category Price: ..." — title precedes the #number
      const titleM = text.match(/^(.*?)\s*#\d{3,5}\b/);
      const idM = text.match(/#(\d{3,5})\b/);
      const locM = text.match(/Location:\s*([^|]+?)(?:\s*More Info|$)/i);
      const locText = locM ? locM[1].trim() : null;

      out.push(this.listing({
        source_listing_id: idM ? idM[1] : slug,
        name: titleM ? titleM[1].trim() : $(el).text().trim() || null,
        url: href.startsWith('http') ? href : `https://www.vikingmergers.com${href}`,
        description: text.slice(0, 500),
        location: {
          city: locText && locText.includes(',') ? locText.split(',')[0].trim() : null,
          state: stateFromText(locText),
          raw: locText,
        },
        asking_price: num(/Price:\s*\$\s*([\d,.]+)/i), // "Market Price" → null
        gross_revenue: num(/Revenues?:\s*\$\s*([\d,.]+)/i),
        cash_flow: num(/Cash\s*Flow:\s*\$\s*([\d,.]+)/i),
        cash_flow_type: 'cash flow',
        raw: {},
      }));
    });

    return out;
  }
}

module.exports = VikingScraper;
