// First Choice Business Brokers (fcbb.com) adapter. The Duda-CMS site is a
// front for a JSON API at api.fcbb.com/Fcbb/GetListings — a POST that returns
// fully structured records (price, gross sales, total income = SDE, per-office
// broker profile with phone/license, category, state). Static header tokens
// (application_api_key etc.) gate the API but are shipped in the page bundle,
// so no browser/session is needed. ~827 listings, national FCBB franchise net.

const SourceScraper = require('../core/source_base');
const { stateFromText } = require('../core/states');

const API = 'https://api.fcbb.com/Fcbb/GetListings';
const HEADERS = {
  'content-type': 'application/json',
  application_api_key: 'fcbb.web.api.token1',
  website_external_id: 'external.corporate.site.100001',
  website_reference_id: 'reference.corporate.site.100001',
  origin: 'https://fcbb.com',
  referer: 'https://fcbb.com/',
  'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
};

class FcbbScraper extends SourceScraper {
  async scrape() {
    const pageSize = this.config.page_size || 100;
    const maxPages = this.config.max_pages || 20;
    const listings = [];
    const seen = new Set();
    let pagesOk = 0;
    let pageErrors = 0;
    let totalPages = null;

    for (let page = 1; page <= maxPages; page++) {
      try {
        const body = {
          location: '', sort: '', keyword: '', pricefrom: '', priceto: '',
          choicetodisplay: '', selleractive: '', assetsale: '',
          pagesize: String(pageSize), page, category: [''],
        };
        const data = await this.postJson(body);
        if (totalPages == null) {
          totalPages = data.TotalPages;
          this.info(`${data.TotalItems} total listings across ${totalPages} page(s)`);
        }
        const items = data.Items || [];
        let added = 0;
        for (const it of items) {
          const l = this.map(it);
          if (l && !seen.has(l.source_listing_id)) {
            seen.add(l.source_listing_id);
            listings.push(l);
            added++;
          }
        }
        pagesOk++;
        this.info(`Page ${page}/${totalPages}: ${items.length} records, ${added} kept (total ${listings.length})`);
        if (items.length === 0 || (totalPages && page >= totalPages)) break;
        await this.sleep(800);
      } catch (err) {
        // Pages are number-indexed (not token-chained), so a failed page after
        // retries doesn't break the rest — skip it and keep going.
        this.error(`Page ${page} failed after retries: ${err.message} — skipping`);
        pageErrors++;
        if (pageErrors >= 4) { this.warn('Too many page errors, stopping'); break; }
      }
    }

    this.info(`Scrape complete — ${listings.length} listings (${pageErrors} errors)`);
    return { listings, stats: { pagesOk, pageErrors } };
  }

  // POST with retry + exponential backoff on transient 429/5xx + network errors.
  async postJson(body, tries = 4) {
    let lastErr;
    for (let attempt = 1; attempt <= tries; attempt++) {
      try {
        const res = await fetch(API, { method: 'POST', headers: HEADERS, body: JSON.stringify(body) });
        if (res.status === 429 || res.status >= 500) throw new Error(`HTTP ${res.status}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return await res.json();
      } catch (err) {
        lastErr = err;
        const transient = /HTTP (429|5\d\d)/.test(err.message) || /fetch failed|ECONN|ETIMEDOUT|socket/i.test(err.message);
        if (!transient || attempt === tries) break;
        const backoff = 1500 * 2 ** (attempt - 1);
        this.warn(`fcbb POST ${err.message} — retry ${attempt}/${tries - 1} in ${backoff}ms`);
        await this.sleep(backoff);
      }
    }
    throw lastErr;
  }

  map(it) {
    if (it.ListingSoldDate) return null; // sold — keep only active inventory
    const id = String(it.OmsListingID || it.BusinessListingID || it.ListingNumberWithLocationCode || '').trim();
    if (!id) return null;

    const office = it.OfficeProfile || {};
    const state = it.State ? stateFromText(it.State) : null;

    return this.listing({
      source_listing_id: id,
      name: (it.BusinessName || '').trim() || null,
      url: it.ListingUrl ? new URL(it.ListingUrl, 'https://www.fcbb.com').href : null,
      description: this.stripHtml(it.BusinessDescription),
      location: {
        city: it.BusinessLocation || office.City || null,
        state,
        raw: [it.BusinessLocation, it.State].filter(Boolean).join(', ') || null,
      },
      industry: it.ListingCategory && it.ListingCategory.CategoryName ? it.ListingCategory.CategoryName : null,
      asking_price: this.parseMoney(it.ListingPrice),
      gross_revenue: this.parseMoney(it.GrossSales),
      cash_flow: this.parseMoney(it.TotalIncome), // FCBB "Total Income" = SDE / owner benefit
      cash_flow_type: 'SDE',
      // Office-level contact (FCBB publishes no individual agent). Branded so
      // the firm-level broker row reads "FCBB Los Angeles #130", not "#130".
      broker: office.OfficeDisplayNameWithLocationCode
        ? { name: null, company: `FCBB ${office.OfficeDisplayNameWithLocationCode}`, phone: office.OfficePhoneNumber || null, email: null }
        : null,
      date_listed: this.dateOnly(it.ListingAgreementDate),
      raw: {
        listing_number: it.ListingNumberWithLocationCode || null,
        location_code: it.LocationCode || null,
        down_payment: this.parseMoney(it.DownPayment),
        inventory: this.parseMoney(it.InventoryAmount),
        ffe: this.parseMoney(it.EquipmentFixtures),
        full_time_employees: it.FullTimeEmployees ?? null,
        established_year: it.BusinessStartDateInYear || null,
        reason_for_selling: it.ReasonForSelling || null,
        e2_visa_eligible: !!it.E2VisaEligibleBusiness,
        office_license: office.OfficeLicenseNo || null,
      },
    });
  }

  stripHtml(s) {
    if (!s) return null;
    return String(s).replace(/<[^>]+>/g, ' ').replace(/&nbsp;|&amp;|&rsquo;|&#\d+;/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 500) || null;
  }

  dateOnly(s) {
    if (!s) return null;
    const d = new Date(s);
    return isNaN(d) ? null : d.toISOString().slice(0, 10);
  }
}

module.exports = FcbbScraper;
