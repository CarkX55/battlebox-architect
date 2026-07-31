import { DeckContract } from '../../src/knowledge/compiler/DeckContract.js';
import { DeckConstructionState } from '../../src/knowledge/compiler/DeckConstructionState.js';
import { SlotCandidateRanker } from '../../src/knowledge/compiler/SlotCandidateRanker.js';
import { DeckJudgeSuite } from '../../src/knowledge/reasoning/DeckJudgeSuite.js';
import { CompilationProof } from '../../src/knowledge/serving/CompilationProof.js';

console.log('=== REAL E2E TEST 4: Golgari Midrange Compiler Run ===');

const contract = new DeckContract({
  requiredCards: 60,
  requiredLands: 24,
  requiredInteraction: 10,
  requiredDraw: 8
});

let state = new DeckConstructionState({ totalSlots: 60, contract });

// Reserve 60 slots for Golgari Midrange
state = state.reserveSlots('pkg_discard', 'Removal', 6, 'cap.hand.disruption', 'node_ir_discard');
state = state.reserveSlots('pkg_removal', 'Removal', 6, 'cap.removal.single_target', 'node_ir_removal');
state = state.reserveSlots('pkg_threats', 'Threat', 16, 'cap.threat.density', 'node_ir_threats');
state = state.reserveSlots('pkg_card_advantage', 'Draw', 8, 'cap.card.draw', 'node_ir_draw');
state = state.reserveSlots('pkg_lands', 'Land', 24, 'cap.mana.source', 'node_ir_lands');

const realGolgariCardPool = [
  { name: 'Thoughtseize', cmc: 1, type_line: 'Sorcery', oracle_text: 'Target player reveals their hand. You choose a nonland card.' },
  { name: 'Abrupt Decay', cmc: 2, type_line: 'Instant', oracle_text: 'Destroy target nonland permanent with CMC 3 or less.' },
  { name: 'Tarmogoyf', cmc: 2, type_line: 'Creature — Lhurgoyf', oracle_text: 'Power is equal to card types in graveyards.' },
  { name: 'Liliana of the Veil', cmc: 3, type_line: 'Planeswalker — Liliana', oracle_text: '+1: Each player discards a card.' },
  { name: 'Overgrown Tomb', cmc: 0, type_line: 'Land — Swamp Forest', oracle_text: '{T}: Add {B} or {G}.' }
];

state = SlotCandidateRanker.rankAndBindDeck(state, realGolgariCardPool);
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

console.log('=== TEST 4 SUCCESSFUL ===');
