// Source-quality analytics — ranks each scrape source by thesis-fit yield and
// data completeness, so the PM can prioritize enrichment and retire low-value
// sources. Read-only: fetches minimal listing columns, aggregates per source,
// prints a ranked table. Run: node source_quality.js
//
// "Thesis yield" = (Tier 1 + Tier 2) / active listings — the share of a source's
// inventory that clears the green-industry screen. "CF%" and "Broker%" measure
// how usable the records are for the multiples engine and outreach.

require('dotenv').config();
const { supabase } = require('./core/db.js');

async function fetchAll() {
  const cols = 'source_id, tier, cash_flow, asking_price, broker_id, priority_state, delisted_at, last_seen_at';
  const out = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase.from('listings').select(cols).range(from, from + 999);
    if (error) throw new Error(error.message);
    out.push(...data);
    if (data.length < 1000) break;
  }
  return out;
}

function pct(n, d) { return d ? `${Math.round((100 * n) / d)}%` : '—'; }

async function main() {
  const rows = await fetchAll();
  const bySource = new Map();
  for (const r of rows) {
    if (!bySource.has(r.source_id)) {
      bySource.set(r.source_id, {
        total: 0, active: 0, delisted: 0, t1: 0, t2: 0, t3: 0, t4: 0,
        cf: 0, asking: 0, broker: 0, priority: 0, lastSeen: null,
      });
    }
    const s = bySource.get(r.source_id);
    s.total++;
    if (r.delisted_at) s.delisted++; else s.active++;
    if (r.tier === 1) s.t1++;
    else if (r.tier === 2) s.t2++;
    else if (r.tier === 3) s.t3++;
    else if (r.tier === 4) s.t4++;
    if (r.cash_flow != null) s.cf++;
    if (r.asking_price != null) s.asking++;
    if (r.broker_id) s.broker++;
    if (r.priority_state) s.priority++;
    if (r.last_seen_at && (!s.lastSeen || r.last_seen_at > s.lastSeen)) s.lastSeen = r.last_seen_at;
  }

  const ranked = [...bySource.entries()]
    .map(([source, s]) => ({ source, ...s, yield: s.active ? (s.t1 + s.t2) / s.active : 0 }))
    .sort((a, b) => (b.t1 + b.t2) - (a.t1 + a.t2));

  const pad = (v, n) => String(v).padEnd(n);
  const padl = (v, n) => String(v).padStart(n);
  console.log('\n=== SOURCE QUALITY (ranked by Tier1+Tier2 count) ===\n');
  console.log(pad('source', 20), padl('total', 7), padl('active', 7), padl('T1', 4), padl('T2', 4),
    padl('fit%', 6), padl('CF%', 6), padl('ask%', 6), padl('brkr%', 6), padl('prio', 6), '  last seen');
  console.log('-'.repeat(110));
  let tot = { total: 0, t1: 0, t2: 0, cf: 0, broker: 0 };
  for (const s of ranked) {
    console.log(
      pad(s.source, 20), padl(s.total, 7), padl(s.active, 7), padl(s.t1, 4), padl(s.t2, 4),
      padl(pct(s.t1 + s.t2, s.active), 6), padl(pct(s.cf, s.total), 6), padl(pct(s.asking, s.total), 6),
      padl(pct(s.broker, s.total), 6), padl(s.priority, 6), '  ' + (s.lastSeen ? s.lastSeen.slice(0, 10) : '—')
    );
    tot.total += s.total; tot.t1 += s.t1; tot.t2 += s.t2; tot.cf += s.cf; tot.broker += s.broker;
  }
  console.log('-'.repeat(110));
  console.log(pad('TOTAL', 20), padl(tot.total, 7), padl('', 7), padl(tot.t1, 4), padl(tot.t2, 4),
    padl('', 6), padl(pct(tot.cf, tot.total), 6), padl('', 6), padl(pct(tot.broker, tot.total), 6));

  // Flag low-value sources: many listings but ~zero thesis fit.
  const lowValue = ranked.filter((s) => s.active >= 100 && s.t1 + s.t2 === 0);
  if (lowValue.length) {
    console.log('\n⚠️  Low-value (≥100 active, 0 Tier1/2 — candidates to deprioritize):');
    for (const s of lowValue) console.log(`   ${s.source} (${s.active} active, ${pct(s.cf, s.total)} CF coverage)`);
  }
  // Flag broker-contact gaps: high thesis fit but no broker contacts captured.
  const brokerGap = ranked.filter((s) => s.t1 + s.t2 >= 3 && s.broker === 0);
  if (brokerGap.length) {
    console.log('\n📇 Broker-contact gaps (≥3 Tier1/2 but 0 broker contacts — enrich these for outreach):');
    for (const s of brokerGap) console.log(`   ${s.source} (${s.t1 + s.t2} thesis-fit, 0 brokers)`);
  }
  console.log('');
}

main().catch((err) => { console.error(err.message); process.exit(1); });
