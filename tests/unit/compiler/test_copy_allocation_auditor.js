/**
 * tests/unit/compiler/test_copy_allocation_auditor.js
 * 
 * Unit tests for CopyAllocationAuditor, DeckTelemetry, and MutationRecord.
 * Sprint 23: Architectural Invariant Audit.
 * 
 * Run: node tests/unit/compiler/test_copy_allocation_auditor.js
 */

import { CopyAllocationAuditor, ViolationType } from '../../../src/services/compiler/core/copyAllocationAuditor.js';
import { DeckTelemetry } from '../../../src/services/compiler/core/deckTelemetry.js';
import { MutationRecord, MutationLog } from '../../../src/services/compiler/core/mutationRecord.js';
import { CopyAllocationState } from '../../../src/services/compiler/core/copyAllocationManager.js';
import { CapabilityPackage, LockLevel, PackagePriority } from '../../../src/services/compiler/core/capabilityPackage.js';

let passed = 0;
let failed = 0;

function assert(condition, testName) {
  if (condition) {
    console.log(`  ✅ ${testName}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${testName}`);
    failed++;
  }
}

// ═══════════════════════════════════════════════════════
// Helper: build test data
// ═══════════════════════════════════════════════════════

function buildTestPackages() {
  return [
    new CapabilityPackage({
      role: 'Ramp',
      requiredDensity: 4,
      allocatedDensity: 4,
      winnerCard: 'Llanowar Elves',
      copies: 4,
      priority: PackagePriority.PRIORITY_1_CORE,
      lockLevel: LockLevel.LOCK_HARD,
      rationale: 'T1 mana acceleration'
    }),
    new CapabilityPackage({
      role: 'Ramp',
      requiredDensity: 4,
      allocatedDensity: 4,
      winnerCard: 'Elvish Mystic',
      copies: 4,
      priority: PackagePriority.PRIORITY_1_CORE,
      lockLevel: LockLevel.LOCK_HARD,
      rationale: 'T1 mana acceleration backup'
    }),
    new CapabilityPackage({
      role: 'Draw',
      requiredDensity: 4,
      allocatedDensity: 4,
      winnerCard: 'Harmonize',
      copies: 4,
      priority: PackagePriority.PRIORITY_2_SUPPORT,
      lockLevel: LockLevel.LOCK_SOFT,
      rationale: 'Card advantage'
    }),
    new CapabilityPackage({
      role: 'Threat',
      requiredDensity: 4,
      allocatedDensity: 4,
      winnerCard: 'Craterhoof Behemoth',
      copies: 4,
      priority: PackagePriority.PRIORITY_1_CORE,
      lockLevel: LockLevel.LOCK_HARD,
      rationale: 'Win condition'
    }),
    new CapabilityPackage({
      role: 'Land',
      requiredDensity: 24,
      allocatedDensity: 24,
      winnerCard: 'Land (Karsten-calculated)',
      copies: 24,
      priority: PackagePriority.PRIORITY_1_CORE,
      lockLevel: LockLevel.LOCK_HARD,
      rationale: 'Mana base'
    })
  ];
}

function buildCompliantDeck() {
  return [
    { name: 'Llanowar Elves', quantity: 4, role: 'Ramp' },
    { name: 'Elvish Mystic', quantity: 4, role: 'Ramp' },
    { name: 'Harmonize', quantity: 4, role: 'Draw' },
    { name: 'Craterhoof Behemoth', quantity: 4, role: 'Threat' },
    { name: 'Birds of Paradise', quantity: 2, role: 'Ramp' },
    { name: 'Forest', quantity: 18, role: 'Land' },
    { name: 'Temple Garden', quantity: 4, role: 'Land' },
    { name: 'Windswept Heath', quantity: 2, role: 'Land' },
    { name: 'Stomping Ground', quantity: 4, role: 'Land' },
    { name: 'Beast Within', quantity: 4, role: 'Removal' },
    { name: 'Winding Way', quantity: 4, role: 'Draw' },
    { name: 'Collected Company', quantity: 4, role: 'Threat' },
    { name: 'Dwynen\'s Elite', quantity: 2, role: 'Threat' }
  ];
}


// ═══════════════════════════════════════════════════════
// TEST 1: PASS case — compliant deck
// ═══════════════════════════════════════════════════════
console.log('\n═══ TEST 1: PASS case — fully compliant deck ═══');
{
  const packages = buildTestPackages();
  const state = new CopyAllocationState({
    packages,
    mode: 'PRIORITIZE_4X',
    modeSource: 'FORMAT_POLICY',
    format: 'MODERN'
  });

  const deck = buildCompliantDeck();
  const result = CopyAllocationAuditor.audit(state, deck);

  assert(result.status === 'PASS', 'Audit status is PASS');
  assert(result.violations.length === 0, 'Zero violations');
  assert(result.respectedPackages > 0, 'At least one package respected');
  assert(result.packageCompliance === 1.0, 'Package compliance is 100%');
  assert(result.singletonRatio >= 0, 'Singleton ratio is a valid number');
  assert(result.unexpectedOneOf === 0, 'No unexpected one-ofs');
  assert(result.unexpectedSplits === 0, 'No unexpected splits');
  assert(result.totalCardsInDeck > 0, 'Total cards counted');
  assert(result.copyDistribution['4x'] > 0, 'Has 4x cards');
  assert(result.timestamp !== null, 'Timestamp is set');
}


// ═══════════════════════════════════════════════════════
// TEST 2: FAIL case — Llanowar Elves reduced to 3
// ═══════════════════════════════════════════════════════
console.log('\n═══ TEST 2: FAIL case — winner card reduced ═══');
{
  const packages = buildTestPackages();
  const state = new CopyAllocationState({
    packages,
    mode: 'PRIORITIZE_4X',
    modeSource: 'FORMAT_POLICY',
    format: 'MODERN'
  });

  const deck = buildCompliantDeck();
  // Simulate a post-allocation reduction
  deck.find(c => c.name === 'Llanowar Elves').quantity = 3;

  const result = CopyAllocationAuditor.audit(state, deck);

  assert(result.status === 'FAIL', 'Audit status is FAIL');
  assert(result.violations.length > 0, 'At least one violation detected');
  
  const llanowarViolation = result.violations.find(v => v.winnerCard === 'Llanowar Elves');
  assert(llanowarViolation !== undefined, 'Violation specifically identifies Llanowar Elves');
  assert(llanowarViolation.type === ViolationType.PACKAGE_FRAGMENTATION || llanowarViolation.type === ViolationType.REDUCED, 'Violation type is PACKAGE_FRAGMENTATION or REDUCED');
  assert(llanowarViolation.expected === 4, 'Expected copies is 4');
  assert(llanowarViolation.actual === 3, 'Actual copies is 3');
  assert(result.packageCompliance < 1.0, 'Package compliance dropped below 100%');
}


// ═══════════════════════════════════════════════════════
// TEST 3: FAIL case — winner card completely missing
// ═══════════════════════════════════════════════════════
console.log('\n═══ TEST 3: FAIL case — winner card missing ═══');
{
  const packages = buildTestPackages();
  const state = new CopyAllocationState({
    packages,
    mode: 'PRIORITIZE_4X',
    modeSource: 'FORMAT_POLICY',
    format: 'MODERN'
  });

  const deck = buildCompliantDeck().filter(c => c.name !== 'Craterhoof Behemoth');

  const result = CopyAllocationAuditor.audit(state, deck);

  assert(result.status === 'FAIL', 'Audit status is FAIL');
  const missingViolation = result.violations.find(v => v.winnerCard === 'Craterhoof Behemoth');
  assert(missingViolation !== undefined, 'Missing card violation detected');
  assert(missingViolation.type === ViolationType.ROLE_SUBSTITUTION || missingViolation.type === ViolationType.MISSING, 'Violation type is ROLE_SUBSTITUTION or MISSING');
  assert(missingViolation.expected === 4, 'Expected 4 copies');
  assert(missingViolation.actual === 0, 'Actual is 0');
}


// ═══════════════════════════════════════════════════════
// TEST 4: Unexpected singleton detection
// ═══════════════════════════════════════════════════════
console.log('\n═══ TEST 4: Unexpected singleton detection ═══');
{
  const packages = buildTestPackages();
  const state = new CopyAllocationState({
    packages,
    mode: 'PRIORITIZE_4X',
    modeSource: 'FORMAT_POLICY',
    format: 'MODERN'
  });

  const deck = buildCompliantDeck();
  // Reduce a 4x to 1x — unexpected singleton
  deck.find(c => c.name === 'Harmonize').quantity = 1;

  const result = CopyAllocationAuditor.audit(state, deck);

  assert(result.unexpectedOneOf > 0, 'Unexpected one-of detected');
  assert(result.violations.some(v => v.winnerCard === 'Harmonize'), 'Harmonize flagged');
}


// ═══════════════════════════════════════════════════════
// TEST 5: Telemetry accuracy
// ═══════════════════════════════════════════════════════
console.log('\n═══ TEST 5: DeckTelemetry accuracy ═══');
{
  const packages = buildTestPackages();
  const state = new CopyAllocationState({
    packages,
    mode: 'PRIORITIZE_4X',
    modeSource: 'FORMAT_POLICY',
    format: 'MODERN'
  });

  const deck = buildCompliantDeck();
  const auditResult = CopyAllocationAuditor.audit(state, deck);
  const telemetry = DeckTelemetry.capture(deck, state, auditResult);

  assert(telemetry.totalCards > 0, 'Total cards counted');
  assert(telemetry.totalDistinctCards === deck.length, 'Distinct cards matches deck entries');
  assert(telemetry.copyDistribution['4x'] >= 0, 'Copy distribution 4x is valid');
  assert(telemetry.copyDistribution['1x'] >= 0, 'Copy distribution 1x is valid');
  assert(telemetry.singletonRatio >= 0 && telemetry.singletonRatio <= 1, 'Singleton ratio in range');
  assert(telemetry.playsetRatio >= 0 && telemetry.playsetRatio <= 1, 'Playset ratio in range');
  assert(telemetry.packageCompliance !== null, 'Package compliance from audit');
  assert(telemetry.allocationMode === 'PRIORITIZE_4X', 'Allocation mode captured');
  assert(telemetry.expectedDistribution !== null, 'Expected distribution computed');
  assert(telemetry.distributionDelta !== null, 'Distribution delta computed');
  assert(telemetry.version === '23.0', 'Version is 23.0');
}


// ═══════════════════════════════════════════════════════
// TEST 6: Telemetry Expected vs Actual comparison
// ═══════════════════════════════════════════════════════
console.log('\n═══ TEST 6: Telemetry Expected vs Actual delta ═══');
{
  const packages = buildTestPackages();
  const state = new CopyAllocationState({
    packages,
    mode: 'PRIORITIZE_4X',
    modeSource: 'FORMAT_POLICY',
    format: 'MODERN'
  });

  const deck = buildCompliantDeck();
  // Reduce one 4x to 2x — should show up in delta
  deck.find(c => c.name === 'Harmonize').quantity = 2;

  const auditResult = CopyAllocationAuditor.audit(state, deck);
  const telemetry = DeckTelemetry.capture(deck, state, auditResult);

  // The 4x bucket should have lost one card and 2x gained one
  assert(telemetry.distributionDelta !== null, 'Distribution delta exists');
  assert(telemetry.copyAllocationViolations > 0, 'Violations reflected in telemetry');
}


// ═══════════════════════════════════════════════════════
// TEST 7: Telemetry format() produces readable output
// ═══════════════════════════════════════════════════════
console.log('\n═══ TEST 7: Telemetry format output ═══');
{
  const deck = buildCompliantDeck();
  const telemetry = DeckTelemetry.capture(deck, null, null);
  const formatted = DeckTelemetry.format(telemetry);

  assert(typeof formatted === 'string', 'Format returns string');
  assert(formatted.includes('DECK TELEMETRY REPORT'), 'Contains report header');
  assert(formatted.includes('4x'), 'Contains 4x distribution');
  assert(formatted.includes('Singleton Ratio'), 'Contains singleton ratio');
}


// ═══════════════════════════════════════════════════════
// TEST 8: MutationLog basic operations
// ═══════════════════════════════════════════════════════
console.log('\n═══ TEST 8: MutationLog operations ═══');
{
  const log = new MutationLog();

  log.record({
    phase: 'ManaRepair',
    action: 'REMOVE',
    cardName: 'Llanowar Elves',
    role: 'Ramp',
    reason: 'Need Forest instead',
    quantityBefore: 4,
    quantityAfter: 3
  });

  log.record({
    phase: 'CurveRepair',
    action: 'REDUCE_COPIES',
    cardName: 'Harmonize',
    role: 'Draw',
    reason: 'Curve too heavy at CMC 4',
    quantityBefore: 4,
    quantityAfter: 2
  });

  assert(log.count === 2, 'Log has 2 records');
  assert(log.getRecordsForCard('Llanowar Elves').length === 1, 'Found record for Llanowar Elves');
  assert(log.getRecordsByPhase('ManaRepair').length === 1, 'Found record by phase');
  
  const summary = log.getSummaryByPhase();
  assert(summary['ManaRepair'] === 1, 'Summary counts ManaRepair');
  assert(summary['CurveRepair'] === 1, 'Summary counts CurveRepair');

  log.freeze();
  
  let threw = false;
  try {
    log.record({ phase: 'AfterFreeze', action: 'ADD', cardName: 'Test' });
  } catch (e) {
    threw = true;
  }
  assert(threw, 'Frozen log rejects new records');
}


// ═══════════════════════════════════════════════════════
// TEST 9: Auditor with MutationLog — forensic trail
// ═══════════════════════════════════════════════════════
console.log('\n═══ TEST 9: Forensic mutation trail ═══');
{
  const packages = buildTestPackages();
  const state = new CopyAllocationState({
    packages,
    mode: 'PRIORITIZE_4X',
    modeSource: 'FORMAT_POLICY',
    format: 'MODERN'
  });

  const log = new MutationLog();
  log.record({
    phase: 'HardEnforceInteraction',
    action: 'REDUCE_COPIES',
    cardName: 'Llanowar Elves',
    role: 'Ramp',
    reason: 'Making room for interaction',
    quantityBefore: 4,
    quantityAfter: 3
  });
  log.freeze();

  const deck = buildCompliantDeck();
  deck.find(c => c.name === 'Llanowar Elves').quantity = 3;

  const result = CopyAllocationAuditor.audit(state, deck, log);

  assert(result.status === 'FAIL', 'Audit detects violation');
  
  const violation = result.violations.find(v => v.winnerCard === 'Llanowar Elves');
  assert(violation !== undefined, 'Llanowar violation found');
  assert(violation.introducedBy !== null, 'Introducer identified');
  assert(violation.introducedBy.phase === 'HardEnforceInteraction', 'Correct phase identified');
  assert(violation.introducedBy.action === 'REDUCE_COPIES', 'Correct action identified');

  // Package audit should have mutation trail
  const pkgAudit = result.packageAudits.find(p => p.winnerCard === 'Llanowar Elves');
  assert(pkgAudit !== undefined, 'Package audit exists');
  assert(pkgAudit.mutationTrail.length === 1, 'Mutation trail has 1 entry');
  assert(pkgAudit.compliance < 1.0, 'Compliance is below 100%');
}


// ═══════════════════════════════════════════════════════
// TEST 10: Auditor with no allocation state — SKIPPED
// ═══════════════════════════════════════════════════════
console.log('\n═══ TEST 10: No allocation state — SKIPPED ═══');
{
  const deck = buildCompliantDeck();
  const result = CopyAllocationAuditor.audit(null, deck);

  assert(result.status === 'SKIPPED', 'Status is SKIPPED when no allocation state');
  assert(result.totalPackages === 0, 'No packages to audit');
  assert(result.violations.length === 0, 'No violations');
}


// ═══════════════════════════════════════════════════════
// TEST 11: Density deficit detection
// ═══════════════════════════════════════════════════════
console.log('\n═══ TEST 11: Density deficit detection ═══');
{
  const packages = [
    new CapabilityPackage({
      role: 'Ramp',
      requiredDensity: 10,
      allocatedDensity: 10,
      winnerCard: 'Llanowar Elves',
      copies: 4,
      priority: PackagePriority.PRIORITY_1_CORE,
      lockLevel: LockLevel.LOCK_HARD,
      rationale: 'Need 10 ramp cards'
    })
  ];
  const state = new CopyAllocationState({
    packages,
    mode: 'PRIORITIZE_4X',
    modeSource: 'FORMAT_POLICY',
    format: 'MODERN'
  });

  // Deck has 4x Llanowar (matching copies) but only 4 total ramp density (deficit below 75% of 10)
  const deck = [
    { name: 'Llanowar Elves', quantity: 4, role: 'Ramp' },
    { name: 'Forest', quantity: 20, role: 'Land' }
  ];

  const result = CopyAllocationAuditor.audit(state, deck);

  const densityViolation = result.violations.find(v => v.type === ViolationType.DENSITY_DEFICIT);
  assert(densityViolation !== undefined, 'Density deficit violation detected');
  assert(densityViolation.expected === 10, 'Expected density is 10');
  assert(densityViolation.actual < 10, 'Actual density is below expected');
}


// ═══════════════════════════════════════════════════════
// SUMMARY
// ═══════════════════════════════════════════════════════
console.log('\n═══════════════════════════════════════');
console.log(`  Results: ${passed} passed, ${failed} failed`);
console.log('═══════════════════════════════════════\n');

if (failed > 0) {
  process.exit(1);
}
