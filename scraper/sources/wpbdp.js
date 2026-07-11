// WordPress Business Directory Plugin (wpbdp) adapter. Many independent/regional
// brokers run their "businesses for sale" page on this popular plugin. Pattern:
//   <directory_url>?wpbdp_view=all_listings  → index linking detail pages
//     (…/<slug>-listing-<id>/)
//   detail page → wpbdp field rows (class wpbdp-field-<slug>) with a label span
//     + value: Revenue, Cash Flow, Asking Price, location, Broker, etc.
// One adapter serves every wpbdp broker — list their directory URLs in config.
// Plain HTTP + cheerio, no browser.
//
// Reuse: find more wpbdp brokers (page source contains
// wp-content/plugins/business-directory-plugin) and add their directory URL.

const cheerio = require('cheerio');
const SourceScraper = require('../core/source_base');
const { stateFromText } = require('../core/states');

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

class WpbdpScraper extends SourceScraper {
  async scrape() {
    const dirs = this.config.directories || [];
    if (dirs.length === 0) {
      this.error('No directories configured');
      return { listings: [], stats: { pagesOk: 0, pageErrors: 1 } };
    }
    const listings = [];
    const seen = new Set();
    let pagesOk = 0;
    let pageErrors = 0;

    for (const entry of dirs) {
      const dirUrl = typeof entry === 'string' ? entry : entry.url;
      const brokerCo = (typeof entry === 'object' && entry.name) || null;
      let detailUrls;
      try {
        const sep = dirUrl.includes('?') ? '&' : '?';
        const res = await fetch(`${dirUrl}${sep}wpbdp_view=all_listings`, { headers: { 'User-Agent': UA } });
        if (!res.ok) throw new Error(`index HTTP ${res.status}`);
        const $ = cheerio.load(await res.text());
        detailUrls = [...new Set(
          $('a[href*="-listing-"]').map((_, a) => $(a).attr('href')).get()
            .filter((h) => /-listing-\d+\/?$/.test(h))
        )];
        this.info(`${brokerCo || dirUrl}: ${detailUrls.length} listings`);
      } catch (err) {
        this.error(`index failed (${dirUrl}): ${err.message}`);
        pageErrors++;
        continue;
      }

      for (const url of detailUrls) {
        const id = (url.match(/-listing-(\d+)/) || [])[1];
        if (!id || seen.has(`${dirUrl}#${id}`)) continue;
        seen.add(`${dirUrl}#${id}`);
        try {
          const res = await fetch(url, { headers: { 'User-Agent': UA } });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const l = this.parseDetail(id, url, await res.text(), brokerCo);
          if (l) listings.push(l);
          pagesOk++;
          await this.sleep(600);
        } catch (err) {
          this.error(`detail failed (${id}): ${err.message}`);
          if (++pageErrors >= 10) { this.warn('Too many errors, stopping'); return { listings, stats: { pagesOk, pageErrors } }; }
        }
      }
    }

    this.info(`Scrape complete — ${listings.length} listings (${listings.filter((l) => l.broker).length} with broker)`);
    return { listings, stats: { pagesOk, pageErrors } };
  }

  parseDetail(id, url, html, brokerCo) {
    const $ = cheerio.load(html);
    const fields = {};
    $('[class*="wpbdp-field-"]').each((_, el) => {
      const label = $(el).find('.field-label, .wpbdp-field-label').first().text().replace(/\s+/g, ' ').replace(/:$/, '').trim();
      if (!label) return;
      const val = $(el).clone().find('.field-label, .wpbdp-field-label').remove().end().text().replace(/\s+/g, ' ').trim();
      if (val) fields[label.toLowerCase()] = val;
    });

    // Name: og:title is the clean business title; the wpbdp field labelled with
    // the directory's own title-field slug varies per site, so fall back to it.
    const og = ($('meta[property="og:title"]').attr('content') || '').replace(/\s*[|–-]\s*[^|–-]*$/, '').replace(/\s+/g, ' ').trim();
    const name = (og && !/^\d/.test(og) ? og : null)
      || fields['business name'] || fields['title']
      || $('.listing-title, h1').first().text().replace(/\s+/g, ' ').trim()
      || null;
    const locRaw = fields['location'] || fields['display'] || fields['city/state'] || null;
    const broker = fields['broker'] || fields['listing broker'] || fields['agent'] || null;

    // wpbdp financial fields often carry parentheticals ("$146,000 (add'l $48K…)")
    // — take only the first dollar amount so parseMoney doesn't concatenate them.
    const firstMoney = (s) => this.parseMoney((String(s || '').match(/\$?[\d,]+(?:\.\d+)?/) || [])[0]);

    return this.listing({
      source_listing_id: id,
      name: name && !/^listing$/i.test(name) ? name : `wpbdp listing ${id}`,
      url,
      description: (fields['business description'] || '').slice(0, 500) || null,
      location: {
        city: locRaw ? locRaw.split(',')[0].trim() : null,
        state: stateFromText(locRaw),
        raw: locRaw,
      },
      industry: fields['category'] || fields['business type'] || null,
      asking_price: firstMoney(fields['asking price']),
      gross_revenue: firstMoney(fields['revenue'] || fields['gross revenue'] || fields['gross sales']),
      cash_flow: firstMoney(fields['cash flow'] || fields['sde'] || fields['ebitda']),
      cash_flow_type: fields['cash flow'] ? 'cash flow' : fields['sde'] ? 'SDE' : fields['ebitda'] ? 'EBITDA' : null,
      broker: broker ? { name: broker, company: brokerCo, phone: null, email: null } : null,
      raw: {
        reason_selling: fields['reason selling'] || null,
        employees: fields['employees'] || null,
        terms: fields['terms'] || null,
        asking_price_details: fields['asking price details'] || null,
      },
    });
  }
}

module.exports = WpbdpScraper;
