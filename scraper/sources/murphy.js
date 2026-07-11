// Murphy Business (murphybusiness.com) adapter. The "View Our Listings" page is
// a WordPress theme whose grid is filled by admin-ajax.php (action=
// ajax_new_business_search_result) returning HTML cards. The call needs an
// api_token that the page embeds inline (rotates per page-load), so each run:
//   1. GET the listings page, regex out `var api_token = "..."`.
//   2. POST admin-ajax.php per page (per_page=200 honored despite the 10/30 UI
//      dropdown) until a page returns no cards.
// Plain HTTP — no browser. Cards carry title, asking price, SDE, state (often
// "Confidential"), and a /business-brokerage/detail/<id>/<slug> link.

const cheerio = require('cheerio');
const SourceScraper = require('../core/source_base');
const { stateFromText } = require('../core/states');

const PAGE_URL = 'https://murphybusiness.com/business-brokerage/view-our-listings/';
const AJAX_URL = 'https://murphybusiness.com/wp-admin/admin-ajax.php';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

class MurphyScraper extends SourceScraper {
  async scrape() {
    const perPage = this.config.per_page || 200;
    const maxPages = this.config.max_pages || 10;
    const listings = [];
    const seen = new Set();
    let pagesOk = 0;
    let pageErrors = 0;

    let token;
    try {
      const res = await fetch(PAGE_URL, { headers: { 'User-Agent': UA } });
      if (!res.ok) throw new Error(`HTTP ${res.status} on listings page`);
      const html = await res.text();
      const m = html.match(/var api_token = "([^"]+)"/);
      if (!m) throw new Error('api_token not found in listings page');
      token = m[1];
    } catch (err) {
      this.error(`Token fetch failed: ${err.message}`);
      return { listings: [], stats: { pagesOk: 0, pageErrors: 1 } };
    }

    for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
      try {
        const body = new URLSearchParams({
          action: 'ajax_new_business_search_result',
          api_token: token,
          per_page: String(perPage),
          page_number: String(pageNum),
        });
        const html = await this.postText(body.toString());
        const cards = this.parse(html, seen);
        if (cards.length === 0) break;
        listings.push(...cards);
        pagesOk++;
        this.info(`Page ${pageNum}: ${cards.length} listings (total ${listings.length})`);
        await this.sleep(1200);
      } catch (err) {
        // page_number pagination is independent — skip a failed page rather than
        // abandoning the rest.
        this.error(`Page ${pageNum} failed after retries: ${err.message} — skipping`);
        pageErrors++;
        if (pageErrors >= 4) { this.warn('Too many page errors, stopping'); break; }
      }
    }

    this.info(`Scrape complete — ${listings.length} listings (${pageErrors} errors)`);
    return { listings, stats: { pagesOk, pageErrors } };
  }

  // POST the admin-ajax form with retry + backoff on transient 429/5xx + network
  // errors; returns the HTML body.
  async postText(bodyStr, tries = 4) {
    let lastErr;
    for (let attempt = 1; attempt <= tries; attempt++) {
      try {
        const res = await fetch(AJAX_URL, {
          method: 'POST',
          headers: { 'User-Agent': UA, 'Content-Type': 'application/x-www-form-urlencoded' },
          body: bodyStr,
        });
        if (res.status === 429 || res.status >= 500) throw new Error(`HTTP ${res.status}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return await res.text();
      } catch (err) {
        lastErr = err;
        const transient = /HTTP (429|5\d\d)/.test(err.message) || /fetch failed|ECONN|ETIMEDOUT|socket/i.test(err.message);
        if (!transient || attempt === tries) break;
        const backoff = 1500 * 2 ** (attempt - 1);
        this.warn(`murphy POST ${err.message} — retry ${attempt}/${tries - 1} in ${backoff}ms`);
        await this.sleep(backoff);
      }
    }
    throw lastErr;
  }

  parse(html, seen) {
    const $ = cheerio.load(html);
    const out = [];

    $('.card').each((_, el) => {
      const card = $(el);
      const href = card.find('a[href*="/business-brokerage/detail/"]').attr('href') || '';
      const idM = href.match(/\/detail\/(\d+)\b/);
      if (!idM || seen.has(idM[1])) return;
      const id = idM[1];
      seen.add(id);

      const name = card.find('.card-title').text().replace(/\s+/g, ' ').trim() || null;
      const price = this.parseMoney(card.find('.price').first().text());

      let cashFlow = null;
      let locRaw = null;
      card.find('li').each((_, li) => {
        const t = $(li).text().replace(/\s+/g, ' ').trim();
        const sdeM = t.match(/^SDE:\s*(.+)$/i);
        if (sdeM) cashFlow = this.parseMoney(sdeM[1]);
        else if (t && t !== '|' && !sdeM) locRaw = t;
      });
      const confidential = /^confidential$/i.test(locRaw || '');

      out.push(this.listing({
        source_listing_id: id,
        name,
        url: href,
        description: null,
        location: {
          city: null,
          state: confidential ? null : stateFromText(locRaw),
          raw: locRaw,
        },
        industry: null, // grid cards carry no category; the title usually names the trade
        asking_price: price,
        gross_revenue: null,
        cash_flow: cashFlow,
        cash_flow_type: 'SDE',
        raw: { status_tag: card.find('.tags').text().trim() || null, location_confidential: confidential },
      }));
    });

    return out;
  }
}

module.exports = MurphyScraper;
