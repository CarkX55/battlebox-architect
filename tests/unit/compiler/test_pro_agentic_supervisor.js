/**
 * PRO REACT EXPERT AGENT & STRATEGIC SUPERVISOR TEST SUITE (v19.0 Pro)
 * 
 * Verifies ReasoningMemory causal trace, StrategicSupervisor audits,
 * SimulationBeforeCommit metric verification, and MagicKnowledgeModel archetypes.
 */

import assert from 'node:assert';
import { IntentLock } from '../../../src/services/agent/intentLock.js';
import { ReasoningMemory, IMPORTANCE_TIERS } from '../../../src/services/agent/reasoningMemory.js';
import { MagicKnowledgeModel } from '../../../src/services/agent/magicKnowledgeModel.js';
import { SimulationBeforeCommit } from '../../../src/services/agent/simulationBeforeCommit.js';
import { StrategicSupervisor } from '../../../src/services/agent/strategicSupervisor.js';
import { BattleBoxAgent } from '../../../src/services/agent/battleBoxAgent.js';

console.log('🧪 Running BattleBox v19.0 Pro ReAct Agent & Strategic Supervisor Test Suite...\n');

// ==========================================
// TEST 1: ReasoningMemory Causal Decision Graph
// ==========================================
console.log('--- TEST 1: ReasoningMemory Causal Decision Graph ---');
const memory = new ReasoningMemory();
memory.recordDecision({
  cardName: 'Llanowar Elves',
  count: 4,
  choiceRationale: 'Mana acceleration T1-T2',
  evaluatedAlternatives: ['Elvish Mystic'],
  importanceRank: IMPORTANCE_TIERS.CRITICAL_FOUNDATION
});
memory.recordDecision({
  cardName: 'Shock',
  count: 4,
  choiceRationale: 'Cheap removal',
  importanceRank: IMPORTANCE_TIERS.UTILITY_RESPONSE
});

const leastCritical = memory.getLeastCriticalCards();
assert.strictEqual(leastCritical[0].cardName, 'Shock'); // Shock is less critical than Llanowar Elves
assert.strictEqual(memory.exportCausalTrace().length, 2);
console.log('✅ TEST 1 PASSED: ReasoningMemory decision graph and importance rankings verified.\n');

// ==========================================
// TEST 2: MagicKnowledgeModel Archetype Rules
// ==========================================
console.log('--- TEST 2: MagicKnowledgeModel Archetype Rules ---');
const aggroKnowledge = MagicKnowledgeModel.getArchetypeKnowledge('Aggro');
assert.strictEqual(aggroKnowledge.targetLands, 22);

const isEnables = MagicKnowledgeModel.evaluateResourceRelation('EarlyInteraction', 'Inevitability', 'Control');
assert.strictEqual(isEnables, true);
console.log('✅ TEST 2 PASSED: MagicKnowledgeModel archetype rules verified.\n');

// ==========================================
// TEST 3: SimulationBeforeCommit Metric Impact Verification
// ==========================================
console.log('--- TEST 3: SimulationBeforeCommit Metric Impact Verification ---');
const mockMetrics = {
  totalCards: 20,
  curve: { 1: 4, 2: 4, 3: 4, 5: 8 } // Already overloaded on CMC 5 for Aggro
};
const heavyCandidate = { name: 'Giant Titan', cmc: 5 };

const simResult = SimulationBeforeCommit.simulateCommit(mockMetrics, heavyCandidate, 4, 'Aggro');
assert.strictEqual(simResult.isCurveOverloaded, true);
assert.strictEqual(simResult.metricsDegraded, true);
assert.strictEqual(simResult.simulationStatus, 'REJECT_COMMIT_METRICS_DEGRADED');
console.log('✅ TEST 3 PASSED: SimulationBeforeCommit correctly rejected curve overload candidate.\n');

// ==========================================
// TEST 4: StrategicSupervisor Audit & Alignment
// ==========================================
console.log('--- TEST 4: StrategicSupervisor Audit & Alignment ---');
const intentLock = new IntentLock({ format: 'STANDARD', archetype: 'Ramp' });
const supervisor = new StrategicSupervisor(intentLock);

const auditResult = supervisor.auditProgress({ totalCards: 32, curve: { 1: 8, 2: 8 } }, memory);
assert.strictEqual(auditResult.action, 'RECOMMEND_BACKTRACK_REMOVAL');
console.log('✅ TEST 4 PASSED: StrategicSupervisor audit and backtrack recommendation verified.\n');

// ==========================================
// TEST 5: Pro BattleBoxAgent End-to-End Execution
// ==========================================
console.log('--- TEST 5: Pro BattleBoxAgent End-to-End Execution ---');
const mockIntentPackage = {
  format: 'STANDARD',
  colors: ['R', 'W', 'G'],
  tribe: 'Giant',
  archetype: 'Aggro',
  budget: 'UNLIMITED',
  powerLevel: 'COMPETITIVE',
  constraints: { excludedCards: [] }
};

const proAgent = new BattleBoxAgent(mockIntentPackage);

(async () => {
  const result = await proAgent.runReActLoop();

  assert.strictEqual(result.metrics.totalCards, 60);
  assert.ok(result.reasoningTrace.length > 0);
  assert.ok(result.supervisorAudits.length > 0);
  assert.ok(result.cognitiveLogs.length >= 6);

  console.log('✅ TEST 5 PASSED: Pro BattleBoxAgent executed 60/60 deck with full causal memory and supervisor audits.\n');
  console.log('🎉 ALL PRO REACT AGENT & STRATEGIC SUPERVISOR TESTS PASSED WITH 100% SUCCESS!');
})();
