/**
 * Test Suite: FASE 6 — Recovery & Adversarial Interruption Engines (v28.1)
 */

import { RecoveryPathEngine } from '../../../src/services/compiler/core/recoveryPathEngine.js';
import { AdversarialPlayabilityEngine } from '../../../src/services/compiler/core/adversarialPlayabilityEngine.js';

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

console.log('=== Running Test Suite: FASE 6 Recovery & Adversarial Interruption ===\n');

try {
  // Test 1: Resilient Multi-Path 60-Card Deck (Creatures + Direct Burn Reach + Flow)
  const resilientDeck = [
    { name: 'Mountain', count: 20, type_line: 'Basic Land — Mountain', cmc: 0 },
    { name: 'Goblin Guide', count: 4, type_line: 'Creature — Goblin Scout', cmc: 1, power: 2, toughness: 2, oracle_text: 'Haste' },
    { name: 'Monastery Swiftspear', count: 4, type_line: 'Creature — Human Monk', cmc: 1, power: 1, toughness: 2, oracle_text: 'Haste, prowess' },
    { name: 'Rundvelt Hordemaster', count: 4, type_line: 'Creature — Goblin Warrior', cmc: 2, power: 1, toughness: 1, oracle_text: 'Whenever a Goblin dies, exile top card, you may play it' },
    { name: 'Eidolon of the Great Revel', count: 4, type_line: 'Creature — Spirit', cmc: 2, power: 2, toughness: 2, oracle_text: 'deals 2 damage' },
    { name: 'Play with Fire', count: 4, type_line: 'Instant', cmc: 1, oracle_text: 'deals 2 damage to any target' },
    { name: 'Lightning Bolt', count: 4, type_line: 'Instant', cmc: 1, oracle_text: 'deals 3 damage to any target' },
    { name: 'Lava Spike', count: 4, type_line: 'Sorcery', cmc: 1, oracle_text: 'deals 3 damage to target player' },
    { name: 'Roiling Vortex', count: 4, type_line: 'Enchantment', cmc: 2, oracle_text: 'deals 1 damage' },
    { name: 'Skewer the Critics', count: 4, type_line: 'Sorcery', cmc: 3, oracle_text: 'deals 3 damage to any target' },
    { name: 'Light Up the Stage', count: 4, type_line: 'Sorcery', cmc: 3, oracle_text: 'exile the top two cards, you may play them' }
  ];

  const recoveryReport = RecoveryPathEngine.evaluateRecoveryPaths(resilientDeck);
  assert(recoveryReport.alternatePathProbability > 0.50, 'Alternate Plan B (Direct Burn) is strongly present (> 50%)');
  assert(recoveryReport.recoveryProbability > 0.30, 'Recovery Plan C (Card flow) is present (> 30%)');
  assert(recoveryReport.resilienceIndex >= 65, 'Resilience index is high (>= 65)');
  assert(recoveryReport.singlePointOfFailure === false, 'Deck has NO single point of failure');

  // Test 2: Adversarial Disruption Simulation
  const advReport = AdversarialPlayabilityEngine.simulateAdversarialScenarios(resilientDeck, {
    seed: 472918,
    simulationCount: 600,
    maxTurns: 6
  });

  assert(advReport.survivalRate > 0.40, 'Survival rate under active disruption > 40%');
  assert(advReport.spotRemovalSurvivalRate > 0.45, 'Resilient deck withstands Turn 2 spot removal (> 45% wins)');

  // Test 3: Fragile Deck (Creatures only, no reach, no card flow)
  const fragileDeck = [
    { name: 'Mountain', count: 20, type_line: 'Basic Land — Mountain', cmc: 0 },
    { name: 'Raging Goblin', count: 16, type_line: 'Creature — Goblin', cmc: 1, power: 1, toughness: 1, oracle_text: 'Haste' }
  ];

  const fragileRecovery = RecoveryPathEngine.evaluateRecoveryPaths(fragileDeck);
  assert(fragileRecovery.alternatePathProbability === 0, 'Fragile deck has 0% alternate path');
  assert(fragileRecovery.recoveryProbability === 0, 'Fragile deck has 0% recovery engine');
  assert(fragileRecovery.singlePointOfFailure === true, 'Fragile deck flagged with Single Point of Failure');

  console.log(`\n🎉 FASE 6 TESTS COMPLETED: ${passed}/${total} PASSED`);
} catch (e) {
  console.error('\n❌ FASE 6 TEST SUITE ERROR:', e);
  process.exit(1);
}
