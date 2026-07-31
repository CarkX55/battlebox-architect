import { DecisionDistributionEngine } from '../../src/knowledge/meta/DecisionDistributionEngine.js';
import { CalibrationLoop } from '../../src/knowledge/meta/CalibrationLoop.js';
import { StrategicEloEvaluator } from '../../src/knowledge/domain/StrategicEloEvaluator.js';
import { DeckConstructionState } from '../../src/knowledge/compiler/DeckConstructionState.js';

console.log('=== TEST: CalibrationLoop, Decision Distribution & 5D Elo Vector ===');

// 1. Test Decision Distribution Model
const distEval = DecisionDistributionEngine.evaluateCardRoleDistribution('Llanowar Elves', 'Ramp_Dorks_T1');
console.log(`[PASS] Card: ${distEval.cardName}`);
console.log(`[PASS] Role: ${distEval.role}`);
console.log(`[PASS] Pro Distribution Share: ${distEval.distributionPercentage}`);
console.log(`[PASS] Is Within Pro Distribution: ${distEval.isWithinProDistribution}`);

if (!distEval.isWithinProDistribution) {
  console.error('FAILED: Llanowar Elves expected to be within Pro distribution (72%)');
  process.exit(1);
}

// 2. Test Role-vs-Role Equivalency
const equiv = DecisionDistributionEngine.evaluateRoleEquivalency(
  { name: 'Llanowar Elves', type_line: 'Creature', cmc: 1 },
  { name: 'Elvish Mystic', type_line: 'Creature', cmc: 1 }
);
console.log(`[PASS] Equivalency: ${equiv.cardA} vs ${equiv.cardB} -> ${equiv.isEquivalent} (Score: ${equiv.equivalencyScore})`);

if (!equiv.isEquivalent) {
  console.error('FAILED: Llanowar Elves vs Elvish Mystic expected to be functionally equivalent');
  process.exit(1);
}

// 3. Test Closed Loop Feedback Calibration Cycle
const state = new DeckConstructionState({ totalSlots: 60 });
const compLoop = CalibrationLoop.runCalibrationIteration(state, 'COMPETITIVE');
const expLoop = CalibrationLoop.runCalibrationIteration(state, 'EXPLORATION');

console.log(`[PASS] Competitive Mode Alignment: ${compLoop.calibratedAlignment}`);
console.log(`[PASS] Exploration Mode Alignment: ${expLoop.calibratedAlignment}`);
console.log(`[PASS] Calibrated Status: ${compLoop.status}`);

// 4. Test 5-Dimensional Elo Rating Vector
const mockSim = { turn4WinProbability: 0.85, manaScrewRate: 0.12 };
const mockMeta = { coreOverlapPercentage: 65, curveAlignmentScore: 92 };

const elo5D = StrategicEloEvaluator.evaluateDeckElo(state, mockSim, mockMeta);
console.log(`[PASS] Composite Elo: ${elo5D.strategicElo}`);
console.log(`[PASS] 5D Vector -> Execution: ${elo5D.eloVector.executionElo}, Construction: ${elo5D.eloVector.constructionElo}, Meta: ${elo5D.eloVector.metaElo}, Consistency: ${elo5D.eloVector.consistencyElo}, Resilience: ${elo5D.eloVector.resilienceElo}`);

if (!elo5D.eloVector.executionElo) {
  console.error('FAILED: Execution Elo expected in 5D Elo Vector');
  process.exit(1);
}

console.log('=== CALIBRATION LOOP TEST SUCCESSFUL ===');
