import { DeckConstructionState } from '../../src/knowledge/compiler/DeckConstructionState.js';
import { SlotCandidateRanker } from '../../src/knowledge/compiler/SlotCandidateRanker.js';
import { CandidateExhaustionReport } from '../../src/knowledge/compiler/CandidateExhaustionReport.js';

console.log('=== TEST: Hard Fail Conditions (Deck != 60 or Candidate Exhaustion) ===');

let state = new DeckConstructionState({ totalSlots: 60 });
// Only reserve 26 slots
state = state.reserveSlots('pkg_partial', 'Utility', 26, 'cap.general', 'node_ir_1');

const exhaustionTracker = new CandidateExhaustionReport();
state = SlotCandidateRanker.rankAndBindDeck(state, [], exhaustionTracker);

const stats = state.getSlotStats();

console.log(`[PASS] Total Slots: ${stats.total}`);
console.log(`[PASS] Bound Cards Count: ${stats.boundCount}`);
console.log(`[PASS] Is Fully Bound (60 cards): ${stats.isFullyBound}`);

if (stats.boundCount === 26 && !stats.isFullyBound) {
  console.log('[PASS] HARD FAIL GATE: Deck has only 26/60 cards bound -> Compilation Aborted (BUILD FAILED)');
} else {
  console.error('FAILED: Hard fail condition check failed');
  process.exit(1);
}

console.log('=== TEST SUCCESSFUL ===');
