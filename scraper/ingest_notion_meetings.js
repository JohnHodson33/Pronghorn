// Notion meeting-notes ingestion — Notion → Supabase activities (Option A of
// docs/MEETING-NOTES-DESIGN.md). READ-ONLY on Notion; notes land as
// kind='meeting' activities on the matched company, visible to John and Tom
// on the company feed. Granola rides through this pipe via its Notion export.
//
// Usage: node ingest_notion_meetings.js <dump.json>
//   [{ "company": "<platform company name or null>", "title": "...",
//      "date": "YYYY-MM-DD", "notion_url": "https://app.notion.com/p/...",
//      "summary": "meeting overview / action items text" }]
//
// Matching: the dump is curated (explicit company per note). The scheduled
// version will add the `Company:` template-line convention + fuzzy matching
// per the design doc; unmatched notes go to a review queue in the UI.
// Idempotency: one activity per Notion page URL (doc_url equality).

const fs = require('fs');
const { supabase } = require('./core/db');
const log = require('./utils/logger');

async function main() {
  const file = process.argv[2];
  if (!file || !fs.existsSync(file)) {
    console.error('Usage: node ingest_notion_meetings.js <dump.json>');
    process.exit(1);
  }
  const notes = JSON.parse(fs.readFileSync(file, 'utf8'));

  let added = 0, skipped = 0, unmatched = 0;
  for (const n of notes) {
    const { data: existing } = await supabase
      .from('activities').select('id').eq('doc_url', n.notion_url).maybeSingle();
    if (existing) { skipped++; continue; }

    let companyId = null, dealId = null;
    if (n.company) {
      const { data: company } = await supabase
        .from('companies').select('id').ilike('name', `%${n.company}%`).maybeSingle();
      if (!company) { log.warn(`No company matches "${n.company}" — logging unattached`); unmatched++; }
      else {
        companyId = company.id;
        const { data: deal } = await supabase
          .from('deals').select('id').eq('company_id', companyId).maybeSingle();
        dealId = deal?.id ?? null;
      }
    }

    const body = `[Notion meeting ${n.date}] ${n.title}\n${(n.summary || '').trim()}`;
    const { error } = await supabase.from('activities').insert({
      company_id: companyId, deal_id: dealId, kind: 'meeting',
      body, doc_url: n.notion_url,
    });
    if (error) { log.error(`${n.title}: ${error.message}`); continue; }
    added++;
  }
  log.info(`Notion meetings: ${added} added, ${skipped} already present, ${unmatched} without company match`);
}

main().catch((e) => { console.error(e.message); process.exit(1); });
