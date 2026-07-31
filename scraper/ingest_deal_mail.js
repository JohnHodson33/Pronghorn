// Live deal-correspondence ingestion (Lane C, 7/12 — closes the gap the live
// pursuit scan surfaced: Oliver's "Data Room Invite" for Landmark was unmatched
// because the CRM DEAL isn't a scraped listing). Reads recent Outlook mail via
// Graph Mail.Read, matches each message to a KNOWN DEAL by broker email →
// contact → company → deal, and logs it as an `activity` on that deal.
//
// READ-ONLY on Outlook: fetches mail, writes activities. It does NOT
// auto-advance a live deal's stage or rewrite next_step (too risky on John's
// real deals) — instead it (a) FLAGS pursuit signals (NDA/CIM/data-room) in
// the activity, and (b) when a reply carries SCHEDULING/COMMITMENT intent,
// writes a deal_proposals row that John APPROVES from a Key Actions card
// (John 7/16: "you should be updating this based on my Outlook traffic" — the
// Fahrenhorst "anytime Tue works" reply sat 24h uncaught). Never a silent
// rewrite. Idempotent on internetMessageId.
//
// Usage: node ingest_deal_mail.js [--hours 48]

require('dotenv').config({ path: require('path').resolve(__dirname, './.env') });
const { supabase } = require('./core/db');
const log = require('./utils/logger');
const { fetchRecentMail } = require('./graph_mail');

const INTERNAL = /pronghornequity\.com|mba2026\.hbs\.edu/i;
const SIGNAL = /(nda|non-disclosure|data ?room|confidential information memorandum|offering memorandum|\bcim\b|process letter|management presentation|IOI|LOI|due diligence)/i;
// cheap pre-filter — only pay for a Claude call when the reply plausibly
// carries scheduling/commitment intent (saves classifying every FYI email)
const SCHED_HINT = /(call|meet|meeting|available|availability|works|schedule|calendar|next week|this week|mon|tue|wed|thu|fri|monday|tuesday|wednesday|thursday|friday|talk|connect|zoom|teams|send|share|following up|follow up|by (end of|eod|cob)|deadline|extend|push|move)/i;

const CLASSIFY_SYSTEM = `You read ONE inbound email from a broker/banker on a live M&A deal thread and decide whether it changes the deal's NEXT STEP. This feeds a proposal a human approves — a wrong or invented commitment is worse than none.

Extract ONLY what the email text states. Look for: (1) a meeting AGREEMENT or availability ("anytime Tue works", "let's do Thursday 2pm", "happy to call this week"); (2) a concrete NEXT STEP the counterparty requests or promises ("send your IOI by Friday", "we'll share the CIM once the NDA is signed"); (3) any DATE they commit to.

Output JSON only:
{"changes_next_step": true/false,
 "next_step": "short imperative for OUR side, e.g. 'Schedule intro call (broker offered Tue)' or 'Send IOI' — or null",
 "next_step_due": "YYYY-MM-DD if a date is stated/clearly implied, else null",
 "meeting_when": "their stated availability verbatim, e.g. 'anytime Tue' — or null",
 "evidence": "the sentence(s) you keyed on, quoted",
 "confidence": "high|medium|low"}

Set changes_next_step=false for pure FYIs, auto-replies, out-of-office, mass mail, or anything with no actionable scheduling/commitment. When unsure, false.`;

async function main() {
  const hoursIdx = process.argv.indexOf('--hours');
  const hours = hoursIdx > -1 ? Number(process.argv[hoursIdx + 1]) : 48;
  const since = new Date(Date.now() - hours * 3600e3).toISOString();

  const messages = await fetchRecentMail(since, 100);
  log.info(`Deal-mail: ${messages.length} messages since ${since.slice(0, 10)}`);

  // broker/contact email → { company_id, deal_id, deal_name }
  const { data: contacts } = await supabase
    .from('contacts').select('email, company_id, companies(name, deals(id, name))').not('email', 'is', null);
  const byEmail = new Map();
  for (const c of contacts || []) {
    if (!c.company_id) continue;
    const co = Array.isArray(c.companies) ? c.companies[0] : c.companies;
    const deal = co?.deals && (Array.isArray(co.deals) ? co.deals[0] : co.deals);
    if (deal) byEmail.set(c.email.toLowerCase(), { company_id: c.company_id, deal_id: deal.id, name: co.name });
  }

  // deal id → {name, stage, next_step, next_step_due} for the classifier context
  const { data: dealRows } = await supabase.from('deals').select('id, name, stage, next_step, next_step_due');
  const dealById = new Map((dealRows || []).map((d) => [d.id, d]));

  let Anthropic = null, anthropic = null;
  const dryRun = process.argv.includes('--dry-run');
  let logged = 0, flagged = 0, skipped = 0, unmatched = 0, proposals = 0;
  for (const m of messages) {
    const from = (m.sender || '').toLowerCase();
    if (!from || INTERNAL.test(from)) continue;
    const match = byEmail.get(from);
    if (!match) { unmatched++; continue; }

    // idempotency: message id breadcrumb on this deal's activities.
    // NOTE: an already-logged activity must NOT short-circuit the proposal
    // path below — that bug made the classifier blind to every message already
    // logged (incl. all mail logged before proposals existed), so those deals
    // could never get a next-step proposal. The proposal write has its own
    // idempotency on (deal_id, source_msg_id).
    const { data: seen } = await supabase.from('activities')
      .select('id').eq('deal_id', match.deal_id).ilike('body', `%[msg:${m.internetMessageId}]%`).limit(1);
    const alreadyLogged = !!seen?.length;

    const isSignal = SIGNAL.test(`${m.subject} ${m.summary}`);
    if (alreadyLogged) {
      skipped++;
    } else {
      const when = (m.receivedDateTime || '').slice(0, 10);
      const body = `[Outlook ${when}] ${m.subject}\nFrom: ${m.sender}\n${(m.summary || '').trim()}` +
        (isSignal ? `\n⚑ pursuit signal — review deal stage` : '') + `\n[msg:${m.internetMessageId}]`;
      if (dryRun) {
        log.info(`  [dry] would log activity ${match.name}: "${m.subject}"`);
      } else {
        const { error } = await supabase.from('activities').insert({
          company_id: match.company_id, deal_id: match.deal_id,
          kind: isSignal ? 'note' : 'email', body, doc_url: m.webLink || null,
        });
        if (error) { log.error(`${match.name}: ${error.message}`); continue; }
      }
      logged++;
      if (isSignal) { flagged++; log.info(`  ⚑ ${match.name}: "${m.subject}" — deal-stage review flagged`); }
    }

    // SCHEDULING/COMMITMENT classification (John 7/16): propose a next_step
    // change John approves — never a silent rewrite. Cheap pre-filter first.
    if (!SCHED_HINT.test(`${m.subject} ${m.summary}`) || !process.env.ANTHROPIC_API_KEY) continue;
    // one proposal per (deal, message) — idempotent even across re-runs
    const { data: existingProp } = await supabase.from('deal_proposals')
      .select('id').eq('deal_id', match.deal_id).eq('source_msg_id', m.internetMessageId).limit(1);
    if (existingProp?.length) continue;
    try {
      if (!anthropic) { Anthropic = require('@anthropic-ai/sdk'); anthropic = new Anthropic(); }
      const deal = dealById.get(match.deal_id) || {};
      const msg = await anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001', max_tokens: 400, system: CLASSIFY_SYSTEM,
        messages: [{ role: 'user', content: JSON.stringify({
          deal: deal.name, current_stage: deal.stage,
          current_next_step: deal.next_step, current_next_step_due: deal.next_step_due,
          from: m.sender, subject: m.subject, body: (m.summary || '').slice(0, 1500),
          received: m.receivedDateTime,
        }) }],
      });
      const v = JSON.parse(msg.content[0].text.match(/\{[\s\S]*\}/)[0]);
      if (!v.changes_next_step || v.confidence === 'low') continue;
      // NEAR-DUPLICATE GUARD: brokers re-send the same ask on a new message
      // (a second "please sign the NDA" produced a second identical card).
      // Skip when a PENDING proposal on this deal already carries the same
      // evidence sentence or the same next step. Distinct asks still get their
      // own card (e.g. the 12x-valuation item alongside the NDA one).
      const nz = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
      const { data: pend } = await supabase.from('deal_proposals')
        .select('proposed_next_step, evidence').eq('deal_id', match.deal_id).eq('status', 'pending');
      if ((pend || []).some((p) => (nz(p.evidence) && nz(p.evidence) === nz(v.evidence)) || nz(p.proposed_next_step) === nz(v.next_step))) {
        log.info(`  = proposal ${match.name}: duplicate of a pending card — skipped ("${v.next_step}")`);
        continue;
      }
      const { recordUsage } = require('./core/usage');
      await recordUsage('claude', 'classification', msg.usage.input_tokens + msg.usage.output_tokens,
        (msg.usage.input_tokens * 0.8e-6 + msg.usage.output_tokens * 4e-6), { deal_mail_intent: match.deal_id });
      if (dryRun) { log.info(`  [dry] proposal ${match.name}: next_step="${v.next_step}" due=${v.next_step_due || '—'} (${v.confidence}) | ${(v.evidence || '').slice(0, 80)}`); proposals++; continue; }
      const { error: pErr } = await supabase.from('deal_proposals').insert({
        deal_id: match.deal_id, kind: v.meeting_when ? 'meeting_scheduled' : 'next_step',
        proposed_next_step: v.next_step, proposed_next_step_due: v.next_step_due || null,
        evidence: v.evidence, meeting_when: v.meeting_when || null, confidence: v.confidence,
        source_msg_id: m.internetMessageId, source_url: m.webLink || null, source_from: m.sender,
      });
      if (pErr && !/deal_proposals_msg_uq|duplicate key/.test(pErr.message)) log.warn(`  proposal ${match.name}: ${pErr.message}`);
      else if (!pErr) { proposals++; log.info(`  + proposal ${match.name}: "${v.next_step}"${v.next_step_due ? ` due ${v.next_step_due}` : ''} (${v.confidence}) — awaiting John's approval`); }
    } catch (e) { log.warn(`  classify ${match.name}: ${e.message}`); }
  }
  // reaching here means Graph auth + mail read succeeded → heartbeat the sync
  if (!dryRun) { const { recordSyncSuccess } = require('./core/sync_health'); await recordSyncSuccess(); }
  log.info(`Deal-mail: ${logged} activities logged (${flagged} pursuit-signal flags), ${proposals} next-step proposals for approval, ${skipped} already present, ${unmatched} from non-deal senders.`);
}

main().catch((e) => { console.error(e.message); process.exit(1); });
