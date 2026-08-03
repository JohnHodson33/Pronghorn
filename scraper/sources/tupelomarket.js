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
// Per-listing CRM API: full structured record (askingPrice, revenue, cashFlow,
// ebitda, description, industries, createdAt) for any marketplace cuid. The
// marketplace cards omit asking price entirely — this API is the only way to
// get it, and asking→implied_multiple is a key Market Multiples input.
const CRM_API = 'https://crm.tupelosmb.com/api/public/listings/';
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

    // Financial enrichment via the per-listing CRM API — the cards never show
    // asking price, so every listing gets one API GET to fill it (plus
    // authoritative revenue/cash-flow/EBITDA, description, industries).
    await this.enrichFinancials(listings);

    // Named-agent enrichment (John 7/15 listing-broker directive). Tupelo has
    // no structured broker field (7/13 recon: the public API exposes only the
    // firm; no __NEXT_DATA__). But SOME detail pages name the agent in prose —
    // "Contact <Name>, <Title>, <Firm>, [email protected], <phone>, for …" —
    // with the address Cloudflare-obfuscated in data-cfemail (decodable).
    // Sparse (~1 in 6 pages) but each hit is a FULL contact (name+firm+email+
    // phone), so we take precision over recall: require BOTH the cfemail
    // element and the Contact-prose, and read the phone from that same prose
    // window (a page-wide phone regex matches cuid digit-strings — verified).
    if (this.config.enrich_details) await this.enrichBrokers(listings);

    this.info(`Scrape complete — ${listings.length} listings across ${pagesOk} states (${pageErrors} errors)`);
    return { listings, stats: { pagesOk, pageErrors } };
  }

  // One CRM-API GET per listing. Enriches ALL listings by default (asking
  // price is the point — a partial pass recreates the coverage gap); the cap
  // is a runaway guard, value-sorted per the sort-before-cap convention so the
  // highest-value deals are protected if the marketplace ever outgrows it.
  async enrichFinancials(listings) {
    const cap = this.config.max_api_enrich ?? 800;
    const targets = [...listings]
      .sort((a, b) => (b.cash_flow ?? -1) - (a.cash_flow ?? -1))
      .slice(0, cap);
    if (targets.length < listings.length) this.warn(`API enrichment capped: ${targets.length}/${listings.length} (raise max_api_enrich)`);
    this.info(`API enrichment: ${targets.length} listing(s)`);

    let enriched = 0;
    let errors = 0;
    let misses = 0;
    let fallbacks = 0;
    for (const l of targets) {
      try {
        const res = await this.fetchRetry(`${CRM_API}${l.source_listing_id}`, {
          headers: { 'User-Agent': UA, Accept: 'application/json' },
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const d = await res.json();
        if (!d || d.id !== l.source_listing_id) throw new Error('id mismatch');

        l.asking_price = this.parseMoney(d.askingPrice) ?? l.asking_price;
        // API is authoritative over the card parse when it has a value.
        l.gross_revenue = this.parseMoney(d.revenue) ?? l.gross_revenue;
        const cf = this.parseMoney(d.cashFlow);
        const ebitda = this.parseMoney(d.ebitda);
        if (cf != null) { l.cash_flow = cf; l.cash_flow_type = 'SDE'; }
        else if (l.cash_flow == null && ebitda != null) { l.cash_flow = ebitda; l.cash_flow_type = 'EBITDA'; }
        if (!l.description && d.description) l.description = String(d.description).slice(0, 2000);
        if (!l.date_listed && d.createdAt) l.date_listed = new Date(d.createdAt).toISOString().slice(0, 10);
        const ind = (d.industries || [])
          .map((i) => [i.sectorTitle, i.subSectorTitle].filter(Boolean).join(' / '))
          .filter(Boolean).join('; ');
        if (ind) l.industry = ind;
        l.raw.ebitda = ebitda ?? undefined;
        l.raw.year_established = d.yearEstablished ?? undefined;
        l.raw.api_enriched = true;
        enriched++;
        await this.sleep(350);
      } catch (err) {
        // 404 = the CRM API doesn't serve this cuid (7/31 run: ~60% of
        // marketplace cards!). The marketplace detail page still SSRs the
        // asking price — fall back to parsing it.
        if (/HTTP 404/.test(err.message)) {
          misses++;
          if (await this.enrichFromDetailPage(l)) fallbacks++;
          continue;
        }
        if (++errors <= 3) this.warn(`API enrich ${l.source_listing_id}: ${err.message}`);
        if (errors >= 15) { this.warn('API enrichment: too many errors, stopping'); break; }
      }
    }
    this.info(`API enrichment complete — ${enriched} via API, ${fallbacks}/${misses} API-404s recovered via detail page, ${errors} errors`);
  }

  // Fallback for CRM-API 404s: the marketplace detail page server-renders
  // labeled stat blocks ("<span…>Asking Price</span><span…>$500,000</span>",
  // same shape for Revenue / Cash Flow). Fill only missing fields; a label
  // with no adjacent dollar figure stays null — never invent.
  async enrichFromDetailPage(l) {
    try {
      const res = await this.fetchRetry(l.url, { headers: { 'User-Agent': UA } });
      if (!res.ok) return false;
      const html = await res.text();
      const grab = (lbl) => {
        const m = html.match(new RegExp(`>\\s*${lbl}\\s*</span><span[^>]*>\\s*\\$([\\d,]+)`, 'i'));
        return m ? this.parseMoney(m[1]) : null;
      };
      const ask = grab('Asking Price');
      if (ask != null) l.asking_price = ask;
      if (l.gross_revenue == null) l.gross_revenue = grab('Revenue');
      if (l.cash_flow == null) {
        const cf = grab('Cash Flow');
        if (cf != null) { l.cash_flow = cf; l.cash_flow_type = 'SDE'; }
      }
      await this.sleep(350);
      return ask != null;
    } catch { return false; }
  }

  // Cloudflare email obfuscation: first byte is the XOR key.
  decodeCfEmail(hex) {
    try {
      const key = parseInt(hex.slice(0, 2), 16);
      let out = '';
      for (let i = 2; i < hex.length; i += 2) out += String.fromCharCode(parseInt(hex.slice(i, i + 2), 16) ^ key);
      return /^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(out) ? out : null;
    } catch { return null; }
  }

  async enrichBrokers(listings) {
    const minCash = this.config.enrich_min_cash_flow ?? 300000;
    const cap = this.config.max_detail_enrich ?? 100;
    const targets = listings
      .filter((l) => l.cash_flow != null && l.cash_flow >= minCash && l.url)
      .slice(0, cap);
    if (targets.length === 0) { this.info('Broker enrichment: no listings meet threshold'); return; }
    this.info(`Broker enrichment: ${targets.length} listing(s) (cash flow ≥ ${minCash}, cap ${cap})`);

    let enriched = 0;
    let errors = 0;
    for (const l of targets) {
      try {
        const res = await this.fetchRetry(l.url, { headers: { 'User-Agent': UA } });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const html = (await res.text()).replace(/[\r\n]+/g, ' ');
        const cf = html.match(/data-cfemail="([0-9a-f]{6,})"/i);
        const email = cf ? this.decodeCfEmail(cf[1]) : null;

        const at = html.search(/Contact\s+[A-Z][a-z]/);
        if (email && at > 0) {
          const prose = html.slice(at, at + 400).replace(/<[^>]*>/g, ' ').replace(/&#160;|&nbsp;/g, ' ').replace(/\s+/g, ' ');
          // "Contact <Name>, <Title>, <Firm>, [email protected] , <phone>, …"
          const m = prose.match(/Contact\s+([A-Z][a-zA-Z.'-]+(?:\s+[A-Z][a-zA-Z.'-]+){1,2})\s*,\s*([^,]{3,40})\s*,\s*([^,]{3,60})\s*,/);
          const phone = (prose.match(/\(?\d{3}\)?[\s.-]\d{3}[-.\s]\d{4}/) || [])[0] || null;
          if (m) {
            l.broker = { name: m[1].trim(), company: m[3].trim(), phone, email };
            enriched++;
          }
        }
        await this.sleep(700);
      } catch (err) {
        if (++errors >= 8) { this.warn('Broker enrichment: too many errors, stopping'); break; }
      }
    }
    this.info(`Broker enrichment complete — ${enriched} enriched (${errors} errors)`);
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
        asking_price: null, // cards omit it — filled by enrichFinancials (CRM API)
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
