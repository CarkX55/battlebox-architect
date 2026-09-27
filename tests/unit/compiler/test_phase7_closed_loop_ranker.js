/**
 * Test Suite: FASE 7 — Closed-Loop State Candidate Ranker (v28.1)
 */

import { StateCandidateRanker } from '../../../src/services/compiler/core/stateCandidateRanker.js';

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

console.log('=== Running Test Suite: FASE 7 Closed-Loop State Candidate Ranker ===\n');

try {
  // Test 1: Role Validity Gate in Layer 1 (Strict Barrier)
  const invalidCandidate = {
    roleValidity: false,
    roleQuality: 0.9,
    stateExecution: 0.95,
    winPathQuality: 0.95,
    netUtility: 100
  };
  const validCandidate = {
    roleValidity: true,
    roleQuality: 0.5,
    stateExecution: 0.6,
    winPathQuality: 0.6,
    netUtility: 10
  };

  const roleGateComparison = StateCandidateRanker.compareDominanceVectors(validCandidate, invalidCandidate);
  assert(roleGateComparison > 0, 'Layer 1: Valid candidate strictly dominates invalid candidate despite lower scores');

  // Test 2: Demand/Supply Integrity Gate in Layer 2
  const brokenDemandCandidate = {
    roleValidity: true,
    hasUnsupportedDemands: true,
    roleQuality: 0.95,
    stateExecution: 0.90
  };
  const cleanCandidate = {
    roleValidity: true,
    hasUnsupportedDemands: false,
    roleQuality: 0.85,
    stateExecution: 0.80
  };

  const demandComparison = StateCandidateRanker.compareDominanceVectors(cleanCandidate, brokenDemandCandidate);
  assert(demandComparison > 0, 'Layer 2: Candidate with 0 broken demands strictly dominates candidate with unmet demands');

  // Test 3: Layer 4 State Execution (Empirical Simulation Dominance - Caso H)
  // Two candidates with identical role quality: Candidate A has 85% execution vs Candidate B with 50% execution
  const candidateHighExec = {
    roleValidity: true,
    hasUnsupportedDemands: false,
    roleQuality: 0.85,
    stateExecution: 0.85,
    winPathQuality: 0.80,
    synergyScore: 0.20
  };
  const candidateLowExec = {
    roleValidity: true,
    hasUnsupportedDemands: false,
    roleQuality: 0.85,
    stateExecution: 0.50,
    winPathQuality: 0.40,
    synergyScore: 0.50 // Higher theoretical synergy, but lower real execution
  };

  const execComparison = StateCandidateRanker.compareDominanceVectors(candidateHighExec, candidateLowExec);
  assert(execComparison > 0, 'Layer 4: Candidate with superior empirical execution (85% vs 50%) dominates candidate with higher theoretical synergy');

  // Test 4: Layer 9 Experience Tie-Breaker (Pacto de Amigos)
  // Two candidates with equivalent power, role quality, and execution
  const candidateInteractive = {
    roleValidity: true,
    hasUnsupportedDemands: false,
    roleQuality: 0.85,
    stateExecution: 0.85,
    winPathQuality: 0.80,
    resilienceScore: 0.75,
    stateDeltaScore: 0.80,
    synergyScore: 0.80,
    experienceScore: 0.90
  };
  const candidateLockout = {
    roleValidity: true,
    hasUnsupportedDemands: false,
    roleQuality: 0.85,
    stateExecution: 0.85,
    winPathQuality: 0.80,
    resilienceScore: 0.75,
    stateDeltaScore: 0.80,
    synergyScore: 0.80,
    experienceScore: 0.60
  };

  const expComparison = StateCandidateRanker.compareDominanceVectors(candidateInteractive, candidateLockout);
  assert(expComparison > 0, 'Layer 9: Candidate with superior interaction quality breaks tie between strategically equal states');

  // Test 5: Full rankCandidatesByStateDelta Integration
  const mockState = {
    cards: [
      { name: 'Mountain', count: 18, type_line: 'Basic Land — Mountain', cmc: 0 },
      { name: 'Goblin Guide', count: 4, type_line: 'Creature — Goblin Scout', cmc: 1, power: 2, toughness: 2, oracle_text: 'Haste' }
    ],
    openDemands: [],
    provenNodes: [],
    manaPips: { R: 4 }
  };

  const candidatePool = [
    { name: 'Play with Fire', cmc: 1, type_line: 'Instant', oracle_text: 'deals 2 damage to any target' },
    { name: 'Dynamite Diver', cmc: 1, type_line: 'Creature — Goblin Pilot', oracle_text: 'When this creature dies, it deals 1 damage to any target.' }
  ];

  const rankingResult = StateCandidateRanker.rankCandidatesByStateDelta(
    mockState,
    candidatePool,
    { executionPolicy: { tempo: 'Aggro' } },
    { format: 'MODERN' },
    { role: 'CHEAP_REMOVAL' }
  );

  assert(rankingResult.winningCandidate !== null, 'Ranking found a winning candidate');
  assert(rankingResult.winningCandidate.name === 'Play with Fire', 'Play with Fire won the CHEAP_REMOVAL slot over Dynamite Diver');

  console.log(`\n🎉 FASE 7 TESTS COMPLETED: ${passed}/${total} PASSED`);
} catch (e) {
  console.error('\n❌ FASE 7 TEST SUITE ERROR:', e);
  process.exit(1);
}
