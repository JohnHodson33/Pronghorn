// Business Brokers of Arizona (azbusinessbrokers.com) adapter — Scottsdale/
// Maricopa broker in AZ (home priority state). Squarespace site: /search-listings
// links detail pages at /search-listings/<slug>; each detail page's og:title is
// the business name and the body carries labeled financials ("Asking Price: $X",
// "Cash Flow: $Y", "Gross Revenue: $Z", "Location: <region>"). Squarespace block
// markup is messy, so financials are parsed from body text. Plain HTTP + cheerio.

const cheerio = require('cheerio');
const SourceScraper = require('../core/source_base');
const { stateFromText } = require('../core/states');

const BASE = 'https://www.azbusinessbrokers.com';
const INDEX = `${BASE}/search-listings`;
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

class AzbbScraper extends SourceScraper {
  async scrape() {
    let paths;
    try {
      const res = await fetch(INDEX, { headers: { 'User-Agent': UA } });
      if (!res.ok) throw new Error(`index HTTP ${res.status}`);
      const $ = cheerio.load(await res.text());
      paths = [...new Set(
        $('a[href*="/search-listings/"]').map((_, a) => $(a).attr('href')).get()
          .filter((h) => h && !/\/search-listings\/category\//i.test(h) && h.split('/').length > 2)
      )];
      this.info(`Index: ${paths.length} listings`);
    } catch (err) {
      this.error(`Index failed: ${err.message}`);
      return { listings: [], stats: { pagesOk: 0, pageErrors: 1 } };
    }

    const listings = [];
    const seen = new Set();
    let pagesOk = 0;
    let pageErrors = 0;
    for (const path of paths) {
      const slug = path.split('/').filter(Boolean).pop();
      if (seen.has(slug)) continue;
      seen.add(slug);
      const url = path.startsWith('http') ? path : BASE + path;
      try {
        const html = await this.fetchWithRetry(url);
        const l = this.parseDetail(slug, url, html);
        if (l) listings.push(l);
        pagesOk++;
        await this.sleep(1500); // Squarespace rate-limits; keep it gentle
      } catch (err) {
        this.error(`Detail ${slug} failed after retries: ${err.message}`);
        pageErrors++;
        // Independent detail pages — skip a bad one rather than abandoning the rest.
        if (pageErrors >= 8) { this.warn('Too many errors, stopping'); break; }
      }
    }

    this.info(`Scrape complete — ${listings.length} listings (${pageErrors} errors)`);
    return { listings, stats: { pagesOk, pageErrors } };
  }

  // Squarespace 429-rate-limits rapid fetches; retry with backoff.
  async fetchWithRetry(url, tries = 4) {
    let lastErr;
    for (let attempt = 1; attempt <= tries; attempt++) {
      try {
        const res = await fetch(url, { headers: { 'User-Agent': UA } });
        if (res.status === 429 || res.status >= 500) throw new Error(`HTTP ${res.status}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return await res.text();
      } catch (err) {
        lastErr = err;
        const transient = /HTTP (429|5\d\d)/.test(err.message) || /fetch failed|ECONN|ETIMEDOUT|socket/i.test(err.message);
        if (!transient || attempt === tries) break;
        const backoff = 2500 * 2 ** (attempt - 1); // 2.5s, 5s, 10s
        this.warn(`${err.message} — retry ${attempt}/${tries - 1} in ${backoff}ms`);
        await this.sleep(backoff);
      }
    }
    throw lastErr;
  }

  parseDetail(slug, url, html) {
    const $ = cheerio.load(html);
    // Name: og:title, minus the " — BBAZ" broker suffix.
    const og = ($('meta[property="og:title"]').attr('content') || '')
      .replace(/&mdash;/g, '—').replace(/\s*[—-]\s*BBAZ\s*$/i, '')
      .replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
    const name = og || this.titleCase(slug.replace(/-/g, ' '));

    const body = $('body').text().replace(/\s+/g, ' ');
    const grab = (label) => this.parseMoney((body.match(new RegExp(`${label}:\\s*\\$?([\\d,]+)`, 'i')) || [])[1]);
    const locM = body.match(/Location:\s*([A-Za-z][A-Za-z .,'-]{2,40}?)(?:\s*(?:Asking|Cash|Gross|Revenue|Down|Category|$))/i);
    const locRaw = locM ? locM[1].trim() : null;

    return this.listing({
      source_listing_id: slug,
      name,
      url,
      description: null,
      location: {
        city: null,
        state: stateFromText(locRaw) || 'AZ', // AZ-focused broker; region text is usually AZ
        raw: locRaw,
      },
      industry: null, // name states the trade
      asking_price: grab('Asking Price'),
      gross_revenue: grab('Gross Revenue') || grab('Gross Sales') || grab('Revenue'),
      cash_flow: grab('Cash Flow') || grab('SDE') || grab('Seller.s Discretionary Earnings'),
      cash_flow_type: /cash flow/i.test(body) ? 'cash flow' : /\bSDE\b/i.test(body) ? 'SDE' : null,
      raw: { down_payment: grab('Down Payment') },
    });
  }

  titleCase(s) {
    return s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
  }
}

module.exports = AzbbScraper;
