import { OracleTraceLog } from '../../src/knowledge/serving/OracleTraceLog.js';
import { DeckContract } from '../../src/knowledge/compiler/DeckContract.js';
import { DeckConstructionState } from '../../src/knowledge/compiler/DeckConstructionState.js';
import { SlotCandidateRanker } from '../../src/knowledge/compiler/SlotCandidateRanker.js';
import { DeckJudgeSuite } from '../../src/knowledge/reasoning/DeckJudgeSuite.js';

console.log('=== TEST: OracleTraceLog Bitácora del Oráculo End-to-End Audit ===');

OracleTraceLog.reset('Selesnya Ramp Standard Audit Run');

OracleTraceLog.logStep({
  category: 'INTENT',
  component: 'UserPrompt',
  action: 'Parse Prompt Constraints',
  details: { prompt: 'Quiero un Ramp Selesnya competitivo para Standard.' }
});

const contract = new DeckContract({ requiredCards: 60, requiredLands: 24, requiredRamp: 10 });
let state = new DeckConstructionState({ totalSlots: 60, contract });
state = state.reserveSlots('pkg_ramp', 'Ramp', 10, 'cap.mana.acceleration', 'node_ir_ramp');

state = SlotCandidateRanker.rankAndBindDeck(state, [
  { name: 'Llanowar Elves', cmc: 1, type_line: 'Creature', oracle_text: '{T}: Add {G}.' }
]);

const judgeResults = DeckJudgeSuite.evaluateDeckState(state);
const traceSummary = OracleTraceLog.getTraceSummary();

console.log(`[PASS] Total Audit Steps Logged: ${traceSummary.totalSteps}`);
console.log(`[PASS] Log Categories Present:`, Object.keys(traceSummary.categoriesCount));

if (traceSummary.totalSteps < 4) {
  console.error(`FAILED: Expected at least 4 audit steps logged, got ${traceSummary.totalSteps}`);
  process.exit(1);
}

if (!traceSummary.categoriesCount['CANDIDATE_ADMISSION']) {
  console.error('FAILED: CANDIDATE_ADMISSION category step missing in Bitácora');
  process.exit(1);
}

console.log('=== TEST SUCCESSFUL ===');
