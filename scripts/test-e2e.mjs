import assert from 'assert';
import { getDb, createUser, getUserByEmail, createScan, getScanById, getUserScans, getDashboardMetrics } from '../src/lib/db/index.js';
import { hashPassword, verifyPassword } from '../src/lib/auth/passwords.js';
import { createSessionToken, verifySessionToken } from '../src/lib/auth/session.js';
import { parseRawOcrText } from '../src/lib/extraction/field-parser.js';
import { evaluateCompliance } from '../src/lib/rule-engine/index.js';

async function runAllTests() {
  console.log('════════════════════════════════════════════════════════════════');
  console.log('      PARAKH REAL FUNCTIONAL MVP — END-TO-END TEST SUITE        ');
  console.log('════════════════════════════════════════════════════════════════\n');

  // TEST 1: Password Hashing & Verification
  console.log('[TEST 1] Testing Password Hashing & Constant-time Verification...');
  const password = 'Inspector@Secure2026';
  const hash = await hashPassword(password);
  assert(hash.includes(':'), 'Hash must contain salt:key delimiter');
  const isMatch = await verifyPassword(password, hash);
  assert.strictEqual(isMatch, true, 'Password must match its own hash');
  const isWrong = await verifyPassword('WrongPassword', hash);
  assert.strictEqual(isWrong, false, 'Wrong password must be rejected');
  console.log('  ✓ Password hashing & verification passed.\n');

  // TEST 2: Session Token Generation & Verification
  console.log('[TEST 2] Testing Cryptographic Session Tokens...');
  const testUserId = `usr_test_officer_${Date.now()}`;
  const token = createSessionToken(testUserId);
  assert(token.includes('.'), 'Token must contain payload.signature');
  const verifiedUserId = verifySessionToken(token);
  assert.strictEqual(verifiedUserId, testUserId, 'Token must decode to correct userId');
  const invalidToken = token.slice(0, -4) + 'abcd';
  assert.strictEqual(verifySessionToken(invalidToken), null, 'Tampered token must be rejected');
  console.log('  ✓ Session token cryptography passed.\n');

  // TEST 3: Database User Storage & Duplicate Prevention
  console.log('[TEST 3] Testing Database User Operations...');
  const db = getDb();
  const testEmail = `inspector_${Date.now()}@parakh.gov.in`;
  const newUser = createUser({
    id: testUserId,
    name: 'Insp. R. Verma',
    email: testEmail,
    passwordHash: hash,
  });
  assert.strictEqual(newUser.email, testEmail);

  const fetched = getUserByEmail(testEmail);
  assert(fetched !== null, 'User must be retrievable by email');
  assert.strictEqual(fetched.name, 'Insp. R. Verma');

  // Duplicate email check
  let duplicateError = false;
  try {
    createUser({
      id: 'usr_dup',
      name: 'Dup User',
      email: testEmail,
      passwordHash: hash,
    });
  } catch (err) {
    duplicateError = true;
  }
  assert(duplicateError, 'Database must enforce unique email constraint');
  console.log('  ✓ Database user creation & constraint enforcement passed.\n');

  // TEST 4: OCR Text Parsing on Product 1 (Compliant Cow Ghee)
  console.log('[TEST 4] Testing Statutory Field Parsing on Product A (Cow Ghee)...');
  const sampleGheeText = `
    AMRIT PURE COW GHEE (CLARIFIED BUTTER)
    Manufactured by: Amrit Dairy Products Pvt Ltd, Plot 42, GIDC Anand, Gujarat - 388001
    Net Quantity: 500 ml
    MRP: Rs. 385.00 (inclusive of all taxes)
    PKD: 07/2026
    Best Before: 9 Months from date of packaging
    Consumer Care: 1800-222-0199 | care@amritdairy.in
    Country of Origin: India
  `;
  const gheeParsed = parseRawOcrText(sampleGheeText, {}, {}, { category: 'FOOD', isImported: false });
  assert.strictEqual(gheeParsed.mrp.value, 385.0);
  assert.strictEqual(gheeParsed.mrp.hasInclusiveOfAllTaxes, true);
  assert.strictEqual(gheeParsed.netQuantity.value, 500);
  assert.strictEqual(gheeParsed.netQuantity.unit, 'ml');
  assert.strictEqual(gheeParsed.netQuantity.isStandardUnit, true);
  assert.strictEqual(gheeParsed.pincode, '388001');
  assert.strictEqual(gheeParsed.manufacturingDate.formatted, '07/2026');
  console.log('  ✓ Product A parsed: MRP ₹385 (taxes incl), 500ml (standard SI), Mfg 07/2026.\n');

  // TEST 5: OCR Text Parsing on Product 2 (Non-compliant Biscuits with 'gms' & missing MRP tax phrase)
  console.log('[TEST 5] Testing Statutory Field Parsing on Product B (Biscuits with Violations)...');
  const sampleBiscuitText = `
    NutriBite Butter Crisp Biscuits
    Packed by: NutriBite Foods, Industrial Area, Okhla, New Delhi - 110020
    Net Weight: 120 gms
    Maximum Retail Price: Rs. 35.00 only
    Date of Mfg: 06/2026
    Best Before: 6 Months from packaging
  `;
  const biscuitParsed = parseRawOcrText(sampleBiscuitText, {}, {}, { category: 'FOOD', isImported: false });
  assert.strictEqual(biscuitParsed.netQuantity.value, 120);
  assert.strictEqual(biscuitParsed.netQuantity.unit, 'gms');
  assert.strictEqual(biscuitParsed.netQuantity.isStandardUnit, false, 'gms must be flagged as non-standard');
  assert.strictEqual(biscuitParsed.mrp.value, 35.0);
  assert.strictEqual(biscuitParsed.mrp.hasInclusiveOfAllTaxes, false, 'Missing tax phrase must be flagged');
  console.log('  ✓ Product B parsed: Non-standard unit "gms" and missing tax phrase detected.\n');

  // TEST 6: Legal Metrology Rule Engine on Product A
  console.log('[TEST 6] Testing Rule Engine on Product A (Expecting COMPLIANT)...');
  const gheeCompliance = evaluateCompliance(gheeParsed, {
    productName: 'Amrit Pure Cow Ghee 500ml',
    category: 'FOOD',
    isImported: false,
  });
  console.log(`  Verdict: ${gheeCompliance.overall_status}`);
  console.log(`  Passed: ${gheeCompliance.summary.passed}/${gheeCompliance.summary.total_rules} rules`);
  console.log(`  Violations: ${gheeCompliance.violations.length}`);
  assert.strictEqual(gheeCompliance.overall_status, 'COMPLIANT');
  assert.strictEqual(gheeCompliance.violations.length, 0);
  console.log('  ✓ Product A evaluated as COMPLIANT with 0 statutory violations.\n');

  // TEST 7: Legal Metrology Rule Engine on Product B
  console.log('[TEST 7] Testing Rule Engine on Product B (Expecting NON_COMPLIANT with 2 infractions)...');
  const biscuitCompliance = evaluateCompliance(biscuitParsed, {
    productName: 'NutriBite Butter Crisp 120g',
    category: 'FOOD',
    isImported: false,
  });
  console.log(`  Verdict: ${biscuitCompliance.overall_status}`);
  console.log(`  Passed: ${biscuitCompliance.summary.passed}/${biscuitCompliance.summary.total_rules} rules`);
  console.log(`  Failed: ${biscuitCompliance.summary.failed}`);
  console.log(`  Violations detected: ${biscuitCompliance.violations.map(v => v.rule_code).join(', ')}`);
  assert.strictEqual(biscuitCompliance.overall_status, 'NON_COMPLIANT');
  assert(biscuitCompliance.violations.some(v => v.rule_code === 'PCR-004'), 'Must fail Rule 12 standard units for "gms"');
  assert(biscuitCompliance.violations.some(v => v.rule_code === 'PCR-006'), 'Must fail Rule 6(1)(e) for missing tax inclusivity');
  console.log('  ✓ Product B evaluated as NON_COMPLIANT with exact legal citations.\n');

  // TEST 8: Scan Persistence in Database
  console.log('[TEST 8] Testing Scan Persistence in Database...');
  const scanIdA = `scn_${Date.now()}_a`;
  const scanRecordA = createScan({
    id: scanIdA,
    userId: testUserId,
    productName: 'Amrit Pure Cow Ghee 500ml',
    category: 'FOOD',
    isImported: false,
    countryOfOrigin: 'India',
    imagePath: '/uploads/sample_ghee.jpg',
    packageFaces: ['FRONT'],
    rawOcrText: sampleGheeText,
    extractedData: gheeParsed,
    complianceResult: gheeCompliance,
    overallStatus: gheeCompliance.overall_status,
    violationsCount: gheeCompliance.violations.length,
    inspectorName: 'Insp. R. Verma',
  });
  assert.strictEqual(scanRecordA.id, scanIdA);

  const retrieved = getScanById(scanIdA);
  assert(retrieved !== null, 'Scan must be retrievable from database');
  assert.strictEqual(retrieved.overall_status, 'COMPLIANT');
  assert.strictEqual(retrieved.product_name, 'Amrit Pure Cow Ghee 500ml');
  console.log('  ✓ Scan record saved and retrieved from DB.\n');

  // TEST 9: User Isolation (User A vs User B)
  console.log('[TEST 9] Testing User Isolation (User A vs User B)...');
  const testUserBId = `usr_test_officer_b_${Date.now()}`;
  createUser({
    id: testUserBId,
    name: 'Insp. Sunita Rao',
    email: `sunita_${Date.now()}@parakh.gov.in`,
    passwordHash: hash,
  });

  const userAScans = getUserScans(testUserId);
  const userBScans = getUserScans(testUserBId);
  assert(userAScans.some(s => s.id === scanIdA), "User A must see their own scan");
  assert(!userBScans.some(s => s.id === scanIdA), "User B must NEVER see User A's scan");
  console.log(`  User A scans: ${userAScans.length}, User B scans: ${userBScans.length}`);
  console.log('  ✓ User isolation verified: User A history strictly separated from User B.\n');

  // TEST 10: Dashboard Metrics Aggregation
  console.log('[TEST 10] Testing Dashboard Metrics Aggregation...');
  const metrics = getDashboardMetrics(testUserId);
  assert(metrics.totalInspections >= 1);
  assert(metrics.compliant >= 1);
  console.log(`  Total: ${metrics.totalInspections}, Compliant: ${metrics.compliant}, Violations: ${metrics.violations}`);
  console.log('  ✓ Dashboard metrics calculation passed.\n');

  console.log('════════════════════════════════════════════════════════════════');
  console.log('        ALL 10 END-TO-END AUTOMATED TESTS PASSED!               ');
  console.log('════════════════════════════════════════════════════════════════');
}

runAllTests().catch((err) => {
  console.error('\n❌ Test execution failed:', err);
  process.exit(1);
});
