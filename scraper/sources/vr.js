// VR Business Brokers (vrbusinessbrokers.com) adapter. The corporate
// /businesses-for-sale/ page aggregates every franchise office's inventory into
// SSR cards (WP Views plugin; paginate with ?wpv_view_count=<v>&wpv_paged=N).
// Each `.vrbb-listing-box` card carries industry, location (county), asking
// price, and title; the link points to the office's own domain
// (vrmiamicenter.com/listing/<slug>/ etc.), which we use as the URL + id source.
// Cards don't expose cash flow, so these feed coverage/asking-price data more
// than computable multiples. Plain HTTP + cheerio.

const cheerio = require('cheerio');
const SourceScraper = require('../core/source_base');
const { stateFromText } = require('../core/states');

const BASE = 'https://www.vrbusinessbrokers.com/businesses-for-sale/';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

class VrScraper extends SourceScraper {
  async scrape() {
    const maxPages = this.config.max_pages || 25;
    const listings = [];
    const seen = new Set();
    let pagesOk = 0;
    let pageErrors = 0;
    let viewCount = null;

    for (let page = 1; page <= maxPages; page++) {
      const url = page === 1 ? BASE
        : `${BASE}?wpv_view_count=${viewCount || ''}&wpv_paged=${page}`;
      try {
        const res = await fetch(url, { headers: { 'User-Agent': UA } });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const html = await res.text();
        if (viewCount == null) {
          const m = html.match(/wpv_view_count["=]+(\d+)/);
          viewCount = m ? m[1] : '';
        }
        const cards = this.parse(html, seen);
        if (cards.length === 0) break;
        listings.push(...cards);
        pagesOk++;
        this.info(`Page ${page}: ${cards.length} listings (total ${listings.length})`);
        await this.sleep(900);
      } catch (err) {
        this.error(`Page ${page} failed: ${err.message}`);
        pageErrors++;
        break;
      }
    }

    // Named-agent enrichment (John 7/15 listing-broker directive). Office
    // detail pages carry the agent three ways (varies by office template):
    // an URL-encoded NDA-link JSON (BrokerFirstName/LastName/Email), an
    // /advisor/<slug>/ profile link (slug = agent name), and tel: links.
    // Cards have NO cash flow, so the gate is asking_price.
    if (this.config.enrich_details) await this.enrichBrokers(listings);

    this.info(`Scrape complete — ${listings.length} listings (${pageErrors} errors)`);
    return { listings, stats: { pagesOk, pageErrors } };
  }

  async enrichBrokers(listings) {
    const minAsk = this.config.enrich_min_asking ?? 500000;
    const cap = this.config.max_detail_enrich ?? 100;
    const targets = listings
      .filter((l) => l.asking_price != null && l.asking_price >= minAsk)
      .slice(0, cap);
    if (targets.length === 0) { this.info('Broker enrichment: no listings meet threshold'); return; }
    this.info(`Broker enrichment: ${targets.length} listing(s) (asking ≥ ${minAsk}, cap ${cap})`);

    const decode = (s) => {
      let out = s;
      try { out = decodeURIComponent(s); } catch { out = s.replace(/%40/g, '@').replace(/%2E/g, '.'); }
      // HTML entities survive URL-decoding ("Ed O&#039;Sullivan").
      return out.replace(/&#0?39;/g, "'").replace(/&amp;/g, '&').replace(/&quot;/g, '"');
    };
    let enriched = 0;
    let errors = 0;
    for (const l of targets) {
      try {
        const res = await this.fetchRetry(l.url, { headers: { 'User-Agent': UA } });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const html = (await res.text()).replace(/[\r\n]+/g, ' ');

        const first = (html.match(/BrokerFirstName%22%3A%22(.+?)%22/) || [])[1];
        const last = (html.match(/BrokerLastName%22%3A%22(.+?)%22/) || [])[1];
        const email = (html.match(/BrokerEmail%22%3A%22(.+?)%22/) || [])[1];
        // Fallback name: /advisor/<slug>/ humanized (dan-eitel → Dan Eitel).
        const advSlug = (html.match(/\/advisor\/([a-z0-9-]{4,40})\//) || [])[1];
        let name = first && last
          ? decode(`${first} ${last}`).trim()
          : advSlug ? advSlug.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') : null;
        // Guard against malformed NDA-JSON fragments ('", ",') — a name must be
        // real words; fall back to the advisor slug, else drop.
        if (name && !/^[A-Za-z][A-Za-z.'-]+(\s+[A-Za-z][A-Za-z.'-]+)+$/.test(name)) {
          name = advSlug ? advSlug.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') : null;
        }
        const phone = (html.match(/tel:\s*\(?(\d{3})\)?[\s.-]?(\d{3})[\s.-]?(\d{4})/) || []).slice(1).join('-') || null;

        if (name) {
          l.broker = {
            name,
            company: `VR Business Brokers (${(l.raw && l.raw.office_domain) || 'office'})`,
            phone: phone || null,
            email: email ? decode(email).trim() : null,
          };
          enriched++;
        }
        await this.sleep(800);
      } catch (err) {
        if (++errors >= 8) { this.warn('Broker enrichment: too many errors, stopping'); break; }
      }
    }
    this.info(`Broker enrichment complete — ${enriched} enriched (${errors} errors)`);
  }

  parse(html, seen) {
    const $ = cheerio.load(html);
    const out = [];

    $('.vrbb-listing-box').each((_, el) => {
      const box = $(el);
      const href = box.closest('a').attr('href') || box.find('a').attr('href') || '';
      const slugM = href.match(/\/listing\/([^/?#]+)/);
      if (!slugM) return;
      // id = office subdomain + slug (slugs can repeat across offices)
      const host = (href.match(/^https?:\/\/([^/]+)/) || [])[1] || 'vr';
      const id = `${host.replace(/^www\./, '').split('.')[0]}:${slugM[1]}`;
      if (seen.has(id)) return;
      seen.add(id);

      const industry = box.find('.vrbb-listing-pretty-industry-name').text().replace(/\s+/g, ' ').trim() || null;
      const locRaw = box.find('.vrbb-listing-loc').text().replace(/\s+/g, ' ').trim() || null;
      const price = this.parseMoney(box.find('.vrbb-listing-pretty-price').text());
      const name = box.find('.vrbb-listing-title').text().replace(/\s+/g, ' ').trim() || null;

      out.push(this.listing({
        source_listing_id: id,
        name: name || (industry ? `${industry} — ${locRaw || 'VR listing'}` : `VR listing ${slugM[1]}`),
        url: href,
        description: null,
        location: {
          city: locRaw ? locRaw.replace(/\s+county$/i, '').trim() : null,
          state: stateFromText(locRaw),
          raw: locRaw,
        },
        industry,
        asking_price: price,
        gross_revenue: null,
        cash_flow: null, // corporate cards omit cash flow
        cash_flow_type: null,
        raw: { office_domain: host },
      }));
    });

    return out;
  }
}

module.exports = VrScraper;
