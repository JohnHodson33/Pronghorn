// BusinessBroker.net adapter. Independent inventory (Franchise Ventures), unlike
// BizQuest which mirrors BizBuySell. Strategy: targeted crawl of keyword/industry
// pages matching the thesis (configured in sources.businessbroker.paths) rather
// than the whole-site firehose — the relevance filter still runs afterward.
//
// Extraction: DOM cards carry the detail link (/business-for-sale/<slug>/<id>.aspx)
// and "Asking Price / Cash Flow / Gross Revenue" text; the page's JSON-LD ItemList
// (LocalBusiness entries) supplies city/state/price by listing name as a fallback.

const cheerio = require('cheerio');
const SourceScraper = require('../core/source_base');

const DELAY_MS = 2500;

// Verified against the site's keyword/industry indexes 2026-07-10. No dedicated
// pest/HVAC/tree/roofing pages exist — those listings surface in landscaping,
// services-repair, and services-construction (relevance filter sorts them out).
const DEFAULT_PATHS = [
  '/keyword/landscaping-and-lawn-care-businesses-for-sale.aspx',
  '/keyword/lawn-care-businesses-for-sale.aspx',
  '/keyword/plumbing-businesses-for-sale.aspx',
  '/keyword/pool-service-and-repair-businesses-for-sale.aspx',
  '/keyword/electrician-businesses-for-sale.aspx',
  '/keyword/handyman-businesses-for-sale.aspx',
  '/keyword/carpet-cleaning-businesses-for-sale.aspx',
  '/keyword/maid-service-businesses-for-sale.aspx',
  '/industry/services-cleaning-businesses-for-sale.aspx',
  '/industry/services-landscaping-businesses-for-sale.aspx',
  '/industry/services-repair-businesses-for-sale.aspx',
  '/industry/services-construction-businesses-for-sale.aspx',
];

const { STATE_CODES } = require('../core/states');

// normalize a name for fuzzy JSON-LD matching: lowercase, alphanumerics only
const normName = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');

// Valid 2-letter US state codes, and a shape check that rejects description
// text that leaked into the greedy city regex ("...Established Business, NY").
const VALID_STATE_CODES = new Set(Object.values(STATE_CODES));
const CITY_STOPWORD = /^(and|the|for|with|of|to|in|on|at|is|are|or|a|an|business|businesses|sale|company|companies|service|services|llc|inc|opportunity|established|profitable|turnkey|priced|owner|absentee|located|near|new|great)$/i;
function cityLooksReal(c) {
  if (!c) return false;
  const s = String(c).replace(/\s+/g, ' ').trim();
  if (s.length < 2 || s.length > 26 || /\d/.test(s)) return false;
  const words = s.split(' ');
  if (words.length > 3) return false;                       // real cities are ≤3 words
  if (words.some((w) => CITY_STOPWORD.test(w))) return false; // description leakage
  return true;
}

class BusinessBrokerScraper extends SourceScraper {
  async scrape() {
    const base = 'https://www.businessbroker.net';
    const paths = this.config.paths || DEFAULT_PATHS;
    const maxPages = this.config.max_pages_per_path || 5;
    const seen = new Set();
    const listings = [];
    let pagesOk = 0;
    let pageErrors = 0;

    await this.withBrowser(async (browser) => {
      const page = await browser.newPage();
      await page.setViewport({ width: 1280, height: 800 });

      for (const path of paths) {
        for (let pg = 1; pg <= maxPages; pg++) {
          const url = `${base}${path}${pg > 1 ? `?page=${pg}` : ''}`;
          this.info(`Scraping ${path} page ${pg}`);
          try {
            await page.goto(url, { waitUntil: 'networkidle2', timeout: 45000 });
            const title = await page.title();
            if (/no such page/i.test(title)) {
              this.warn(`${path} — page does not exist, skipping path`);
              break;
            }
            const html = await page.content();
            const pageListings = this.parsePage(html, path);
            if (pageListings.length === 0) {
              this.info(`${path} page ${pg}: no listings — end of results`);
              break;
            }
            let added = 0;
            for (const l of pageListings) {
              if (!seen.has(l.id)) { seen.add(l.id); listings.push(l); added++; }
            }
            this.info(`${path} page ${pg}: ${pageListings.length} found, ${added} new, ${listings.length} total`);
            pagesOk++;
            if (added === 0 && pg > 1) break; // repeating content — stop paging this path
          } catch (err) {
            this.error(`${path} page ${pg} failed: ${err.message}`);
            pageErrors++;
            break;
          }
          await this.sleep(DELAY_MS);
        }
      }

      // Detail-page broker enrichment (name/email/phone) for outreach targets.
      if (this.config.enrich_details !== false) {
        await this.enrichBrokers(page, listings);
      }
    });

    this.info(`Scrape complete — ${listings.length} unique listings (${pagesOk} pages ok, ${pageErrors} errors)`);
    return { listings, stats: { pagesOk, pageErrors } };
  }

  // The listing detail page embeds a JSON-LD Organization whose `founder.name`
  // is the listing broker, `email` the broker/brokerage email, and `telephone`
  // the phone (often "Not Disclosed"). Enrich a bounded subset — the listings
  // most worth an outreach contact (cash flow ≥ floor) — to avoid fetching all
  // ~700 detail pages every run. brokerage is inferred from the email domain.
  async enrichBrokers(page, listings) {
    const minCash = this.config.enrich_min_cash_flow ?? 300000;
    const cap = this.config.max_detail_enrich ?? 150;
    const targets = listings
      .filter((l) => l.cash_flow != null && l.cash_flow >= minCash)
      .sort((a, b) => b.cash_flow - a.cash_flow) // highest cash flow first — cap protects top deals, not a scrape-order slice
      .slice(0, cap);
    if (targets.length === 0) { this.info('Broker enrichment: no listings meet threshold'); return; }
    this.info(`Broker enrichment: ${targets.length} listing(s) (cash flow ≥ ${minCash}, cap ${cap})`);

    let enriched = 0;
    let errors = 0;
    for (const l of targets) {
      try {
        await page.goto(l.url, { waitUntil: 'domcontentloaded', timeout: 40000 });
        const contact = await page.evaluate(() => {
          const clean = (v) => (v && !/not\s*disclosed|undisclosed|confidential|n\/?a/i.test(v) ? String(v).trim() : null);
          for (const s of document.querySelectorAll('script[type="application/ld+json"]')) {
            try {
              const j = JSON.parse(s.textContent);
              if (j && j['@type'] === 'Organization') {
                return {
                  name: clean(j.founder && j.founder.name),
                  email: clean(j.email),
                  phone: clean(j.telephone),
                };
              }
            } catch { /* skip */ }
          }
          return null;
        });
        if (contact && (contact.name || contact.email || contact.phone)) {
          const domain = contact.email ? (contact.email.split('@')[1] || null) : null;
          const genericInbox = domain && /^(gmail|yahoo|outlook|hotmail|aol|icloud|comcast|me)\./i.test(domain);
          // Only seed the brokers table when there's a real person name — avoid
          // rows named after an email domain. Raw contact is always kept below.
          if (contact.name) {
            l.broker = {
              name: contact.name,
              company: genericInbox ? null : domain, // brokerage domain, not a personal inbox
              phone: contact.phone || null,
              email: contact.email || null,
            };
          }
          l.raw = { ...l.raw, detail_contact: { name: contact.name, email: contact.email, phone: contact.phone } };
          enriched++;
        }
        await this.sleep(1200);
      } catch (err) {
        if (++errors >= 6) { this.warn('Broker enrichment: too many errors, stopping'); break; }
      }
    }
    this.info(`Broker enrichment complete — ${enriched} enriched, ${errors} errors`);
  }

  parsePage(html, path) {
    const $ = cheerio.load(html);

    // JSON-LD ItemList → name-keyed fallback for city/state/price
    const ldByName = new Map();
    $('script[type="application/ld+json"]').each((_, el) => {
      try {
        const j = JSON.parse($(el).html());
        const items = j.mainEntity?.itemListElement || [];
        for (const it of items) {
          const biz = it.item;
          if (biz?.name) {
            ldByName.set(normName(biz.name), {
              city: biz.address?.addressLocality || null,
              state: biz.address?.addressRegion || null,
              price: this.parseMoney(biz.makesOffer?.[0]?.price ?? biz.priceRange),
            });
          }
        }
      } catch { /* ignore */ }
    });

    // Pass 1: several anchors can point at the same listing (title link, a
    // whole-card wrapper link, and "Read More" buttons). Keep the shortest
    // NON-JUNK anchor text per id; the URL slug is the reliable fallback
    // (e.g. /business-for-sale/premier-ohio-environmental.../1011566.aspx).
    const JUNK = /^(read\s*more|view( details| listing)?|details|learn\s*more|more\s*info|photos?|contact|save|share)$/i;
    const anchors = new Map(); // id → { href, name, el }
    $('a[href*="/business-for-sale/"]').each((_, el) => {
      const href = $(el).attr('href') || '';
      const m = href.match(/\/(\d+)\.aspx$/);
      if (!m) return;
      const id = m[1];
      const raw = $(el).text().replace(/\s+/g, ' ').trim();
      const text = raw && !JUNK.test(raw) && raw.length >= 8 && raw.length <= 160 ? raw : null;
      const prev = anchors.get(id);
      if (!prev) anchors.set(id, { href, name: text, el });
      else if (text && (!prev.name || text.length < prev.name.length)) {
        anchors.set(id, { href, name: text, el: prev.el });
      }
    });

    const slugWords = (href) => {
      const m = href.match(/\/business-for-sale\/([^/]+)\/\d+\.aspx$/);
      return m ? m[1].split('-').filter(Boolean) : null;
    };
    const slugName = (href) => {
      const w = slugWords(href);
      return w ? w.map((x) => x.charAt(0).toUpperCase() + x.slice(1)).join(' ') : null;
    };
    // listing slugs end in the state name: "...-augusta-georgia" / "...-new-york"
    const slugState = (href) => {
      const w = slugWords(href);
      if (!w || w.length < 2) return null;
      const lastTwo = `${w[w.length - 2]} ${w[w.length - 1]}`.toLowerCase();
      return STATE_CODES[lastTwo] ?? STATE_CODES[w[w.length - 1].toLowerCase()] ?? null;
    };

    const out = [];
    for (const [id, a] of anchors) {
      const { href } = a;
      const name = a.name || slugName(href);

      // find a card-sized ancestor containing financial text
      let card = $(a.el);
      let cardText = '';
      for (let i = 0; i < 8; i++) {
        card = card.parent();
        if (!card.length) break;
        const t = card.text().replace(/\s+/g, ' ').trim();
        if (/\$/.test(t) && t.length < 1500) { cardText = t; break; }
        if (t.length >= 1500) break;
      }
      if (!name && !cardText) continue;

      const asking = this.matchMoney(cardText, /asking\s*price:?\s*\$\s*([\d,.]+)/i);
      const cashFlow = this.matchMoney(cardText, /cash\s*flow:?\s*\$\s*([\d,.]+)/i);
      const revenue = this.matchMoney(cardText, /(?:gross\s*revenue|revenue|gross\s*income):?\s*\$\s*([\d,.]+)/i);
      // Prefer the STRUCTURED JSON-LD locality (clean). The card-text regex is
      // only a fallback and is strictly validated — the old greedy match let
      // description text ending in ", Xx" land in city, and accepted any two
      // caps as a "state". Non-greedy, must start capitalized, state must be a
      // real code, and the city must pass the shape check.
      const locM = cardText.match(/([A-Z][A-Za-z .'-]{1,26}?),\s*([A-Z]{2})\b/);
      const regexState = locM && VALID_STATE_CODES.has(locM[2]) ? locM[2] : null;
      const regexCity = regexState && cityLooksReal(locM[1]) ? locM[1].trim() : null;

      const ld = name ? ldByName.get(normName(name)) : null;
      const clean = (v) => (v && !/not\s*disclosed|undisclosed|confidential/i.test(v) ? v.trim() : null);
      const city = clean(ld?.city) ?? clean(regexCity);
      const state = ld?.state || regexState || slugState(href);

      out.push(this.listing({
        source_listing_id: id,
        name,
        url: href.startsWith('http') ? href : `https://www.businessbroker.net${href}`,
        description: cardText ? cardText.slice(0, 500) : null,
        location: {
          city,
          state,
          raw: [city, state].filter(Boolean).join(', ') || null,
        },
        asking_price: asking ?? ld?.price ?? null,
        gross_revenue: revenue,
        cash_flow: cashFlow,
        cash_flow_type: cashFlow != null ? 'cash flow' : null, // site label is generic
        raw: { crawl_path: path },
      }));
    }

    return out;
  }

  matchMoney(text, re) {
    const m = text.match(re);
    return m ? this.parseMoney(m[1]) : null;
  }
}

module.exports = BusinessBrokerScraper;
