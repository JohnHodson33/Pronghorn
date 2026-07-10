// Night-run grand totals. node totals.js
const { supabase } = require('./core/db');

async function count(mod) {
  let q = supabase.from('listings').select('*', { count: 'exact', head: true });
  if (mod) q = mod(q);
  const { count: c } = await q;
  return c;
}

(async () => {
  const total = await count();
  const bbs = await count((q) => q.eq('source_id', 'bizbuysell'));
  const bbn = await count((q) => q.eq('source_id', 'businessbroker'));
  const t1 = await count((q) => q.eq('tier', 1));
  const t1p = await count((q) => q.eq('tier', 1).eq('priority_state', true));
  const t2 = await count((q) => q.eq('tier', 2));
  const { count: ev } = await supabase.from('listing_events').select('*', { count: 'exact', head: true });
  console.log(`total: ${total} | bizbuysell: ${bbs} | businessbroker: ${bbn}`);
  console.log(`Tier 1: ${t1} (${t1p} in priority states) | Tier 2: ${t2} | events: ${ev}`);
})();
