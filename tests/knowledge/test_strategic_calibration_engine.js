import { StrategicCalibrationEngine } from '../../src/knowledge/meta/StrategicCalibrationEngine.js';
import { DeckConstructionState } from '../../src/knowledge/compiler/DeckConstructionState.js';
import { SlotCandidateRanker } from '../../src/knowledge/compiler/SlotCandidateRanker.js';

console.log('=== TEST: StrategicCalibrationEngine & Ground Truth Alignment ===');

// 1. Prepare DeckState
let state = new DeckConstructionState({ totalSlots: 60 });
state = state.reserveSlots('pkg_ramp', 'Ramp', 10, 'cap.mana.acceleration', 'ir_1');
state = state.reserveSlots('pkg_lands', 'Land', 24, 'cap.mana.source', 'ir_2');

const pool = [
  { name: 'Delighted Halfling', cmc: 1, type_line: 'Creature', oracle_text: '{T}: Add {C}.' },
  { name: 'Forest', cmc: 0, type_line: 'Basic Land', oracle_text: '{T}: Add {G}.' }
];

state = SlotCandidateRanker.rankAndBindDeck(state, pool);

// 2. Run Ground Truth Calibration
const report = StrategicCalibrationEngine.calibrateDeckAgainstGroundTruth(state, 'SELESNYA_RAMP_STANDARD');

console.log(`[PASS] Ground Truth Dataset: ${report.groundTruthDataset}`);
console.log(`[PASS] Decision Alignment Percentage: ${report.overallDecisionAlignmentPercentage}%`);
console.log(`[PASS] Formatted Elo Bounds: ${report.uncertaintyBounds.formattedElo}`);
console.log(`[PASS] Confidence Level: ${report.uncertaintyBounds.confidenceLevel}`);
console.log(`[PASS] Top Strategic Error 1: ${report.topStrategicErrors[0].description}`);
console.log(`[PASS] Slot 1 Decision Alignment: ${report.decisionAlignmentDetails[0].battleBoxChoice} vs Pro Consensus: ${report.decisionAlignmentDetails[0].proConsensusChoice} (${report.decisionAlignmentDetails[0].proAlignmentPercentage})`);

if (report.overallDecisionAlignmentPercentage < 10) {
  console.error('FAILED: Decision alignment percentage expected >= 10%');
  process.exit(1);
}

if (!report.uncertaintyBounds.formattedElo.includes('±')) {
  console.error('FAILED: Formatted Elo expected to include margin of error bounds (±)');
  process.exit(1);
}

console.log('=== STRATEGIC CALIBRATION ENGINE TEST SUCCESSFUL ===');
