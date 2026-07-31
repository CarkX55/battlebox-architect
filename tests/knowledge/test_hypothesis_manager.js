import { HypothesisManager } from '../../src/knowledge/lifecycle/HypothesisManager.js';

console.log('=== TEST: Strict Async Hypothesis Isolation & 0.95 Validation Gate ===');

const manager = new HypothesisManager();

const hyp = manager.submitObservation(
  'T1 Llanowar Elves boosts winrate by +3.2%',
  'Monte Carlo Simulation',
  0.88,
  ['Oracle Text', 'MTGTop8']
);

console.log(`[PASS] Submitted Hypothesis ID: ${hyp.id} (Initial Confidence: ${hyp.confidence})`);

// Attempt 1: Low evidence weight -> should be REJECTED (confidence < 0.95)
const res1 = manager.evaluateValidationGate(hyp.id, 1.0);
console.log(`[PASS] Low Evidence Gate Result Status: ${res1.status} (Adjusted Confidence: ${res1.confidence})`);

if (res1.status === 'VALIDATED') {
  console.error('FAILED: Hypothesis should not validate with low evidence weight');
  process.exit(1);
}

// Resubmit for high evidence test
const hyp2 = manager.submitObservation(
  'T1 Llanowar Elves boosts winrate by +3.2%',
  'Monte Carlo Simulation',
  0.92,
  ['Oracle Text', 'MTGTop8', 'Simulation 100k']
);

// Attempt 2: High evidence weight -> should pass validation gate (confidence >= 0.95)
const res2 = manager.evaluateValidationGate(hyp2.id, 2.0);
console.log(`[PASS] High Evidence Gate Result Status: ${res2.status} (Validated Confidence: ${res2.confidence})`);

if (res2.status !== 'VALIDATED') {
  console.error('FAILED: Hypothesis should pass validation gate with confidence >= 0.95');
  process.exit(1);
}

console.log('=== TEST SUCCESSFUL ===');
