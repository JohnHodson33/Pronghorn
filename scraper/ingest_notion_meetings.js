// Notion meeting-notes ingestion — Notion → Supabase activities (Option A of
// docs/MEETING-NOTES-DESIGN.md). READ-ONLY on Notion; notes land as
// kind='meeting' activities on the matched company, visible to John and Tom
// on the company feed. Granola rides through this pipe via its Notion export.
//
// CURATED-DUMP MODE (original):
//   node ingest_notion_meetings.js <dump.json>
//   [{ "company": "<platform company name or null>", "title": "...",
//      "date": "YYYY-MM-DD", "notion_url": "...", "summary": "..." }]
//
// LIVE SWEEP MODE (John 7/13 ~10:20 — "automated fashion… scrape Tom's Notion
// too… tag it to the right company or deal"):
//   node ingest_notion_meetings.js --live [--hours 48] [--dry-run]
//   1. Polls the Notion API (NOTION_TOKEN + NOTION_TOKEN_TOM when present) for
//      pages edited within the window.
//   2. Pulls each page's text and has Claude tag it against the CRM: company,
//      deal, contacts mentioned + a short summary w/ action items.
//   3. Writes kind='meeting' activities — idempotent per Notion URL (doc_url);
//      an edited page updates its existing activity instead of duplicating.
//   4. Dan Mello pattern: people mentioned WITH contact info + a clear role
//      (advisor/broker/investor) are created/enriched as contacts.
//   5. LOW-CONFIDENCE / unmatched notes are still logged (company_id null) and
//      surface in dashboard Key Actions as 'note_needs_tagging' — never
//      silently dropped.
//   READ-ONLY on Notion. Nothing is ever written back.

require('dotenv').config({ path: require('path').resolve(__dirname, './.env') });
const fs = require('fs');
const { supabase } = require('./core/db');
const log = require('./utils/logger');

const NOTION_VERSION = '2022-06-28';

// --------------------------------------------------------------------------
// Notion API helpers (plain fetch — no SDK dependency)
// --------------------------------------------------------------------------
async function notion(token, method, path, body) {
  const res = await fetch(`https://api.notion.com/v1${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, 'Notion-Version': NOTION_VERSION, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`Notion ${path}: ${res.status} ${(await res.text()).slice(0, 200)}`);
  return res.json();
}

async function recentPages(token, cutoff) {
  const pages = [];
  let cursor;
  do {
    const res = await notion(token, 'POST', '/search', {
      filter: { property: 'object', value: 'page' },
      sort: { direction: 'descending', timestamp: 'last_edited_time' },
      page_size: 50, ...(cursor ? { start_cursor: cursor } : {}),
    });
    pages.push(...res.results);
    cursor = res.has_more ? res.next_cursor : null;
    const oldest = pages[pages.length - 1];
    if (oldest && new Date(oldest.last_edited_time) < cutoff) break; // sorted desc — done
  } while (cursor);
  return pages.filter((p) => new Date(p.last_edited_time) >= cutoff);
}

function pageTitle(p) {
  for (const prop of Object.values(p.properties || {})) {
    if (prop.type === 'title') return (prop.title || []).map((t) => t.plain_text).join('') || '(untitled)';
  }
  return '(untitled)';
}

const blockText = (b) => ((b[b.type]?.rich_text) || []).map((t) => t.plain_text).join('');

async function pageText(token, blockId, depth = 0, budget = { chars: 8000 }) {
  if (depth > 2 || budget.chars <= 0) return '';
  const parts = [];
  let cursor;
  do {
    const res = await notion(token, 'GET', `/blocks/${blockId}/children?page_size=100${cursor ? `&start_cursor=${cursor}` : ''}`);
    for (const b of res.results) {
      if (budget.chars <= 0) break;
      const t = blockText(b);
      if (t) { parts.push(t); budget.chars -= t.length; }
      if (b.has_children && b.type !== 'child_page' && b.type !== 'child_database') {
        parts.push(await pageText(token, b.id, depth + 1, budget));
      }
    }
    cursor = res.has_more ? res.next_cursor : null;
  } while (cursor && budget.chars > 0);
  return parts.filter(Boolean).join('\n');
}

// --------------------------------------------------------------------------
// Claude auto-tagging
// --------------------------------------------------------------------------
const TAG_SYSTEM = `You tag a meeting note from a 2-partner acquisition firm (Pronghorn Equity) against their CRM. You get the note plus numbered candidate lists (companies, deals, contacts). Match ONLY when the note is genuinely about that entity — a passing mention of a similar name is not a match. People: detect anyone mentioned with a ROLE relevant to deal-making (advisor, broker, investor, owner/seller, lender) — include them in new_people ONLY if the note gives their FULL name (first + last, verbatim) AND at least one of: firm, email, phone, title — each VERBATIM from the note, never inferred or guessed. NEVER include John Hodson or Tom Berman (the firm's own partners). If a person is already in the contacts candidate list, put them in contact_idxs instead of new_people.

Output JSON only:
{"company_idx": <number or null>, "deal_idx": <number or null>,
 "contact_idxs": [numbers of existing contacts this meeting was WITH],
 "confidence": "high|medium|low",  // of the company/deal match
 "summary": "3-6 sentences: what the meeting covered, decisions, action items",
 "new_people": [{"name": "...", "role": "advisor|broker|investor|owner|lender|network", "firm": null, "title": null, "email": null, "phone": null, "context": "one line on why they matter"}]}`;

async function tagNote(anthropic, note, cands, totals) {
  const msg = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001', max_tokens: 900, system: TAG_SYSTEM,
    messages: [{ role: 'user', content: JSON.stringify({
      title: note.title, edited: note.edited, text: note.text.slice(0, 6000),
      companies: cands.companies.map((c, i) => `${i}: ${c.name}`),
      deals: cands.deals.map((d, i) => `${i}: ${d.name}`),
      contacts: cands.contacts.map((c, i) => `${i}: ${c.name}${c.firm ? ` (${c.firm})` : ''}`),
    }) }],
  });
  totals.in += msg.usage.input_tokens; totals.out += msg.usage.output_tokens;
  const m = msg.content[0].text.match(/\{[\s\S]*\}/);
  return JSON.parse(m[0]);
}

const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

const PARTNERS = /john\s+hodson|tom\s+berman/i;
async function upsertPerson(p, docUrl, dryRun) {
  if (!p?.name || !(p.firm || p.email || p.phone || p.title)) return null;
  if (String(p.name).trim().split(/\s+/).length < 2) return null; // full names only
  if (PARTNERS.test(p.name)) return null;                          // never self-import
  if (/inferred|probably|likely|unknown/i.test(p.firm || '')) p.firm = null;
  if (!(p.firm || p.email || p.phone || p.title)) return null;     // re-check after firm scrub
  const { data: existing } = await supabase.from('contacts').select('id,name,email,phone,firm,title')
    .or([p.email ? `email.eq.${p.email}` : null, `name.ilike.${p.name}`].filter(Boolean).join(','))
    .limit(5);
  const hit = (existing || []).find((c) => (p.email && c.email === p.email) || norm(c.name) === norm(p.name));
  if (dryRun) { log.info(`    person: ${p.name} (${p.role}${p.firm ? ` @ ${p.firm}` : ''}) → ${hit ? 'enrich existing' : 'CREATE'}`); return hit?.id ?? null; }
  if (hit) {
    const patch = {};
    for (const k of ['email', 'phone', 'firm', 'title']) if (!hit[k] && p[k]) patch[k] = p[k];
    if (Object.keys(patch).length) await supabase.from('contacts').update(patch).eq('id', hit.id);
    return hit.id;
  }
  const { data: created, error } = await supabase.from('contacts').insert({
    name: p.name, role: p.role === 'owner' ? 'owner' : (p.role || 'network'),
    email: p.email, phone: p.phone, firm: p.firm, title: p.title,
    notes: `[notion-sweep] ${p.context || ''} (${docUrl})`.trim(),
  }).select('id').single();
  if (error) { log.warn(`    contact create ${p.name}: ${error.message}`); return null; }
  log.info(`    + contact: ${p.name} (${p.role}${p.firm ? ` @ ${p.firm}` : ''})`);
  return created.id;
}

// --------------------------------------------------------------------------
async function liveSweep() {
  const arg = (f, d) => { const i = process.argv.indexOf(f); return i > -1 ? Number(process.argv[i + 1]) : d; };
  const hours = arg('--hours', 48);
  const dryRun = process.argv.includes('--dry-run');
  const cutoff = new Date(Date.now() - hours * 3600 * 1000);

  const tokens = [['John', process.env.NOTION_TOKEN], ['Tom', process.env.NOTION_TOKEN_TOM]]
    .filter(([, t]) => t);
  if (!tokens.length) { log.error('No NOTION_TOKEN in env.'); process.exit(1); }

  const [{ data: companies }, { data: deals }, { data: contacts }] = await Promise.all([
    supabase.from('companies').select('id,name').limit(2000),
    supabase.from('deals').select('id,name').limit(500),
    supabase.from('contacts').select('id,name,firm').limit(2000),
  ]);
  const cands = { companies: companies || [], deals: deals || [], contacts: contacts || [] };

  const Anthropic = require('@anthropic-ai/sdk');
  const anthropic = new Anthropic();
  const totals = { in: 0, out: 0 };
  let added = 0, updated = 0, unchanged = 0, needsTagging = 0, people = 0;

  for (const [who, token] of tokens) {
    let pages;
    try { pages = await recentPages(token, cutoff); }
    catch (e) { log.error(`${who}'s Notion: ${e.message}`); continue; }
    log.info(`${who}'s Notion: ${pages.length} page(s) edited in the last ${hours}h`);

    for (const p of pages) {
      const url = p.url;
      const title = pageTitle(p);
      try {
        // Idempotency on the PAGE ID, not the URL string — the same page has
        // multiple URL forms (app.notion.com/p/<id> vs notion.so/<slug>-<id>).
        const pid = String(p.id).replace(/-/g, '');
        const { data: existRows } = await supabase.from('activities')
          .select('id,body,company_id').ilike('doc_url', `%${pid}%`).limit(1);
        const existing = existRows?.[0] ?? null;
        // Hand-cataloged entries (PM/John) are curated — never overwrite them.
        if (existing && !String(existing.body || '').startsWith('[Notion meeting')) { unchanged++; continue; }

        const text = await pageText(token, p.id);
        if (!text.trim()) { log.info(`  skip (empty): ${title}`); continue; }

        const tag = await tagNote(anthropic, { title, edited: p.last_edited_time, text }, cands, totals);
        const company = tag.company_idx != null ? cands.companies[tag.company_idx] : null;
        const deal = tag.deal_idx != null ? cands.deals[tag.deal_idx] : null;
        const confident = tag.confidence === 'high' || tag.confidence === 'medium';
        const companyId = confident ? (company?.id ?? null) : null;

        const body = [
          `[Notion meeting ${String(p.last_edited_time).slice(0, 10)}] ${title}`,
          (tag.summary || '').trim(),
          company && !confident ? `(low-confidence match: ${company.name} — needs review)` : null,
        ].filter(Boolean).join('\n');

        // Dan Mello pattern — people first so the activity can link one
        let contactId = tag.contact_idxs?.length ? cands.contacts[tag.contact_idxs[0]]?.id ?? null : null;
        for (const np of tag.new_people || []) {
          const id = await upsertPerson(np, url, dryRun);
          if (id) { people++; contactId = contactId || id; }
        }

        if (dryRun) {
          log.info(`  [dry] ${title} → ${company ? company.name : 'UNMATCHED'} (${tag.confidence})${deal ? ` deal:${deal.name}` : ''}`);
          continue;
        }
        if (existing) {
          if (existing.body === body && (existing.company_id || null) === companyId) { unchanged++; continue; }
          const { error } = await supabase.from('activities')
            .update({ body, company_id: companyId ?? existing.company_id, deal_id: deal?.id ?? null, contact_id: contactId })
            .eq('id', existing.id);
          if (error) log.error(`  ${title}: ${error.message}`); else { updated++; log.info(`  ~ updated: ${title} → ${company?.name ?? 'unattached'}`); }
        } else {
          const { error } = await supabase.from('activities').insert({
            company_id: companyId, deal_id: deal?.id ?? null, contact_id: contactId,
            kind: 'meeting', body, doc_url: url,
          });
          if (error) log.error(`  ${title}: ${error.message}`);
          else {
            added++;
            if (!companyId) { needsTagging++; log.info(`  + logged UNATTACHED (needs tagging): ${title}`); }
            else log.info(`  + ${title} → ${company.name} (${tag.confidence})`);
          }
        }
      } catch (e) { log.error(`  ${title}: ${e.message}`); }
    }
  }

  const cost = totals.in * 0.8e-6 + totals.out * 4e-6;
  if (totals.in && !dryRun) {
    const { recordUsage } = require('./core/usage');
    await recordUsage('claude', 'enrichment', totals.in + totals.out, cost, { notion_sweep: added + updated });
  }
  log.info(`Notion sweep: ${added} added, ${updated} updated, ${unchanged} unchanged, ${needsTagging} need tagging, ${people} people upserted. Cost ≈ $${cost.toFixed(3)}.`);
}

// --------------------------------------------------------------------------
async function dumpMode() {
  const file = process.argv[2];
  if (!file || !fs.existsSync(file)) {
    console.error('Usage: node ingest_notion_meetings.js <dump.json> | --live [--hours 48] [--dry-run]');
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

(process.argv.includes('--live') ? liveSweep() : dumpMode())
  .catch((e) => { console.error(e.message); process.exit(1); });
