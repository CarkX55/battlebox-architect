import { DeckContract } from '../../src/knowledge/compiler/DeckContract.js';
import { DeckConstructionState } from '../../src/knowledge/compiler/DeckConstructionState.js';
import { SlotCandidateRanker } from '../../src/knowledge/compiler/SlotCandidateRanker.js';
import { DeckJudgeSuite } from '../../src/knowledge/reasoning/DeckJudgeSuite.js';
import { CompilationProof } from '../../src/knowledge/serving/CompilationProof.js';

console.log('=== REAL E2E TEST 3: Mono Red Aggro Compiler Run ===');

const contract = new DeckContract({
  requiredCards: 60,
  requiredLands: 20,
  requiredInteraction: 8,
  requiredDraw: 4
});

let state = new DeckConstructionState({ totalSlots: 60, contract });

// Reserve 60 slots for Mono Red Aggro
state = state.reserveSlots('pkg_1drops', 'AggroCreature', 12, 'cap.tempo.early', 'node_ir_1drops');
state = state.reserveSlots('pkg_2drops', 'AggroCreature', 12, 'cap.tempo.early', 'node_ir_2drops');
state = state.reserveSlots('pkg_burn', 'Removal', 12, 'cap.burn.direct', 'node_ir_burn');
state = state.reserveSlots('pkg_finishers', 'Finisher', 4, 'cap.threat.density', 'node_ir_finishers');
state = state.reserveSlots('pkg_lands', 'Land', 20, 'cap.mana.source', 'node_ir_lands');

const realRedCardPool = [
  { name: 'Monastery Swiftspear', cmc: 1, type_line: 'Creature — Human Monk', oracle_text: 'Haste, Prowess.' },
  { name: 'Goblin Guide', cmc: 1, type_line: 'Creature — Goblin Scout', oracle_text: 'Haste.' },
  { name: 'Lightning Bolt', cmc: 1, type_line: 'Instant', oracle_text: 'Lightning Bolt deals 3 damage to any target.' },
  { name: 'Eidolon of the Great Revel', cmc: 2, type_line: 'Enchantment Creature — Satyr', oracle_text: 'Whenever a player casts a spell with CMC 3 or less, deal 2 damage.' },
  { name: 'Mountain', cmc: 0, type_line: 'Basic Land — Mountain', oracle_text: '{T}: Add {R}.' }
];

state = SlotCandidateRanker.rankAndBindDeck(state, realRedCardPool);
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

console.log('=== TEST 3 SUCCESSFUL ===');
