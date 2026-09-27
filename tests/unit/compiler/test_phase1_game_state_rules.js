/**
 * Test Suite: FASE 1 — MTG Deterministic Execution Subset Engine (v28.1)
 */

import { DeterministicGameState, SUPPORTED_RULES_V1 } from '../../../src/services/compiler/core/deterministicGameState.js';
import { PRNG } from '../../../src/services/compiler/core/prng.js';

let passed = 0;
let total = 0;

function assert(condition, message) {
  total++;
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    throw new Error(message);
  } else {
    console.log(`✅ PASS: ${message}`);
    passed++;
  }
}

console.log('=== Running Test Suite: FASE 1 Deterministic Execution Subset ===\n');

try {
  // Test 1: Supported Rules v1 Definition
  assert(Array.isArray(SUPPORTED_RULES_V1) && SUPPORTED_RULES_V1.includes('ATTACK_COMBAT_DAMAGE'), 'SUPPORTED_RULES_V1 contains ATTACK_COMBAT_DAMAGE');

  // Test 2: State Initialization & Shuffling
  const mockDeck = [
    { name: 'Mountain', count: 20, type_line: 'Basic Land — Mountain', cmc: 0 },
    { name: 'Goblin Guide', count: 4, type_line: 'Creature — Goblin Scout', cmc: 1, mana_cost: '{R}', power: 2, toughness: 2, oracle_text: 'Haste. Whenever Goblin Guide attacks...' },
    { name: 'Play with Fire', count: 4, type_line: 'Instant', cmc: 1, mana_cost: '{R}', oracle_text: 'Play with Fire deals 2 damage to any target.' },
    { name: 'Rundvelt Hordemaster', count: 4, type_line: 'Creature — Goblin Warrior', cmc: 2, mana_cost: '{1}{R}', power: 1, toughness: 1, oracle_text: 'Other Goblins you control get +1/+1.' }
  ];

  const prng = new PRNG(12345);
  const state = DeterministicGameState.createInitialState(mockDeck, prng);

  assert(state.library.length === 32, 'Library initialized with expanded card count of 32');
  assert(state.hand.length === 0, 'Hand starts empty before draw');

  // Test 3: Controlled Hand Draw
  // Put 1 Mountain and 1 Goblin Guide into hand deterministically
  const mIndex = state.library.findIndex(c => c.name === 'Mountain');
  const mountainCard = state.library.splice(mIndex, 1)[0];
  const gIndex = state.library.findIndex(c => c.name === 'Goblin Guide');
  const guideCard = state.library.splice(gIndex, 1)[0];

  state.hand.push(mountainCard, guideCard);
  state.draw(5); // draw 5 more to have 7 cards

  assert(state.hand.length === 7, 'Drawing cards populates hand to 7');

  // Test 4: Land Play & Mana Generation
  const handMountainIndex = state.hand.findIndex(c => c.name === 'Mountain');
  assert(handMountainIndex !== -1, 'Found Mountain in hand');

  const landPlayed = state.playLand(handMountainIndex);
  assert(landPlayed === true, 'Successfully played Mountain to battlefield');
  assert(state.battlefield.length === 1 && state.battlefield[0].isLand, 'Battlefield has 1 land permanent');
  assert(state.landsPlayedThisTurn === 1, 'landsPlayedThisTurn increments to 1');

  // Test 5: Second Land Play in Same Turn Rejected
  const secondMountainIndex = state.hand.findIndex(c => c.name === 'Mountain');
  if (secondMountainIndex !== -1) {
    const secondLandPlayed = state.playLand(secondMountainIndex);
    assert(secondLandPlayed === false, 'Cannot play second land in same turn');
  } else {
    assert(true, 'No second land in hand to play');
  }

  // Test 6: Casting 1-Drop Creature with Haste
  const goblinGuideIndex = state.hand.findIndex(c => c.name === 'Goblin Guide');
  assert(goblinGuideIndex !== -1, 'Goblin Guide is in hand');

  const castOk = state.castSpell(goblinGuideIndex);
  assert(castOk === true, 'Cast Goblin Guide successfully using Mountain');
  assert(state.battlefield.some(p => p.name === 'Goblin Guide' && p.hasHaste), 'Goblin Guide entered battlefield with Haste');

  // Test 7: Combat Phase & Damage Resolution
  const combatResult = state.executeCombatPhase();
  assert(combatResult.attackersCount === 1, 'Haste creature declared as attacker');
  assert(combatResult.totalDamageDealt === 2, '2 combat damage dealt to opponent');
  assert(state.opponentLife === 18, 'Opponent life decreased to 18');

  // Test 8: Turn Progression
  state.startNewTurn();
  assert(state.turn === 2, 'Turn increments to 2 on startNewTurn()');
  assert(state.landsPlayedThisTurn === 0, 'landsPlayedThisTurn resets to 0');
  assert(state.battlefield.every(p => !p.isTapped), 'All battlefield permanents untap');

  console.log(`\n🎉 FASE 1 TESTS COMPLETED: ${passed}/${total} PASSED`);
} catch (e) {
  console.error('\n❌ FASE 1 TEST SUITE ERROR:', e);
  process.exit(1);
}
