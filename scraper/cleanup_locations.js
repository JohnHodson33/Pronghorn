// Location-pollution cleanup (John 7/12) — tupelomarket + businessbroker
// adapters wrote description text into listings.city (e.g. "HVAC Businesses…
// Serving NW Washington", "ORMultnomah County…"). Lane A fixes the parsers
// going forward; this re-derives city/state for the already-polluted rows and
// NULLS city when unrecoverable, so the column is honest either way.
//
// Recovery, best-effort in order:
//   1. leading 2-letter state code stuck to a county ("ORMultnomah County"
//      → state OR, city "Multnomah County") — only when state is blank
//   2. "covering <City>" / "in <City>" / "located in <City>" tail
//   3. "<City>, <ST>" pattern anywhere in the blob
// Anything still description-like (has business/serving/service, or >40 chars)
// after recovery → city = null.
//
// Usage: node cleanup_locations.js [--dry-run]

const { supabase } = require('./core/db');
const log = require('./utils/logger');

const US_STATES = new Set(['AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY','DC']);
const POLLUTED = /business|serving|service|covering|established|provider|company|profitable|residential|commercial/i;

function looksPolluted(city) {
  return !!city && (POLLUTED.test(city) || city.length > 40);
}

// A clean city is a short run of Title-case words with NO case-glue artifact
// ("LouisvilleLouisville", "LocationSedona") and no consecutive-word repeat.
function cleanCity(c) {
  if (!c) return null;
  c = c.trim();
  if (/[a-z][A-Z]/.test(c)) return null;             // glue artifact
  if (looksPolluted(c)) return null;
  const words = c.split(/\s+/);
  if (words.length > 3) return null;                 // description leaked
  for (let i = 1; i < words.length; i++) if (words[i] === words[i - 1]) return null; // "X X"
  return c;
}

/** → { city, state } best-effort, either possibly null. */
function recover(raw, existingState) {
  let city = null, state = existingState || null;

  // 1. leading "<ST><Rest County>" — the state prefix is a real signal even
  //    when the county text is glued; take the state, keep county only if clean
  const lead = raw.match(/^([A-Z]{2})([A-Z][a-z][^A-Z]{0,28}?County)\b/);
  if (lead && US_STATES.has(lead[1])) {
    state = state || lead[1];
    const county = cleanCity(lead[2]);
    return { city: county, state };
  }

  // 2. "covering|located in|based in <City>"
  const cover = raw.match(/\b(?:covering|located in|based in)\s+([A-Z][a-z]+(?:\s[A-Z][a-z]+){0,2})\b/);
  if (cover) city = cleanCity(cover[1]);

  // 3. "<City>, <ST>" anywhere
  const cs = raw.match(/\b([A-Z][a-z]+(?:\s[A-Z][a-z]+){0,2}),\s*([A-Z]{2})\b/);
  if (cs && US_STATES.has(cs[2])) { city = city || cleanCity(cs[1]); state = state || cs[2]; }

  return { city, state };
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const { data: rows, error } = await supabase.from('listings')
    .select('id, city, state, source_id')
    .or('city.ilike.%business%,city.ilike.%serving%,city.ilike.%service%,city.ilike.%covering%,city.ilike.%established%');
  if (error) throw new Error(error.message);
  const polluted = (rows || []).filter((r) => looksPolluted(r.city));
  log.info(`${polluted.length} polluted city rows${dryRun ? ' (dry run)' : ''}`);

  let recovered = 0, nulled = 0;
  for (const r of polluted) {
    const { city, state } = recover(r.city, r.state);
    const patch = { city: city || null };
    if (state && !r.state) patch.state = state;
    if (dryRun) {
      log.info(`  ${r.source_id}: ${JSON.stringify(r.city).slice(0, 45)} → ${city ? `city="${city}"${patch.state ? ` state=${patch.state}` : ''}` : 'NULL'}`);
    } else {
      const { error: uErr } = await supabase.from('listings').update(patch).eq('id', r.id);
      if (uErr) { log.error(`  ${r.id}: ${uErr.message}`); continue; }
    }
    if (city) recovered++; else nulled++;
  }
  log.info(`Cleanup: ${recovered} recovered a city, ${nulled} nulled (unrecoverable). Lane A: fix tupelomarket + businessbroker parsers so this stops at source.`);
}

main().catch((e) => { console.error(e.message); process.exit(1); });
