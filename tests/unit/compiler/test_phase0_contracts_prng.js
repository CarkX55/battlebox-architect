/**
 * Test Suite: FASE 0 — Contracts & PRNG Determinism (v28.1)
 */

import { PRNG } from '../../../src/services/compiler/core/prng.js';
import { ExecutionEvidence, ConfidenceTier } from '../../../src/services/compiler/core/executionEvidence.js';

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

console.log('=== Running Test Suite: FASE 0 Contracts & PRNG Determinism ===\n');

try {
  // Test 1: PRNG Bitwise Reproducibility
  const prng1 = new PRNG(12345);
  const prng2 = new PRNG(12345);

  const seq1 = [prng1.next(), prng1.next(), prng1.nextInt(1, 100), prng1.next()];
  const seq2 = [prng2.next(), prng2.next(), prng2.nextInt(1, 100), prng2.next()];

  assert(JSON.stringify(seq1) === JSON.stringify(seq2), 'PRNG with identical seeds produces identical float/int sequence');

  // Test 2: Deterministic Fisher-Yates Shuffle
  const arr1 = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
  const arr2 = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
  const shuffled1 = prng1.shuffle(arr1);
  const shuffled2 = prng2.shuffle(arr2);
  assert(JSON.stringify(shuffled1) === JSON.stringify(shuffled2), 'PRNG shuffle is 100% deterministic');

  // Test 3: String Seed Support & State Forking
  const prngStr = new PRNG('rakdos_goblins_472918');
  const forkedA = prngStr.fork('sub_deck_1');
  const forkedB = new PRNG('rakdos_goblins_472918').fork('sub_deck_1');
  assert(forkedA.next() === forkedB.next(), 'Derived sub-PRNG fork is deterministic');

  // Test 4: ExecutionEvidence Immutability & Confidence Tiers
  const evidence = new ExecutionEvidence({
    candidateId: 'play_with_fire_opt',
    simulationConfig: { seed: 999, simulationCount: 50000, engineVersion: 'v28.1' },
    execution: { openingHandKeepRate: 0.88, earlyManaReliability: 0.95 },
    winPath: { winPathSuccessRate: 0.82, expectedKillTurn: 4.1 },
    resilience: { recoveryProbability: 0.76, resilienceIndex: 84 }
  });

  assert(evidence.confidence.confidenceTier === ConfidenceTier.HIGH_CONFIDENCE, '50,000 simulations assigned HIGH_CONFIDENCE');
  assert(Object.isFrozen(evidence), 'ExecutionEvidence instance is deeply frozen');
  assert(Object.isFrozen(evidence.execution), 'execution sub-object is frozen');
  assert(evidence.winPath.expectedKillTurn === 4.1, 'expectedKillTurn is captured accurately');

  // Test 5: Insufficient Evidence on Unsupported Mechanics
  const partialEvidence = new ExecutionEvidence({
    candidateId: 'unsupported_complex_card',
    simulationConfig: { seed: 1, simulationCount: 1000 },
    unsupportedMechanics: ['Banding', 'Phasing']
  });

  assert(partialEvidence.confidence.confidenceTier === ConfidenceTier.INSUFFICIENT_EVIDENCE, 'Unsupported mechanics trigger INSUFFICIENT_EVIDENCE tier');

  console.log(`\n🎉 FASE 0 TESTS COMPLETED: ${passed}/${total} PASSED`);
} catch (e) {
  console.error('\n❌ FASE 0 TEST SUITE ERROR:', e);
  process.exit(1);
}
