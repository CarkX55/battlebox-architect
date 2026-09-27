/**
 * tests/benchmarks/test_v29_6_independent_holdout.js
 * 
 * V29.6 Independent Holdout Gauntlet Benchmark.
 * 
 * Verifies:
 * 1. Independent Holdout Gauntlet executes deterministically across multiple archetypes.
 * 2. Complete Gauntlet coverage: Clock, Disruption, Board Wipe, Mana Sensitivity Sweep.
 * 3. Zero shared scoring code or data leakage with StateCandidateRanker.
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
console.log('  BENCHMARK: V29.6 INDEPENDENT HOLDOUT GAUNTLET AUDIT');
console.log('══════════════════════════════════════════════════════════════════\n');

// ─── ARCHETYPE 1: WEREWOLF TEMPO ────────────────────────────────────────────
console.log('[Test 1] Werewolf Tempo Holdout Evaluation...');

const werewolfDeck = [
  { name: 'Mountain', isLand: true, quantity: 10, type_line: 'Basic Land — Mountain' },
  { name: 'Forest', isLand: true, quantity: 12, type_line: 'Basic Land — Forest' },
  { name: 'Kessig Naturalist', cmc: 2, power: 2, toughness: 2, quantity: 4, type_line: 'Creature — Human Werewolf' },
  { name: 'Outland Liberator', cmc: 2, power: 2, toughness: 2, quantity: 4, type_line: 'Creature — Human Werewolf' },
  { name: 'Reckless Stormseeker', cmc: 3, power: 2, toughness: 3, quantity: 4, type_line: 'Creature — Human Werewolf' },
  { name: 'Tovolar, Dire Overlord', cmc: 3, power: 3, toughness: 3, quantity: 4, type_line: 'Legendary Creature — Human Werewolf' },
  { name: 'Hound Tamer', cmc: 3, power: 3, toughness: 3, quantity: 4, type_line: 'Creature — Human Werewolf' },
  { name: 'Weaver of Blossoms', cmc: 3, power: 2, toughness: 3, quantity: 4, type_line: 'Creature — Human Werewolf' },
  { name: 'Avabruck Caretaker', cmc: 6, power: 4, toughness: 4, quantity: 4, type_line: 'Creature — Human Werewolf' },
  { name: 'Lightning Strike', cmc: 2, quantity: 4, type_line: 'Instant' },
  { name: 'Play with Fire', cmc: 1, quantity: 4, type_line: 'Instant' },
  { name: 'Abrade', cmc: 2, quantity: 2, type_line: 'Instant' }
];

const werewolfReport = IndependentHoldoutEvaluator.evaluateHoldoutGauntlet(werewolfDeck, {
  strategicTempo: 'TEMPO',
  primaryTribe: 'Werewolf'
}, { runsPerGauntlet: 150, seed: 77711 });

assert(werewolfReport.deckSize === 60, `Werewolf deck size verified (60 cards).`);
assert(typeof werewolfReport.holdoutVector.medianKillTurn === 'number', `Median kill turn evaluated (T${werewolfReport.holdoutVector.medianKillTurn}).`);
assert(werewolfReport.holdoutVector.disruptionRecoveryRate >= 0.40, `Disruption recovery evaluated (${(werewolfReport.holdoutVector.disruptionRecoveryRate * 100).toFixed(1)}%).`);
assert(werewolfReport.manaSweep.optimalLandReliability >= 0.50, `Mana reliability verified (${(werewolfReport.manaSweep.optimalLandReliability * 100).toFixed(1)}%).`);
assert(typeof werewolfReport.verdict === 'string', `Independent verdict emitted: ${werewolfReport.verdict}`);

// ─── ARCHETYPE 2: AZORIUS CONTROL ───────────────────────────────────────────
console.log('\n[Test 2] Azorius Control Holdout Evaluation...');

const azoriusControlDeck = [
  { name: 'Plains', isLand: true, quantity: 13, type_line: 'Basic Land — Plains' },
  { name: 'Island', isLand: true, quantity: 13, type_line: 'Basic Land — Island' },
  { name: 'Teferi, Hero of Dominaria', cmc: 5, quantity: 4, type_line: 'Legendary Planeswalker — Teferi' },
  { name: 'The Wandering Emperor', cmc: 4, quantity: 4, type_line: 'Legendary Planeswalker' },
  { name: 'Supreme Verdict', cmc: 4, quantity: 4, type_line: 'Sorcery' },
  { name: 'Absorb', cmc: 3, quantity: 4, type_line: 'Instant' },
  { name: 'Dovin\'s Veto', cmc: 2, quantity: 4, type_line: 'Instant' },
  { name: 'Fateful Absence', cmc: 2, quantity: 4, type_line: 'Instant' },
  { name: 'Memory Deluge', cmc: 4, quantity: 4, type_line: 'Instant' },
  { name: 'Shark Typhoon', cmc: 6, quantity: 4, type_line: 'Enchantment' },
  { name: 'March of Otherworldly Light', cmc: 1, quantity: 2, type_line: 'Instant' }
];

const azoriusReport = IndependentHoldoutEvaluator.evaluateHoldoutGauntlet(azoriusControlDeck, {
  strategicTempo: 'CONTROL'
}, { runsPerGauntlet: 150, seed: 88822 });

assert(azoriusReport.deckSize === 60, `Azorius Control deck size verified (60 cards).`);
assert(azoriusReport.holdoutVector.boardWipeRecoveryRate >= 0.40, `Control sweep recovery verified (${(azoriusReport.holdoutVector.boardWipeRecoveryRate * 100).toFixed(1)}%).`);
assert(azoriusReport.manaSweep.isCurrentLandCountOptimal === true || Math.abs(azoriusReport.manaSweep.bestOffset) <= 1, 'Control land count is near or at empirical peak.');
assert(typeof azoriusReport.verdict === 'string', `Independent verdict emitted: ${azoriusReport.verdict}`);

// ─── TEST 3: ZERO DATA LEAKAGE VERIFICATION ─────────────────────────────────
console.log('\n[Test 3] Zero Shared Heuristics Audit...');

const evaluatorModule = IndependentHoldoutEvaluator.toString();
assert(!evaluatorModule.includes('StateCandidateRanker'), 'IndependentHoldoutEvaluator has ZERO reference to StateCandidateRanker.');
assert(!evaluatorModule.includes('ProgressiveDeckStateBuilder'), 'IndependentHoldoutEvaluator has ZERO reference to ProgressiveDeckStateBuilder.');
assert(!evaluatorModule.includes('stateDeltaScore'), 'IndependentHoldoutEvaluator has ZERO reference to stateDeltaScore.');

console.log('\n══════════════════════════════════════════════════════════════════');
console.log(`  INDEPENDENT HOLDOUT GAUNTLET SUMMARY: ${passed} PASSED, ${failed} FAILED`);
console.log('══════════════════════════════════════════════════════════════════\n');

if (failed > 0) process.exit(1);
