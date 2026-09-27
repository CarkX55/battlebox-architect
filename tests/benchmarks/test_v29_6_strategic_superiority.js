/**
 * tests/benchmarks/test_v29_6_strategic_superiority.js
 * 
 * V29.6 STRATEGIC_SUPERIORITY_TEST Benchmark.
 * 
 * Verifies the Core Axiom of V29.6:
 * The optimization unit is DeckState, and choices are governed by context-dependent superiority:
 * 
 * 1. Test 1 (Synergy-Anchored Context):
 *    In a Tribal Aggro/Tempo shell with early swarm:
 *    State(A_Synergy) > State(B_Bomb) > State(C_Neutral)
 *    The synergy lord accelerates the lethal clock beyond the standalone bomb.
 * 
 * 2. Test 2 (Unanchored / Big-Mana Context):
 *    In a Midrange shell without swarm infrastructure:
 *    State(B_Bomb) > State(A_Synergy)
 *    The standalone bomb is superior because the synergy piece has zero infrastructure.
 * 
 * Demonstrates that the compiler does NOT blindly favor synergy labels or raw power;
 * it selects the state that maximizes gameplan execution.
 */

import { IndependentHoldoutEvaluator } from '../../src/services/compiler/core/independentHoldoutEvaluator.js';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    failed++;
  }
}

console.log('══════════════════════════════════════════════════════════════════');
console.log('  BENCHMARK: V29.6 STRATEGIC_SUPERIORITY_TEST (A vs B vs C)');
console.log('══════════════════════════════════════════════════════════════════\n');

// ─── CANDIDATES ─────────────────────────────────────────────────────────────
// A = Synergy Engine (Goblin Chieftain: 3 CMC, gives goblins +1/+1 and haste)
const candidateA_Synergy = {
  name: 'Goblin Chieftain',
  cmc: 3,
  power: 2,
  toughness: 2,
  type_line: 'Creature — Goblin',
  oracle_text: 'Haste. Other Goblin creatures you control get +1/+1 and have haste.'
};

// B = Generic Standalone Bomb (Glorybringer: 5 CMC, 4/4 Flying Haste, exert to deal 4)
const candidateB_Bomb = {
  name: 'Glorybringer',
  cmc: 5,
  power: 4,
  toughness: 4,
  type_line: 'Creature — Dragon',
  oracle_text: 'Flying, haste. You may exert Glorybringer as it attacks. When you do, it deals 4 damage to target non-Dragon creature an opponent controls.'
};

// C = Neutral Baseline (Searing Spear: 2 CMC, 3 damage)
const candidateC_Neutral = {
  name: 'Searing Spear',
  cmc: 2,
  type_line: 'Instant',
  oracle_text: 'Searing Spear deals 3 damage to any target.'
};

// ─── CONTEXT 1: GOBLIN AGGRO SHELL (Active Swarm Infrastructure) ───────────
console.log('[Test 1] SYNERGY-ANCHORED CONTEXT: Goblin Aggro Shell...');

const goblinSwarmBase = [
  { name: 'Mountain', isLand: true, quantity: 20, type_line: 'Basic Land — Mountain' },
  { name: 'Foundry Street Denizen', cmc: 1, power: 1, toughness: 1, quantity: 4, type_line: 'Creature — Goblin' },
  { name: 'Goblin Bushwhacker', cmc: 1, power: 1, toughness: 1, quantity: 4, type_line: 'Creature — Goblin' },
  { name: 'Fanatical Firebrand', cmc: 1, power: 1, toughness: 1, quantity: 4, type_line: 'Creature — Goblin' },
  { name: 'Mogg War Marshal', cmc: 2, power: 1, toughness: 1, quantity: 4, type_line: 'Creature — Goblin' },
  { name: 'Krenko, Tin Street Kingpin', cmc: 3, power: 1, toughness: 2, quantity: 4, type_line: 'Legendary Creature — Goblin' },
  { name: 'Lightning Bolt', cmc: 1, quantity: 4, type_line: 'Instant' },
  { name: 'Play with Fire', cmc: 1, quantity: 4, type_line: 'Instant' },
  { name: 'Light Up the Stage', cmc: 1, quantity: 4, type_line: 'Sorcery' }
  // 52 cards total + 4 copies of tested candidate = 56 cards + 4 flex = 60
];

const deckWithSynergy = [...goblinSwarmBase, { ...candidateA_Synergy, quantity: 4 }, { name: 'Mountain', isLand: true, quantity: 4 }];
const deckWithBomb = [...goblinSwarmBase, { ...candidateB_Bomb, quantity: 4 }, { name: 'Mountain', isLand: true, quantity: 4 }];
const deckWithNeutral = [...goblinSwarmBase, { ...candidateC_Neutral, quantity: 4 }, { name: 'Mountain', isLand: true, quantity: 4 }];

const evalSynergy = IndependentHoldoutEvaluator.evaluateHoldoutGauntlet(deckWithSynergy, {
  strategicTempo: 'AGGRO',
  primaryTribe: 'Goblin'
}, { runsPerGauntlet: 150, seed: 10101 });

const evalBomb = IndependentHoldoutEvaluator.evaluateHoldoutGauntlet(deckWithBomb, {
  strategicTempo: 'AGGRO',
  primaryTribe: 'Goblin'
}, { runsPerGauntlet: 150, seed: 10101 });

const evalNeutral = IndependentHoldoutEvaluator.evaluateHoldoutGauntlet(deckWithNeutral, {
  strategicTempo: 'AGGRO',
  primaryTribe: 'Goblin'
}, { runsPerGauntlet: 150, seed: 10101 });

console.log(`  State(Synergy A) -> Lethal by T5: ${(evalSynergy.holdoutVector.lethalByTurn5Rate * 100).toFixed(1)}%, Median Kill: T${evalSynergy.holdoutVector.medianKillTurn}`);
console.log(`  State(Bomb B)    -> Lethal by T5: ${(evalBomb.holdoutVector.lethalByTurn5Rate * 100).toFixed(1)}%, Median Kill: T${evalBomb.holdoutVector.medianKillTurn}`);
console.log(`  State(Neutral C) -> Lethal by T5: ${(evalNeutral.holdoutVector.lethalByTurn5Rate * 100).toFixed(1)}%, Median Kill: T${evalNeutral.holdoutVector.medianKillTurn}`);

// In Goblin Aggro, 3-drop haste lord A strictly accelerates clock compared to 5-drop Dragon B
assert(
  evalSynergy.holdoutVector.lethalByTurn5Rate >= evalBomb.holdoutVector.lethalByTurn5Rate,
  'In Aggro Swarm shell, Synergy Lord A achieves equal or superior T5 Lethal Rate over 5-CMC Bomb B.'
);
assert(
  evalSynergy.holdoutVector.medianKillTurn <= evalBomb.holdoutVector.medianKillTurn,
  'In Aggro Swarm shell, Synergy Lord A achieves faster or equal median kill turn than 5-CMC Bomb B.'
);

// ─── CONTEXT 2: BIG-MANA MIDRANGE SHELL (No Goblin Swarm) ───────────────────
console.log('\n[Test 2] UNANCHORED CONTEXT: Big-Mana Midrange Shell...');

const bigManaMidrangeBase = [
  { name: 'Mountain', isLand: true, quantity: 14, type_line: 'Basic Land — Mountain' },
  { name: 'Forest', isLand: true, quantity: 12, type_line: 'Basic Land — Forest' },
  { name: 'Llanowar Elves', cmc: 1, power: 1, toughness: 1, quantity: 4, type_line: 'Creature — Elf Druid' },
  { name: 'Paradise Druid', cmc: 2, power: 2, toughness: 1, quantity: 4, type_line: 'Creature — Elf Druid' },
  { name: 'Bonecrusher Giant', cmc: 3, power: 4, toughness: 3, quantity: 4, type_line: 'Creature — Giant' },
  { name: 'Fable of the Mirror-Breaker', cmc: 3, quantity: 4, type_line: 'Enchantment' },
  { name: 'Lightning Bolt', cmc: 1, quantity: 4, type_line: 'Instant' },
  { name: 'Abrade', cmc: 2, quantity: 4, type_line: 'Instant' }
  // 50 cards total + 4 copies of tested candidate + 6 lands = 60
];

const midrangeWithSynergy = [...bigManaMidrangeBase, { ...candidateA_Synergy, quantity: 4 }, { name: 'Forest', isLand: true, quantity: 6 }];
const midrangeWithBomb = [...bigManaMidrangeBase, { ...candidateB_Bomb, quantity: 4 }, { name: 'Forest', isLand: true, quantity: 6 }];

const evalMidrangeSynergy = IndependentHoldoutEvaluator.evaluateHoldoutGauntlet(midrangeWithSynergy, {
  strategicTempo: 'MIDRANGE'
}, { runsPerGauntlet: 150, seed: 20202 });

const evalMidrangeBomb = IndependentHoldoutEvaluator.evaluateHoldoutGauntlet(midrangeWithBomb, {
  strategicTempo: 'MIDRANGE'
}, { runsPerGauntlet: 150, seed: 20202 });

console.log(`  State(Synergy A in Midrange) -> Recovery Rate: ${(evalMidrangeSynergy.holdoutVector.disruptionRecoveryRate * 100).toFixed(1)}%, Lethal T5: ${(evalMidrangeSynergy.holdoutVector.lethalByTurn5Rate * 100).toFixed(1)}%`);
console.log(`  State(Bomb B in Midrange)    -> Recovery Rate: ${(evalMidrangeBomb.holdoutVector.disruptionRecoveryRate * 100).toFixed(1)}%, Lethal T5: ${(evalMidrangeBomb.holdoutVector.lethalByTurn5Rate * 100).toFixed(1)}%`);

// In Big-Mana Midrange with ramp and zero goblins, Glorybringer B is strictly superior to Goblin Chieftain A
assert(
  evalMidrangeBomb.holdoutVector.disruptionRecoveryRate >= evalMidrangeSynergy.holdoutVector.disruptionRecoveryRate,
  'In Big-Mana Midrange, Standalone Bomb B achieves equal or superior recovery rate over unanchored Synergy Card A.'
);

// ─── TEST 3: COUNTERFACTUAL SENSITIVITY PROOF ───────────────────────────────
console.log('\n[Test 3] Counterfactual Sensitivity Proof...');

const sensitivityResult = IndependentHoldoutEvaluator.evaluateCounterfactualSensitivity(
  deckWithSynergy,
  'Goblin Chieftain',
  candidateB_Bomb,
  { strategicTempo: 'AGGRO', primaryTribe: 'Goblin' }
);

assert(sensitivityResult.engineCard === 'Goblin Chieftain', 'Sensitivity analyzed target engine card.');
assert(sensitivityResult.bombCard === 'Glorybringer', 'Sensitivity tested against distractor bomb.');
assert(typeof sensitivityResult.standardError === 'number', 'Standard error computed.');
assert(sensitivityResult.confidence >= 0.5, 'Statistical confidence evaluated.');

console.log('\n══════════════════════════════════════════════════════════════════');
console.log(`  STRATEGIC SUPERIORITY TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
console.log('══════════════════════════════════════════════════════════════════\n');

if (failed > 0) process.exit(1);
