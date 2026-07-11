// Transworld Business Advisors adapter. Their listing search is a Laravel SPA
// backed by POST https://www.tworld.com/api/listings (CSRF-protected). We load
// the search page in a real browser to obtain the XSRF-TOKEN cookie, then call
// the API from inside the browser context (inherits cookies + CSRF header),
// paginating via the response `pagination` block. ~3,500 US listings.
//
// Response item fields: heading, slug, location (state name), price (asking),
// seller_discretionary_earnings / cash_flow / ebitda / annual_revenue,
// categories (JSON string array), industry.

const SourceScraper = require('../core/source_base');
const { stateFromText } = require('../core/states');

const DELAY_MS = 1500;

class TransworldScraper extends SourceScraper {
  async scrape() {
    const maxPages = this.config.max_pages || 60;
    const listings = [];
    let pageErrors = 0;

    await this.withBrowser(async (browser) => {
      const page = await browser.newPage();
      await page.setViewport({ width: 1280, height: 800 });
      await page.goto('https://www.tworld.com/buy-a-business/business-listing-search', { waitUntil: 'networkidle2', timeout: 45000 });
      await this.sleep(2500);

      let lastPage = maxPages;
      for (let pg = 1; pg <= maxPages && pg <= lastPage; pg++) {
        this.info(`Fetching API page ${pg}${lastPage < maxPages ? `/${lastPage}` : ''}`);
        let resp;
        try {
          resp = await page.evaluate(async (pageNum) => {
            const xsrf = decodeURIComponent((document.cookie.match(/XSRF-TOKEN=([^;]+)/) || [])[1] || '');
            const body = {
              page: pageNum, per_page: 48,
              country: { value: 4, name: 'United States' },
              state: null, region: null, categories: null, sub_category: null,
              sort: { value: '-c_listing_price__c' },
            };
            const r = await fetch('https://www.tworld.com/api/listings', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'X-XSRF-TOKEN': xsrf, 'X-Requested-With': 'XMLHttpRequest' },
              body: JSON.stringify(body),
            });
            const j = await r.json();
            return { status: r.status, data: j.data || [], pagination: j.pagination || null };
          }, pg);
        } catch (err) {
          this.error(`API page ${pg} failed: ${err.message}`);
          if (++pageErrors >= 3) break;
          continue;
        }

        if (!resp.data || resp.data.length === 0) { this.info(`Page ${pg}: empty — done`); break; }
        if (resp.pagination) {
          lastPage = resp.pagination.last_page || resp.pagination.total_pages || lastPage;
        }
        for (const it of resp.data) {
          const l = this.mapItem(it);
          if (l) listings.push(l);
        }
        this.info(`Page ${pg}: ${resp.data.length} items (${listings.length} total)`);
        await this.sleep(DELAY_MS);
      }
    });

    this.info(`Scrape complete — ${listings.length} listings (${pageErrors} errors)`);
    return { listings, stats: { pagesOk: listings.length ? 1 : 0, pageErrors } };
  }

  mapItem(it) {
    const slug = it.slug;
    if (!slug) return null;
    let cats = it.categories;
    try { const arr = JSON.parse(cats); if (Array.isArray(arr)) cats = arr.join(', '); } catch { /* leave as-is */ }

    const sde = this.parseMoney(it.seller_discretionary_earnings ?? it.sde ?? it.cash_flow);
    const ebitda = this.parseMoney(it.ebitda);
    const cash = sde ?? ebitda;

    return this.listing({
      source_listing_id: slug,
      name: (it.heading || '').trim() || null,
      url: `https://www.tworld.com/buy-a-business/listings/${slug}`,
      description: (it.description || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 500) || null,
      location: {
        city: null, // API gives state-level location only
        state: stateFromText(it.location) || null,
        raw: it.location || null,
      },
      industry: cats || it.industry || null,
      asking_price: this.parseMoney(it.price),
      gross_revenue: this.parseMoney(it.annual_revenue ?? it.revenue ?? it.gross_revenue),
      cash_flow: cash,
      cash_flow_type: sde ? 'SDE' : ebitda ? 'EBITDA' : null,
      raw: { tribe_slug: it.tribe_slug },
    });
  }
}

module.exports = TransworldScraper;
