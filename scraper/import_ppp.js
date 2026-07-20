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

const OUT_ALL = path.resolve(__dirname, 'data/ppp_all.json');

// filter(all): keep every $150k+ loan WITH a jobs count, regardless of NAICS
// (John 7/20 — "PPP for EVERY proprietary company, not just named industries").
// The 9-code green filter cost coverage: a tree-care company that filed under a
// generic NAICS was invisible. Lead names are industry-specific, so name+state
// collision risk stays low; the matched naics is stored so matches are auditable.
async function filter(all) {
  if (!fs.existsSync(CSV)) { log.error(`${CSV} missing — download the 150k_plus file first`); process.exit(1); }
  const out = all ? OUT_ALL : OUT;
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
    const f = parseLine(line);
    const naics = f[idx.NAICSCode];
    if (!all && !NAICS.has(naics)) continue;
    const jobs = Number(f[idx.JobsReported]) || null;
    if (all && !jobs) continue; // all-NAICS mode: jobs is the signal, skip loans without it
    rows.push({
      name: f[idx.BorrowerName], city: f[idx.BorrowerCity], state: f[idx.BorrowerState],
      naics,
      loan: Number(f[idx.CurrentApprovalAmount] || f[idx.InitialApprovalAmount]) || null,
      jobs,
      date: f[idx.DateApproved] || null,
    });
    kept++;
  }
  fs.writeFileSync(out, JSON.stringify(rows));
  log.info(`PPP filter${all ? ' (all NAICS)' : ' (green)'}: ${kept} loans kept of ${total} (${(fs.statSync(out).size / 1e6).toFixed(1)}MB → ${path.basename(out)})`);
}

const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const SUFFIX = /\s(llc|inc|co|corp|corporation|company|ltd|pllc|incorporated)$/;

// green-adjacent NAICS keep the match at 'high' confidence; other NAICS that a
// same-named borrower filed under are still a plausible match but flagged 'med'
// (a name collision across industries is the only failure mode name+state has).
function pppConfidence(naics) { return NAICS.has(String(naics)) ? 'high' : 'med'; }

async function match(dryRun) {
  const { supabase } = require('./core/db');
  // prefer the full all-NAICS index (John 7/20); fall back to the green one
  const src = fs.existsSync(OUT_ALL) ? OUT_ALL : OUT;
  const rows = JSON.parse(fs.readFileSync(src, 'utf8'));
  const byKey = new Map();
  for (const r of rows) {
    if (!r.jobs) continue;
    for (const n of [norm(r.name), norm(r.name).replace(SUFFIX, '')]) {
      const k = `${n}|${(r.state || '').toUpperCase()}`;
      if (!byKey.has(k)) byKey.set(k, r);
    }
  }
  log.info(`PPP index: ${byKey.size} name+state keys from ${rows.length} loans (${path.basename(src)})`);

  // proprietary leads (name+state). Every lead gets a match attempt now.
  const { data: leads } = await supabase.from('leads').select('id,name,state,enrichment,company_id');
  let matched = 0, written = 0, hi = 0, med = 0;
  const companyPatch = new Map(); // company_id → best ppp signal, for the companies mirror
  for (const l of leads || []) {
    if (l.enrichment?.size_signals?.ppp) { matched++; hi += l.enrichment.size_signals.ppp.confidence !== 'med' ? 1 : 0; continue; } // already matched
    const keys = [`${norm(l.name)}|${(l.state || '').toUpperCase()}`,
                  `${norm(l.name).replace(SUFFIX, '')}|${(l.state || '').toUpperCase()}`];
    const hit = keys.map((k) => byKey.get(k)).find(Boolean);
    if (!hit) continue;
    const conf = pppConfidence(hit.naics);
    matched++; conf === 'high' ? hi++ : med++;
    if (dryRun) { log.info(`  match(${conf}): ${l.name} (${l.state}) ← PPP "${hit.name}" naics=${hit.naics} jobs=${hit.jobs} loan=$${Math.round(hit.loan / 1000)}k ${hit.date}`); continue; }
    const ppp = { loan: hit.loan, jobs: hit.jobs, date: hit.date, borrower: hit.name, naics: hit.naics, confidence: conf };
    const enrich = { ...(l.enrichment || {}) };
    enrich.size_signals = { ...(enrich.size_signals || {}), ppp };
    const { error } = await supabase.from('leads').update({ enrichment: enrich }).eq('id', l.id);
    if (error) log.error(`  ${l.name}: ${error.message}`); else { written++; if (l.company_id) companyPatch.set(l.company_id, ppp); }
  }
  log.info(`PPP match: ${matched} of ${(leads || []).length} leads matched (${hi} high, ${med} med) — ${written} newly written${dryRun ? ' (dry run — nothing written)' : ''}.`);
}

(async () => {
  if (process.argv.includes('--filter')) return filter(process.argv.includes('--all'));
  if (process.argv.includes('--match')) return match(process.argv.includes('--dry-run'));
  console.error('Usage: node import_ppp.js --filter [--all] | --match [--dry-run]');
  process.exit(1);
})().catch((e) => { console.error(e.message); process.exit(1); });
