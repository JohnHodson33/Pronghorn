// Quick data-quality peek after a run. node peek.js
const { supabase } = require('./core/db');

async function main() {
  const { count } = await supabase.from('listings').select('*', { count: 'exact', head: true });
  console.log('Total listings in DB:', count);

  const { data: t1 } = await supabase
    .from('listings')
    .select('name, city, state, asking_price, cash_flow, cash_flow_type, tier, tier_reasoning, industry, priority_state, url')
    .not('tier', 'is', null)
    .order('tier');
  console.log('\nScreened listings:');
  for (const r of t1) {
    console.log(`\n[Tier ${r.tier}] ${r.name}`);
    console.log(`  ${r.city ?? '?'}, ${r.state ?? '?'} ${r.priority_state ? '★' : ''} | ask $${r.asking_price} | CF $${r.cash_flow} (${r.cash_flow_type})`);
    console.log(`  industry: ${r.industry} | ${r.tier_reasoning}`);
  }

  const { data: sample } = await supabase
    .from('listings')
    .select('external_id, name, state, asking_price, first_seen_at, last_seen_at')
    .limit(3);
  console.log('\nRandom rows (field sanity):');
  console.table(sample);

  const { count: evCount } = await supabase.from('listing_events').select('*', { count: 'exact', head: true });
  console.log('listing_events rows:', evCount);
}
main().catch((e) => { console.error(e.message); process.exit(1); });
