// Usage-event recorder (COST-TRACKING.md) — every paid call site reports here.
// Tolerant by design: if migration 0009 isn't applied yet, it warns once and
// becomes a no-op so no pipeline ever fails over metering.
const { supabase } = require('./db');
const log = require('../utils/logger');

let tableMissing = false;

async function recordUsage(service, activity, units, costUsd, meta) {
  if (tableMissing) return;
  const { error } = await supabase.from('usage_events').insert({
    service, activity, units, cost_usd: Number(costUsd.toFixed(5)), meta: meta || null,
  });
  if (error) {
    if (/usage_events/.test(error.message)) {
      tableMissing = true;
      log.warn('usage_events missing (migration 0009) — cost metering disabled this run');
    } else log.warn(`usage event: ${error.message}`);
  }
}

module.exports = { recordUsage };
