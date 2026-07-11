// BizBen (bizben.com) adapter — California-focused marketplace, 5,000+ listings.
// The Next.js frontend is fed by a public AWS API Gateway JSON endpoint:
//   GET .../Prod/top-business?posting_types=forSale&limit=N&pagination_token=T
// Fully structured records (asking/cashFlow/revenue, city/county/state, broker
// name+phone+email+license, established year). No browser, no auth.
// Pagination quirk: the response's nextPageKey is a JSON *string*; the request
// wants it wrapped in one more layer of JSON quoting (double-encoded).

const SourceScraper = require('../core/source_base');
const { stateFromText } = require('../core/states');

const API = 'https://vohsd4dbkg.execute-api.us-east-1.amazonaws.com/Prod/top-business';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

class BizbenScraper extends SourceScraper {
  async scrape() {
    const limit = this.config.limit || 100;
    const maxPages = this.config.max_pages || 80;
    const listings = [];
    const seen = new Set();
    let pagesOk = 0;
    let pageErrors = 0;

    // Two separate pools: fast_track=true (paid placements, ~300) and
    // fast_track=false ("regular" phase — the bulk of the inventory). The API
    // never transitions between them on its own, so run both passes.
    for (const fastTrack of ['true', 'false']) {
      let token = null;
      for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
        try {
          let url = `${API}?posting_types=forSale&limit=${limit}&fast_track=${fastTrack}`;
          if (token) url += `&pagination_token=${encodeURIComponent(JSON.stringify(token))}`;
          const data = await this.fetchPage(url);
          const batch = data.businesses || [];

          let added = 0;
          for (const b of batch) {
            const l = this.map(b);
            if (l && !seen.has(l.source_listing_id)) {
              seen.add(l.source_listing_id);
              listings.push(l);
              added++;
            }
          }
          pagesOk++;
          this.info(`fast_track=${fastTrack} page ${pageNum}: ${batch.length} records, ${added} kept (total ${listings.length})`);

          token = data.nextPageKey || null;
          if (!token || batch.length === 0) break;
          await this.sleep(1000);
        } catch (err) {
          // The AWS API Gateway throws intermittent 500s under rapid pagination.
          // fetchPage already retried with backoff; if it still failed we can't
          // continue this pool (pagination is token-chained, so a lost page
          // breaks the chain) — but keep everything collected so far and move to
          // the next pool rather than aborting the whole source.
          this.error(`fast_track=${fastTrack} page ${pageNum} failed after retries: ${err.message}`);
          pageErrors++;
          break;
        }
      }
    }

    this.info(`Scrape complete — ${listings.length} listings (${pageErrors} errors)`);
    return { listings, stats: { pagesOk, pageErrors } };
  }

  // Fetch one page with retry + exponential backoff on transient failures
  // (429 rate-limit, 5xx). Returns parsed JSON or throws after exhausting tries.
  async fetchPage(url, tries = 4) {
    let lastErr;
    for (let attempt = 1; attempt <= tries; attempt++) {
      try {
        const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json' } });
        if (res.status === 429 || res.status >= 500) throw new Error(`HTTP ${res.status}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return await res.json();
      } catch (err) {
        lastErr = err;
        const transient = /HTTP (429|5\d\d)/.test(err.message) || /fetch failed|ECONN|ETIMEDOUT|socket/i.test(err.message);
        if (!transient || attempt === tries) break;
        const backoff = 1500 * 2 ** (attempt - 1); // 1.5s, 3s, 6s
        this.warn(`fetch ${err.message} — retry ${attempt}/${tries - 1} in ${backoff}ms`);
        await this.sleep(backoff);
      }
    }
    throw lastErr;
  }

  map(b) {
    if (b.status && b.status !== 'active') return null;
    if (b.soldAt) return null;
    const id = String(b.postID || (b.entityId || '').replace(/^#POST#/, '') || '').trim();
    if (!id) return null;

    const stateRaw = b.state || null;
    const brokerName = [b.firstName, b.lastName].filter(Boolean).join(' ') || b.contactName || null;

    return this.listing({
      source_listing_id: id,
      name: (b.title || '').trim() || null,
      url: b.urlPath ? `https://www.bizben.com/business-for-sale/${b.urlPath.replace(/^\/?(business-for-sale\/)?/, '')}` : `https://www.bizben.com/business-for-sale/${id}`,
      description: (b.shortProfile || b.description || '').replace(/\s+/g, ' ').trim().slice(0, 500) || null,
      location: {
        city: b.city || null,
        state: stateRaw ? stateFromText(stateRaw) : null,
        raw: [b.city, b.county, stateRaw].filter(Boolean).join(', ') || null,
      },
      industry: [b.businessCategory, (b.businessTypes || []).slice(0, 3).join(' / ')].filter(Boolean).join(': ') || null,
      asking_price: this.parseMoney(b.askingPrice),
      gross_revenue: this.parseMoney(b.revenue ?? b.revenueInt),
      cash_flow: this.parseMoney(b.cashFlow ?? b.adjustedNet),
      cash_flow_type: 'SDE', // BizBen "cash flow" = adjusted net / owner benefit
      broker: brokerName ? { name: brokerName, company: null, phone: b.phoneNumber || null, email: b.email || null } : null,
      date_listed: b.createdAt ? new Date(b.createdAt).toISOString().slice(0, 10) : null,
      raw: {
        county: b.county || null,
        established_year: b.establishedYear || null,
        employees: b.employees || null,
        down_payment: this.parseMoney(b.down ?? b.downInt),
        ffe: this.parseMoney(b.ffe),
        broker_license: b.license || null,
        fast_track: !!b.isFastTrack,
        business_types: b.businessTypes || null,
      },
    });
  }
}

module.exports = BizbenScraper;
