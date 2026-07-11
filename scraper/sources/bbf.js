// Business Brokers of Florida (BBF) adapter. Their public MLS runs on the
// bizmls.com ASP platform. The search page is a POST form, but a session
// (obtained by loading the entry URL) plus `displayall=all` returns the full
// results table in one GET. Aggregates ~hundreds of FL brokerages → high value.
//
// Row = 7 cells: [0] Listing# (BBF-xxxx) · [1] "County, Florida USA" ·
// [2] Category (may be prefixed "*May Qualify For Visa*") · [3] Price (asking) ·
// [4] Down payment · [5] Disc Earn (SDE cash flow) · [6] Sales (revenue).
//
// Same platform backs other associations (AZBBA etc.) — this adapter generalizes
// via config (org/folder/state).

const cheerio = require('cheerio');
const SourceScraper = require('../core/source_base');

class BbfScraper extends SourceScraper {
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
      const county = locRaw.replace(/,?\s*florida\s*usa\s*$/i, '').replace(/,\s*$/, '').trim() || null;
      const industry = (cells[2] || '').replace(/\*[^*]+\*/g, '').trim() || null; // strip "*May Qualify For Visa*"

      out.push(this.listing({
        source_listing_id: id,
        name: industry ? `${industry} — ${county || 'Florida'} (${id})` : `BBF Listing ${id}`,
        url: `https://bizmls.com/cgi-bin/a-bus-d.asp?folder=${folder}&LIST_NUMBER=${id}`,
        description: null,
        location: {
          city: county, // BBF gives county, not city
          state: 'FL',
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

    return out;
  }
}

module.exports = BbfScraper;
