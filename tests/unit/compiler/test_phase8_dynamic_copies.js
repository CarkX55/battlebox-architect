/**
 * Test Suite: FASE 8 — Systemic Dynamic Copy Allocation (v28.1)
 */

import { MarginalCopyEvaluator } from '../../../src/services/compiler/core/marginalCopyEvaluator.js';

let passed = 0;
let total = 0;

function assert(condition, message) {
  total++;
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    throw new Error(message);
  } else {
    console.log(`✅ PASS: ${message}`);
    passed++;
  }
}

console.log('=== Running Test Suite: FASE 8 Dynamic Copy Allocation ===\n');

try {
  // Test 1: Core Non-Legendary 1-Drop Spell (Gets 4 Copies)
  const boltCard = {
    name: 'Lightning Bolt',
    cmc: 1,
    type_line: 'Instant',
    oracle_text: 'Lightning Bolt deals 3 damage to any target.'
  };

  const boltEval = MarginalCopyEvaluator.evaluateOptimalCopies(boltCard, {}, { format: 'MODERN', winPath: ['LETHAL_REACH'] });
  assert(boltEval.recommendedCopies === 4, 'Lightning Bolt allocated full 4 copies playset');
  assert(boltEval.stoppingReason === 'MAX_LEGAL_COPIES_REACHED', 'Lightning Bolt reached MAX_LEGAL_COPIES_REACHED');
  assert(boltEval.steps.length === 4, 'Evaluated all 4 incremental steps (1..4)');

  // Test 2: Legendary Creature (Stops early due to Legendary Collision)
  const ragavanCard = {
    name: 'Ragavan, Nimble Pilferer',
    cmc: 1,
    type_line: 'Legendary Creature — Monkey Pirate',
    oracle_text: 'Dash {1}{R}'
  };

  const ragavanEval = MarginalCopyEvaluator.evaluateOptimalCopies(ragavanCard, {}, { format: 'MODERN' });
  assert(ragavanEval.recommendedCopies <= 3, 'Legendary creature capped at <= 3 copies to prevent dead draws');
  assert(ragavanEval.stoppingReason === 'LEGENDARY_COLLISION_CAP', 'Ragavan stopped with LEGENDARY_COLLISION_CAP');

  // Test 3: High CMC Heavy Finisher (Stops at 1-2 copies)
  const heavyDragon = {
    name: 'Inferno Titan',
    cmc: 6,
    type_line: 'Creature — Giant',
    oracle_text: 'When Inferno Titan enters the battlefield...'
  };

  const dragonEval = MarginalCopyEvaluator.evaluateOptimalCopies(heavyDragon, {}, { format: 'MODERN' });
  assert(dragonEval.recommendedCopies <= 2, '6-CMC creature allocated <= 2 copies');
  assert(dragonEval.stoppingReason === 'HIGH_CMC_DIMINISHING_RETURNS', 'Heavy creature stopped with HIGH_CMC_DIMINISHING_RETURNS');

  // Test 4: Format Singleton Exception (Commander / EDH)
  const edhEval = MarginalCopyEvaluator.evaluateOptimalCopies(boltCard, {}, { format: 'COMMANDER' });
  assert(edhEval.recommendedCopies === 1, 'Commander format enforces 1-copy limit');
  assert(edhEval.copyDomain.max === 1, 'Copy domain in Commander is max 1');

  console.log(`\n🎉 FASE 8 TESTS COMPLETED: ${passed}/${total} PASSED`);
} catch (e) {
  console.error('\n❌ FASE 8 TEST SUITE ERROR:', e);
  process.exit(1);
}
