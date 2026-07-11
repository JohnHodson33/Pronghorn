// Franchise Resales (franchiseresales.com) adapter. Enumerates listings from
// the WordPress listing-sitemap.xml (~600 URLs), then fetches each detail page.
// Structured data: a JSON-LD Product (matched by sku === slug) gives asking
// price + franchise brand; the page body carries "Cash Flow: $X". Franchise
// resales skew heavily food/retail, so by default we crawl only slugs matching
// green/home-services keywords (the thesis-relevant resales: cleaning, painting,
// plumbing, HVAC, pest, restoration, window/junk/pressure-wash). Set
// green_only=false to crawl the full board for franchise-resale multiples data.

const cheerio = require('cheerio');
const SourceScraper = require('../core/source_base');
const { stateFromText } = require('../core/states');

const SITEMAP = 'https://www.franchiseresales.com/listing-sitemap.xml';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

// Slug keywords for the green / home-services franchise resales we care about.
const GREEN_SLUG_KEYWORDS = [
  'lawn', 'landscap', 'pest', 'mosquito', 'weed', 'tree', 'turf', 'irrigation',
  'sprinkler', 'pool', 'garden', 'snow', 'pressure-wash', 'power-wash',
  'clean', 'maid', 'janitor', 'handyman', 'hvac', 'heating', 'cooling',
  'plumb', 'electric', 'roof', 'window', 'gutter', 'siding', 'fence',
  'junk', 'restor', 'remediat', 'mold', 'paint', 'chem-dry', 'servicemaster',
  'home-service', 'property', 'garage-door', 'fibrenew',
];

class FranchiseResalesScraper extends SourceScraper {
  async scrape() {
    const greenOnly = this.config.green_only !== false;
    const maxDetails = this.config.max_details || 200;
    const listings = [];
    let pageErrors = 0;

    let slugs;
    try {
      const res = await fetch(SITEMAP, { headers: { 'User-Agent': UA } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const xml = await res.text();
      slugs = [...xml.matchAll(/<loc>\s*(https?:\/\/[^<]*?\/listing\/([^/<]+)\/?)\s*<\/loc>/gi)]
        .map((m) => ({ url: m[1], slug: m[2] }));
    } catch (err) {
      this.error(`Sitemap fetch failed: ${err.message}`);
      return { listings: [], stats: { pagesOk: 0, pageErrors: 1 } };
    }

    let targets = slugs;
    if (greenOnly) {
      targets = slugs.filter(({ slug }) => GREEN_SLUG_KEYWORDS.some((k) => slug.toLowerCase().includes(k)));
      this.info(`Sitemap: ${slugs.length} listings, ${targets.length} green/home-services (green_only)`);
    } else {
      this.info(`Sitemap: ${slugs.length} listings (full crawl)`);
    }
    targets = targets.slice(0, maxDetails);

    let ok = 0;
    for (const { url, slug } of targets) {
      try {
        const res = await fetch(url, { headers: { 'User-Agent': UA } });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const l = this.parseDetail(url, slug, await res.text());
        if (l) listings.push(l);
        ok++;
        if (ok % 25 === 0) this.info(`  …${ok}/${targets.length} fetched (${listings.length} kept)`);
        await this.sleep(600);
      } catch (err) {
        this.error(`Detail failed (${slug}): ${err.message}`);
        if (++pageErrors >= 8) { this.warn('Too many detail errors, stopping'); break; }
      }
    }

    this.info(`Scrape complete — ${listings.length} listings (${pageErrors} errors)`);
    return { listings, stats: { pagesOk: ok, pageErrors } };
  }

  parseDetail(url, slug, html) {
    // Main listing = JSON-LD Product whose sku matches the page slug.
    let ld = null;
    for (const m of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
      try {
        const j = JSON.parse(m[1]);
        if (j['@type'] === 'Product' && j.sku === slug) { ld = j; break; }
      } catch { /* skip malformed */ }
    }

    const $ = cheerio.load(html);
    const body = $('body').text().replace(/\s+/g, ' ');
    const name = (ld && ld.name) || $('h1').first().text().trim() || null;
    const brand = ld && ld.brand && ld.brand.name ? ld.brand.name : null;
    const asking = ld && ld.offers && ld.offers.price
      ? this.parseMoney(ld.offers.price)
      : this.parseMoney((body.match(/Asking Price[:\s]*\$([\d,]+)/i) || [])[1]);
    const cashFlow = this.parseMoney((body.match(/Cash Flow[:\s]*\$([\d,]+)/i) || [])[1]);
    const revenue = this.parseMoney((body.match(/(?:Gross Revenue|Gross Sales)[:\s]*\$([\d,]+)/i) || [])[1]);

    // No clean location field; infer state from the name (e.g. "…, Dallas, TX").
    const state = stateFromText(name) || stateFromText(slug.replace(/-/g, ' '));

    return this.listing({
      source_listing_id: slug,
      name,
      url,
      description: null,
      location: { city: null, state, raw: null },
      industry: brand ? `Franchise resale — ${brand}` : 'Franchise resale',
      asking_price: asking,
      gross_revenue: revenue,
      cash_flow: cashFlow,
      cash_flow_type: cashFlow ? 'SDE' : null,
      raw: { franchise_brand: brand },
    });
  }
}

module.exports = FranchiseResalesScraper;
