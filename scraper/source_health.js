// SOURCE-HEALTH DRIFT ALERTING (John approved 7/13, TASK-QUEUE Lane A #2).
// Read-only: per enabled source, compares tonight's active count + null-
// financial rate against a trailing baseline of the previous ≤7 runs and
// flags drift — the automated replacement for eyeballing every scraper.
//
//   🔴 count drop  — active count fell >25% below the trailing-baseline mean
//   🟠 null spike  — share of active rows w/ no cash_flow AND no asking_price
//                    rose >15 percentage points above baseline (silent parse
//                    breakage: pages still counted, fields no longer extracted)
//
// History persists in state/source_health_history.json (last 30 runs, local /
// CI-artifact). First runs only record — flags start once a baseline exists.
// Output: compact digest on stdout ("34 sources: 33 green, 1 flagged …"),
// exit code 1 when anything is flagged so CI marks the run.
// NO DB WRITES. Posting the digest to the brain (/api/feedback) is out of this
// script's scope until John enables the agent feedback-write.
//
// Usage: node source_health.js [--record-only]

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { supabase } = require('./core/db');
const log = require('./utils/logger');

const HIST_PATH = path.join(__dirname, 'state', 'source_health_history.json');
const KEEP_RUNS = 30;
const BASELINE_RUNS = 7;
const COUNT_DROP = 0.25;      // >25% below baseline mean
const NULL_SPIKE_PTS = 15;    // >15 percentage-point rise

function enabledSources() {
  const cfg = JSON.parse(fs.readFileSync(path.join(__dirname, 'config.json'), 'utf8'));
  return new Set(Object.entries(cfg.sources || {}).filter(([, v]) => v.enabled !== false).map(([k]) => k));
}

async function snapshot() {
  const per = new Map(); // source → { active, nullFin }
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase.from('listings')
      .select('source_id, cash_flow, asking_price, delisted_at')
      .range(from, from + 999);
    if (error) throw new Error(error.message);
    for (const r of data) {
      if (r.delisted_at) continue;
      const s = per.get(r.source_id) || { active: 0, nullFin: 0 };
      s.active++;
      if (r.cash_flow == null && r.asking_price == null) s.nullFin++;
      per.set(r.source_id, s);
    }
    if (data.length < 1000) break;
  }
  const out = {};
  for (const [k, v] of per) out[k] = { active: v.active, nullRate: v.active ? Math.round((100 * v.nullFin) / v.active) : 0 };
  return out;
}

function loadHistory() {
  try { return JSON.parse(fs.readFileSync(HIST_PATH, 'utf8')); } catch { return []; }
}

function main2(history, current, enabled) {
  const flags = [];
  const prior = history.slice(-BASELINE_RUNS);
  for (const src of enabled) {
    const cur = current[src];
    if (!cur) { flags.push(`🔴 ${src}: 0 active rows (enabled but absent — broken or never scraped)`); continue; }
    const base = prior.map((run) => run.stats[src]).filter(Boolean);
    if (base.length === 0) continue; // no baseline yet — record only
    const meanActive = base.reduce((a, b) => a + b.active, 0) / base.length;
    const meanNull = base.reduce((a, b) => a + b.nullRate, 0) / base.length;
    if (meanActive >= 5 && cur.active < meanActive * (1 - COUNT_DROP)) {
      flags.push(`🔴 ${src}: count drop ${Math.round(meanActive)}→${cur.active} (>${COUNT_DROP * 100}% below ${base.length}-run baseline)`);
    }
    if (cur.nullRate > meanNull + NULL_SPIKE_PTS && cur.active >= 5) {
      flags.push(`🟠 ${src}: null-financial rate ${Math.round(meanNull)}%→${cur.nullRate}% (silent parse breakage?)`);
    }
  }
  return flags;
}

async function main() {
  const enabled = enabledSources();
  const current = await snapshot();
  const history = loadHistory();
  const flags = process.argv.includes('--record-only') ? [] : main2(history, current, enabled);

  // Persist tonight's snapshot (trim to last KEEP_RUNS).
  history.push({ at: new Date().toISOString(), stats: current });
  fs.mkdirSync(path.dirname(HIST_PATH), { recursive: true });
  fs.writeFileSync(HIST_PATH, JSON.stringify(history.slice(-KEEP_RUNS), null, 1));

  const green = [...enabled].filter((s) => current[s]).length - flags.filter((f) => f.startsWith('🔴')).length;
  const digest = `SOURCE HEALTH ${new Date().toISOString().slice(0, 10)}: ${enabled.size} enabled — ` +
    (flags.length ? `${Math.max(green, 0)} green, ${flags.length} FLAGGED` : `all green`) +
    (history.length <= 1 ? ' (first run — baseline recording)' : '');
  console.log('\n' + digest);
  for (const f of flags) console.log('  ' + f);
  console.log('');
  if (flags.length) process.exit(1);
}

main().catch((err) => { log.error(err.message); process.exit(1); });
