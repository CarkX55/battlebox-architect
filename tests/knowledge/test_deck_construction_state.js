import { DeckConstructionState, SLOT_STATES } from '../../src/knowledge/compiler/DeckConstructionState.js';

console.log('=== TEST: DeckConstructionState 60 Fixed Slots & Immutable Transitions ===');

const state0 = new DeckConstructionState({ totalSlots: 60 });
console.log(`[PASS] Initial Total Slots: ${state0.totalSlots}`);

const state1 = state0.reserveSlots('pkg_elf_ramp', 'Ramp', 10, 'cap.mana.acceleration', 'node_ir_ramp');
const stats1 = state1.getSlotStats();

console.log(`[PASS] Reserved Slots Count: ${stats1.reservedCount}`);
console.log(`[PASS] Empty Slots Count: ${stats1.emptyCount}`);

if (state0.slots[0].state !== SLOT_STATES.EMPTY) {
  console.error('FAILED: Initial state expected EMPTY');
  process.exit(1);
}

if (state1.slots[0].state !== SLOT_STATES.RESERVED) {
  console.error('FAILED: Reserved state expected RESERVED');
  process.exit(1);
}

if (stats1.reservedCount !== 10) {
  console.error('FAILED: Reserved slots count expected 10');
  process.exit(1);
}

console.log('=== TEST SUCCESSFUL ===');
