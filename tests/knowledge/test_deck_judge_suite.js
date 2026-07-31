import { DeckContract } from '../../src/knowledge/compiler/DeckContract.js';
import { DeckConstructionState } from '../../src/knowledge/compiler/DeckConstructionState.js';
import { SlotCandidateRanker } from '../../src/knowledge/compiler/SlotCandidateRanker.js';
import { DeckJudgeSuite } from '../../src/knowledge/reasoning/DeckJudgeSuite.js';

console.log('=== TEST: DeckJudgeSuite 10 Independent Verifiers ===');

const contract = new DeckContract({ requiredCards: 60, requiredLands: 24 });
let state = new DeckConstructionState({ totalSlots: 60, contract });

// Reserve 60 slots across packages
state = state.reserveSlots('pkg_elf_ramp', 'Ramp', 10, 'cap.mana.acceleration', 'node_ir_1');
state = state.reserveSlots('pkg_draw', 'Draw', 8, 'cap.card.draw', 'node_ir_2');
state = state.reserveSlots('pkg_removal', 'Removal', 8, 'cap.removal.single_target', 'node_ir_3');
state = state.reserveSlots('pkg_lands', 'Land', 24, 'cap.mana.source', 'node_ir_4');
state = state.reserveSlots('pkg_threats', 'Threat', 10, 'cap.threat.density', 'node_ir_5');

state = SlotCandidateRanker.rankAndBindDeck(state, []);

const evaluation = DeckJudgeSuite.evaluateDeckState(state);

console.log(`[PASS] Overall Judge Status: ${evaluation.overallStatus}`);
console.log(`[PASS] Total Verifiers Executed: ${evaluation.verifications.length}`);

for (const v of evaluation.verifications) {
  console.log(`  - [${v.status}] ${v.verifier}: ${v.details}`);
}

if (evaluation.overallStatus !== 'PASS') {
  console.error('FAILED: DeckJudgeSuite overall status expected PASS');
  process.exit(1);
}

if (evaluation.verifications.length !== 10) {
  console.error('FAILED: Expected 10 verifiers executed');
  process.exit(1);
}

console.log('=== TEST SUCCESSFUL ===');
