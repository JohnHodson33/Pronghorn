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

        // Office-broker enrichment (John 7/15 listing-broker directive): detail
        // pages carry the listing office's brokerage + phone (no individual
        // agent is published — firm-level rows, accepted since 7/16). Rides the
        // same ASP session; gated by cash flow + a per-run cap.
        // The national BIZMLS folder's detail template omits the contact block,
        // but the SAME LIST_NUMBERs render it under the bbfnew folder (verified
        // 7/16) — so the enrichment folder is configurable, independent of the
        // folder we searched.
        if (this.config.enrich_details) {
          await this.enrichBrokers(page, listings, this.config.enrich_folder || folder);
        }
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

  // Fetch detail pages (same ASP session) for listings clearing the cash-flow
  // gate and attach the office brokerage + phone as a firm-level broker.
  // Detail block shape (verified 7/13): "BROKER/ASSOC … Agent Direct : …
  // <b>SUNBELT BUSINESS BROKERS OF SOUTH FLORIDA</b> … Cell : (561) 827-6601".
  async enrichBrokers(page, listings, folder) {
    const minCash = this.config.enrich_min_cash_flow ?? 300000;
    const cap = this.config.max_detail_enrich ?? 150;
    const targets = listings
      .filter((l) => l.cash_flow != null && l.cash_flow >= minCash)
      .slice(0, cap);
    if (targets.length === 0) { this.info('Broker enrichment: no listings meet threshold'); return; }
    this.info(`Broker enrichment: ${targets.length} listing(s) (cash flow ≥ ${minCash}, cap ${cap})`);

    let enriched = 0;
    let errors = 0;
    for (const l of targets) {
      try {
        const html = await page.evaluate(async (f, id) => {
          const r = await fetch(`/cgi-bin/a-bus-d.asp?folder=${f}&LIST_NUMBER=${id}`);
          return r.ok ? await r.text() : null;
        }, folder, l.source_listing_id);
        if (!html) throw new Error('detail fetch not ok');

        // Contact table: heading bold is "BROKER/ASSOC" OR "ASSOCIATE" (varies
        // by template); left column = company then address, right column =
        // "Office : <phone>" / "Agent Direct : <phone>" label rows.
        const flat = html.replace(/[\r\n]+/g, ' ');
        const blockM = flat.match(/<b>\s*(?:BROKER\/ASSOC|ASSOCIATE)\s*<\/b>[\s\S]{0,2600}/i);
        if (blockM) {
          const block = blockM[0];
          const LABEL = /^(BROKER\/ASSOC|ASSOCIATE|Agent Direct|Fax|Cell|Email|Office|Phone|:)$/i;
          // Company: first non-label bold that isn't a street address.
          const company = (block.match(/<b>\s*([^<]{2,80}?)\s*<\/b>/g) || [])
            .map((b) => b.replace(/<\/?b>\s*/g, '').trim())
            .find((t) => t.length >= 8 && !LABEL.test(t) && !/^\d/.test(t) && /[A-Za-z]{3}/.test(t)) || null;
          // Phone: prefer the Agent Direct line, then Office, then any in block.
          const phoneAfter = (label) =>
            (block.match(new RegExp(`${label}[\\s\\S]{0,400}?(\\(?\\d{3}\\)?[\\s.-]\\d{3}[\\s.-]\\d{4})`, 'i')) || [])[1] || null;
          const phone = phoneAfter('Agent Direct') || phoneAfter('Office')
            || (block.replace(/<[^>]+>/g, ' ').match(/\(?\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}/) || [])[0] || null;
          if (company || phone) {
            l.broker = { name: null, company: company || 'BBF member office', phone, email: null };
            enriched++;
          }
        }
        await this.sleep(700);
      } catch (err) {
        if (++errors >= 8) { this.warn('Broker enrichment: too many errors, stopping'); break; }
      }
    }
    this.info(`Broker enrichment complete — ${enriched} enriched, ${errors} errors`);
  }
}

module.exports = BizmlsScraper;
