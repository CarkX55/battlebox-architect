import { StrategicMemory } from '../../src/knowledge/domain/StrategicMemory.js';
import { ExplainabilityTimeline } from '../../src/knowledge/serving/ExplainabilityTimeline.js';
import { CompetitiveEncyclopedia } from '../../src/knowledge/domain/CompetitiveEncyclopedia.js';
import { InteractiveCounterplaySimulator } from '../../src/knowledge/simulation/InteractiveCounterplaySimulator.js';

console.log('=== TEST: Strategic Memory, Explainability Timeline & Interactive Counterplay ===');

// 1. Test Strategic Memory
StrategicMemory.recordEngineFailure('eng_failed_dorks', 'Ramp', 'Fatal Push vulnerability');
const isBlacklisted = StrategicMemory.isEngineBlacklisted('eng_failed_dorks', 'Ramp');
console.log(`[PASS] Strategic Memory Blacklist Check: ${isBlacklisted}`);
console.log(`[PASS] Memory Failure Reason: ${StrategicMemory.getFailureReason('eng_failed_dorks', 'Ramp')}`);

if (!isBlacklisted) {
  console.error('FAILED: Strategic Memory expected engine to be blacklisted');
  process.exit(1);
}

// 2. Test Explainability Timeline (T0 -> T9)
ExplainabilityTimeline.reset();
ExplainabilityTimeline.addStep('T0', 'User Request', 'User asked for Selesnya Ramp');
ExplainabilityTimeline.addStep('T9', 'Strategic Calibration', 'Certified deck at 2509 Elo');

const timelineSummary = ExplainabilityTimeline.getTimelineSummary();
console.log(`[PASS] Explainability Timeline Steps Count: ${timelineSummary.totalSteps}`);
console.log(`[PASS] T0 Description: ${timelineSummary.steps[0].description}`);
console.log(`[PASS] T9 Description: ${timelineSummary.steps[1].description}`);

if (timelineSummary.totalSteps !== 2) {
  console.error('FAILED: Explainability timeline step count expected 2');
  process.exit(1);
}

// 3. Test Competitive Encyclopedia (Card & Engine Insights)
const yawgInsight = CompetitiveEncyclopedia.getEngineInsight('YAWGMOTH');
const llanowarInsight = CompetitiveEncyclopedia.getCardInsight('Llanowar Elves');

console.log(`[PASS] Yawgmoth Engine Strengths: ${yawgInsight.strengths.join(', ')}`);
console.log(`[PASS] Llanowar Elves Expert Insight: ${llanowarInsight.expertInsight}`);

// 4. Test Interactive Counterplay Simulator
const counterplayRes = InteractiveCounterplaySimulator.simulateInteractiveMatch([
  { name: 'Llanowar Elves', oracle_text: '{T}: Add {G}.' },
  { name: 'Heroic Intervention', oracle_text: 'Permanents you control gain hexproof and indestructible.' }
], 'Control', 1000);

console.log(`[PASS] Interactive Win Rate vs Control: ${counterplayRes.interactiveWinRate}`);
console.log(`[PASS] Destroyed Dorks Count: ${counterplayRes.destroyedDorksCount}`);
console.log(`[PASS] Countered Spells Count: ${counterplayRes.counteredSpellsCount}`);
console.log(`[PASS] Counterplay Rating: ${counterplayRes.rating}`);

if (!counterplayRes.interactiveWinRate) {
  console.error('FAILED: Interactive win rate expected in counterplay result');
  process.exit(1);
}

console.log('=== EXPERT KNOWLEDGE EXPANSION TEST SUCCESSFUL ===');
