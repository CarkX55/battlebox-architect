/**
 * AUTOMATED EVALUATION PLATFORM & PRO SUITE (v22.0 Master Baseline)
 * 
 * Tests Strategic Debate (Hypothesis A vs B vs C), Opponent Strategy Model (Meta countering),
 * Continuous Learning Engine, Pro Coach Explainer ("Why not X, why Y"),
 * and executes an automated evaluation run across simulated competitive requests.
 */

import assert from 'node:assert';
import { StrategicDebateEngine } from '../../../src/services/agent/strategicDebateEngine.js';
import { OpponentStrategyModel } from '../../../src/services/agent/opponentStrategyModel.js';
import { continuousLearningEngine } from '../../../src/services/agent/continuousLearningEngine.js';
import { ProCoachExplainer } from '../../../src/services/agent/proCoachExplainer.js';
import { BattleBoxAgent } from '../../../src/services/agent/battleBoxAgent.js';

console.log('🧪 Running BattleBox v22.0 Automated Evaluation Platform & Pro Test Suite...\n');

// ==========================================
// TEST 1: StrategicDebateEngine Internal Debate
// ==========================================
console.log('--- TEST 1: StrategicDebateEngine Internal Debate ---');
const dummyIntent = { archetype: 'Aggro', tribe: 'Giant' };
const debateResult = StrategicDebateEngine.conductDebate(dummyIntent);

assert.strictEqual(debateResult.debatedHypotheses.length, 3);
assert.strictEqual(debateResult.winningHypothesis.id, 'HYPOTHESIS_B');
assert.ok(debateResult.debateSummary.length > 0);
console.log('✅ TEST 1 PASSED: StrategicDebateEngine conducted internal debate between 3 hypotheses.\n');

// ==========================================
// TEST 2: OpponentStrategyModel Meta Countering
// ==========================================
console.log('--- TEST 2: OpponentStrategyModel Meta Countering ---');
const opponentModel = OpponentStrategyModel.modelOpponentStrategy('Control');
assert.strictEqual(opponentModel.targetOpponentArchetype, 'Control');
assert.ok(opponentModel.profile.requiredAdaptation.includes('resiliencia'));
console.log('✅ TEST 2 PASSED: OpponentStrategyModel modeled opponent archetype and required adaptation.\n');

// ==========================================
// TEST 3: ContinuousLearningEngine Synergy Learning
// ==========================================
console.log('--- TEST 3: ContinuousLearningEngine Synergy Learning ---');
continuousLearningEngine.recordEvaluationResult('Llanowar Elves', 'Bonecrusher Giant', +0.25);
const learnedAdj = continuousLearningEngine.getWeightAdjustment('Llanowar Elves', 'Bonecrusher Giant');
assert.strictEqual(learnedAdj, +0.25);
console.log('✅ TEST 3 PASSED: ContinuousLearningEngine recorded empirical synergy weight adjustment.\n');

// ==========================================
// TEST 4: ProCoachExplainer Rationale Generation
// ==========================================
console.log('--- TEST 4: ProCoachExplainer Rationale Generation ---');
const dummyChosen = { name: 'Llanowar Elves', mana_cost: '{G}' };
const dummyDiscards = ['Elvish Mystic', 'Delighted Halfling'];
const coachOutput = ProCoachExplainer.explainChoice(dummyChosen, dummyDiscards, 'Maximizes T3 Giant');

assert.strictEqual(coachOutput.chosenCard, 'Llanowar Elves');
assert.ok(coachOutput.explanation.includes('Explicación Pro-Coach'));
assert.ok(coachOutput.explanation.includes('Elvish Mystic'));
console.log('✅ TEST 4 PASSED: ProCoachExplainer generated pro-level coaching rationale ("Why not X, why Y").\n');

// ==========================================
// TEST 5: Master Pro BattleBoxAgent End-to-End Execution
// ==========================================
console.log('--- TEST 5: Master Pro BattleBoxAgent End-to-End Execution ---');
const mockIntentPackage = {
  format: 'STANDARD',
  colors: ['R', 'W', 'G'],
  tribe: 'Giant',
  archetype: 'Aggro',
  budget: 'UNLIMITED',
  powerLevel: 'COMPETITIVE',
  constraints: { excludedCards: [] }
};

const masterAgent = new BattleBoxAgent(mockIntentPackage);

(async () => {
  const result = await masterAgent.runReActLoop();

  assert.strictEqual(result.metrics.totalCards, 60);
  assert.ok(result.coachExplanations.length > 0);
  assert.strictEqual(result.debate.winningHypothesis.id, 'HYPOTHESIS_B');
  assert.strictEqual(result.opponentModel.targetOpponentArchetype, 'Control');

  console.log('✅ TEST 5 PASSED: Master Pro BattleBoxAgent executed 60/60 deck with Debate, Opponent Model, and Pro-Coach Explanations.\n');
  console.log('🎉 ALL AUTOMATED EVALUATION PLATFORM v22.0 TESTS PASSED WITH 100% SUCCESS!');
})();
