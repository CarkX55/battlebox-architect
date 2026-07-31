import { DeckConstructionState } from '../../src/knowledge/compiler/DeckConstructionState.js';
import { SlotCandidateRanker } from '../../src/knowledge/compiler/SlotCandidateRanker.js';
import { DeckJudgeSuite } from '../../src/knowledge/reasoning/DeckJudgeSuite.js';
import { CandidateExhaustionReport } from '../../src/knowledge/compiler/CandidateExhaustionReport.js';
import { CompilationProof } from '../../src/knowledge/serving/CompilationProof.js';

console.log('=== TEST: CompilationProof Execution Certification ===');

let state = new DeckConstructionState({ totalSlots: 60 });
state = state.reserveSlots('pkg_main', 'Ramp', 60, 'cap.mana.acceleration', 'node_ir_1');

const tracker = new CandidateExhaustionReport();
state = SlotCandidateRanker.rankAndBindDeck(state, [], tracker);

const judgeResults = DeckJudgeSuite.evaluateDeckState(state);
const proof = CompilationProof.generateProof(state, judgeResults, tracker);

console.log(`[PASS] Certified Clean Execution: ${proof.certified}`);
console.log(`[PASS] Filled Slots: ${proof.filledSlots}/${proof.requiredSlots}`);
console.log(`[PASS] Exhaustion Status: ${proof.exhaustionStatus}`);
console.log(`[PASS] Judge Status: ${proof.judgeStatus}`);

if (!proof.certified) {
  console.error('FAILED: CompilationProof expected certified true');
  process.exit(1);
}

if (proof.filledSlots !== 60) {
  console.error('FAILED: Filled slots expected 60');
  process.exit(1);
}

console.log('=== TEST SUCCESSFUL ===');
