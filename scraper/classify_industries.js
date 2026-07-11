// Industry-classification backfill for the market-multiples database.
// Classifies EVERY unclassified listing (including off-thesis and eventually
// delisted ones) so multiples/margins can be computed per industry × size band.
// Cheap: Haiku, ~$0.001/listing. Run: node classify_industries.js
require('dotenv').config();
const Anthropic = require('@anthropic-ai/sdk');
const { supabase } = require('./core/db');

const MODEL = 'claude-haiku-4-5-20251001';
const BATCH = 15;

const SYSTEM = `Classify the business-for-sale listing into exactly one industry from this list:
Pest Control | Wildlife/Animal Control | Pool Services | Lawn Care | Lake/Pond Management | Tree Care | Landscaping | Irrigation | Fencing | HVAC | Plumbing | Electrical | Roofing | Windows & Doors | Cleaning/Janitorial | Restoration | Property Maintenance | Other Essential Services | Restaurant/Food | Retail | Auto | Construction/Contractor | Manufacturing | Healthcare | Professional Services | Transportation/Logistics | Internet/Online | Hospitality | Other

Guidance: "Wildlife/Animal Control" = nuisance wildlife removal, trapping, animal
exclusion (distinct from insect Pest Control). "Fencing" = fence installation/
repair (residential or commercial). "Irrigation" = sprinkler/irrigation systems.
Prefer the most specific thesis vertical when applicable.

Respond ONLY with JSON: {"industry":"<one of the above>"}`;

async function main() {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  // --all reclassifies every listing (e.g. after a taxonomy change); default
  // only fills in unclassified rows.
  const reclassifyAll = process.argv.includes('--all');

  // fetch target rows (paginate past the 1000-row cap)
  const rows = [];
  for (let from = 0; ; from += 1000) {
    let q = supabase
      .from('listings')
      .select('id, name, description, industry_raw')
      .is('duplicate_of', null); // mirrors are excluded from analytics anyway
    if (!reclassifyAll) q = q.is('industry', null);
    const { data, error } = await q.range(from, from + 999);
    if (error) throw new Error(error.message);
    rows.push(...data);
    if (data.length < 1000) break;
  }
  console.log(`Classifying ${rows.length} listings${reclassifyAll ? ' (reclassify ALL)' : ''}...`);

  let done = 0;
  let failed = 0;
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);
    await Promise.all(batch.map(async (r) => {
      try {
        const res = await client.messages.create({
          model: MODEL,
          max_tokens: 60,
          system: SYSTEM,
          messages: [{
            role: 'user',
            content: JSON.stringify({ name: r.name, industry_hint: r.industry_raw, description: (r.description || '').slice(0, 700) }),
          }],
        });
        const text = (res.content[0]?.text ?? '').replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
        const industry = JSON.parse(text).industry;
        if (!industry) throw new Error('no industry in response');
        const { error } = await supabase.from('listings').update({ industry }).eq('id', r.id);
        if (error) throw new Error(error.message);
        done++;
      } catch (e) {
        failed++;
        if (failed <= 5) console.error(`  fail ${r.id}: ${e.message}`);
      }
    }));
    if ((i / BATCH) % 10 === 0) console.log(`  ${Math.min(i + BATCH, rows.length)}/${rows.length} (ok ${done}, failed ${failed})`);
    await new Promise((r) => setTimeout(r, 400));
  }
  console.log(`DONE: ${done} classified, ${failed} failed`);
}

main().catch((e) => { console.error(e.message); process.exit(1); });
