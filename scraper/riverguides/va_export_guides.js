// RIVER-GUIDE VA HANDOFF PACKAGE (PM 8/5: ready the moment John hires).
//
// Automation has hit its ceiling on three distinct things, and they need
// DIFFERENT human work — a single "find contact info" sheet wastes VA hours on
// rows where we already have the contact and only need the exit confirmed:
//
//   NAME            we know the company + buyer, not the person who sold it.
//   EMAIL_OR_PHONE  we know the person, but have no sendable channel
//                   (LinkedIn-only counts as MISSING — you can't email it).
//   EXIT_CONFIRM    we have the person AND a channel, but can't tell from
//                   public sources whether they still work for the acquirer.
//                   THIS IS THE HIGHEST-VALUE COLUMN: a confirmed exit turns
//                   an existing contact into a sendable lead with zero new
//                   research. It's also the one Serper genuinely cannot do —
//                   the 8/4 probe re-verified 48 of these and got nothing.
//
// Rows are ordered by that value: EXIT_CONFIRM-only first (cheapest win),
// then EMAIL_OR_PHONE, then the pairs, then NAME (most work per row).
//
// Writes TWO files: the CSV the VA fills in, and a README with per-task
// acceptance criteria. The filled CSV goes back through /intake (record type
// "enrichment fill", target river_guide) — that path is shaken down and will
// fill blanks only, surface conflicts, and never overwrite what we hold.
//
// Usage: node riverguides/va_export_guides.js [--limit 150] [--out <dir>]

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const fs = require('fs');
const path = require('path');
const { supabase } = require('../core/db');
const log = require('../utils/logger');
const { loadFocus, applyFocus, notMerged } = require('../core/focus');

// what a row still needs from a human
function needsOf(g) {
  const c = g.contact || {};
  const out = [];
  if (g.name_status !== 'RESOLVED') { out.push('NAME'); return out; } // name first; the rest is unanswerable without it
  if (!c.email && !c.phone) out.push('EMAIL_OR_PHONE');
  if (!g.current_status_verified) out.push('EXIT_CONFIRM');
  return out;
}

// cheapest-win-first (see header): a confirmed exit on a row that already has
// a channel converts to sendable immediately
const RANK = { 'EXIT_CONFIRM': 0, 'EMAIL_OR_PHONE': 1, 'EMAIL_OR_PHONE+EXIT_CONFIRM': 2, 'NAME': 3 };

const csvEsc = (v) => {
  const s = v == null ? '' : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

// Column names are load-bearing: the filled file returns through /api/intake,
// whose Claude mapper matches headers to our fields. Two traps found by running
// the real round-trip before shipping this:
//   · a pre-filled "LinkedIn (known)" column out-competed the VA's answer
//     column for the linkedin_url mapping — so the VA's finding was ignored and
//     the value we already had was re-read back. Reference columns now say
//     "do not edit" and never share a name with an answer column.
//   · "Still at acquirer? (YES/NO/UNSURE)" had nowhere to land. Asking for the
//     exit status in OUR vocabulary makes it map natively to exit_status; the
//     README translates it into plain words so the VA never sees jargon.
const COLUMNS = [
  'Deal ID', 'Task', 'Owner / Seller', 'Acquired Company', 'Acquirer', 'Year',
  'City', 'State', 'Company Website', 'Already on file',
  // the VA fills these:
  'Email', 'Phone', 'LinkedIn', 'Exit Status (EXITED / EMPLOYED / UNKNOWN)',
  'Evidence URL', 'VA Notes',
];

async function main() {
  const arg = (f) => { const i = process.argv.indexOf(f); return i > -1 ? process.argv[i + 1] : null; };
  const limit = Number(arg('--limit')) || 150;
  const outDir = arg('--out') || path.resolve(__dirname, '../output');

  const { data: all, error } = await supabase.from('river_guides').select('*');
  if (error) { console.error(error.message); process.exit(1); }

  const focus = await loadFocus();
  const { rows: inFocus } = applyFocus(notMerged(all || []), focus, (g) => g.industry);
  const work = inFocus
    .map((g) => ({ g, needs: needsOf(g) }))
    .filter((x) => x.needs.length)
    .sort((a, b) => (RANK[a.needs.join('+')] ?? 9) - (RANK[b.needs.join('+')] ?? 9)
      || (b.g.screen_score ?? 0) - (a.g.screen_score ?? 0))
    .slice(0, limit);

  if (!work.length) { log.info('Nothing needs human work — automation is current.'); return; }

  const rows = work.map(({ g, needs }) => {
    const c = g.contact || {};
    return [
      g.deal_id, needs.join('+'), g.full_name || '', g.their_company || '',
      g.acquirer || '', g.deal_year || '', g.location_city || '', g.location_state || '',
      g.company_website || '', c.linkedin_url || '',
      '', '', '', '', '', '',
    ];
  });

  fs.mkdirSync(outDir, { recursive: true });
  const stamp = new Date().toISOString().slice(0, 10);
  const csvPath = path.join(outDir, `river-guides-va-${stamp}.csv`);
  fs.writeFileSync(csvPath, [COLUMNS.join(','), ...rows.map((r) => r.map(csvEsc).join(','))].join('\n'), 'utf8');

  const tally = {};
  for (const { needs } of work) { const k = needs.join('+'); tally[k] = (tally[k] || 0) + 1; }

  const readme = `# River-guide research task — ${stamp}

${work.length} rows. Work top to bottom; they are ordered so the quickest wins come first.

## Who these people are
Each row is someone who **sold their company** to a larger buyer (the "Acquirer").
We want to talk to them about buying their next business, or about the one they
still own. We only contact people who have actually LEFT the buyer — that's why
the "Still at acquirer?" column matters as much as the contact details.

## The "Task" column tells you what's missing on that row
| Task | What to find | Count |
|---|---|---|
| EXIT_CONFIRM | We have the person and a way to reach them. Just confirm whether they still work for the Acquirer. | ${tally['EXIT_CONFIRM'] || 0} |
| EMAIL_OR_PHONE | We know who they are; find a direct email or phone. | ${tally['EMAIL_OR_PHONE'] || 0} |
| EMAIL_OR_PHONE+EXIT_CONFIRM | Both of the above. | ${tally['EMAIL_OR_PHONE+EXIT_CONFIRM'] || 0} |
| NAME | We know the company that sold, not the person. Find the owner/founder who sold it. | ${tally['NAME'] || 0} |

## Acceptance criteria (what counts as done)
- **Email / Phone** — must be a way to reach the PERSON. A company switchboard
  or info@ address does not count; leave it blank instead. A personal gmail is
  fine. If you can only find a company line, put it in VA Notes, not in Phone.
- **Exit Status** — type one of exactly three words:
  \`EXITED\` = they have LEFT the buyer · \`EMPLOYED\` = they still work there ·
  \`UNKNOWN\` = you could not tell. **Put the link that shows it in Evidence
  URL.** A LinkedIn profile showing their current employer is ideal. UNKNOWN is
  a perfectly good answer — we would much rather have UNKNOWN than a guess.
- **NAME rows** — the person who OWNED or FOUNDED the company at the time it was
  sold. Not the current manager the buyer installed. Evidence URL required.
- **Blank beats wrong.** Every field here gets read by a person deciding whether
  to contact someone. If you are not confident, leave it empty and say why in
  VA Notes. You will never be penalised for blanks; a wrong contact costs us a
  real relationship.
- Do not edit the Deal ID, Task, or any of the pre-filled columns — they are how
  results get matched back to our records.

## Where to look
LinkedIn (their profile and the buyer's employee list), the acquisition press
release (search the company name plus "acquired"), the old company website and
its "about"/"our team" page via archive.org, state business registrations, and
local news. The Company Website column often still resolves even when the
business was absorbed.

## Returning the file
Save as CSV or Excel and send it back. It is imported automatically: existing
values are never overwritten, anything that disagrees with what we already hold
is flagged for a human, and "not found"/"n/a" cells are treated as blank.
`;
  const readmePath = path.join(outDir, `river-guides-va-${stamp}-README.md`);
  fs.writeFileSync(readmePath, readme, 'utf8');

  log.info(`VA package: ${work.length} rows → ${csvPath}`);
  log.info(`            instructions → ${readmePath}`);
  log.info(`  breakdown: ${Object.entries(tally).map(([k, v]) => `${k} ${v}`).join(' · ')}`);
  log.info('  return path: /intake → "enrichment fill" → river_guide (fill-blanks-only, conflicts surfaced)');
}

main().catch((e) => { console.error(e.message); process.exit(1); });
