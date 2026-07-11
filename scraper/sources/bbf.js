// bizmls.com platform adapter (ASP MLS used by state broker associations).
// The search page is a POST form, but a session (obtained by loading the entry
// URL) plus `displayall=all&rpp=9999` returns the full results table in one GET.
//
// Registered twice in config.json:
//   "bbf"    — Business Brokers of Florida (org=bbf, folder=bbfnew, state=Florida);
//              ~2,100 listings, hundreds of FL brokerages.
//   "bizmls" — national search (org/folder=BIZMLS, state=ALL) which carries every
//              member listing incl. TX/NC/GA rows; excludes FL (bbf is
//              authoritative there) via exclude_states.
//
// Row = 7 cells: [0] Listing# · [1] "County, State USA" · [2] Category (may be
// prefixed with badges like "*May Qualify For Visa*") · [3] Price (asking) ·
// [4] Down payment · [5] Disc Earn (SDE cash flow) · [6] Sales (revenue).

const cheerio = require('cheerio');
const SourceScraper = require('../core/source_base');
const { stateFromText } = require('../core/states');

class BizmlsScraper extends SourceScraper {
  async scrape() {
    const org = this.config.org || 'bbf';
    const folder = this.config.folder || 'bbfnew';
    const state = this.config.state || 'Florida';
    const entry = this.config.entry || 'https://bizmls.com/bbf/businesses';
    const listings = [];
    let pageErrors = 0;

    await this.withBrowser(async (browser) => {
      const page = await browser.newPage();
      await page.setViewport({ width: 1280, height: 800 });
      try {
        // Load entry to establish the ASP session, then pull the full table.
        await page.goto(entry, { waitUntil: 'networkidle2', timeout: 45000 });
        await this.sleep(1500);
        // rpp (results per page) high enough to return the full inventory in one shot.
        const html = await page.evaluate(async (f, o, s) => {
          const r = await fetch(`/cgi-bin/a-bus2.asp?folder=${f}&org=${o}&state=${s}&displayall=all&rpp=9999`);
          return await r.text();
        }, folder, org, state);
        listings.push(...this.parse(html, folder));
      } catch (err) {
        this.error(`Failed: ${err.message}`);
        pageErrors++;
      }
    });

    this.info(`Scrape complete — ${listings.length} listings (${pageErrors} errors)`);
    return { listings, stats: { pagesOk: listings.length ? 1 : 0, pageErrors } };
  }

  parse(html, folder) {
    const $ = cheerio.load(html);
    const out = [];
    const seen = new Set();
    const exclude = new Set(this.config.exclude_states || []);
    let excluded = 0;

    $('tr').each((_, el) => {
      const link = $(el).find('a[onclick*="LIST_NUMBER"]').first();
      if (!link.length) return;
      const onclick = link.attr('onclick') || '';
      const idM = onclick.match(/LIST_NUMBER=([A-Z0-9-]+)/i);
      const id = idM ? idM[1] : link.text().trim();
      if (!id || seen.has(id)) return;
      seen.add(id);

      const cells = $(el).find('td').map((_, td) => $(td).text().replace(/\s+/g, ' ').trim()).get();
      if (cells.length < 7) return;

      const locRaw = cells[1] || '';
      const stateCode = stateFromText(locRaw); // "Withheld" etc. → null
      if (stateCode && exclude.has(stateCode)) { excluded++; return; }
      const county = locRaw.replace(/,\s*[A-Za-z .]+?\s*USA\s*$/i, '').replace(/,\s*$/, '').trim() || null;
      const industry = (cells[2] || '').replace(/\*[^*]+\*/g, '').trim() || null; // strip "*May Qualify For Visa*" badges

      out.push(this.listing({
        source_listing_id: id,
        name: industry ? `${industry} — ${county || stateCode || 'undisclosed'} (${id})` : `Listing ${id}`,
        url: `https://bizmls.com/cgi-bin/a-bus-d.asp?folder=${folder}&LIST_NUMBER=${id}`,
        description: null,
        location: {
          city: county, // bizmls gives county, not city
          state: stateCode,
          raw: locRaw || null,
        },
        industry,
        asking_price: this.parseMoney(cells[3]),
        gross_revenue: this.parseMoney(cells[6]),
        cash_flow: this.parseMoney(cells[5]),
        cash_flow_type: 'SDE', // "Disc Earn" = discretionary earnings
        raw: { down_payment: this.parseMoney(cells[4]), county },
      }));
    });

    if (excluded) this.info(`Skipped ${excluded} rows in excluded states (${[...exclude].join(', ')})`);
    return out;
  }
}

module.exports = BizmlsScraper;
