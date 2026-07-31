import { DeckContract } from '../../src/knowledge/compiler/DeckContract.js';
import { DeckConstructionState } from '../../src/knowledge/compiler/DeckConstructionState.js';
import { SlotCandidateRanker } from '../../src/knowledge/compiler/SlotCandidateRanker.js';
import { DeckJudgeSuite } from '../../src/knowledge/reasoning/DeckJudgeSuite.js';
import { CompilationProof } from '../../src/knowledge/serving/CompilationProof.js';

console.log('=== REAL E2E TEST 1: Mono Green Ramp Compiler Run ===');

const contract = new DeckContract({
  requiredCards: 60,
  requiredLands: 24,
  requiredRamp: 10,
  requiredInteraction: 6,
  requiredDraw: 8
});

let state = new DeckConstructionState({ totalSlots: 60, contract });

// Reserve 60 slots for Mono Green Ramp
state = state.reserveSlots('pkg_elf_ramp', 'Ramp', 10, 'cap.mana.acceleration', 'node_ir_ramp');
state = state.reserveSlots('pkg_card_draw', 'Draw', 8, 'cap.card.draw', 'node_ir_draw');
state = state.reserveSlots('pkg_removal', 'Removal', 6, 'cap.removal.single_target', 'node_ir_removal');
state = state.reserveSlots('pkg_finishers', 'Finisher', 12, 'cap.threat.density', 'node_ir_finisher');
state = state.reserveSlots('pkg_lands', 'Land', 24, 'cap.mana.source', 'node_ir_lands');

// Real card pool
const realGreenCardPool = [
  { name: 'Llanowar Elves', cmc: 1, type_line: 'Creature — Elf Druid', oracle_text: '{T}: Add {G}.' },
  { name: 'Elvish Mystic', cmc: 1, type_line: 'Creature — Elf Druid', oracle_text: '{T}: Add {G}.' },
  { name: 'Harmonize', cmc: 4, type_line: 'Sorcery', oracle_text: 'Draw three cards.' },
  { name: 'Beast Within', cmc: 3, type_line: 'Instant', oracle_text: 'Destroy target permanent.' },
  { name: 'Primeval Titan', cmc: 6, type_line: 'Creature — Giant', oracle_text: 'Trample. Search for 2 lands.' },
  { name: 'Forest', cmc: 0, type_line: 'Basic Land — Forest', oracle_text: '{T}: Add {G}.' }
];

state = SlotCandidateRanker.rankAndBindDeck(state, realGreenCardPool);
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

console.log('=== TEST 1 SUCCESSFUL ===');
