/**
 * HoneLENS Automated Test Suite
 * Validates deterministic dosage calculations, biostatistical formulas,
 * citation generators, and Joint Commission abbreviation detectors.
 */

import { generateDosageProblem, checkDoNotUse, analyzeMistake, DO_NOT_USE_PATTERNS } from '../modules/practice/dosage-engine.js';
import { calculateFromCounts, explainReportedResult, calculateDiagnosticAccuracy } from '../modules/read/stats-calculator.js';
import { generateAPA7, generateAMA11, formatAuthorListAPA } from '../modules/read/cite-maker.js';
import { STUDY_DESIGNS } from '../modules/build/reading-sheets.js';
import fs from 'fs';

let passedTests = 0;
let totalTests = 0;

function assert(condition, message) {
  totalTests++;
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    process.exitCode = 1;
  } else {
    console.log(`✅ PASS: ${message}`);
    passedTests++;
  }
}

console.log('=== HoneLENS Test Suite ===\n');

// 1. Manifest Validation
console.log('--- Test Group: Manifest V3 Compliance ---');
const manifest = JSON.parse(fs.readFileSync('manifest.json', 'utf8'));
assert(manifest.manifest_version === 3, 'Manifest version is 3');
assert(manifest.permissions.includes('sidePanel'), 'SidePanel permission present');
assert(manifest.permissions.includes('storage'), 'Storage permission present');
assert(fs.existsSync('sidepanel/sidepanel.html'), 'Side panel HTML file exists');
assert(fs.existsSync('background/service-worker.js'), 'Service worker file exists');
assert(fs.existsSync('assets/icons/icon128.png'), '128px PNG icon exists');

// 2. Dosage Calculation Tests
console.log('\n--- Test Group: Deterministic Dosage Generators ---');
const categories = [
  'unit_conversion', 'oral_tablets', 'oral_liquids',
  'weight_based', 'divided_doses', 'pediatric_safe_range',
  'iv_flow_rate', 'iv_drop_rate', 'reconstitution',
  'percent_solutions', 'titration', 'heparin_protocol',
  'bsa_mosteller', 'maintenance_fluids'
];

categories.forEach(cat => {
  const prob = generateDosageProblem(cat, 12345);
  assert(prob && typeof prob.correctAnswer === 'number' && !isNaN(prob.correctAnswer), `Category ${cat} produces valid numeric answer (${prob.correctAnswer} ${prob.targetUnit})`);
  assert(prob.steps && prob.steps.length > 0, `Category ${cat} provides worked dimensional analysis steps`);
});

// Test Deterministic Mistake Analytics
console.log('\n--- Test Group: Dosage Mistake Analytics ---');
const probTest = generateDosageProblem('oral_tablets', 9999);
const mistakeFactor10 = analyzeMistake(probTest, probTest.correctAnswer * 10);
assert(mistakeFactor10.type === 'decimal_shift', 'Correctly tags factor-of-10 decimal shift error');

const probDiv = generateDosageProblem('divided_doses', 8888);
const mistakeDiv = analyzeMistake(probDiv, probDiv.correctAnswer * 3); // didn't divide by doses
assert(mistakeDiv.type === 'forgot_frequency_division', 'Correctly tags omitted frequency division error');

// 3. Joint Commission "Do Not Use" Abbreviations
console.log('\n--- Test Group: Joint Commission "Do Not Use" List ---');
const testOrders = [
  { text: 'Administer Morphine 5.0 mg IV push', expected: 'TRAILING_ZERO' },
  { text: 'Give Haldol .5 mg IM', expected: 'LACK_LEADING_ZERO' },
  { text: 'Heparin 5000 U subQ', expected: 'U' },
  { text: 'Synthroid 50 mcg Q.D. PO', expected: 'QD' },
  { text: 'Insulin 10 IU subQ', expected: 'IU' },
  { text: 'Give MS 4 mg IV', expected: 'MSO4' }
];

testOrders.forEach(o => {
  const flags = checkDoNotUse(o.text);
  assert(flags.length > 0, `Flags forbidden pattern in "${o.text}"`);
});

// Clean text should have 0 flags
const cleanOrder = 'Administer Amoxicillin 500 mg PO daily';
assert(checkDoNotUse(cleanOrder).length === 0, 'Clean medical order produces 0 Do Not Use flags');

// 4. Biostatistics Calculator Formulas
console.log('\n--- Test Group: Biostatistics Formulas ---');
const stats1 = calculateFromCounts({ a: 15, n1: 100, c: 30, n0: 100, outcomeDirection: 'bad', confLevel: 95 });
assert(stats1.expRisk === '15.00%', 'Experimental risk is 15%');
assert(stats1.ctrlRisk === '30.00%', 'Control risk is 30%');
assert(stats1.arr === '15.00%', 'ARR is 15%');
assert(stats1.nnt === 7, 'NNT is 7 (1 / 0.15 = 6.67 rounded up)');

const reported1 = explainReportedResult({ metric: 'OR', value: 0.70, ciLower: 0.55, ciUpper: 0.89 });
assert(reported1.isSignificant === true, 'OR 0.70 [0.55, 0.89] is statistically significant');

const reported2 = explainReportedResult({ metric: 'OR', value: 1.15, ciLower: 0.90, ciUpper: 1.45 });
assert(reported2.isSignificant === false, 'OR 1.15 [0.90, 1.45] is NOT statistically significant (includes 1.0)');

const diag = calculateDiagnosticAccuracy({ tp: 80, fp: 20, fn: 20, tn: 80 });
assert(diag.sensitivity === '80.0%', 'Diagnostic Sensitivity is 80%');
assert(diag.specificity === '80.0%', 'Diagnostic Specificity is 80%');

// 5. Citation Maker Rules (APA 7 & AMA 11)
console.log('\n--- Test Group: Citation Rules ---');
const srcSingle = { firstAuthor: 'Smith, J.', authors: ['Smith, John'], year: 2024, title: 'Nursing Leadership', journal: 'Journal of Nursing', volume: '12', issue: '3', page: '45-52', doi: '10.1000/182' };
const apaSingle = generateAPA7(srcSingle);
assert(apaSingle.plainText.includes('Smith, J. (2024).'), 'APA 7 formats single author initials and year');
assert(apaSingle.inTextParenthetical === '(Smith, 2024)', 'In-text single author parenthetical format');

// 21+ authors test
const authors25 = Array.from({ length: 25 }, (_, i) => `Author${i + 1}, A.`);
const apa25 = formatAuthorListAPA(authors25);
assert(apa25.includes('... Author25, A.'), 'APA 7 lists 19 authors, ellipsis, and last author for 21+ authors');

// 6. Reading Sheets Appraisal Checklists
console.log('\n--- Test Group: Reading Sheets Appraisal Checklists ---');
const studyKeys = Object.keys(STUDY_DESIGNS);
assert(studyKeys.length === 7, 'Exactly 7 study designs configured in appraisal framework');
studyKeys.forEach(k => {
  assert(STUDY_DESIGNS[k].prompts.length >= 4, `Design ${k} contains comprehensive appraisal prompts`);
});

console.log(`\n==========================================`);
console.log(`Results: ${passedTests} / ${totalTests} tests passed.`);
console.log(`==========================================`);

if (passedTests === totalTests) {
  console.log('🎉 ALL TESTS PASSED SUCCESSFULLY!\n');
} else {
  process.exit(1);
}
