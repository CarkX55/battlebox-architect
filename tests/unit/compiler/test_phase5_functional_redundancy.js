/**
 * Test Suite: FASE 5 — Functional Redundancy Graph (v28.1)
 */

import { FunctionalRedundancyGraph, RedundancyTier } from '../../../src/services/compiler/core/functionalRedundancyGraph.js';

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

console.log('=== Running Test Suite: FASE 5 Functional Redundancy Graph ===\n');

try {
  // Test 1: Diverse Functional Redundancy (4+2+2 structure)
  const diverseDeck = [
    { name: 'Mountain', count: 20, type_line: 'Basic Land — Mountain', cmc: 0 },
    // 4+2+2 T1 pressure: Goblin Guide (4) + Monastery Swiftspear (2) + Kumano Faces Kakkazan (2)
    { name: 'Goblin Guide', count: 4, type_line: 'Creature — Goblin Scout', cmc: 1, power: 2, toughness: 2, oracle_text: 'Haste' },
    { name: 'Monastery Swiftspear', count: 2, type_line: 'Creature — Human Monk', cmc: 1, power: 1, toughness: 2, oracle_text: 'Haste' },
    { name: 'Ragavan, Nimble Pilferer', count: 2, type_line: 'Legendary Creature — Monkey Pirate', cmc: 1, power: 2, toughness: 1, oracle_text: 'Dash' },
    // Removal redundancy: Lightning Bolt (4) + Play with Fire (4)
    { name: 'Lightning Bolt', count: 4, type_line: 'Instant', cmc: 1, oracle_text: 'deals 3 damage to any target' },
    { name: 'Play with Fire', count: 4, type_line: 'Instant', cmc: 1, oracle_text: 'deals 2 damage to any target' }
  ];

  const analysisDiverse = FunctionalRedundancyGraph.analyzeDeckRedundancy(diverseDeck);
  assert(analysisDiverse.nodeAnalysis.T1_PRESSURE.distinctProvidersCount === 3, 'T1_PRESSURE has 3 independent card providers (4+2+2)');
  assert(analysisDiverse.nodeAnalysis.T1_PRESSURE.isSinglePointOfFailure === false, 'T1_PRESSURE is NOT a single point of failure');
  assert(analysisDiverse.nodeAnalysis.CHEAP_SPOT_REMOVAL.distinctProvidersCount === 2, 'Removal has 2 distinct providers (Bolt + Play with Fire)');
  assert(analysisDiverse.nodeAnalysis.CHEAP_SPOT_REMOVAL.redundancyTiers.includes(RedundancyTier.RESILIENCE_REDUNDANCY), 'Instant removal classified as RESILIENCE_REDUNDANCY');

  // Test 2: Fragile Single Point of Failure Deck (4+4 with only 1 card per capability)
  const fragileDeck = [
    { name: 'Mountain', count: 20, type_line: 'Basic Land — Mountain', cmc: 0 },
    { name: 'Goblin Guide', count: 4, type_line: 'Creature — Goblin Scout', cmc: 1, power: 2, toughness: 2, oracle_text: 'Haste' },
    { name: 'Lightning Bolt', count: 4, type_line: 'Instant', cmc: 1, oracle_text: 'deals 3 damage to any target' },
    { name: 'Hill Giant', count: 8, type_line: 'Creature — Giant', cmc: 4, power: 3, toughness: 3, oracle_text: '' }
  ];

  const analysisFragile = FunctionalRedundancyGraph.analyzeDeckRedundancy(fragileDeck);
  assert(analysisFragile.nodeAnalysis.T1_PRESSURE.distinctProvidersCount === 1, 'Fragile deck has only 1 provider for T1_PRESSURE');
  assert(analysisFragile.nodeAnalysis.T1_PRESSURE.isSinglePointOfFailure === true, 'T1_PRESSURE flagged as Single Point of Failure');
  assert(analysisFragile.spofCount >= 1, 'Detected at least 1 SPOF in fragile deck');

  console.log(`\n🎉 FASE 5 TESTS COMPLETED: ${passed}/${total} PASSED`);
} catch (e) {
  console.error('\n❌ FASE 5 TEST SUITE ERROR:', e);
  process.exit(1);
}
