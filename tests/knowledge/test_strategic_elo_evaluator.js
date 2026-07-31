import { StrategicEloEvaluator } from '../../src/knowledge/domain/StrategicEloEvaluator.js';
import { CompilerAutoExplainer } from '../../src/knowledge/domain/CompilerAutoExplainer.js';
import { DeckConstructionState } from '../../src/knowledge/compiler/DeckConstructionState.js';

console.log('=== TEST: StrategicEloEvaluator & CompilerAutoExplainer ===');

// 1. Test Strategic Elo Rating & Percentile Rank
const mockSim = { turn4WinProbability: 0.85, manaScrewRate: 0.12 };
const mockMeta = { coreOverlapPercentage: 65, curveAlignmentScore: 92 };

const eloReport = StrategicEloEvaluator.evaluateDeckElo(new DeckConstructionState({ totalSlots: 60 }), mockSim, mockMeta);

console.log(`[PASS] Strategic Elo Rating: ${eloReport.strategicElo}`);
console.log(`[PASS] Percentile Rank: ${eloReport.percentileRank}`);
console.log(`[PASS] Beats Reference List %: ${eloReport.beatsReferencePercentage}`);
console.log(`[PASS] Natural Language Report: ${eloReport.naturalLanguageReport}`);

if (eloReport.strategicElo < 2000) {
  console.error('FAILED: Strategic Elo expected > 2000 for high win prob and high meta alignment');
  process.exit(1);
}

// 2. Test Compiler Auto-Explainer (Tutoring Explanations)
const explanation = CompilerAutoExplainer.explainDecision('WHY_NOT_COCO');

console.log(`[PASS] Question: ${explanation.question}`);
console.log(`[PASS] Explanation: ${explanation.explanation}`);
console.log(`[PASS] Net Plan Delta: ${explanation.netPlanDelta}`);

if (!explanation.explanation.includes('Plan B')) {
  console.error('FAILED: Explanation expected to reference Plan B loss vs Plan A gain');
  process.exit(1);
}

console.log('=== STRATEGIC ELO & AUTO-EXPLAINER TEST SUCCESSFUL ===');
