/**
 * tests/unit/compiler/test_v29_7_combat_blocker_fidelity.js
 * 
 * Test Suite: Combat & Blocker Modeling Fidelity in DeterministicGameState.
 * Verifies that:
 *   1. Opponent blockers absorb non-evasion ground attack damage.
 *   2. Flying / Unblockable bypasses ground blockers.
 *   3. Trample penetrates blockers (excess damage goes to opponent).
 *   4. Victory strictly requires physical opponent life <= 0.
 */

import { strict as assert } from 'assert';
import { DeterministicGameState } from '../../../src/services/compiler/core/deterministicGameState.js';

console.log('══════════════════════════════════════════════════════════════════');
console.log('  TEST SUITE: V29.7 COMBAT BLOCKER FIDELITY & PHYSICAL LETHAL');
console.log('══════════════════════════════════════════════════════════════════\n');

// [Test 1] Ground attacker blocked by opponent blocker
console.log('[Test 1] Testing ground attacker blocked by 0/2 wall...');
const state1 = new DeterministicGameState({
  opponentLife: 20,
  battlefield: [
    {
      instanceId: 1,
      name: 'Grizzly Bears',
      isCreature: true,
      isTapped: false,
      hasSummoningSickness: false,
      power: 2,
      toughness: 2,
      card: { name: 'Grizzly Bears', oracle_text: '' }
    }
  ]
});

// Pass an opponent blocker with toughness 2
const combat1 = state1.executeCombatPhase([
  { power: 0, toughness: 2, hasFlying: false, id: 'wall_1' }
]);

assert.equal(combat1.blockedCount, 1, 'Expected creature to be blocked');
assert.equal(combat1.totalDamageDealt, 0, 'Expected all damage absorbed by blocker');
assert.equal(state1.opponentLife, 20, 'Opponent life must remain 20');
console.log(`  ✅ PASS: Ground attacker was blocked (blockedCount: ${combat1.blockedCount}, damageDealt: ${combat1.totalDamageDealt}).`);

// [Test 2] Flying attacker bypassing ground blocker
console.log('\n[Test 2] Testing Flying attacker bypassing ground blocker...');
const state2 = new DeterministicGameState({
  opponentLife: 20,
  battlefield: [
    {
      instanceId: 2,
      name: 'Storm Crow',
      isCreature: true,
      isTapped: false,
      hasSummoningSickness: false,
      power: 1,
      toughness: 2,
      card: { name: 'Storm Crow', oracle_text: 'Flying' }
    }
  ]
});

// Pass an opponent ground blocker (hasFlying = false)
const combat2 = state2.executeCombatPhase([
  { power: 0, toughness: 2, hasFlying: false, id: 'ground_wall' }
]);

assert.equal(combat2.blockedCount, 0, 'Flying creature must not be blocked by ground creature');
assert.equal(combat2.totalDamageDealt, 1, 'Expected 1 flying damage dealt to opponent');
assert.equal(state2.opponentLife, 19, 'Opponent life must drop to 19');
console.log(`  ✅ PASS: Flying attacker bypassed ground blocker (damageDealt: ${combat2.totalDamageDealt}, opponentLife: ${state2.opponentLife}).`);

// [Test 3] Trample attacker penetrating blocker
console.log('\n[Test 3] Testing Trample attacker penetrating blocker...');
const state3 = new DeterministicGameState({
  opponentLife: 20,
  battlefield: [
    {
      instanceId: 3,
      name: 'Colossal Dreadmaw',
      isCreature: true,
      isTapped: false,
      hasSummoningSickness: false,
      power: 6,
      toughness: 6,
      card: { name: 'Colossal Dreadmaw', oracle_text: 'Trample' }
    }
  ]
});

// Pass an opponent blocker with toughness 2
const combat3 = state3.executeCombatPhase([
  { power: 1, toughness: 2, hasFlying: false, id: 'chump_blocker' }
]);

assert.equal(combat3.blockedCount, 1, 'Trample creature was blocked');
// 6 power - 2 toughness = 4 trample damage dealt to opponent!
assert.equal(combat3.totalDamageDealt, 4, `Expected 4 trample damage, got ${combat3.totalDamageDealt}`);
assert.equal(state3.opponentLife, 16, 'Opponent life must be 16');
console.log(`  ✅ PASS: Trample penetrated blocker (power 6 vs toughness 2 = ${combat3.totalDamageDealt} damage to face).`);

// [Test 4] Physical lethal verification
console.log('\n[Test 4] Testing physical lethal requirements...');
assert.equal(state3.isLethal(), false, 'Opponent at 16 life must not be lethal');
state3.dealDamageToOpponent(16, 'DIRECT_LETHAL');
assert.equal(state3.opponentLife, 0);
assert.equal(state3.isLethal(), true, 'Opponent at 0 life must be lethal');
console.log(`  ✅ PASS: Physical lethal strictly requires opponentLife <= 0 (verified: ${state3.isLethal()}).`);

console.log('\n══════════════════════════════════════════════════════════════════');
console.log('  V29.7 COMBAT FIDELITY TEST SUMMARY: ALL 4 PASSED');
console.log('══════════════════════════════════════════════════════════════════\n');
