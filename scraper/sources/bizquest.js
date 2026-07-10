// BizQuest adapter — same CoStar feed and JSON-LD format as BizBuySell (probed
// 2026-07-10: identical SearchResultsPage/Product structure, same productIds).
// Most listings mirror BizBuySell; run_supabase links those via mirror dedup
// (same external_id → duplicate_of). The value is the small non-overlap.
// Note: BizQuest's DOM differs, so the cash-flow DOM walk usually finds nothing —
// mirrored rows inherit nothing here, but their BizBuySell originals carry CF.

const BizBuySellScraper = require('./bizbuysell');

class BizQuestScraper extends BizBuySellScraper {
  pageUrl(pg) {
    return `https://www.bizquest.com/businesses-for-sale/page-${pg}/`;
  }
}

module.exports = BizQuestScraper;
