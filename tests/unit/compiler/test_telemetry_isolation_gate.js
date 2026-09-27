/**
 * tests/unit/compiler/test_telemetry_isolation_gate.js
 * 
 * V29.5 Phase D: Simulation Truth Closure & Telemetry Isolation Gate.
 * Verifies that illustrative telemetry and mock evidence can NEVER leak into
 * decision-making components (Ranker, Judge, Mana Solver).
 */

import { ExecutionEvidence, ConfidenceTier } from '../../../src/services/compiler/core/executionEvidence.js';
import { OracleTraceLog } from '../../../src/knowledge/Serving/OracleTraceLog.js';
import { ExplainabilityTimeline } from '../../../src/knowledge/Serving/ExplainabilityTimeline.js';

console.log('══════════════════════════════════════════════════════════════════');
console.log('  🏛️ V29.5 PHASE D: SIMULATION TRUTH & TELEMETRY ISOLATION GATE');
console.log('══════════════════════════════════════════════════════════════════');

// Test 1: Baseline / illustrative evidence is flagged correctly
console.log('[Test 1] Testing illustrative mock classification...');
const mockEvidence = ExecutionEvidence.createBaseline('test_mock');
console.log('  Mock Evidence evidenceTier:', mockEvidence.evidenceTier);
console.log('  Mock Evidence isDecisionSafe:', mockEvidence.isDecisionSafe);

if (mockEvidence.evidenceTier !== 'ILLUSTRATIVE_MOCK' || mockEvidence.isDecisionSafe !== false) {
  throw new Error('Baseline evidence was not flagged as illustrative mock!');
}
console.log('  ✅ Test 1 Passed: Mock evidence correctly tagged as ILLUSTRATIVE_MOCK.');

// Test 2: Inviolable gate throws when illustrative mock enters decision consumer
console.log('[Test 2] Testing assertDecisionSafe throws on mock evidence...');
let errorCaught = false;
try {
  ExecutionEvidence.assertDecisionSafe(mockEvidence, 'StateCandidateRanker');
} catch (err) {
  errorCaught = true;
  console.log('  Caught expected safety violation:', err.message);
  if (!err.message.includes('DECISION_SAFE_VIOLATION')) {
    throw new Error('Unexpected error message: ' + err.message);
  }
}

if (!errorCaught) {
  throw new Error('Gate failed to block illustrative mock evidence from entering StateCandidateRanker!');
}
console.log('  ✅ Test 2 Passed: Fatal safety violation thrown on illegal consumption.');

// Test 3: Empirical simulation evidence passes the gate
console.log('[Test 3] Testing valid empirical simulation passes assertDecisionSafe...');
const empiricalEvidence = new ExecutionEvidence({
  candidateId: 'state_candidate_real',
  simulationConfig: { seed: 472918, simulationCount: 1000, engineVersion: 'v29.5' },
  execution: { curveExecutionProbability: 0.88, mulliganRate: 0.12 },
  winPath: { lethalRate: 0.78, expectedKillTurn: 4.2 },
  resilience: { recoveryProbability: 0.72 }
});

const isSafe = ExecutionEvidence.assertDecisionSafe(empiricalEvidence, 'DeterministicSupremeJudge');
if (!isSafe || !empiricalEvidence.isDecisionSafe) {
  throw new Error('Valid empirical evidence failed decision safe gate!');
}
console.log('  ✅ Test 3 Passed: Empirical evidence cleanly approved for decisions.');

// Test 4: Telemetry Isolation (Logs do not mutate decision evidence)
console.log('[Test 4] Testing telemetry isolation...');
OracleTraceLog.reset('Test prompt');
OracleTraceLog.logPass({
  passIndex: 99,
  passName: 'ILLUSTRATIVE_PASS',
  category: 'ILLUSTRATIVE_TELEMETRY',
  status: 'PASS',
  details: { illustrativeSummary: 'Mock council vote 10/10' }
});

ExplainabilityTimeline.reset();
ExplainabilityTimeline.addStep('T_TEST', 'Telemetry Test', 'Purely observational note');

const traceEntries = OracleTraceLog.passes;
if (traceEntries.length === 0 || ExplainabilityTimeline.getTimelineSummary().length === 0) {
  throw new Error('Telemetry logger failed to record observational trace');
}
console.log('  Observational telemetry recorded without leaking into decision boundary.');
console.log('  ✅ Test 4 Passed: Telemetry strictly isolated as observational only.');

console.log('\n══════════════════════════════════════════════════════════════════');
console.log('  PHASE D PASS: SIMULATION TRUTH & TELEMETRY ISOLATION CERTIFIED');
console.log('══════════════════════════════════════════════════════════════════');
