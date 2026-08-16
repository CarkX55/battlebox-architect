/**
 * CONSOLIDATED SINGLE-AGENT ARCHITECTURE & EPISODIC MEMORY SUITE (v23.0 Baseline)
 * 
 * Verifies single cognitive core execution (BattleBoxAgent), StrategicEpisodicMemory recall,
 * and consolidated tool suite invocation (DebateTool, OpponentAnalysisTool, TurnSimulationTool, CoachExplanationTool).
 */

import assert from 'node:assert';
import { strategicEpisodicMemory } from '../../../src/services/agent/episodicMemory.js';
import { DebateTool } from '../../../src/services/agent/tools/debateTool.js';
import { OpponentAnalysisTool } from '../../../src/services/agent/tools/opponentAnalysisTool.js';
import { TurnSimulationTool } from '../../../src/services/agent/tools/turnSimulationTool.js';
import { CoachExplanationTool } from '../../../src/services/agent/tools/coachExplanationTool.js';
import { BattleBoxAgent } from '../../../src/services/agent/battleBoxAgent.js';

console.log('🧪 Running BattleBox v23.0 Consolidated Single-Agent & Episodic Memory Test Suite...\n');

// ==========================================
// TEST 1: StrategicEpisodicMemory Episode Recall
// ==========================================
console.log('--- TEST 1: StrategicEpisodicMemory Episode Recall ---');
const recalled = strategicEpisodicMemory.recallSimilarEpisodes({ archetype: 'Ramp', tribe: 'Giant' });
assert.ok(recalled.length > 0);
assert.strictEqual(recalled[0].episodeId, 'EP_4812');
assert.ok(recalled[0].episodicLesson.includes('incrementar la remoción barata'));
console.log('✅ TEST 1 PASSED: StrategicEpisodicMemory recorded and recalled historical match episode.\n');

// ==========================================
// TEST 2: Consolidated Tool Suite Invocation
// ==========================================
console.log('--- TEST 2: Consolidated Tool Suite Invocation ---');
const debate = DebateTool.evaluatePlanDebate({ archetype: 'Aggro', tribe: 'Giant' });
assert.strictEqual(debate.plans.length, 3);
assert.strictEqual(debate.recommendedPlan.id, 'PLAN_B');

const opponentAnalysis = OpponentAnalysisTool.analyzeOpponentMeta('Control');
assert.strictEqual(opponentAnalysis.targetOpponent, 'Control');

const turnSim = TurnSimulationTool.simulateOpeningHands({ cmc: 1 }, { curve: { 1: 0 } });
assert.strictEqual(turnSim.simulationPassed, true);

const coachExp = CoachExplanationTool.formatExplanation({ name: 'Llanowar Elves' }, ['Elvish Mystic']);
assert.ok(coachExp.explanation.includes('Explicación Pro-Coach'));
console.log('✅ TEST 2 PASSED: Consolidated tool suite executed independently as software tools.\n');

// ==========================================
// TEST 3: BattleBoxAgent Single Cognitive Core End-to-End
// ==========================================
console.log('--- TEST 3: BattleBoxAgent Single Cognitive Core End-to-End ---');
const mockIntentPackage = {
  format: 'STANDARD',
  colors: ['R', 'W', 'G'],
  tribe: 'Giant',
  archetype: 'Aggro',
  budget: 'UNLIMITED',
  powerLevel: 'COMPETITIVE',
  constraints: { excludedCards: [] }
};

const agent = new BattleBoxAgent(mockIntentPackage);

(async () => {
  const result = await agent.runReActLoop();

  assert.strictEqual(result.metrics.totalCards, 60);
  assert.ok(result.recalledEpisodes.length > 0);
  assert.ok(result.coachExplanations.length > 0);
  assert.ok(result.debateSummary.includes('DebateTool'));

  console.log('✅ TEST 3 PASSED: BattleBoxAgent executed 60/60 deck as Single Cognitive Core commanding Tool Suite & Episodic Memory.\n');
  console.log('🎉 ALL CONSOLIDATED SINGLE-AGENT & EPISODIC MEMORY v23.0 TESTS PASSED WITH 100% SUCCESS!');
})();
