/**
 * tests/unit/compiler/test_anti_greedy_adversarial.js
 * 
 * 🏛️ V29.5 Master Audit: Anti-Greedy Contextual Dominance Proof
 * 
 * Demonstrates mathematically that StateCandidateRanker evaluates contextual state delta
 * rather than greedy card evaluation:
 * 
 * 1. Engine Open Scenario (Active Deficit):
 *    - Card A: Synergistic Engine Piece (Intrinsic Power 72, satisfies open deficit/engine slot)
 *    - Card B: Generic "Good Stuff" Bomb (Intrinsic Power 100, zero engine synergy)
 *    -> Result: Card A MUST DOMINATE Card B due to Proof Obligation Closure (Layer 3).
 * 
 * 2. Engine Saturated Scenario (Zero Active Deficits):
 *    - Card A: Redundant Engine Piece (Intrinsic Power 72, zero new deficits closed)
 *    - Card B: Generic "Good Stuff" Bomb (Intrinsic Power 100, superior execution quality)
 *    -> Result: Card B MUST DOMINATE Card A due to Role Quality & Standalone Power (Layer 4/10).
 * 
 * Axiom:
 *   "El compilador nunca debe elegir cartas para llenar roles;
 *    debe seleccionar transiciones de estado que mejoren la ejecución del plan."
 */

import assert from 'assert';
import { StateCandidateRanker } from '../../../src/services/compiler/core/stateCandidateRanker.js';

console.log('══════════════════════════════════════════════════════════════════');
console.log('  🏛️ V29.5 MASTER AUDIT: ANTI-GREEDY ADVERSARIAL DOMINANCE');
console.log('══════════════════════════════════════════════════════════════════\n');

// ─── Scenario 1: Engine Open (Active Deficit Unresolved) ───
console.log('[Scenario 1] Engine Open: Evaluating Engine Card (72) vs Generic Bomb (100)...');

const engineOpenDeltaA = {
  roleProof: { roleValidity: true, roleQuality: 0.72, rejectionReason: null, evidence: {} },
  demandsSatisfiedByExistingState: true,
  closedDeficits: ['DAYBOUND_NIGHTBOUND_ENGINE'],
  winPathNodesProven: ['STATE_TRANSITION_STEP_1'],
  stateDeltaScore: 12.0,
  synergyScore: 8.5,
  tribalContribution: { isMember: true, isEngine: true }
};

const genericBombDeltaB = {
  roleProof: { roleValidity: true, roleQuality: 1.00, rejectionReason: null, evidence: {} },
  demandsSatisfiedByExistingState: true,
  closedDeficits: [], // Does not close the active engine deficit
  winPathNodesProven: [],
  stateDeltaScore: 10.0,
  synergyScore: 1.0,
  tribalContribution: { isMember: false, isEngine: false }
};

const vecA_Open = StateCandidateRanker.computeDominanceVector(engineOpenDeltaA);
const vecB_Open = StateCandidateRanker.computeDominanceVector(genericBombDeltaB);

// Lexicographic comparison: Positive means first argument dominates second argument
const comparisonOpen = StateCandidateRanker.compareDominanceVectors(vecA_Open, vecB_Open);

assert.ok(comparisonOpen > 0, 'Engine Card (72) must dominate Generic Bomb (100) when deficit is open');
console.log('  ✅ Scenario 1 Passed: Engine card (Power 72) deterministically defeats Generic Bomb (Power 100) via Layer 3 Deficit Closure.\n');

// ─── Scenario 2: Engine Saturated (No Active Deficits Open) ───
console.log('[Scenario 2] Engine Saturated: Evaluating Redundant Engine (72) vs Generic Bomb (100)...');

const redundantEngineDeltaA = {
  roleProof: { roleValidity: true, roleQuality: 0.72, rejectionReason: null, evidence: {} },
  demandsSatisfiedByExistingState: true,
  closedDeficits: [], // Saturated: no new deficits closed
  winPathNodesProven: [],
  stateDeltaScore: 4.0,
  synergyScore: 3.0,
  tribalContribution: { isMember: true, isEngine: true }
};

const genericBombDeltaB_Saturated = {
  roleProof: { roleValidity: true, roleQuality: 1.00, rejectionReason: null, evidence: {} },
  demandsSatisfiedByExistingState: true,
  closedDeficits: [], // Saturated: no new deficits closed
  winPathNodesProven: ['LETHAL_REACH_FINISHER'],
  stateDeltaScore: 10.0,
  synergyScore: 1.0,
  tribalContribution: { isMember: false, isEngine: false }
};

const vecA_Sat = StateCandidateRanker.computeDominanceVector(redundantEngineDeltaA);
const vecB_Sat = StateCandidateRanker.computeDominanceVector(genericBombDeltaB_Saturated);

const comparisonSaturated = StateCandidateRanker.compareDominanceVectors(vecB_Sat, vecA_Sat);

assert.ok(comparisonSaturated > 0, 'Generic Bomb (100) must dominate Redundant Engine Card (72) when engine is saturated');
console.log('  ✅ Scenario 2 Passed: Generic Bomb (Power 100) deterministically defeats Redundant Engine piece when engine is saturated.\n');

console.log('══════════════════════════════════════════════════════════════════');
console.log('  🏛️ ANTI-GREEDY ADVERSARIAL CERTIFICATION: 100% PASS');
console.log('══════════════════════════════════════════════════════════════════');
process.exit(0);
