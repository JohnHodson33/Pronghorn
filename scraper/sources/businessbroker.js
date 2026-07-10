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

const STATE_CODES = {
  alabama: 'AL', alaska: 'AK', arizona: 'AZ', arkansas: 'AR', california: 'CA',
  colorado: 'CO', connecticut: 'CT', delaware: 'DE', florida: 'FL', georgia: 'GA',
  hawaii: 'HI', idaho: 'ID', illinois: 'IL', indiana: 'IN', iowa: 'IA',
  kansas: 'KS', kentucky: 'KY', louisiana: 'LA', maine: 'ME', maryland: 'MD',
  massachusetts: 'MA', michigan: 'MI', minnesota: 'MN', mississippi: 'MS',
  missouri: 'MO', montana: 'MT', nebraska: 'NE', nevada: 'NV',
  'new hampshire': 'NH', 'new jersey': 'NJ', 'new mexico': 'NM', 'new york': 'NY',
  'north carolina': 'NC', 'north dakota': 'ND', ohio: 'OH', oklahoma: 'OK',
  oregon: 'OR', pennsylvania: 'PA', 'rhode island': 'RI', 'south carolina': 'SC',
  'south dakota': 'SD', tennessee: 'TN', texas: 'TX', utah: 'UT', vermont: 'VT',
  virginia: 'VA', washington: 'WA', 'west virginia': 'WV', wisconsin: 'WI',
  wyoming: 'WY', 'district of columbia': 'DC',
};

// normalize a name for fuzzy JSON-LD matching: lowercase, alphanumerics only
const normName = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');

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
            ldByName.set(normName(biz.name), {
              city: biz.address?.addressLocality || null,
              state: biz.address?.addressRegion || null,
              price: this.parseMoney(biz.makesOffer?.[0]?.price ?? biz.priceRange),
            });
          }
        }
      } catch { /* ignore */ }
    });

    // Pass 1: several anchors can point at the same listing (title link, a
    // whole-card wrapper link, and "Read More" buttons). Keep the shortest
    // NON-JUNK anchor text per id; the URL slug is the reliable fallback
    // (e.g. /business-for-sale/premier-ohio-environmental.../1011566.aspx).
    const JUNK = /^(read\s*more|view( details| listing)?|details|learn\s*more|more\s*info|photos?|contact|save|share)$/i;
    const anchors = new Map(); // id → { href, name, el }
    $('a[href*="/business-for-sale/"]').each((_, el) => {
      const href = $(el).attr('href') || '';
      const m = href.match(/\/(\d+)\.aspx$/);
      if (!m) return;
      const id = m[1];
      const raw = $(el).text().replace(/\s+/g, ' ').trim();
      const text = raw && !JUNK.test(raw) && raw.length >= 8 && raw.length <= 160 ? raw : null;
      const prev = anchors.get(id);
      if (!prev) anchors.set(id, { href, name: text, el });
      else if (text && (!prev.name || text.length < prev.name.length)) {
        anchors.set(id, { href, name: text, el: prev.el });
      }
    });

    const slugWords = (href) => {
      const m = href.match(/\/business-for-sale\/([^/]+)\/\d+\.aspx$/);
      return m ? m[1].split('-').filter(Boolean) : null;
    };
    const slugName = (href) => {
      const w = slugWords(href);
      return w ? w.map((x) => x.charAt(0).toUpperCase() + x.slice(1)).join(' ') : null;
    };
    // listing slugs end in the state name: "...-augusta-georgia" / "...-new-york"
    const slugState = (href) => {
      const w = slugWords(href);
      if (!w || w.length < 2) return null;
      const lastTwo = `${w[w.length - 2]} ${w[w.length - 1]}`.toLowerCase();
      return STATE_CODES[lastTwo] ?? STATE_CODES[w[w.length - 1].toLowerCase()] ?? null;
    };

    const out = [];
    for (const [id, a] of anchors) {
      const { href } = a;
      const name = a.name || slugName(href);

      // find a card-sized ancestor containing financial text
      let card = $(a.el);
      let cardText = '';
      for (let i = 0; i < 8; i++) {
        card = card.parent();
        if (!card.length) break;
        const t = card.text().replace(/\s+/g, ' ').trim();
        if (/\$/.test(t) && t.length < 1500) { cardText = t; break; }
        if (t.length >= 1500) break;
      }
      if (!name && !cardText) continue;

      const asking = this.matchMoney(cardText, /asking\s*price:?\s*\$\s*([\d,.]+)/i);
      const cashFlow = this.matchMoney(cardText, /cash\s*flow:?\s*\$\s*([\d,.]+)/i);
      const revenue = this.matchMoney(cardText, /(?:gross\s*revenue|revenue|gross\s*income):?\s*\$\s*([\d,.]+)/i);
      const locM = cardText.match(/([A-Za-z .'-]+),\s*([A-Z]{2})\b/);

      const ld = name ? ldByName.get(normName(name)) : null;
      const clean = (v) => (v && !/not\s*disclosed|undisclosed|confidential/i.test(v) ? v.trim() : null);
      const city = clean(locM?.[1]) ?? clean(ld?.city);
      const state = locM?.[2] || ld?.state || slugState(href);

      out.push(this.listing({
        source_listing_id: id,
        name,
        url: href.startsWith('http') ? href : `https://www.businessbroker.net${href}`,
        description: cardText ? cardText.slice(0, 500) : null,
        location: {
          city,
          state,
          raw: [city, state].filter(Boolean).join(', ') || null,
        },
        asking_price: asking ?? ld?.price ?? null,
        gross_revenue: revenue,
        cash_flow: cashFlow,
        cash_flow_type: cashFlow != null ? 'cash flow' : null, // site label is generic
        raw: { crawl_path: path },
      }));
    }

    return out;
  }

  matchMoney(text, re) {
    const m = text.match(re);
    return m ? this.parseMoney(m[1]) : null;
  }
}

module.exports = BusinessBrokerScraper;
