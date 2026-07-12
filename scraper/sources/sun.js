// Sun Acquisitions (sunacquisitions.com) adapter — Chicago/Midwest M&A firm.
// SSR WordPress: /featured-business-listings/ lists every business_listing post
// (single page; /page/N/ mirrors page 1), and each detail page carries
// "Location: ... | Listing #: 3N1139" plus field rows (Industry, Established)
// and per-year financial lines "2025: Revenue: $X Adjusted EBITDA: $Y".
// Plain HTTP + cheerio, ~24 detail fetches per run. Listings marked "Sold"
// are skipped (their financial lines are removed, so no comp value).

const cheerio = require('cheerio');
const SourceScraper = require('../core/source_base');
const { stateFromText } = require('../core/states');

const INDEX_URL = 'https://sunacquisitions.com/featured-business-listings/';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

class SunAcquisitionsScraper extends SourceScraper {
  async scrape() {
    const listings = [];
    let pagesOk = 0;
    let pageErrors = 0;

    let links;
    try {
      const res = await this.fetchRetry(INDEX_URL, { headers: { 'User-Agent': UA } });
      if (!res.ok) throw new Error(`HTTP ${res.status} on index`);
      const $ = cheerio.load(await res.text());
      links = [...new Set(
        $('a[href*="/business_listing/"]').map((_, a) => $(a).attr('href')).get()
          .map((h) => new URL(h, INDEX_URL).href)
      )];
      pagesOk++;
      this.info(`Index: ${links.length} listings`);
    } catch (err) {
      this.error(`Index fetch failed: ${err.message}`);
      return { listings: [], stats: { pagesOk: 0, pageErrors: 1 } };
    }

    for (const url of links) {
      try {
        const res = await fetch(url, { headers: { 'User-Agent': UA } });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const l = this.parseDetail(url, await res.text());
        if (l) listings.push(l);
        pagesOk++;
        await this.sleep(800);
      } catch (err) {
        this.error(`Detail failed (${url}): ${err.message}`);
        pageErrors++;
      }
    }

    this.info(`Scrape complete — ${listings.length} listings (${pageErrors} errors)`);
    return { listings, stats: { pagesOk, pageErrors } };
  }

  parseDetail(url, html) {
    const $ = cheerio.load(html);
    const main = $('main, article, .entry-content, body').first();
    const text = main.text().replace(/[ \t]+/g, ' ');

    const name = $('h1').first().text().replace(/\s+/g, ' ').trim() || null;

    // The header line lives in its own <h4> ("Location: ... | Listing #: 3N1139").
    // Parse from that element — cheerio .text() on larger containers glues
    // adjacent elements together and corrupts the id.
    const headerEl = $('h4').filter((_, el) => /Listing\s*#/i.test($(el).text())).first();
    const locM = headerEl.text().replace(/\s+/g, ' ').match(/Location:\s*([^|]+?)\s*\|\s*Listing\s*#:\s*([A-Za-z0-9-]+)/i);
    const locRaw = locM ? locM[1].trim() : null;
    const id = locM ? locM[2].trim() : url.replace(/\/$/, '').split('/').pop();

    // Post-header status badge: <h2 class="status">Sold</h2>
    const sold = /sold/i.test($('.status').first().text());
    if (sold) return null;

    // Field rows are separate <p><strong>Label:</strong> value</p> elements,
    // so read each <p> on its own (glued .text() runs values together).
    const fields = {};
    $('p').each((_, el) => {
      const t = $(el).text().replace(/\s+/g, ' ').trim();
      const m = t.match(/^([A-Za-z -]+):\s*(.+)$/);
      if (m && m[2].length < 120) fields[m[1].trim().toLowerCase()] = m[2].trim();
    });
    const field = (label) => fields[label.toLowerCase()] || null;
    const industry = field('Industry');

    // Financial lines like "2025: Revenue: $1,506,278 Adjusted EBITDA: $1,097,275" — take the latest year.
    let revenue = null;
    let ebitda = null;
    let finYear = null;
    for (const m of text.matchAll(/(20\d{2}):\s*Revenue:\s*(\$[\d,.]+)(?:\s*Adjusted EBITDA:\s*(\$[\d,.]+))?/gi)) {
      const year = parseInt(m[1], 10);
      if (finYear == null || year > finYear) {
        finYear = year;
        revenue = this.parseMoney(m[2]);
        ebitda = m[3] ? this.parseMoney(m[3]) : null;
      }
    }

    // Location is Midwest-regional prose ("Greater Chicago Area", "Northwest
    // Indiana, Lake County") — stateFromText catches explicit state names;
    // Chicago-area default IL.
    let state = stateFromText(locRaw);
    if (!state && /chicago/i.test(locRaw || '')) state = 'IL';

    return this.listing({
      source_listing_id: id,
      name,
      url,
      description: null,
      location: { city: null, state, raw: locRaw },
      industry,
      asking_price: null, // Sun doesn't publish asking prices
      gross_revenue: revenue,
      cash_flow: ebitda,
      cash_flow_type: ebitda ? 'EBITDA' : null, // "Adjusted EBITDA"
      raw: {
        financials_year: finYear,
        established: field('Established In'),
        real_estate_included: field('Real Estate Included'),
        franchise: field('Franchise in'),
        reason_for_selling: field('Reason for Selling'),
      },
    });
  }
}

module.exports = SunAcquisitionsScraper;
