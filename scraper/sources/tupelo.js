// Tupelo SMB platform adapter. Tupelo (crm.tupelosmb.com) is a multi-tenant
// broker CRM whose marketplace widget is fed by a public JSON API:
//   GET /api/public/listings?statuses=ACTIVE&organizationId=<org>&take=N
// Structured records: headline, askingPrice, revenue, cashFlow, industries
// (sector/subsector), locationString ("City, State, Country"). One adapter
// serves every broker on the platform — configure per instance with
// organization_id + broker_name + broker_url (like the shared bizmls adapter).
//
// Reuse: find more Tupelo brokers (network tab → crm.tupelosmb.com/api/public/
// listings) and add a config entry with their organizationId.

const SourceScraper = require('../core/source_base');
const { stateFromText } = require('../core/states');

const API = 'https://crm.tupelosmb.com/api/public/listings';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

class TupeloScraper extends SourceScraper {
  async scrape() {
    const org = this.config.organization_id;
    if (!org) {
      this.error('Missing organization_id in config');
      return { listings: [], stats: { pagesOk: 0, pageErrors: 1 } };
    }
    const brokerName = this.config.broker_name || 'Tupelo broker';
    const brokerUrl = this.config.broker_url || null;
    const take = this.config.take || 500;

    let items;
    try {
      const res = await fetch(`${API}?statuses=ACTIVE&organizationId=${encodeURIComponent(org)}&take=${take}`, {
        headers: { 'User-Agent': UA, Accept: 'application/json' },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      items = data.listings || [];
    } catch (err) {
      this.error(`API fetch failed: ${err.message}`);
      return { listings: [], stats: { pagesOk: 0, pageErrors: 1 } };
    }

    const listings = [];
    for (const it of items) {
      const id = String(it.id || '');
      if (!id) continue;
      const ind = (it.industries || [])
        .map((i) => [i.sectorTitle, i.subSectorTitle].filter(Boolean).join(' / '))
        .filter(Boolean)
        .join('; ') || null;

      listings.push(this.listing({
        source_listing_id: id,
        name: (it.headline || '').trim() || null,
        url: brokerUrl ? `${brokerUrl.replace(/\/$/, '')}/listings` : null,
        description: null,
        location: {
          city: it.locationString ? it.locationString.split(',')[0].trim() : null,
          state: stateFromText(it.locationString),
          raw: it.locationString || null,
        },
        industry: ind,
        asking_price: this.parseMoney(it.askingPrice),
        gross_revenue: this.parseMoney(it.revenue),
        cash_flow: this.parseMoney(it.cashFlow),
        cash_flow_type: 'SDE',
        // API exposes the firm but no individual agent name — skip broker to
        // avoid seeding the brokers table with firm-as-person rows.
        date_listed: it.createdAt ? new Date(it.createdAt).toISOString().slice(0, 10) : null,
        raw: { tupelo_org: org, brokerage: brokerName, status: it.status || null },
      }));
    }

    this.info(`Scrape complete — ${listings.length} listings (org ${org})`);
    return { listings, stats: { pagesOk: 1, pageErrors: 0 } };
  }
}

module.exports = TupeloScraper;
