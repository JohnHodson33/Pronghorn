// Connection + migration verification. Run: node check_db.js
const { supabase } = require('./core/db');

async function main() {
  console.log('Checking Supabase connection & migrations...\n');

  // 1. Tables exist (query each; error = missing)
  const tables = [
    'screen_profiles', 'scrape_sources', 'brokers', 'listings', 'listing_events',
    'listing_reviews', 'lead_lists', 'leads', 'companies', 'contacts', 'deals', 'activities',
  ];
  let allOk = true;
  for (const t of tables) {
    const { error } = await supabase.from(t).select('*', { count: 'exact', head: true });
    if (error) { console.log(`  [MISSING] ${t} — ${error.message}`); allOk = false; }
    else console.log(`  [ok] ${t}`);
  }

  // 2. Seed: default screen profile (migration 0002)
  const { data: profiles } = await supabase
    .from('screen_profiles').select('name, is_default, priority_states').eq('is_default', true);
  console.log('\nDefault screen profile:',
    profiles?.length ? `"${profiles[0].name}" (${profiles[0].priority_states?.length} priority states)` : 'NOT FOUND — run 0002');

  // 3. Source roster (migrations 0002 + 0003)
  const { count: srcCount } = await supabase
    .from('scrape_sources').select('*', { count: 'exact', head: true });
  console.log('Scrape sources seeded:', srcCount, srcCount >= 36 ? '(roster loaded ✓)' : '(expected 37 — run 0003)');

  // 4. Identity columns (migration 0003)
  const { error: colErr } = await supabase.from('listings').select('company_id, website_domain').limit(1);
  console.log('Identity columns on listings:', colErr ? `MISSING — run 0003 (${colErr.message})` : 'present ✓');

  console.log(allOk ? '\n✅ All tables present.' : '\n❌ Some tables missing — re-run migrations.');
}

main().catch((e) => { console.error('Connection failed:', e.message); process.exit(1); });
