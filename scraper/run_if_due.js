// Gate for scheduled triggers: runs the pipeline only when this week's Monday
// 06:00 run hasn't completed yet. Task Scheduler fires this generously —
// Monday 6 AM, every logon, and daily at noon — and every firing except the
// one that actually does the work exits immediately. This makes a missed
// Monday (laptop asleep, no network) self-heal at the next opportunity
// instead of silently skipping to next week.
//
// "Completed" = run_daily wrote data/last_success.json after the digest email
// was confirmed sent, with a timestamp at or after the most recent Monday 06:00.

const fs = require('fs');
const path = require('path');

const MARKER = path.resolve(__dirname, 'data', 'last_success.json');
const RUN_DAY = 1;  // Monday
const RUN_HOUR = 6; // 06:00 local (machine TZ = Arizona)

function mostRecentDueTime(now) {
  const d = new Date(now);
  d.setHours(RUN_HOUR, 0, 0, 0);
  const daysSinceMonday = (d.getDay() - RUN_DAY + 7) % 7;
  d.setDate(d.getDate() - daysSinceMonday);
  if (d > now) d.setDate(d.getDate() - 7); // it's Monday, but before 06:00
  return d;
}

const now = new Date();
const due = mostRecentDueTime(now);

let lastSuccess = null;
try {
  lastSuccess = new Date(JSON.parse(fs.readFileSync(MARKER, 'utf8')).completed_at);
  if (isNaN(lastSuccess)) lastSuccess = null;
} catch { /* no marker yet — run is due */ }

if (lastSuccess && lastSuccess >= due) {
  console.log(`[run_if_due] This week's run already completed ${lastSuccess.toISOString()} — nothing to do`);
  process.exit(0);
}

console.log(`[run_if_due] Weekly run due since ${due.toISOString()} (last success: ${lastSuccess ? lastSuccess.toISOString() : 'never'}) — starting pipeline`);
require('./run_daily').main().catch((err) => {
  console.error(`[run_if_due] Pipeline failed: ${err.message}`);
  process.exit(1);
});
