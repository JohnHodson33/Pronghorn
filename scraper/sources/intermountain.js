// InterMountain Business Brokers (intermountainbusinessbrokers.com) — Colorado
// (priority state) broker. WordPress: /businesses-for-sale-2 lists /business/<slug>
// detail pages (the /businesses-for-sale index 500s — use the -2 variant). Detail
// pages carry an h1 business name and financials mostly in PROSE
// ("$465K in Seller's Discretionary Earnings (SDE) on $1.19M Revenue",
// "Price: $800,000"), with K/M abbreviations. We parse the "Price:" field for
// asking and best-effort SDE/Revenue from the prose. "Coming Soon" teasers are
// kept (name-level leads). Plain HTTP + cheerio; state defaults CO.

const cheerio = require('cheerio');
const SourceScraper = require('../core/source_base');
const { stateFromText } = require('../core/states');

const BASE = 'https://intermountainbusinessbrokers.com';
const INDEX = `${BASE}/businesses-for-sale-2`;
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

class InterMountainScraper extends SourceScraper {
  async scrape() {
    let urls;
    try {
      const res = await this.fetchRetry(INDEX, { headers: { 'User-Agent': UA } });
      if (!res.ok) throw new Error(`index HTTP ${res.status}`);
      const $ = cheerio.load(await res.text());
      urls = [...new Set(
        $('a[href*="/business/"]').map((_, a) => $(a).attr('href')).get()
          .filter((h) => /\/business\/[a-z0-9-]{5,}\/?$/i.test(h))
          .map((h) => (h.startsWith('http') ? h : BASE + h))
      )];
      this.info(`Index: ${urls.length} listings`);
    } catch (err) {
      this.error(`Index failed: ${err.message}`);
      return { listings: [], stats: { pagesOk: 0, pageErrors: 1 } };
    }

    const listings = [];
    let pagesOk = 0;
    let pageErrors = 0;
    for (const url of urls) {
      const slug = url.replace(/\/$/, '').split('/').pop();
      try {
        const res = await this.fetchRetry(url, { headers: { 'User-Agent': UA } });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const l = this.parseDetail(slug, url, await res.text());
        if (l) listings.push(l);
        pagesOk++;
        await this.sleep(700);
      } catch (err) {
        this.error(`Detail ${slug} failed: ${err.message}`);
        if (++pageErrors >= 8) { this.warn('Too many errors, stopping'); break; }
      }
    }

    this.info(`Scrape complete — ${listings.length} listings (${pageErrors} errors)`);
    return { listings, stats: { pagesOk, pageErrors } };
  }

  // Handles "$465K", "$1.19M", "$800,000".
  money(str) {
    if (!str) return null;
    const m = String(str).match(/\$?\s*([\d,.]+)\s*([KM])?/i);
    if (!m) return null;
    let n = parseFloat(m[1].replace(/,/g, ''));
    if (isNaN(n)) return null;
    const suffix = (m[2] || '').toUpperCase();
    if (suffix === 'K') n *= 1e3;
    else if (suffix === 'M') n *= 1e6;
    return Math.round(n);
  }

  parseDetail(slug, url, html) {
    const $ = cheerio.load(html);
    const rawName = $('h1').first().text().replace(/\s+/g, ' ').trim();
    // Trim promo/financing suffixes after a dash.
    const name = rawName.replace(/\s*[-–—]\s*(Creative Financing|Coming Soon|Seller Financing|Price Reduced|SBA|New Listing).*$/i, '').trim() || rawName || null;

    const body = $('body').text().replace(/\s+/g, ' ');
    const asking = this.money((body.match(/(?:Asking\s*Price|List\s*Price|Price)\s*:?\s*(\$[\d,.]+\s*[KM]?)/i) || [])[1]);
    // Prose: "$465K in Seller's Discretionary Earnings (SDE)" / "SDE on $1.19M Revenue".
    const sde = this.money((body.match(/(\$[\d,.]+\s*[KM]?)\s*(?:in\s*)?(?:Seller.?s\s*Discretionary\s*Earnings|SDE|Cash\s*Flow|Adjusted\s*EBITDA)/i) || [])[1]);
    const revenue = this.money((body.match(/(\$[\d,.]+\s*[KM]?)\s*(?:in\s*)?(?:Annual\s*)?Revenue/i)
      || body.match(/Revenue\s*(?:of|:)?\s*(\$[\d,.]+\s*[KM]?)/i) || [])[1]);

    return this.listing({
      source_listing_id: slug,
      name,
      url,
      description: null,
      location: { city: null, state: stateFromText(body.slice(0, 400)) || 'CO', raw: null },
      industry: null,
      asking_price: asking,
      gross_revenue: revenue,
      cash_flow: sde,
      cash_flow_type: sde ? 'SDE' : null,
      raw: { coming_soon: /coming soon/i.test(rawName) || undefined },
    });
  }
}

module.exports = InterMountainScraper;
