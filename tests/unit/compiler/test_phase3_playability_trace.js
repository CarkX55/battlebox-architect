/**
 * Test Suite: FASE 3 — Strategic Playability Engine & Structured Trace (v28.1)
 */

import { StrategicPlayabilityEngine } from '../../../src/services/compiler/core/strategicPlayabilityEngine.js';
import { ExecutionPolicy } from '../../../src/services/compiler/core/executionPolicy.js';
import { ConfidenceTier } from '../../../src/services/compiler/core/executionEvidence.js';

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

console.log('=== Running Test Suite: FASE 3 Strategic Playability Engine ===\n');

try {
  // Test 1: High-Power Aggro Deck Simulation
  const aggroDeck = [
    { name: 'Mountain', count: 20, type_line: 'Basic Land — Mountain', cmc: 0 },
    { name: 'Goblin Guide', count: 4, type_line: 'Creature — Goblin Scout', cmc: 1, mana_cost: '{R}', power: 2, toughness: 2, oracle_text: 'Haste' },
    { name: 'Monastery Swiftspear', count: 4, type_line: 'Creature — Human Monk', cmc: 1, mana_cost: '{R}', power: 1, toughness: 2, oracle_text: 'Haste, prowess' },
    { name: 'Play with Fire', count: 4, type_line: 'Instant', cmc: 1, mana_cost: '{R}', oracle_text: 'deals 2 damage to any target' },
    { name: 'Lightning Bolt', count: 4, type_line: 'Instant', cmc: 1, mana_cost: '{R}', oracle_text: 'deals 3 damage to any target' },
    { name: 'Rundvelt Hordemaster', count: 4, type_line: 'Creature — Goblin Warrior', cmc: 2, mana_cost: '{1}{R}', power: 1, toughness: 1, oracle_text: 'Other Goblins you control get +1/+1' }
  ];

  const policy = ExecutionPolicy.deriveFromIntent({ tempo: 'Aggro' }, { archetypeKey: 'BURN' }, {});
  const evidence1 = StrategicPlayabilityEngine.simulatePlayability(aggroDeck, {
    executionPolicy: policy,
    seed: 472918,
    simulationCount: 1000,
    maxTurns: 5,
    candidateId: 'aggro_burn_v1'
  });

  assert(evidence1.confidence.confidenceTier === ConfidenceTier.MEDIUM_CONFIDENCE, '1,000 simulations assigned MEDIUM_CONFIDENCE tier');
  assert(evidence1.execution.openingHandKeepRate > 0.70, 'Aggro deck has healthy opening hand keep rate (> 70%)');
  assert(evidence1.winPath.lethalRate > 0.60, 'Aggro deck achieves strong lethal rate (> 60%) in 5 turns');
  assert(evidence1.winPath.expectedKillTurn <= 4.8, 'Expected kill turn is fast (<= 4.8 turns)');
  assert(evidence1.traces.length === 5, 'Recorded 5 detailed sample traces');

  // Test 2: Structured ExecutionTrace Inspection
  const sampleTrace = evidence1.traces[0];
  assert(typeof sampleTrace.simIndex === 'number', 'Trace contains simIndex');
  assert(Array.isArray(sampleTrace.steps) && sampleTrace.steps.length > 0, 'Trace contains structured steps');

  const firstStep = sampleTrace.steps[0];
  assert(firstStep.turn === 1, 'First trace step is Turn 1');
  assert(typeof firstStep.action === 'string', 'Step contains structured action string');

  // Test 3: High Precision Simulation (10,000 runs)
  const evidenceHigh = StrategicPlayabilityEngine.simulatePlayability(aggroDeck, {
    executionPolicy: policy,
    seed: 472918,
    simulationCount: 10000,
    maxTurns: 5,
    candidateId: 'aggro_burn_deep'
  });

  assert(evidenceHigh.confidence.confidenceTier === ConfidenceTier.HIGH_CONFIDENCE, '10,000 simulations assigned HIGH_CONFIDENCE tier');
  assert(evidenceHigh.confidence.confidence >= 0.95, 'High confidence level >= 0.95');

  // Test 4: Deterministic Seeded Reproducibility
  const evidenceReproA = StrategicPlayabilityEngine.simulatePlayability(aggroDeck, { seed: 8888, simulationCount: 500 });
  const evidenceReproB = StrategicPlayabilityEngine.simulatePlayability(aggroDeck, { seed: 8888, simulationCount: 500 });

  assert(evidenceReproA.winPath.lethalRate === evidenceReproB.winPath.lethalRate, 'Identical seeds produce identical lethal rate');
  assert(evidenceReproA.execution.openingHandKeepRate === evidenceReproB.execution.openingHandKeepRate, 'Identical seeds produce identical keep rate');

  console.log(`\n🎉 FASE 3 TESTS COMPLETED: ${passed}/${total} PASSED`);
} catch (e) {
  console.error('\n❌ FASE 3 TEST SUITE ERROR:', e);
  process.exit(1);
}
