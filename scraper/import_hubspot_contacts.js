// Full HubSpot contact-directory import (130 contacts) — HubSpot → Supabase only.
// READ-ONLY on the HubSpot side; nothing is ever written back.
//
// Usage: node import_hubspot_contacts.js <path-to-contacts.json>
//   The JSON is a raw HubSpot contacts payload: { results: [{ id, properties }] }
//   (from the HubSpot MCP search_crm_objects dump or the REST search API).
//   Keep dumps OUT of the repo — scraper/data/ is gitignored for a reason:
//   contact PII must not be pushed to GitHub.
//
// What it does:
//   1. Filters system/vendor noise (DocuSign, HubSpot samples, Gusto, Paylocity,
//      Expensify, M365, calendar addresses, generic mailboxes, spam domains).
//   2. Skips internal/personal records (John, Tom, family).
//   3. Infers a role per contact: owner | broker | advisor | investor |
//      recruiter | network | other — from a firm-domain map first, then title
//      keywords, then lifecycle stage.
//   4. Dedupes: by email against existing rows, by normalized name (deal-import
//      owners/brokers have no email), and in-batch (e.g. the Ron Edmonds trio —
//      same person across principiumgroup.com / principium-whiteoak.com).
//   5. Links contacts to companies by normalized company-name match.
//   6. Idempotent on contacts.hubspot_id (migration 0004). If 0004 is not yet
//      applied it falls back to a "[hs:<id>]" breadcrumb in notes and folds
//      firm/title into notes, so it is safe to run before AND after 0004.

const fs = require('fs');
const { supabase } = require('./core/db');
const log = require('./utils/logger');

// ---------------------------------------------------------------------------
// Classification rules (business firms only — no personal data lives here)
// ---------------------------------------------------------------------------

// Whole domains that are system/vendor noise for a deal CRM.
const NOISE_DOMAINS = new Set([
  'docusign.net', 'hubspot.com', 'microsoft.com', 'expensify.com',
  'gusto.com', 'paylocity.com', 'apintego.com',
  'findunlockwealthweeklysolutions.co', // spam
]);
const NOISE_DOMAIN_SUFFIXES = ['.calendar.google.com'];
// Generic mailboxes — never a person.
const NOISE_LOCALPARTS = /^(concierge|success|contact|info|insurance|noreply|no-reply|m365communication|dse_)/i;

// Internal / personal — the partners themselves and family; not CRM contacts.
const INTERNAL_EMAILS = new Set([
  'jhodson@mba2026.hbs.edu', 'tberman@mba2026.hbs.edu', 'callierhodson@gmail.com',
]);

// domain → { firm, role }. Domain wins over title keywords (e.g. the "Owner" of
// an accounting firm is our advisor, not a seller).
const DOMAIN_MAP = {
  // Sell-side brokers / M&A intermediaries
  'tworld.com':                { firm: 'Transworld Business Advisors', role: 'broker' },
  'murphybusiness.com':        { firm: 'Murphy Business & Financial Services', role: 'broker' },
  'vrbizworld.com':            { firm: 'VR Business Brokers Atlanta', role: 'broker' },
  'goldstarbbaz.com':          { firm: 'Gold Star Business Brokers (AZ)', role: 'broker' },
  'trustbusinessbrokers.com':  { firm: 'Trust Business Brokers', role: 'broker' },
  'theadvisoryib.com':         { firm: 'The Advisory Investment Bank', role: 'broker' },
  'principium-whiteoak.com':   { firm: 'Principium | White Oak', role: 'broker' },
  'principiumgroup.com':       { firm: 'The Principium Group', role: 'broker' },
  'threesixtyseven.com':       { firm: 'Three Sixty Seven Advisors', role: 'broker' },
  'morsebridge.com':           { firm: 'Morsebridge', role: 'broker' },
  // Capital / investors / consolidators
  'shorecp.com':               { firm: 'Shore Capital Partners', role: 'investor' },
  'davissquarecapital.com':    { firm: 'Davis Square Capital', role: 'investor' },
  'nautic.com':                { firm: 'Nautic Partners', role: 'investor' },
  'riversidecompany.com':      { firm: 'The Riverside Company', role: 'investor' },
  'streetlight-cap.com':       { firm: 'Streetlight Capital', role: 'investor' },
  'trilongroup.com':           { firm: 'Trilon Group (landscape consolidator)', role: 'investor' },
  'friedkinintl.com':          { firm: 'Friedkin International', role: 'investor' },
  'stakercompany.com':         { firm: 'Staker Company', role: 'investor' },
  'wilkersonave.com':          { firm: 'Wilkerson Avenue', role: 'investor' },
  // Deal advisors / service providers
  'kroll.com':                 { firm: 'Kroll (Transaction Advisory)', role: 'advisor' },
  'hinckleyallen.com':         { firm: 'Hinckley Allen (law)', role: 'advisor' },
  'us.dlapiper.com':           { firm: 'DLA Piper (law)', role: 'advisor' },
  'bnncpa.com':                { firm: 'BNN (CPA)', role: 'advisor' },
  'plantemoran.com':           { firm: 'Plante Moran (CPA)', role: 'advisor' },
  'oberle-risk.com':           { firm: 'Oberle Risk Strategies (R&W insurance)', role: 'advisor' },
  'newcorisk.com':             { firm: 'Newco Risk', role: 'advisor' },
  'wcibroker.com':             { firm: 'WCI (insurance brokerage)', role: 'advisor' },
  'igsinsights.com':           { firm: 'Investor Group Services (diligence)', role: 'advisor' },
  'diligencesquared.com':      { firm: 'Diligence Squared', role: 'advisor' },
  'cfoxadvisory.com':          { firm: 'CFOx Advisory (CFO services)', role: 'advisor' },
  'mayfieldconsulting.com':    { firm: 'Mayfield Consulting', role: 'advisor' },
  'arizonaescrow.com':         { firm: 'Arizona Escrow & Financial', role: 'advisor' },
  'kinlinecpas.com':           { firm: 'Kinline CPAs', role: 'advisor' },
  'thomersonaccountingservices.com': { firm: 'Thomerson Accounting Services', role: 'advisor' },
  'jpmorgan.com':              { firm: 'J.P. Morgan', role: 'advisor' },
  'naihorizon.com':            { firm: 'NAI Horizon (commercial RE)', role: 'advisor' },
  'ewtaz.com':                 { firm: 'Enterprise Bank & Trust (AZ)', role: 'advisor' },
  'cetane.com':                { firm: 'Cetane Associates', role: 'advisor' },
  'prime-service.com':         { firm: 'Prime Service', role: 'advisor' },
  // Recruiters / search
  'sanfordrose.com':           { firm: 'Sanford Rose Associates', role: 'recruiter' },
  'jjrpartners.com':           { firm: 'JJR Partners', role: 'recruiter' },
  'rossersearch.com':          { firm: 'Rosser Search', role: 'recruiter' },
  'outsearched.com':           { firm: 'Outsearched', role: 'recruiter' },
  // ETA / search-fund network
  'exponent.partners':         { firm: 'Exponent', role: 'network' },
  'yourexponent.io':           { firm: 'Exponent', role: 'network' },
  'earlybirdedugroup.com':     { firm: 'Early Bird Education Group', role: 'network' },
  'tufts.edu':                 { firm: null, role: 'network' },
  'ucla.edu':                  { firm: null, role: 'network' },
  'mba2026.hbs.edu':           { firm: 'HBS MBA 2026', role: 'network' },
};

// Firm-name tokens too generic to identify a firm when merging duplicates.
const FIRM_STOPWORDS = new Set(['group', 'partners', 'company', 'capital', 'advisors', 'associates', 'services', 'the', 'llc', 'inc']);

// When duplicate records disagree on role, the most specific one wins.
const ROLE_PRIORITY = ['owner', 'broker', 'investor', 'advisor', 'recruiter', 'network', 'other'];
const bestRole = (a, b) => (ROLE_PRIORITY.indexOf(a ?? 'other') <= ROLE_PRIORITY.indexOf(b ?? 'other') ? a : b);

const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const emailDomain = (e) => (e && e.includes('@') ? e.split('@')[1].toLowerCase() : null);

function classify(p) {
  const email = (p.email || '').toLowerCase();
  const domain = emailDomain(email);
  const title = p.jobtitle || '';

  if (INTERNAL_EMAILS.has(email)) return { skip: 'internal' };
  if (domain) {
    if (NOISE_DOMAINS.has(domain) || NOISE_DOMAIN_SUFFIXES.some((s) => domain.endsWith(s))) return { skip: 'noise' };
    if (NOISE_LOCALPARTS.test(email.split('@')[0])) return { skip: 'noise' };
  }
  if (/\(sample contact\)/i.test(p.hs_full_name_or_email || '')) return { skip: 'noise' };

  const mapped = domain ? DOMAIN_MAP[domain] : null;
  if (mapped) return { role: mapped.role, firm: mapped.firm };

  // Title-based inference for unmapped domains / no-email records
  if (/broker|intermediar|m&a/i.test(title)) return { role: 'broker', firm: p.company || null };
  if (/recruit/i.test(title)) return { role: 'recruiter', firm: p.company || null };
  if (p.lifecyclestage === 'opportunity' && /owner|founder|seller|managing member/i.test(title)) {
    return { role: 'owner', firm: null }; // their "firm" IS the target company
  }
  return { role: 'other', firm: p.company || null };
}

// ---------------------------------------------------------------------------
// Duplicate collapsing within the import batch
// ---------------------------------------------------------------------------

function firmTokens(s) {
  return new Set(norm(s).split(' ').filter((t) => t.length >= 5 && !FIRM_STOPWORDS.has(t)));
}
function tokensOverlap(a, b) {
  const A = firmTokens(a); const B = firmTokens(b);
  for (const t of A) if (B.has(t)) return true;
  return false;
}

/** Collapse records that are the same human (email > full name > first name + firm). */
function collapseBatch(records) {
  // Rich records first: has email and a multi-word name, opportunities first
  const score = (r) => (r.email ? 2 : 0) + (norm(r.name).includes(' ') ? 1 : 0) + (r.lifecycle === 'opportunity' ? 4 : 0);
  const sorted = [...records].sort((a, b) => score(b) - score(a));
  const kept = [];
  for (const r of sorted) {
    const dup = kept.find((k) => {
      if (r.email && k.email && r.email === k.email) return true;
      const rn = norm(r.name); const kn = norm(k.name);
      if (rn && rn === kn) return true;
      // bare-first-name record joining a fuller record at the same firm/domain
      const rFirst = rn.split(' ')[0]; const kFirst = kn.split(' ')[0];
      if (rFirst && rFirst === kFirst) {
        const rd = emailDomain(r.email); const kd = emailDomain(k.email);
        if (rd && kd && rd === kd) return true;
        if (tokensOverlap(r.firm || r.company, k.firm || k.company)) return true;
        if (rd && tokensOverlap(rd.split('.')[0], (k.firm || k.company || '') + ' ' + (kd || ''))) return true;
      }
      return false;
    });
    if (dup) {
      dup.role = bestRole(dup.role, r.role);
      dup.email = dup.email || r.email;
      dup.phone = dup.phone || r.phone;
      dup.title = dup.title || r.title;
      dup.firm = dup.firm || r.firm;
      dup.company = dup.company || r.company;
      dup.mergedIds.push(r.hubspot_id);
      if (norm(r.name).length > norm(dup.name).length) dup.name = r.name;
    } else {
      r.mergedIds = [r.hubspot_id];
      kept.push(r);
    }
  }
  return kept;
}

// ---------------------------------------------------------------------------
// DB plumbing
// ---------------------------------------------------------------------------

/** Migration 0004 applied? Probe once. */
async function directoryColumnsExist() {
  const { error } = await supabase.from('contacts').select('hubspot_id').limit(1);
  return !error;
}

async function loadCompanies() {
  const { data, error } = await supabase.from('companies').select('id, name');
  if (error) throw new Error(`companies load: ${error.message}`);
  return new Map(data.map((c) => [norm(c.name), c.id]));
}

async function loadExistingContacts() {
  const { data, error } = await supabase.from('contacts').select('id, name, email, role, company_id, notes');
  if (error) throw new Error(`contacts load: ${error.message}`);
  return data;
}

async function main() {
  const file = process.argv[2];
  if (!file || !fs.existsSync(file)) {
    console.error('Usage: node import_hubspot_contacts.js <contacts.json>  ({results:[{id,properties}]})');
    process.exit(1);
  }
  const payload = JSON.parse(fs.readFileSync(file, 'utf8'));
  const rows = payload.results || payload;
  log.info(`Loaded ${rows.length} HubSpot contact records`);

  const hasCols = await directoryColumnsExist();
  if (!hasCols) log.warn('Migration 0004 not applied yet — using notes breadcrumbs for hubspot_id/firm/title');

  // 1. classify + filter
  const skipped = { noise: 0, internal: 0 };
  const records = [];
  for (const r of rows) {
    const p = r.properties;
    const c = classify(p);
    if (c.skip) { skipped[c.skip]++; continue; }
    const name = [p.firstname, p.lastname].filter(Boolean).join(' ').trim()
      || p.hs_full_name_or_email || p.email || `HubSpot ${r.id}`;
    records.push({
      hubspot_id: String(r.id), name, role: c.role, firm: c.firm,
      email: (p.email || '').toLowerCase() || null,
      phone: p.phone || p.mobilephone || null,
      title: p.jobtitle || null, company: p.company || null,
      city: p.city || null, state: p.state || null,
      lifecycle: p.lifecyclestage || null,
      linkedin: p.hs_linkedin_url || null,
    });
  }

  // 2. collapse in-batch duplicates
  const collapsed = collapseBatch(records);
  log.info(`${records.length} keepers → ${collapsed.length} after in-batch dedupe (noise ${skipped.noise}, internal ${skipped.internal})`);

  // 3. upsert against existing contacts
  const companies = await loadCompanies();
  const existing = await loadExistingContacts();
  const byEmail = new Map(existing.filter((c) => c.email).map((c) => [c.email.toLowerCase(), c]));
  const byName = new Map(existing.map((c) => [norm(c.name), c]));
  const byBreadcrumb = (hsId) => existing.find((c) => c.notes && c.notes.includes(`[hs:${hsId}]`));

  let inserted = 0, updated = 0;
  const roleCounts = {};
  for (const r of collapsed) {
    const companyId = r.company ? companies.get(norm(r.company)) || null : null;
    const match =
      (r.email && byEmail.get(r.email)) ||
      byName.get(norm(r.name)) ||
      r.mergedIds.map(byBreadcrumb).find(Boolean) ||
      null;

    const noteBits = [];
    if (r.lifecycle === 'opportunity') noteBits.push('HubSpot lifecycle: opportunity');
    if (r.city || r.state) noteBits.push([r.city, r.state].filter(Boolean).join(', '));
    if (r.mergedIds.length > 1) noteBits.push(`merged ${r.mergedIds.length} HubSpot records`);

    const base = {
      name: r.name,
      email: r.email,
      phone: r.phone,
      linkedin: r.linkedin,
    };
    if (companyId) base.company_id = companyId;

    if (hasCols) {
      base.hubspot_id = r.mergedIds[0];
      base.firm = r.firm;
      base.title = r.title;
      base.origin = 'hubspot';
      if (r.mergedIds.length > 1) noteBits.push(`also HubSpot ids ${r.mergedIds.slice(1).join(', ')}`);
    } else {
      // breadcrumbs until migration 0004 lands
      if (r.title) noteBits.unshift(r.title);
      if (r.firm) noteBits.unshift(r.firm);
      noteBits.push(...r.mergedIds.map((id) => `[hs:${id}]`));
    }

    if (match) {
      // enrich, never blank out; keep an existing owner/broker role from the deal import
      const payload2 = { ...base };
      for (const k of Object.keys(payload2)) if (payload2[k] == null && k !== 'origin') delete payload2[k];
      // protect deal-import roles (owner/broker) but let a specific role replace 'other'
      payload2.role = match.role && match.role !== 'other' ? match.role : r.role;
      const newBits = noteBits.filter((b) => !(match.notes || '').includes(b));
      if (newBits.length) payload2.notes = [match.notes, newBits.join(' · ')].filter(Boolean).join(' | ');
      const { error } = await supabase.from('contacts').update(payload2).eq('id', match.id);
      if (error) { log.error(`update ${r.name}: ${error.message}`); continue; }
      roleCounts[payload2.role] = (roleCounts[payload2.role] || 0) + 1;
      updated++;
    } else {
      const payload2 = { ...base, role: r.role, notes: noteBits.join(' · ') || null };
      const { error } = await supabase.from('contacts').insert(payload2);
      if (error) { log.error(`insert ${r.name}: ${error.message}`); continue; }
      roleCounts[r.role] = (roleCounts[r.role] || 0) + 1;
      inserted++;
    }
  }

  log.info(`Contact directory import: ${inserted} inserted, ${updated} updated/enriched`);
  log.info(`Roles: ${Object.entries(roleCounts).map(([k, v]) => `${k}=${v}`).join(', ')}`);
}

main().catch((e) => { console.error(e.message); process.exit(1); });
