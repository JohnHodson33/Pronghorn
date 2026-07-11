// Sunbelt Midwest (sunbeltmidwest.com) adapter — the large MN/WI/IL Sunbelt
// franchise group (separate inventory from sunbeltnetwork.com, which the
// `sunbelt` adapter covers). Next.js + Sanity CMS: the search page embeds the
// ENTIRE listing dataset in __NEXT_DATA__ (props.pageProps.page.pageBuilder[n]
// .allBusiness, ~139 records) with full financials (businessPrice, cashFlow,
// EBITDA, revenue), industries, state, year established, and LISTING AGENT
// NAMES — brokers for the outreach channel. One HTTP fetch, no browser.
// Listings open in a modal (no per-listing page), so url = the per-listing
// buyer-inquire link.

const SourceScraper = require('../core/source_base');
const { stateFromText } = require('../core/states');

const SEARCH_URL = 'https://sunbeltmidwest.com/buy-a-business/search-businesses-for-sale';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

class SunbeltMidwestScraper extends SourceScraper {
  async scrape() {
    let records;
    try {
      const res = await fetch(SEARCH_URL, { headers: { 'User-Agent': UA } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const html = await res.text();
      const m = html.match(/<script id="__NEXT_DATA__" type="application\/json"[^>]*>([\s\S]*?)<\/script>/);
      if (!m) throw new Error('__NEXT_DATA__ not found');
      const j = JSON.parse(m[1]);
      const blocks = j.props?.pageProps?.page?.pageBuilder || [];
      records = blocks.flatMap((b) => b.allBusiness || []);
      if (records.length === 0) throw new Error('no allBusiness records in pageBuilder');
    } catch (err) {
      this.error(`Fetch/parse failed: ${err.message}`);
      return { listings: [], stats: { pagesOk: 0, pageErrors: 1 } };
    }

    const listings = [];
    const seen = new Set();
    for (const r of records) {
      const id = String(r.listingID || r.slug || '').trim();
      if (!id || seen.has(id)) continue;
      seen.add(id);

      const stateRaw = (r.locations || []).map((l) => l.location).filter(Boolean).join(', ') || null;
      const industry = (r.industries || []).map((i) => i.industry).filter(Boolean).join(' / ') || null;
      const agents = (r.listingAgents || []).map((a) => a.title).filter(Boolean);
      const cash = this.parseMoney(r.cashFlow);
      const ebitda = this.parseMoney(r.EBITDA);

      listings.push(this.listing({
        source_listing_id: id,
        name: (r.title || '').trim() || null,
        url: `https://sunbeltmidwest.com/buyer-inquire?listingID=${id}`,
        description: null, // r.body is Sanity portable-text blocks; skip
        location: { city: null, state: stateFromText(stateRaw), raw: stateRaw },
        industry,
        asking_price: this.parseMoney(r.businessPrice),
        gross_revenue: this.parseMoney(r.revenue),
        cash_flow: cash ?? ebitda,
        cash_flow_type: cash != null ? 'SDE' : ebitda != null ? 'EBITDA' : null,
        broker: agents.length
          ? { name: agents[0], company: 'Sunbelt Midwest', phone: null, email: null }
          : null,
        date_listed: r.publishedAt ? r.publishedAt.slice(0, 10) : null,
        raw: {
          all_agents: agents.length > 1 ? agents : undefined,
          year_established: r.yearEstablished || null,
          reason_for_selling: r.reasonforSelling || null,
          franchise: r.franchise || null,
          absentee_owner: !!r.absenteeOwner,
          real_estate_for_sale: !!r.realEstateForSale,
          real_estate_asking: this.parseMoney(r.realEstateAskingPrice),
          down_payment: this.parseMoney(r.downPayment),
          employees_ft: r.employeesFullTime ?? null,
          sba_financable: r.sbaFinancable || null,
        },
      }));
    }

    this.info(`Scrape complete — ${listings.length} listings (${listings.filter((l) => l.broker).length} with agent)`);
    return { listings, stats: { pagesOk: 1, pageErrors: 0 } };
  }
}

module.exports = SunbeltMidwestScraper;
