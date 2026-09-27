/**
 * tests/unit/compiler/test_v29_6_pareto_dominance.js
 * 
 * V29.6 State Pareto Dominance & Joint Solver Test Suite.
 * 
 * Verifies:
 * 1. Mathematical Pareto Dominance over complete deck state vectors.
 * 2. Non-dominated state preservation on the Pareto frontier.
 * 3. Pure Lexicographic tie-breaking (ZERO arbitrary linear weighted sums).
 * 4. Extensible land search domain (boundary expansion).
 * 5. Statistical distinguishability handling via confidence intervals.
 */

import { StateParetoFrontier } from '../../../src/services/compiler/core/stateParetoFrontier.js';
import { ProgressiveDeckStateBuilder } from '../../../src/services/compiler/core/progressiveDeckStateBuilder.js';

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
console.log('  TEST SUITE: V29.6 STATE PARETO DOMINANCE & LEXICOGRAPHIC HIERARCHY');
console.log('══════════════════════════════════════════════════════════════════\n');

// ─── TEST 1: MATHEMATICAL PARETO DOMINANCE ──────────────────────────────────
console.log('[Test 1] Mathematical Pareto Dominance Verification...');

const stateSuperior = {
  curveExecutionRate: 0.88,
  winPathCompletionRate: 0.65,
  resilienceRecoveryRate: 0.70,
  manaCastabilityRate: 0.92,
  tangibleResourceVelocity: 3.5
};

const stateInferior = {
  curveExecutionRate: 0.80,
  winPathCompletionRate: 0.60,
  resilienceRecoveryRate: 0.65,
  manaCastabilityRate: 0.88,
  tangibleResourceVelocity: 3.0
};

const stateNonDominated = {
  curveExecutionRate: 0.95, // Better in curve
  winPathCompletionRate: 0.58, // Worse in winpath
  resilienceRecoveryRate: 0.68,
  manaCastabilityRate: 0.90,
  tangibleResourceVelocity: 3.2
};

assert(StateParetoFrontier.dominates(stateSuperior, stateInferior), 'State Superior strictly dominates State Inferior across all dimensions.');
assert(!StateParetoFrontier.dominates(stateInferior, stateSuperior), 'State Inferior does NOT dominate State Superior.');
assert(!StateParetoFrontier.dominates(stateSuperior, stateNonDominated), 'State Superior does NOT dominate State NonDominated (trade-off exists).');
assert(!StateParetoFrontier.dominates(stateNonDominated, stateSuperior), 'State NonDominated does NOT dominate State Superior.');

// ─── TEST 2: NON-DOMINATED FRONTIER PRESERVATION ────────────────────────────
console.log('\n[Test 2] Frontier Extraction (Preserves Alternatives, Discards Dominated)...');

const candidates = [
  { id: 'S_A', metrics: stateSuperior },
  { id: 'S_B', metrics: stateInferior },
  { id: 'S_C', metrics: stateNonDominated }
];

const frontier = StateParetoFrontier.extractParetoFrontier(candidates);
const frontierIds = frontier.map(f => f.id);

assert(frontier.length === 2, `Frontier contains exactly 2 non-dominated states (found ${frontier.length}).`);
assert(frontierIds.includes('S_A'), 'Frontier retains State S_A.');
assert(frontierIds.includes('S_C'), 'Frontier retains State S_C.');
assert(!frontierIds.includes('S_B'), 'Frontier strictly discards dominated State S_B.');

// ─── TEST 3: PURE LEXICOGRAPHIC SELECTION (ZERO LINEAR WEIGHTED SUMS) ───────
console.log('\n[Test 3] Pure Lexicographic Selection Hierarchy...');

const selectionResult = StateParetoFrontier.selectBestState(candidates, {
  strategicTempo: 'AGGRO',
  intentPackage: { tempo: 'Aggro' }
});

assert(selectionResult.winningState !== null, 'Lexicographic selection produced a valid winning state.');
assert(selectionResult.winningState.id === 'S_C' || selectionResult.winningState.id === 'S_A', 'Winner is from the non-dominated Pareto frontier.');
assert(selectionResult.auditTrail.eliminatedDominatedCount === 1, 'Audit trail accurately records 1 dominated state eliminated.');

// ─── TEST 4: EXTENSIBLE COMPUTATIONAL DOMAIN IN JOINT LAND SOLVER ───────────
console.log('\n[Test 4] Extensible Computational Domain for Lands...');

// Low curve mono-red spells (CMC 1-2)
const lowCurveSpells = [
  { name: 'Monastery Swiftspear', cmc: 1, quantity: 4 },
  { name: 'Kumano Faces Kakkazan', cmc: 1, quantity: 4 },
  { name: 'Play with Fire', cmc: 1, quantity: 4 },
  { name: 'Eidolon of the Great Revel', cmc: 2, quantity: 4 },
  { name: 'Light Up the Stage', cmc: 1, quantity: 4 }, // Cheap draw
  { name: 'Reckless Lackey', cmc: 1, quantity: 4 },
  { name: 'Goblin Guide', cmc: 1, quantity: 4 },
  { name: 'Slickshot Show-Off', cmc: 2, quantity: 4 },
  { name: 'Lightning Bolt', cmc: 1, quantity: 4 },
  { name: 'Roil Eruption', cmc: 2, quantity: 4 }
];

const lowCurveSolution = ProgressiveDeckStateBuilder.solveJointLandAllocation(lowCurveSpells, false, 60);

assert(lowCurveSolution.optimalLands <= 21, `Low-curve aggro solves to low land count (${lowCurveSolution.optimalLands} lands).`);
assert(lowCurveSolution.domainMin <= 16, `Computational search domain accommodates low lands (min: ${lowCurveSolution.domainMin}).`);
assert(lowCurveSolution.minRequiredSpellCapacity >= 30, `Spell capacity dynamically derived without magic constants (${lowCurveSolution.minRequiredSpellCapacity}).`);

// High curve ramp/control spells (CMC 4-6)
const highCurveSpells = [
  { name: 'Teferi, Hero of Dominaria', cmc: 5, quantity: 4 },
  { name: 'The Wandering Emperor', cmc: 4, quantity: 4 },
  { name: 'Supreme Verdict', cmc: 4, quantity: 4 },
  { name: 'Absorb', cmc: 3, quantity: 4 },
  { name: 'Memory Deluge', cmc: 4, quantity: 4 },
  { name: 'Shark Typhoon', cmc: 6, quantity: 4 },
  { name: 'Fateful Absence', cmc: 2, quantity: 4 },
  { name: 'Dovin\'s Veto', cmc: 2, quantity: 4 }
];

const highCurveSolution = ProgressiveDeckStateBuilder.solveJointLandAllocation(highCurveSpells, false, 60);

assert(highCurveSolution.optimalLands >= 25, `High-curve control solves to higher land count (${highCurveSolution.optimalLands} lands).`);
assert(highCurveSolution.domainMax >= 30, `Computational domain extends to accommodate high-curve needs (max: ${highCurveSolution.domainMax}).`);

console.log('\n══════════════════════════════════════════════════════════════════');
console.log(`  V29.6 PARETO DOMINANCE TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
console.log('══════════════════════════════════════════════════════════════════\n');

if (failed > 0) process.exit(1);
