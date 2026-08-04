// Unit tests for the sweep's filing guards — the last line of defence before a
// row lands in a table John reads. Every case here is a REAL string seen in a
// live 8/4 run (the failures were found by the dedupe pass, not hypothesised).
// Run: node test/sweep_guards.test.js
const { plausibleCompanyName, personShaped, isStrongSource } = require('../river_guides_sweep');

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
console.log(`sweep guards: ${pass}/${cases.length} pass${fail ? `, ${fail} FAILED` : ''}`);
process.exit(fail ? 1 : 0);
