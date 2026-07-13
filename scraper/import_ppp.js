// PPP size-signal import (John 7/13 ~10:40 — Tom uses PPP loan data to
// estimate company sizes; card folded into the size-proxy build).
//
// SBA's public PPP FOIA data is a free, high-quality size signal: JobsReported
// is a near-employee-count and loan ≈ 2.5× monthly payroll. We import ONLY the
// 150k-plus file (~968k loans): a $150k+ loan ≈ 12+ employees, exactly the
// platform/tuck-in band the tier math cares about — sub-150k borrowers are
// too-small tier regardless, so skipping the 11M-row small-loan files loses
// nothing we'd act on.
//
// Usage:
//   node import_ppp.js --filter            # 1) stream the 452MB CSV → data/ppp_green.json
//                                          #    (green/home-services NAICS only, all states)
//   node import_ppp.js --match --dry-run   # 2) show what would match (sample validation)
//   node import_ppp.js --match             # 3) write size_signals.ppp onto matched leads
//
// Matching is conservative: normalized name + state must both match (with an
// LLC/Inc-suffix-stripped variant). PPP borrower names are legal names in
// CAPS; leads carry brand names — expect precision over recall.

require('dotenv').config({ path: require('path').resolve(__dirname, './.env') });
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const log = require('./utils/logger');

const CSV = path.resolve(__dirname, 'data/ppp_150k_plus.csv');
const OUT = path.resolve(__dirname, 'data/ppp_green.json');

// green / essential home-services NAICS (thesis + adjacent trades)
const NAICS = new Set([
  '561730', // Landscaping Services (landscape, tree care, lawn)
  '115310', // Support Activities for Forestry (some tree services file here)
  '561710', // Exterminating & Pest Control
  '561790', // Other Services to Buildings (pool cleaning etc.)
  '561720', // Janitorial
  '238160', // Roofing
  '238210', // Electrical
  '238220', // Plumbing / HVAC
  '238990', // All Other Specialty Trades (pool builds etc.)
]);

// minimal CSV line parser (handles quoted fields with commas)
function parseLine(line) {
  const out = [];
  let cur = '', inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQ) {
      if (ch === '"') { if (line[i + 1] === '"') { cur += '"'; i++; } else inQ = false; }
      else cur += ch;
    } else if (ch === '"') inQ = true;
    else if (ch === ',') { out.push(cur); cur = ''; }
    else cur += ch;
  }
  out.push(cur);
  return out;
}

async function filter() {
  if (!fs.existsSync(CSV)) { log.error(`${CSV} missing — download the 150k_plus file first`); process.exit(1); }
  const rl = readline.createInterface({ input: fs.createReadStream(CSV), crlfDelay: Infinity });
  let header = null, idx = {}, kept = 0, total = 0;
  const rows = [];
  for await (const line of rl) {
    if (!header) {
      header = parseLine(line);
      for (const [i, h] of header.entries()) idx[h] = i;
      continue;
    }
    total++;
    // cheap pre-filter before full parse: NAICS appears near the line end
    const f = parseLine(line);
    const naics = f[idx.NAICSCode];
    if (!NAICS.has(naics)) continue;
    rows.push({
      name: f[idx.BorrowerName], city: f[idx.BorrowerCity], state: f[idx.BorrowerState],
      naics,
      loan: Number(f[idx.CurrentApprovalAmount] || f[idx.InitialApprovalAmount]) || null,
      jobs: Number(f[idx.JobsReported]) || null,
      date: f[idx.DateApproved] || null,
    });
    kept++;
  }
  fs.writeFileSync(OUT, JSON.stringify(rows));
  log.info(`PPP filter: ${kept} green-industry loans kept of ${total} (${(fs.statSync(OUT).size / 1e6).toFixed(1)}MB)`);
}

const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const SUFFIX = /\s(llc|inc|co|corp|corporation|company|ltd|pllc|incorporated)$/;

async function match(dryRun) {
  const { supabase } = require('./core/db');
  const rows = JSON.parse(fs.readFileSync(OUT, 'utf8'));
  const byKey = new Map();
  for (const r of rows) {
    if (!r.jobs) continue; // jobs is the signal; loans without it are no help
    for (const n of [norm(r.name), norm(r.name).replace(SUFFIX, '')]) {
      const k = `${n}|${(r.state || '').toUpperCase()}`;
      if (!byKey.has(k)) byKey.set(k, r);
    }
  }
  log.info(`PPP index: ${byKey.size} name+state keys from ${rows.length} loans`);

  const { data: leads } = await supabase.from('leads').select('id,name,state,enrichment');
  let matched = 0, written = 0;
  for (const l of leads || []) {
    const keys = [`${norm(l.name)}|${(l.state || '').toUpperCase()}`,
                  `${norm(l.name).replace(SUFFIX, '')}|${(l.state || '').toUpperCase()}`];
    const hit = keys.map((k) => byKey.get(k)).find(Boolean);
    if (!hit) continue;
    matched++;
    if (dryRun) { log.info(`  match: ${l.name} (${l.state}) ← PPP "${hit.name}" jobs=${hit.jobs} loan=$${Math.round(hit.loan / 1000)}k ${hit.date}`); continue; }
    const enrich = { ...(l.enrichment || {}) };
    enrich.size_signals = { ...(enrich.size_signals || {}), ppp: { loan: hit.loan, jobs: hit.jobs, date: hit.date, borrower: hit.name } };
    const { error } = await supabase.from('leads').update({ enrichment: enrich }).eq('id', l.id);
    if (error) log.error(`  ${l.name}: ${error.message}`); else written++;
  }
  log.info(`PPP match: ${matched} of ${(leads || []).length} leads${dryRun ? ' (dry run — nothing written)' : `; ${written} written`}`);
}

(async () => {
  if (process.argv.includes('--filter')) return filter();
  if (process.argv.includes('--match')) return match(process.argv.includes('--dry-run'));
  console.error('Usage: node import_ppp.js --filter | --match [--dry-run]');
  process.exit(1);
})().catch((e) => { console.error(e.message); process.exit(1); });
