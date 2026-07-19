// Transworld Business Advisors adapter. Their listing search is a Laravel SPA
// backed by POST https://www.tworld.com/api/listings (CSRF-protected). We load
// the search page in a real browser to obtain the XSRF-TOKEN cookie, then call
// the API from inside the browser context (inherits cookies + CSRF header),
// paginating via the response `pagination` block. ~3,500 US listings.
//
// Response item fields: heading, slug, location (state name), price (asking),
// seller_discretionary_earnings / cash_flow / ebitda / annual_revenue,
// categories (JSON string array), industry.
//
// DETAIL ENRICHMENT: the search API omits the broker. The per-listing detail
// API (POST /api/listings/<slug-lowercased>) returns an `employee` block
// (name, email, phone, license, office) plus richer listing fields
// (ebitda_price, year_established, reason_for_sale). Fetching that for all
// ~3,500 listings would triple the request count, so we enrich only the subset
// worth a broker contact: cash flow ≥ enrich_min_cash_flow (thesis SDE floor),
// capped at max_detail_enrich. Toggle with config.enrich_details.

const SourceScraper = require('../core/source_base');
const { stateFromText, regionState, STATE_CODES } = require('../core/states');

const DELAY_MS = 1500;
const DETAIL_DELAY_MS = 900;
const STATE_ABBRS = new Set(Object.values(STATE_CODES));

// The DETAIL API's `location` is richer than the search feed (which leaves some
// listings state-less) but arrives in mixed shapes: a bare code ("OH"), a region
// + code (" Eastern NC"), or "County, State" ("Maricopa County, Arizona").
// stateFromText handles the last; regionState handles metro shorthands; add a
// bare/embedded 2-letter-code fallback — safe HERE because this is a structured
// geography field, not free title text (where a stray "IN"/"OR" would misfire).
function stateFromDetailLoc(loc) {
  if (!loc) return null;
  const viaText = stateFromText(loc) || regionState(loc);
  if (viaText) return viaText;
  const codes = String(loc).toUpperCase().match(/\b[A-Z]{2}\b/g) || [];
  for (const code of codes) if (STATE_ABBRS.has(code)) return code;
  return null;
}

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

      // --- Detail enrichment (broker + extra fields) on the qualifying subset ---
      if (this.config.enrich_details !== false) {
        await this.enrichDetails(page, listings);
      }
    });

    this.info(`Scrape complete — ${listings.length} listings (${pageErrors} errors)`);
    return { listings, stats: { pagesOk: listings.length ? 1 : 0, pageErrors } };
  }

  async enrichDetails(page, listings) {
    const minCash = this.config.enrich_min_cash_flow ?? 300000;
    const cap = this.config.max_detail_enrich ?? 150;
    const targets = listings
      .filter((l) => l.cash_flow != null && l.cash_flow >= minCash)
      .slice(0, cap);
    if (targets.length === 0) { this.info('Detail enrichment: no listings meet threshold'); return; }
    this.info(`Detail enrichment: ${targets.length} listing(s) (cash flow ≥ ${minCash}, cap ${cap})`);

    let enriched = 0;
    let errors = 0;
    for (const l of targets) {
      try {
        const detail = await page.evaluate(async (slug) => {
          const xsrf = decodeURIComponent((document.cookie.match(/XSRF-TOKEN=([^;]+)/) || [])[1] || '');
          const r = await fetch(`https://www.tworld.com/api/listings/${slug.toLowerCase()}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'X-XSRF-TOKEN': xsrf, 'X-Requested-With': 'XMLHttpRequest' },
            body: '{}',
          });
          if (!r.ok) return { status: r.status };
          const j = await r.json();
          const root = j.data || j;
          return { status: 200, employee: root.employee || null, listing: root.listing || null };
        }, l.source_listing_id);

        if (detail.status !== 200) { errors++; continue; }

        const emp = detail.employee;
        if (emp && emp.name) {
          l.broker = {
            name: emp.name.trim(),
            company: emp.office && emp.office.name ? `Transworld — ${emp.office.name}` : 'Transworld Business Advisors',
            phone: emp.phone || null,
            email: emp.email || null,
          };
        }
        const det = detail.listing || {};
        // Backfill EBITDA / metadata the search API doesn't carry.
        if (l.cash_flow == null) {
          const ebitda = this.parseMoney(det.ebitda_price);
          if (ebitda) { l.cash_flow = ebitda; l.cash_flow_type = 'EBITDA'; }
        }
        // Backfill STATE from the richer detail location when the search feed
        // left it blank (John 7/15: thesis-fit deals must not show empty
        // location). Costs nothing — this detail page is already fetched. City
        // stays null: Transworld only ever publishes state/region/county.
        // NOTE: the canonical field is l.location.state — filters.js derives
        // priority_state and db_output persists state from THERE, not l.state.
        if (l.location && !l.location.state) {
          const st = stateFromDetailLoc(det.location);
          if (st) l.location.state = st;
        }
        l.raw = {
          ...l.raw,
          year_established: det.year_established || null,
          reason_for_sale: det.reason_for_sale || null,
          detail_location: det.location || null, // county/region text (no city published)
          broker_license: emp && emp.license ? emp.license : null,
          office: emp && emp.office ? emp.office.name : null,
        };
        enriched++;
        await this.sleep(DETAIL_DELAY_MS);
      } catch (err) {
        errors++;
        if (errors >= 5) { this.warn('Detail enrichment: too many errors, stopping'); break; }
      }
    }
    this.info(`Detail enrichment complete — ${enriched} enriched, ${errors} errors`);
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
