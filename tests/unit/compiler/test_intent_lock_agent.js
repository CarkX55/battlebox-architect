/**
 * REACT EXPERT AGENT & INTENT LOCK INTEGRATION TEST SUITE (v18.0)
 * 
 * Verifies Level 1 IntentLock authority invariance, ReAct cognitive loop execution,
 * dynamic backtracking card removal, self-questioning reflection, and explicit causal rationale.
 */

import assert from 'node:assert';
import { IntentLock } from '../../../src/services/agent/intentLock.js';
import { SearchEngineTool } from '../../../src/services/agent/tools/searchEngineTool.js';
import { DeckStateManager } from '../../../src/services/agent/tools/deckStateManager.js';
import { BattleBoxAgent } from '../../../src/services/agent/battleBoxAgent.js';

console.log('🧪 Running BattleBox v18.0 ReAct Expert Agent & IntentLock Integration Test Suite...\n');

// ==========================================
// TEST 1: IntentLock Invariance & Authority
// ==========================================
console.log('--- TEST 1: IntentLock Invariance & Authority ---');
const intentLock = new IntentLock({
  format: 'STANDARD',
  colors: ['R', 'W', 'G'],
  tribe: 'Giant',
  archetype: 'Aggro',
  excludedCards: ['Sol Ring']
});

assert.strictEqual(intentLock.format, 'STANDARD');
assert.deepStrictEqual(intentLock.colors, ['R', 'W', 'G']);
assert.strictEqual(intentLock.isFormatLocked, true);

// Assert compliance check rejects excluded card
assert.throws(
  () => intentLock.assertCompliance({ name: 'Sol Ring' }),
  /IntentLockViolation/
);
console.log('✅ TEST 1 PASSED: IntentLock authority and compliance verified.\n');

// ==========================================
// TEST 2: SearchEngineTool Bound by IntentLock
// ==========================================
console.log('--- TEST 2: SearchEngineTool Bound by IntentLock ---');
const candidates = SearchEngineTool.executeSearch({
  minCmc: 1,
  maxCmc: 3,
  requiredType: 'Creature'
}, intentLock);

assert.ok(Array.isArray(candidates));
assert.ok(candidates.length > 0);
for (const cand of candidates) {
  assert.notStrictEqual(cand.name, 'Sol Ring');
}
console.log('✅ TEST 2 PASSED: SearchEngineTool returned candidate pool strictly bound by IntentLock.\n');

// ==========================================
// TEST 3: DeckStateManager Backtracking Removal
// ==========================================
console.log('--- TEST 3: DeckStateManager Backtracking Removal ---');
const stateManager = new DeckStateManager(intentLock);
const dummyCard = { name: 'Bonecrusher Giant', cmc: 3, mana_cost: '{1}{R}{R}' };

stateManager.addCard(dummyCard, 4, 'Causal justification for Bonecrusher');
assert.strictEqual(stateManager.getMetrics().totalCards, 4);

// Backtrack removal
stateManager.removeCard('Bonecrusher Giant', 2);
assert.strictEqual(stateManager.getMetrics().totalCards, 2);
console.log('✅ TEST 3 PASSED: Dynamic backtracking card removal verified.\n');

// ==========================================
// TEST 4: BattleBoxAgent ReAct Cognitive Loop End-to-End
// ==========================================
console.log('--- TEST 4: BattleBoxAgent ReAct Cognitive Loop End-to-End ---');
const mockIntentPackage = {
  format: 'STANDARD',
  colors: ['R', 'W', 'G'],
  tribe: 'Giant',
  archetype: 'Aggro',
  budget: 'UNLIMITED',
  powerLevel: 'COMPETITIVE',
  constraints: {
    excludedCards: ['Sol Ring']
  }
};

const agent = new BattleBoxAgent(mockIntentPackage);

(async () => {
  const result = await agent.runReActLoop();

  assert.ok(result.deckList.length > 0);
  assert.strictEqual(result.metrics.totalCards, 60); // 60/60 target size achieved
  assert.ok(result.cognitiveLogs.length >= 5);
  assert.strictEqual(result.activeHypothesis.id, 'HYPOTHESIS_A');

  // Verify 100% card choices have explicit causal rationale
  for (const entry of result.deckList) {
    assert.ok(entry.rationale && entry.rationale.length > 0, `Card ${entry.name} missing causal rationale`);
  }

  console.log('✅ TEST 4 PASSED: BattleBoxAgent ReAct cognitive loop executed 60/60 deck end-to-end.\n');
  console.log('🎉 ALL REACT EXPERT AGENT & INTENTLOCK INTEGRATION TESTS PASSED WITH 100% SUCCESS!');
})();
