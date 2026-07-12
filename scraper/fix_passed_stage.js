// One-shot data fix (John's 7/11 live feedback via PM): deals sitting in the
// pipeline's "Closed" column are deals we PASSED on (zero actual closes yet).
// Moves stage 'Closed' → 'Passed' for every deal that has a pass reason,
// leaving 'Closed' free for future real closes.
//
// Lane C prepared this but deliberately did NOT run it — a bulk semantic
// change to live deal records should be executed by the session/person holding
// John's direct feedback. PM: run `node fix_passed_stage.js` once; idempotent.

const { supabase } = require('./core/db');
const log = require('./utils/logger');

async function main() {
  const { data: closed, error } = await supabase
    .from('deals').select('id, name, closed_lost_reason').eq('stage', 'Closed');
  if (error) throw new Error(error.message);
  const toMove = closed.filter((d) => d.closed_lost_reason);
  log.info(`Closed deals: ${closed.length}; with pass reason (moving): ${toMove.length}`);
  for (const d of toMove) {
    const { error: uErr } = await supabase.from('deals').update({ stage: 'Passed' }).eq('id', d.id);
    if (uErr) log.error(`  ${d.name}: ${uErr.message}`);
    else log.info(`  ${d.name}: Closed → Passed`);
  }
  log.info('Done. Deals without a pass reason were left untouched.');
}

main().catch((e) => { console.error(e.message); process.exit(1); });
