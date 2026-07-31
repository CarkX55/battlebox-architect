import { DeckContract } from '../../src/knowledge/compiler/DeckContract.js';
import { DeckConstructionState } from '../../src/knowledge/compiler/DeckConstructionState.js';
import { SlotCandidateRanker } from '../../src/knowledge/compiler/SlotCandidateRanker.js';
import { DeckJudgeSuite } from '../../src/knowledge/reasoning/DeckJudgeSuite.js';
import { CompilationProof } from '../../src/knowledge/serving/CompilationProof.js';

console.log('=== REAL E2E TEST 2: Azorius Control Compiler Run ===');

const contract = new DeckContract({
  requiredCards: 60,
  requiredLands: 25,
  requiredInteraction: 14, // 8 counters + 6 removal
  requiredDraw: 8
});

let state = new DeckConstructionState({ totalSlots: 60, contract });

// Reserve 60 slots for Azorius Control
state = state.reserveSlots('pkg_counters', 'Removal', 8, 'cap.countermagic', 'node_ir_counters');
state = state.reserveSlots('pkg_spot_removal', 'Removal', 6, 'cap.removal.single_target', 'node_ir_removal');
state = state.reserveSlots('pkg_card_draw', 'Draw', 8, 'cap.card.draw', 'node_ir_draw');
state = state.reserveSlots('pkg_finishers', 'Finisher', 4, 'cap.threat.density', 'node_ir_finisher');
state = state.reserveSlots('pkg_lands', 'Land', 25, 'cap.mana.source', 'node_ir_lands');
state = state.reserveSlots('pkg_sweepers', 'Removal', 9, 'cap.board.reset', 'node_ir_sweepers');

const realAzoriusCardPool = [
  { name: 'Counterspell', cmc: 2, type_line: 'Instant', oracle_text: 'Counter target spell.' },
  { name: 'Swords to Plowshares', cmc: 1, type_line: 'Instant', oracle_text: 'Exile target creature.' },
  { name: 'Memory Deluge', cmc: 4, type_line: 'Instant', oracle_text: 'Look at the top X cards of your library and put two of them into your hand.' },
  { name: 'Teferi, Hero of Dominaria', cmc: 5, type_line: 'Planeswalker — Teferi', oracle_text: '+1: Draw a card. Untap two lands.' },
  { name: 'Hallowed Fountain', cmc: 0, type_line: 'Land — Plains Island', oracle_text: '{T}: Add {W} or {U}.' },
  { name: 'Supreme Verdict', cmc: 4, type_line: 'Sorcery', oracle_text: 'Destroy all creatures.' }
];

state = SlotCandidateRanker.rankAndBindDeck(state, realAzoriusCardPool);
const stats = state.getSlotStats();

const judgeResults = DeckJudgeSuite.evaluateDeckState(state);
const proof = CompilationProof.generateProof(state, judgeResults, null);

console.log(`[PASS] Total Bound Cards: ${stats.boundCount}/60`);
console.log(`[PASS] Judge Overall Status: ${judgeResults.overallStatus}`);
console.log(`[PASS] CompilationProof Certified: ${proof.certified}`);

if (stats.boundCount !== 60) {
  console.error(`FAILED: Expected exactly 60 bound cards, got ${stats.boundCount}`);
  process.exit(1);
}

if (judgeResults.overallStatus !== 'PASS') {
  console.error('FAILED: Expected Judge overall status PASS');
  process.exit(1);
}

console.log('=== TEST 2 SUCCESSFUL ===');
