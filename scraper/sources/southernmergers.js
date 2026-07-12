// Southern Mergers (southernmergers.com) adapter — Southeast US regional broker
// covering the Carolinas (NC/SC priority states) + Florida. Classic ASP site:
// state index pages (business-forSale-carolina.asp / -florida.asp) link detail
// pages at business-for-sale/business_details.asp?LID=N. The detail markup is
// HTML-entity-escaped (&quot; etc.), so we decode first, then parse the shared
// resultsBusiness template: first <h2> = business name, .valuesItems <li>
// "$value Label" = financials, office block <li> "City:/State:" = location.
// Plain HTTP + cheerio, no browser.

const cheerio = require('cheerio');
const SourceScraper = require('../core/source_base');
const { stateFromText } = require('../core/states');

const BASE = 'https://southernmergers.com';
const INDEXES = ['/business-forSale-carolina.asp', '/business-forSale-florida.asp'];
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

class SouthernMergersScraper extends SourceScraper {
  async scrape() {
    const listings = [];
    const seen = new Set();
    let pagesOk = 0;
    let pageErrors = 0;

    // Collect LIDs from both state index pages.
    const lids = new Set();
    for (const path of INDEXES) {
      try {
        const res = await fetch(`${BASE}${path}`, { headers: { 'User-Agent': UA, Accept: 'text/html' } });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const html = await res.text();
        for (const m of html.matchAll(/LID=(\d+)/gi)) lids.add(m[1]);
      } catch (err) {
        this.error(`Index ${path} failed: ${err.message}`);
        pageErrors++;
      }
    }
    this.info(`Index: ${lids.size} unique listings across ${INDEXES.length} state pages`);

    for (const lid of lids) {
      if (seen.has(lid)) continue;
      seen.add(lid);
      const url = `${BASE}/business-for-sale/business_details.asp?LID=${lid}`;
      try {
        const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'text/html' } });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const l = this.parseDetail(lid, url, await res.text());
        if (l) listings.push(l);
        pagesOk++;
        await this.sleep(700);
      } catch (err) {
        this.error(`Detail ${lid} failed: ${err.message}`);
        if (++pageErrors >= 8) { this.warn('Too many errors, stopping'); break; }
      }
    }

    this.info(`Scrape complete — ${listings.length} listings (${pageErrors} errors)`);
    return { listings, stats: { pagesOk, pageErrors } };
  }

  parseDetail(lid, url, rawHtml) {
    // The listing block is entity-escaped in the source; decode then parse.
    const html = rawHtml.replace(/&quot;/g, '"').replace(/&#34;/g, '"').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&');
    const $ = cheerio.load(html);

    // Name: first content <h2> that isn't a section header.
    let name = null;
    $('h2').each((_, el) => {
      const t = $(el).text().replace(/\s+/g, ' ').replace(/^Business Profile:\s*/i, '').trim();
      if (t && !/^(financial information|business location|purchase information|other business information)$/i.test(t) && !name) name = t;
    });

    // Financials: .valuesItems li = "$value Label".
    const fin = {};
    $('.valuesItems li').each((_, el) => {
      const t = $(el).text().replace(/\s+/g, ' ').trim();
      const m = t.match(/^(\$[\d,]+|On request|[\d,]+)\s*(.+)$/i);
      if (m) fin[m[2].trim().toLowerCase()] = m[1];
      else { // label-only or reversed
        const lm = t.match(/^([A-Za-z /]+?)\s*(\$[\d,]+|On request|Yes|No)$/i);
        if (lm) fin[lm[1].trim().toLowerCase()] = lm[2];
      }
    });

    // Location: office block li = "City: X" / "State: Y".
    let city = null;
    let stateName = null;
    $('.resultsBusiness__detailsOffice li, .block li, ul.block li').each((_, el) => {
      const t = $(el).text().replace(/\s+/g, ' ').trim();
      const c = t.match(/^City:\s*(.+)$/i);
      const s = t.match(/^State(?:\/Prov)?:\s*(.+)$/i);
      const g = t.match(/^General Location:\s*(.+)$/i);
      if (c) city = c[1].trim();
      else if (s) stateName = s[1].trim();
      else if (g && !city) city = g[1].trim();
    });

    return this.listing({
      source_listing_id: lid,
      name,
      url,
      description: null,
      location: { city, state: stateFromText(stateName) || stateFromText(city), raw: [city, stateName].filter(Boolean).join(', ') || null },
      industry: null, // name states the trade
      asking_price: this.parseMoney(fin['asking price'] || fin['selling price']),
      gross_revenue: this.parseMoney(fin['gross revenue'] || fin['gross sales']),
      cash_flow: this.parseMoney(fin['cash flow']),
      cash_flow_type: fin['cash flow'] ? 'cash flow' : null,
      raw: { down_payment: this.parseMoney(fin['down payment']), financing: fin['financing'] || null },
    });
  }
}

module.exports = SouthernMergersScraper;
