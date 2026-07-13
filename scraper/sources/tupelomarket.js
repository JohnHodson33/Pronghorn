// Tupelo Marketplace platform-wide adapter. tupelosmb.com/marketplace aggregates
// the inventory of EVERY broker on the Tupelo SMB CRM. There's no working
// URL-paginated API, but each state page
//   /marketplace/business-for-sale-in-<state>
// server-renders cards for that state: category badge, title, Revenue + Cash
// Flow, and "City/County, State, United States". We crawl all 50 states and
// parse the SSR cards. Broader than the per-org API (many brokers) though
// shallower per state; daily runs accumulate coverage via first_seen.
//
// Listing id is the Tupelo cuid (same key the per-org API uses), so this source
// is the single canonical Tupelo feed — the per-org `certifiedbb` source is
// disabled to avoid duplicate rows for the same cuid under two source_ids.

const cheerio = require('cheerio');
const SourceScraper = require('../core/source_base');
const { STATE_CODES } = require('../core/states');

const BASE = 'https://www.tupelosmb.com/marketplace/business-for-sale-in-';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

class TupeloMarketScraper extends SourceScraper {
  async scrape() {
    const states = Object.keys(STATE_CODES).filter((s) => s !== 'district of columbia');
    const listings = [];
    const seen = new Set();
    let pagesOk = 0;
    let pageErrors = 0;

    for (const state of states) {
      const slug = state.replace(/\s+/g, '-');
      try {
        const res = await fetch(`${BASE}${slug}`, { headers: { 'User-Agent': UA } });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const cards = this.parse(await res.text(), STATE_CODES[state], seen);
        listings.push(...cards);
        pagesOk++;
        if (cards.length) this.info(`${state}: ${cards.length} (total ${listings.length})`);
        await this.sleep(700);
      } catch (err) {
        this.error(`${state} failed: ${err.message}`);
        if (++pageErrors >= 8) { this.warn('Too many errors, stopping'); break; }
      }
    }

    this.info(`Scrape complete — ${listings.length} listings across ${pagesOk} states (${pageErrors} errors)`);
    return { listings, stats: { pagesOk, pageErrors } };
  }

  parse(html, stateCode, seen) {
    const $ = cheerio.load(html);
    const out = [];

    $('a[href*="/marketplace/listings/"]').each((_, a) => {
      const card = $(a);
      const idM = (card.attr('href') || '').match(/\/marketplace\/listings\/([a-z0-9]+)/i);
      if (!idM || seen.has(idM[1])) return;
      const id = idM[1];
      seen.add(id);

      const title = card.find('h3').first().text().replace(/\s+/g, ' ').trim() || null;
      const category = card.find('div[style*="background-color"]').first().text().replace(/\s+/g, ' ').trim() || null;

      // Financial rows render as a value div followed/preceded by a label div.
      let revenue = null;
      let cashFlow = null;
      card.find('div,span,p').each((_, el) => {
        const label = $(el).clone().children().remove().end().text().replace(/\s+/g, ' ').trim();
        if (label === 'Revenue' || label === 'Cash Flow') {
          const val = this.parseMoney($(el).prev().text()) ?? this.parseMoney($(el).next().text());
          if (label === 'Revenue') revenue = val;
          else cashFlow = val;
        }
      });

      // Location is its own span: "City, County, State, United States" (city
      // and/or county optional). Read it from that element — NOT the glued
      // card.text(), which runs the title/description straight into the city
      // (e.g. "Turnkey OpportunityBirmingham"). Take the SHORTEST element that
      // ends in ", United States" (the description prose can also mention the
      // U.S. but is long), then parse the city out structurally.
      let locText = null;
      card.find('span, div').each((_, el) => {
        const t = $(el).text().replace(/\s+/g, ' ').trim();
        if (/,\s*United States$/.test(t) && t.length <= 60 && /^[A-Za-z]/.test(t)) {
          if (locText === null || t.length < locText.length) locText = t;
        }
      });
      const { city, locRaw } = this.parseUsLoc(locText);

      out.push(this.listing({
        source_listing_id: id,
        name: title,
        url: `https://www.tupelosmb.com/marketplace/listings/${id}`,
        description: null,
        location: {
          city,
          state: stateCode, // page is state-scoped
          raw: locRaw,
        },
        industry: category,
        asking_price: null, // marketplace cards show revenue + cash flow, not asking
        gross_revenue: revenue,
        cash_flow: cashFlow,
        cash_flow_type: cashFlow != null ? 'SDE' : null,
        raw: {},
      }));
    });

    return out;
  }

  // "City, County, State, United States" → { city (clean, or null), locRaw }.
  // Drops the trailing "United States" and state; the city is the first token
  // that isn't a county. Returns null city when only county/state are present,
  // so description text can never masquerade as a city.
  parseUsLoc(locText) {
    if (!locText) return { city: null, locRaw: null };
    const parts = locText.split(',').map((s) => s.trim()).filter(Boolean);
    if (parts.length && /^united states$/i.test(parts[parts.length - 1])) parts.pop();
    if (parts.length) parts.pop(); // trailing state name (page is state-scoped)
    const city = parts.find((p) => p && !/county$/i.test(p)) || null;
    return { city, locRaw: locText.replace(/,\s*United States\s*$/i, '').trim() || null };
  }
}

module.exports = TupeloMarketScraper;
