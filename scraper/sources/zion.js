// Zion Business Brokers (zionbusinessbrokers.com) — Utah (priority state) broker
// specializing in HVAC/landscaping/Main-Street LMM. Wix site: /listings renders
// each listing as a sequence of rich-text blocks — "Price: $X", "Revenues: $Y",
// "SDE: $Z", "Location: Utah", and the business-name block. We read the ordered
// .wixui-rich-text__text blocks and group them into listings at each "Price:"
// marker. No per-listing detail page / stable id, so we hash the name for the id.
// Plain HTTP + cheerio; state defaults UT.

const cheerio = require('cheerio');
const crypto = require('crypto');
const SourceScraper = require('../core/source_base');
const { stateFromText } = require('../core/states');

const INDEX = 'https://www.zionbusinessbrokers.com/listings';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';
const LABEL = /^(Price|Revenues?|SDE|Cash Flow|EBITDA|Location|Asking Price|Down)\s*:/i;

class ZionScraper extends SourceScraper {
  async scrape() {
    let blocks;
    try {
      const res = await this.fetchRetry(INDEX, { headers: { 'User-Agent': UA } });
      if (!res.ok) throw new Error(`index HTTP ${res.status}`);
      const $ = cheerio.load(await res.text());
      blocks = $('.wixui-rich-text__text').map((_, el) => $(el).text().replace(/\s+/g, ' ').trim()).get().filter(Boolean);
    } catch (err) {
      this.error(`Fetch failed: ${err.message}`);
      return { listings: [], stats: { pagesOk: 0, pageErrors: 1 } };
    }

    // Group blocks into listings at each "Price:" marker.
    const groups = [];
    let cur = null;
    for (const b of blocks) {
      if (/^Price\s*:/i.test(b)) { if (cur) groups.push(cur); cur = []; }
      if (cur) cur.push(b);
    }
    if (cur) groups.push(cur);

    const listings = [];
    const seen = new Set();
    for (const g of groups) {
      const field = (re) => {
        const hit = g.find((b) => re.test(b));
        return hit ? this.parseMoney((hit.match(re) || [])[1]) : null;
      };
      const asking = field(/^Price\s*:\s*\$?([\d,]+)/i) ?? field(/^Asking Price\s*:\s*\$?([\d,]+)/i);
      const revenue = field(/^Revenues?\s*:\s*\$?([\d,]+)/i);
      const sde = field(/^SDE\s*:\s*\$?([\d,]+)/i) ?? field(/^Cash Flow\s*:\s*\$?([\d,]+)/i);
      const locHit = g.find((b) => /^Location\s*:/i.test(b));
      const locRaw = locHit ? locHit.replace(/^Location\s*:\s*/i, '').trim() : null;
      // Title = the substantial non-label, non-bare-number, non-state block.
      const name = g.find((b) =>
        !LABEL.test(b) && !/^\$?[\d,]+$/.test(b) && !/^utah$/i.test(b) && /[a-z]/i.test(b) && b.length >= 8
      ) || null;
      if (!name && !asking && !revenue) continue;

      const id = crypto.createHash('md5').update(name || `${asking}-${revenue}-${sde}`).digest('hex').slice(0, 12);
      if (seen.has(id)) continue;
      seen.add(id);

      listings.push(this.listing({
        source_listing_id: id,
        name: name || `Zion listing ${id}`,
        url: INDEX,
        description: null,
        location: { city: null, state: stateFromText(locRaw) || 'UT', raw: locRaw },
        industry: null,
        asking_price: asking,
        gross_revenue: revenue,
        cash_flow: sde,
        cash_flow_type: sde ? 'SDE' : null,
        raw: {},
      }));
    }

    this.info(`Scrape complete — ${listings.length} listings`);
    return { listings, stats: { pagesOk: listings.length ? 1 : 0, pageErrors: 0 } };
  }
}

module.exports = ZionScraper;
