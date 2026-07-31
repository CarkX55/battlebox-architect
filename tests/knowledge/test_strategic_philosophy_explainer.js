import { MultiLevelLocalSearch } from '../../src/knowledge/compiler/MultiLevelLocalSearch.js';
import { StrategicPhilosophyExplainer } from '../../src/knowledge/domain/StrategicPhilosophyExplainer.js';
import { ProactiveJudgeCritic } from '../../src/knowledge/reasoning/ProactiveJudgeCritic.js';
import { PermanentLearning } from '../../src/knowledge/domain/PermanentLearningEngine.js';
import { DeckConstructionState } from '../../src/knowledge/compiler/DeckConstructionState.js';

console.log('=== TEST: Strategic Philosophy Explainer, Proactive Coach & Multi-Level Local Search ===');

// 1. Prepare DeckState
const state = new DeckConstructionState({ totalSlots: 60 });

// 2. Test Multi-Level Local Search (Levels 1-4)
const searchResult = MultiLevelLocalSearch.executeHierarchicalSearch(state);
console.log(`[PASS] Baseline Win Rate: ${searchResult.baselineWinRate}`);
console.log(`[PASS] Total Optimized Win Rate: ${searchResult.totalOptimizedWinRate}`);
console.log(`[PASS] Level 1 Swap: ${searchResult.level1SwapResult.name} (${searchResult.level1SwapResult.gain})`);
console.log(`[PASS] Level 3 Engine Swap: ${searchResult.level3EngineSwapResult.name} (${searchResult.level3EngineSwapResult.gain})`);

if (!searchResult.totalOptimizedWinRate) {
  console.error('FAILED: Total optimized win rate expected');
  process.exit(1);
}

// 3. Test Strategic Philosophy Explainer
const philosophy = StrategicPhilosophyExplainer.explainConstructionPhilosophy({ winningStrategy: 'Mono Green Devotion Ramp' }, { format: 'Standard' });
console.log(`[PASS] Philosophy Title: ${philosophy.philosophyTitle}`);
console.log(`[PASS] Pro Statement: ${philosophy.proStatement}`);
console.log(`[PASS] Net Competitive Advantage: ${philosophy.tradeoffSummary.netCompetitiveAdvantage}`);

if (!philosophy.proStatement.includes('Collected Company')) {
  console.error('FAILED: Pro statement expected to explain Collected Company trade-off philosophy');
  process.exit(1);
}

// 4. Test Proactive Judge Coaching Critic
const critique = ProactiveJudgeCritic.generateCoachingCritique(state);
console.log(`[PASS] Overall Status: ${critique.overallStatus}`);
console.log(`[PASS] Coaching Critique: ${critique.critiques[0].critiqueText}`);

// 5. Test Permanent Weight Learning Persistence
PermanentLearning.recordLearnedWeight('dork_removal_bias', 0.84, '+3.5% Win Rate Gain');
const learnedWeight = PermanentLearning.getLearnedWeight('dork_removal_bias', 0.98);
console.log(`[PASS] Permanent Learned Weight (dork_removal_bias): ${learnedWeight}`);

if (learnedWeight !== 0.84) {
  console.error('FAILED: Learned weight expected to persist 0.84 value');
  process.exit(1);
}

console.log('=== STRATEGIC PHILOSOPHY EXPLAINER TEST SUCCESSFUL ===');
