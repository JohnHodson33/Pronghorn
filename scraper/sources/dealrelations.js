// DealRelations platform adapter. dealrelations.com is a multi-tenant broker
// CRM used by many Sunbelt regional offices (and others). Each broker gets a
// subdomain <broker>.dealrelations.com with:
//   /listings                → HTML index linking /listings/<slug>
//   /listings/<slug>         → SSR detail page with a two-column spec table
//     (Listing No, Category, Detail, Price, County, Down, State/Prov,
//      Disc Earn = SDE, Sales = revenue) + an agent block (name + office phone).
// One adapter serves every broker on the platform — list their subdomains in
// config.subdomains. Plain HTTP + cheerio, no browser, no item_id needed.
//
// Reuse: find more subdomains by web-searching "site:dealrelations.com" or a
// broker's "current listings" page (their WordPress json_url points here).

const cheerio = require('cheerio');
const SourceScraper = require('../core/source_base');
const { STATE_CODES } = require('../core/states');

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

class DealRelationsScraper extends SourceScraper {
  async scrape() {
    const brokers = this.config.subdomains || [];
    if (brokers.length === 0) {
      this.error('No subdomains configured');
      return { listings: [], stats: { pagesOk: 0, pageErrors: 1 } };
    }
    const listings = [];
    const seen = new Set();
    let pagesOk = 0;
    let pageErrors = 0;

    for (const entry of brokers) {
      const sub = typeof entry === 'string' ? entry : entry.sub;
      const brokerName = (typeof entry === 'object' && entry.name) || `Sunbelt (${sub})`;
      const base = `https://${sub}.dealrelations.com`;
      let slugs;
      try {
        const res = await fetch(`${base}/listings`, { headers: { 'User-Agent': UA } });
        if (!res.ok) throw new Error(`index HTTP ${res.status}`);
        const $ = cheerio.load(await res.text());
        slugs = [...new Set(
          $('a[href*="/listings/"]').map((_, a) => $(a).attr('href')).get()
            .map((h) => (h.match(/\/listings\/([a-z0-9-]+)/i) || [])[1])
            .filter(Boolean)
        )];
        this.info(`${sub}: ${slugs.length} listings`);
      } catch (err) {
        this.error(`${sub} index failed: ${err.message}`);
        pageErrors++;
        continue;
      }

      for (const slug of slugs) {
        const id = `${sub}:${slug}`;
        if (seen.has(id)) continue;
        seen.add(id);
        try {
          const res = await fetch(`${base}/listings/${slug}`, { headers: { 'User-Agent': UA } });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const l = this.parseDetail(id, `${base}/listings/${slug}`, await res.text(), brokerName);
          if (l) listings.push(l);
          pagesOk++;
          await this.sleep(600);
        } catch (err) {
          this.error(`${slug} failed: ${err.message}`);
          if (++pageErrors >= 10) { this.warn('Too many errors, stopping'); return { listings, stats: { pagesOk, pageErrors } }; }
        }
      }
    }

    this.info(`Scrape complete — ${listings.length} listings (${listings.filter((l) => l.broker).length} with agent)`);
    return { listings, stats: { pagesOk, pageErrors } };
  }

  parseDetail(id, url, html, brokerName) {
    const $ = cheerio.load(html);

    // Spec table: sequences of <td><strong>Label</strong></td><td>:</td><td>value</td>.
    // Collect label→value by walking the td list.
    const fields = {};
    const cells = $('td.display').toArray();
    for (let i = 0; i < cells.length; i++) {
      const label = $(cells[i]).find('strong').first().text().replace(/\s+/g, ' ').trim();
      if (!label || label === ':') continue;
      // value is the next display cell that isn't the ":" separator
      for (let j = i + 1; j < Math.min(i + 3, cells.length); j++) {
        const t = $(cells[j]).text().replace(/\s+/g, ' ').trim();
        if (t && t !== ':' && !$(cells[j]).find('strong').length) { fields[label.toLowerCase()] = t; break; }
      }
    }

    // og:title is the clean listing name ("Trusted Roofing Firm…"); the <title>
    // tag is just "<broker> | <name>" (or bare "<broker> |" when name is blank).
    const title = ($('meta[property="og:title"]').attr('content')
      || $('h1').first().text()
      || $('title').text().replace(/^[^|]*\|\s*/, '')).replace(/\s+/g, ' ').trim() || null;
    const stateName = (fields['state/prov'] || '').toLowerCase();
    const state = STATE_CODES[stateName] || null;

    // Agent: <strong>NAME</strong> preceding an "Office :" phone.
    let agentName = null;
    let agentPhone = null;
    $('strong').each((_, el) => {
      if (/^Office$/i.test($(el).text().trim())) {
        const row = $(el).closest('tr, table');
        const nm = row.find('strong').first().text().replace(/\s+/g, ' ').trim();
        if (nm && !/^office$/i.test(nm)) agentName = agentName || nm;
        const phoneM = row.text().match(/\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/);
        if (phoneM) agentPhone = agentPhone || phoneM[0];
      }
    });

    const industry = [fields['category'], fields['detail']].filter((v) => v && v !== '-').join(' / ') || null;

    return this.listing({
      source_listing_id: id,
      name: title && !/^(listings?|.*\.dealrelations)$/i.test(title) ? title : (fields['detail'] || `DealRelations ${id}`),
      url,
      description: null,
      location: {
        city: fields['county'] ? `${fields['county']} County` : null,
        state,
        raw: [fields['county'], fields['state/prov']].filter(Boolean).join(', ') || null,
      },
      industry,
      asking_price: this.parseMoney(fields['price']),
      gross_revenue: this.parseMoney(fields['sales']),
      cash_flow: this.parseMoney(fields['disc earn']),
      cash_flow_type: fields['disc earn'] ? 'SDE' : null,
      broker: agentName ? { name: this.titleCase(agentName), company: brokerName, phone: agentPhone, email: null } : null,
      raw: {
        listing_no: fields['listing no'] || null,
        sic: fields['sic'] || null,
        down_payment: this.parseMoney(fields['down']),
        view_status: this.viewStatus($),
      },
    });
  }

  viewStatus($) {
    const t = $('body').text();
    const m = t.match(/Under LOI|Sale Pending|Contract Pending|Sold/i);
    return m ? m[0] : null;
  }

  titleCase(s) {
    return s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
  }
}

module.exports = DealRelationsScraper;
