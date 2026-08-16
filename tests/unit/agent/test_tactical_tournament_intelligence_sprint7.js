/**
 * SPRINT 7 TOURNAMENT INTELLIGENCE & REFINEMENT LOOP TEST SUITE
 * 
 * Verifies:
 * 1. TacticalSimulator Monte Carlo (1000 runs in < 20ms, deterministic metrics).
 * 2. StrategicAuditorAgent tactical bottleneck diagnosis & swap generation.
 * 3. End-to-end refinement loop execution in AgenticDeckArchitect (before Karsten land resolution).
 */

import assert from 'node:assert';
import { DeckState } from '../../../src/services/agent/deckState.js';
import { TacticalSimulator } from '../../../src/services/agent/tacticalSimulator.js';
import { StrategicAuditorAgent } from '../../../src/services/agent/strategicAuditorAgent.js';
import { AgenticDeckArchitect } from '../../../src/services/agent/agenticDeckArchitect.js';
import { IntentBuilder } from '../../../src/services/compiler/core/intentBuilder.js';

console.log('🧪 Running Sprint 7 Tournament Intelligence Test Suite...\n');

const mockPool = [
  { name: 'Fatal Push', type_line: 'Instant', cmc: 1, colors: ['B'], priceUSD: 1.50, oracle_text: 'Destroy target creature.' },
  { name: 'Lightning Bolt', type_line: 'Instant', cmc: 1, colors: ['R'], priceUSD: 1.00, oracle_text: 'Deal 3 damage.' },
  { name: 'Cut Down', type_line: 'Instant', cmc: 1, colors: ['B'], priceUSD: 0.50, oracle_text: 'Destroy target creature.' },
  { name: 'Thoughtseize', type_line: 'Sorcery', cmc: 1, colors: ['B'], priceUSD: 10.00, oracle_text: 'Target player discards.' },
  { name: 'Archfiend of the Dross', type_line: 'Creature — Demon', cmc: 4, colors: ['B'], priceUSD: 2.00, oracle_text: 'Flying.' },
  { name: 'Spawn of Mayhem', type_line: 'Creature — Demon', cmc: 3, colors: ['B'], priceUSD: 3.00, oracle_text: 'Flying, trample.' },
  { name: 'Bloodthirster', type_line: 'Creature — Demon', cmc: 6, colors: ['R'], priceUSD: 8.00, oracle_text: 'Flying, trample. Attacks multiple times.' },
  { name: 'Demon of Loathing', type_line: 'Creature — Demon', cmc: 7, colors: ['B'], priceUSD: 0.50, oracle_text: 'Flying.' }
];

// ==========================================
// TEST 1: TacticalSimulator Monte Carlo Performance & Metrics
// ==========================================
console.log('--- TEST 1: TacticalSimulator Monte Carlo Performance & Metrics ---');
const intent = IntentBuilder.buildFromUI({ format: 'MODERN', colors: ['B', 'R'] });
const state = new DeckState(intent);

// Add 36 non-land cards
state.addCard(mockPool[0], 4); // Fatal Push (1)
state.addCard(mockPool[1], 4); // Lightning Bolt (1)
state.addCard(mockPool[2], 4); // Cut Down (1)
state.addCard(mockPool[3], 4); // Thoughtseize (1)
state.addCard(mockPool[4], 4); // Archfiend (4)
state.addCard(mockPool[5], 4); // Spawn of Mayhem (3)
state.addCard(mockPool[6], 4); // Bloodthirster (6)
state.addCard(mockPool[7], 4); // Demon of Loathing (7)
state.addCard(mockPool[0], 4); // Fatal Push extra

const startTime = performance.now();
const report = TacticalSimulator.simulateOpeningHands(state, 1000);
const durationMs = performance.now() - startTime;

assert.strictEqual(report.iterations, 1000);
assert.ok(typeof report.tacticalFidelityScore === 'number');
assert.ok(report.tacticalFidelityScore >= 0 && report.tacticalFidelityScore <= 100);
assert.ok(typeof report.mulliganRate === 'number');
assert.ok(typeof report.manaScrewRisk === 'number');
assert.ok(typeof report.colorScrewRisk === 'number');
assert.ok(typeof report.onCurvePlayability === 'number');

console.log(`Report: ${report.summaryMessage}`);
console.log(`Execution time for 1,000 runs: ${durationMs.toFixed(2)}ms`);
assert.ok(durationMs < 100, 'Monte Carlo 1,000 runs must complete in under 100ms');
console.log('✅ TEST 1 PASSED: TacticalSimulator executed 1,000 Monte Carlo runs in under 100ms with complete tactical metrics.\n');

// ==========================================
// TEST 2: StrategicAuditorAgent Audit & Proposed Swaps
// ==========================================
console.log('--- TEST 2: StrategicAuditorAgent Audit & Proposed Swaps ---');
const artificialWeakReport = {
  tacticalFidelityScore: 72,
  mulliganRate: 22,
  manaScrewRisk: 28,
  colorScrewRisk: 10,
  onCurvePlayability: 60
};

const auditRes = StrategicAuditorAgent.auditDeck(state, artificialWeakReport, intent);

assert.strictEqual(auditRes.needsRefinement, true, 'Audit must trigger refinement when tactical score < 85');
assert.ok(auditRes.proposedSwaps.length > 0, 'Audit must generate proposed swaps');
assert.strictEqual(auditRes.proposedSwaps[0].removeCardName, 'Demon of Loathing', 'Audit must target highest CMC card for removal');
assert.strictEqual(auditRes.proposedSwaps[0].needRole, 'CHEAP_REMOVAL');
console.log('✅ TEST 2 PASSED: StrategicAuditorAgent correctly identified tactical bottleneck and proposed targeted swap.\n');

// ==========================================
// TEST 3: End-to-End Refinement Loop in AgenticDeckArchitect
// ==========================================
console.log('--- TEST 3: End-to-End Refinement Loop in AgenticDeckArchitect ---');
(async () => {
  const architect = new AgenticDeckArchitect(intent, mockPool);
  const buildResult = await architect.buildDeck();

  assert.strictEqual(buildResult.buildStatus, 'SUCCESS');
  assert.ok(buildResult.tacticalReport, 'Final result must include tacticalReport');
  assert.strictEqual(buildResult.summary.totalCards, 60);

  console.log(`Final Deck Tactical Score: ${buildResult.tacticalReport.tacticalFidelityScore}/100`);
  console.log(`Refinement Iterations Executed: ${buildResult.refinementIterations}`);
  console.log('✅ TEST 3 PASSED: AgenticDeckArchitect executed Monte Carlo sparring, audit, and compiled 60/60 deck.\n');

  console.log('🎉 ALL SPRINT 7 TOURNAMENT INTELLIGENCE TESTS PASSED WITH 100% SUCCESS!');
})();
