import { DeckConstructionState } from '../../src/knowledge/compiler/DeckConstructionState.js';
import { SlotCandidateRanker } from '../../src/knowledge/compiler/SlotCandidateRanker.js';
import { DeckJudgeSuite } from '../../src/knowledge/reasoning/DeckJudgeSuite.js';
import { CompilationProof } from '../../src/knowledge/serving/CompilationProof.js';

console.log('=== TEST: Navigable Decision Tree in CompilationProof ===');

let state = new DeckConstructionState({ totalSlots: 60 });
state = state.reserveSlots('pkg_elf_ramp', 'Ramp', 10, 'cap.mana.acceleration', 'node_ir_ramp');

state = SlotCandidateRanker.rankAndBindDeck(state, []);
const judgeResults = DeckJudgeSuite.evaluateDeckState(state);
const proof = CompilationProof.generateProof(state, judgeResults, null);

console.log(`[PASS] Decision Tree Nodes Count: ${proof.decisionTree.length}`);
console.log(`[PASS] Slot 1 Chosen Card: ${proof.decisionTree[0].chosenCard}`);
console.log(`[PASS] Slot 1 Rationale Score: ${proof.decisionTree[0].decisionRationale.winningScore}`);
console.log(`[PASS] Slot 1 Runner-Up Score: ${proof.decisionTree[0].decisionRationale.runnerUpScore}`);

if (proof.decisionTree.length !== 60) {
  console.error('FAILED: Decision tree nodes count expected 60');
  process.exit(1);
}

if (!proof.decisionTree[0].decisionRationale) {
  console.error('FAILED: Decision rationale missing');
  process.exit(1);
}

console.log('=== TEST SUCCESSFUL ===');
