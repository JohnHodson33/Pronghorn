// Unit tests for the sweep's filing guards — the last line of defence before a
// row lands in a table John reads. Every case here is a REAL string seen in a
// live 8/4 run (the failures were found by the dedupe pass, not hypothesised).
// Run: node test/sweep_guards.test.js
const {
  plausibleCompanyName, personShaped, isStrongSource,
  normAcq, baseKey, brandKey, isDescriptivePlaceholder, findExisting,
} = require('../river_guides_sweep');

const cases = [
  // --- company names: descriptions and fragments must never file ---
  ['company', 'Select Rentokil Lawn Care Operations', false], // a divested unit, not a company
  ['company', 'Long Island tree care business', false],       // a description
  ['company', 'South Carolina and Louisiana tree care companies', false],
  ['company', 'its Florida lawn division', false],
  ['company', 'certain pest control assets', false],
  ['company', 'of', false],                                    // fragment
  ['company', 'LLC', false],
  ['company', "Emery's Tree Service", true],
  ['company', 'Elk Creek Lawn & Tree Care', true],
  ['company', 'TurfPride', true],
  ['company', 'Heads Up Landscape Contractors', true],
  ['company', 'Sun Pest Management', true],

  // --- sellers: a corporate divestiture is not a river-guide person ---
  ['person', 'Rentokil', false],
  ['person', 'Bartlett Tree Experts', false],
  ['person', 'Swinski family', false],
  ['person', 'Ed Gollaher', true],
  ['person', 'Damon Schrosk', true],

  // --- source strength: aggregator profiles can never be HIGH ---
  ['source', 'https://www.owler.com/company/senske', false],
  ['source', 'https://www.linkedin.com/posts/caseytaylor_activity-123', false],
  ['source', 'https://mergr.com/transaction/senske-acquires-x', false],
  ['source', 'https://www.prnewswire.com/news-releases/senske-acquires-x.html', true],
  ['source', 'https://www.lawnandlandscape.com/news/senske-acquires-turfpride/', true],
];

let pass = 0, fail = 0;
for (const [kind, input, want] of cases) {
  const got = kind === 'company' ? plausibleCompanyName(input)
    : kind === 'person' ? !!personShaped(input)
    : isStrongSource(input, 'Senske');
  if (got === want) { pass++; continue; }
  fail++;
  console.error(`FAIL [${kind}] ${JSON.stringify(input)} → ${got}, expected ${want}`);
}

// ── INSERT-TIME DUPLICATE GUARD ─────────────────────────────────────────────
// Every pair below is real: taken from the 19 duplicate people PM measured on
// 8/4, or from the false-positive scan run across all 549 live rows. The
// distinction this pins down is the whole point of the guard —
//   'exact' → the existing row is UPDATED in place
//   'fuzzy' → parked for a human, because a near-identical company name does
//             NOT prove the same deal
//   null    → unrelated
// An over-merge silently destroys a real deal, so the 'fuzzy'/null cases below
// matter more than the 'exact' ones.
const idxOf = (company, acquirer, full_name = null) => new Map([[normAcq(acquirer), [
  { deal_id: 'RG-X', full_name, their_company: company, acquirer,
    _base: baseKey(company), _brand: brandKey(company) },
]]]);

const dupCases = [
  // [candidate company, candidate acquirer, existing company, existing acquirer, expected tier]
  // --- real duplicates the old exact key missed ---
  ['Cordwin Tree Services', 'SavATree', 'Cordwin Tree Service', 'SavATree', 'exact'],      // plural
  ['Treecology', 'A Plus Tree', 'Treecology (Portland)', 'A Plus Tree', 'exact'],          // parenthetical
  ['JC Pools Services', 'Poolwerx', 'JC Pool Services', 'Poolwerx', 'exact'],              // plural mid-name
  ['Fairway Lawn and Tree Service', 'LawnPro', 'Fairway Lawn & Tree Service', 'LawnPRO Partners', 'exact'], // "and"/& + acquirer variant
  ['Concord Custom Lawn Care, LLC', 'LawnPro', 'Concord Custom Lawn Care', 'LawnPRO Partners', 'exact'],    // corp suffix
  ['VanCuren Services', 'Davey Tree', 'VanCuren Services + Midwest Land Clearing', 'Davey Tree', 'fuzzy'],  // qualifier tail
  ['Greener Turf', 'ExperiGreen', 'Greener Turf Lawn Fertilizing', 'ExperiGreen', 'fuzzy'],
  ['Heads Up Landscaping', 'Yellowstone', 'Heads Up Landscape Contractors', 'Yellowstone', 'fuzzy'],        // generic tail

  // --- MUST NOT auto-merge: same/similar name, genuinely different deals ---
  ['Green Machine', 'LawnPro', 'Green Machine Lawn Care', 'LawnPro', 'fuzzy'],       // Swinski family vs Cody Wetz
  ['Seacoast Tree Care and Turf', 'LawnPro', 'Seacoast Tree Care', 'LawnPRO Partners', 'fuzzy'], // Tim Doyle vs Dan Mello
  ['Commercial Kitchen Repairs', 'Tech24', 'Commercial Kitchens Inc.', 'Tech24', 'fuzzy'],

  // --- unrelated: one owner, two real companies (Chris Mierswa) ---
  ['Green Machine Lawn Care', 'LawnPro', 'Sea of Green Lawn Care, LLC', 'LawnPro', null],
  // --- unrelated: different acquirer entirely (Binford divestiture) ---
  ['Binford Supply', 'Fencing Supply Group', 'Binford Supply', 'U.S. Fence Solutions', null],
];
for (const [company, acq, exCompany, exAcq, want] of dupCases) {
  const hit = findExisting(idxOf(exCompany, exAcq), acq, company);
  const got = hit ? hit.tier : null;
  if (got === want) { pass++; continue; }
  fail++;
  console.error(`FAIL [dup] "${company}" (${acq}) vs "${exCompany}" (${exAcq}) → ${got}, expected ${want}`);
}

// Descriptive placeholders — these produced 2 of the 19 duplicate people,
// because a description can never match the real company's row.
const placeholderCases = [
  ['Long Island tree care business', true],
  ['South Carolina and Louisiana tree care companies', true],
  ["Joe's Landscaping Company", false],   // singular "Company" is a real suffix
  ["Halls Tree and Shrub Care, Inc.", false],
];
for (const [name, want] of placeholderCases) {
  const got = isDescriptivePlaceholder(name);
  if (got === want) { pass++; continue; }
  fail++;
  console.error(`FAIL [placeholder] ${JSON.stringify(name)} → ${got}, expected ${want}`);
}

const total = cases.length + dupCases.length + placeholderCases.length;
console.log(`sweep guards: ${pass}/${total} pass${fail ? `, ${fail} FAILED` : ''}`);
process.exit(fail ? 1 : 0);
