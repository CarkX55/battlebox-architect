/**
 * tests/unit/compiler/test_v29_9_strategic_superiority.js
 * 
 * V29.9 Strategic Superiority & Acceptable Gameplan Execution Suite:
 * 1. OPTIMUM_NOT_GOOD_ENOUGH_TEST (Judge blocks approval if gameplan success < acceptabilityThreshold)
 * 2. TRAJECTORY_CURVE_CEILING_TEST (Bars CMC > kill turn in non-ramp trajectories)
 * 3. TRIBAL_CAUSAL_AUTHENTICITY_TEST (Prevents incidental burn from hijacking werewolf tempo into BURN_LETHAL)
 * 4. STRATEGIC_SUPERIORITY_CERTIFICATE_TEST (Verifies 5-context counterfactual proofs on DeckState)
 */

import { strict as assert } from 'assert';
import { ManaExecutionOptimizer } from '../../../src/services/compiler/core/manaExecutionOptimizer.js';
import { DeterministicSupremeJudge } from '../../../src/services/compiler/core/deterministicSupremeJudge.js';
import { GameplanIntegrityGate } from '../../../src/services/compiler/core/gameplanIntegrityGate.js';
import { GameplanContract, GameplanSynthesizer } from '../../../src/services/compiler/core/gameplanSynthesizer.js';
import { StrategicLineGraph } from '../../../src/services/compiler/core/strategicLineGraph.js';
import { StrategicSuperiorityCertificate } from '../../../src/services/compiler/core/strategicSuperiorityCertificate.js';
import { StateContextEvaluator } from '../../../src/services/compiler/core/stateContextEvaluator.js';
import { ProgressiveDeckStateBuilder } from '../../../src/services/compiler/core/progressiveDeckStateBuilder.js';
import { DeckState } from '../../../src/services/compiler/core/deckState.js';
import { CertifiedDeckState } from '../../../src/services/compiler/core/certifiedDeckState.js';

console.log('--- [TEST SUITE: V29.9 Strategic Superiority & Viable Gameplan Execution] ---');

// ─── TEST 1: OPTIMUM ≠ GOOD ENOUGH (Mana & Gameplan Viability Gate) ───────────
console.log('\n[TEST 1] OPTIMUM ≠ GOOD ENOUGH (Gameplan Acceptability Gate)...');

const mockHighCurveSpells = [
  ...Array(10).fill({ name: 'High Curve Wolf', cmc: 5, type_line: 'Creature — Werewolf', colors: ['G'] }),
  ...Array(15).fill({ name: 'Mid Curve Wolf', cmc: 4, type_line: 'Creature — Werewolf', colors: ['R'] }),
  ...Array(10).fill({ name: 'Removal Spell', cmc: 3, type_line: 'Instant', colors: ['R'] })
];

const availableLands = [
  { name: 'Karplusan Forest', type_line: 'Land', colors: [] },
  { name: 'Stomping Ground', type_line: 'Land', colors: [] },
  { name: 'Mountain', type_line: 'Basic Land — Mountain', colors: [] },
  { name: 'Forest', type_line: 'Basic Land — Forest', colors: [] }
];

const competitiveGameplan = new GameplanContract({
  format: 'PIONEER',
  derivedKillTurn: 4,
  tacticalExecutionProfile: { manaScrewSensitivity: 1.25, landFloodSensitivity: 0.95 }
});

const manaOptResult = ManaExecutionOptimizer.optimizeLandState({
  nonLandSpells: mockHighCurveSpells,
  gameplanContract: competitiveGameplan,
  intentPackage: { format: 'PIONEER', colors: ['R', 'G'], competitiveTier: 'COMPETITIVE' },
  availableLands,
  deckSize: 60
});

console.log(`  Optimal Land Count: ${manaOptResult.optimalLandCount}`);
console.log(`  Gameplan Success Rate: ${(manaOptResult.gameplanSuccessRate * 100).toFixed(1)}%`);
console.log(`  Acceptability Threshold: ${(manaOptResult.acceptabilityThreshold * 100).toFixed(1)}%`);
console.log(`  Is Acceptable: ${manaOptResult.isAcceptable}`);
console.log(`  Viability Status: ${manaOptResult.viabilityStatus}`);

// Assert that the optimizer recognizes it is suboptimal despite being the mathematical argmax
assert.equal(manaOptResult.isAcceptable, false, '50.5% success must NOT pass competitive threshold of 60%');
assert.equal(manaOptResult.viabilityStatus, 'SUBOPTIMAL_VIABILITY_BELOW_ACCEPTABILITY');

// Verify that DeterministicSupremeJudge emits high defect and blocks APPROVE
const mockBuiltDeck = manaOptResult.optimalDeckState;
const judicialReview = DeterministicSupremeJudge.judgeDeck(
  mockBuiltDeck,
  {},
  {
    format: 'PIONEER',
    competitiveTier: 'COMPETITIVE',
    gameplanContract: competitiveGameplan,
    manaOptimization: manaOptResult
  },
  1
);

console.log(`  Supreme Judge Verdict: ${judicialReview.verdict}`);
const viabilityDefect = judicialReview.defects.find(d => (d.message || d).includes('UNSATISFACTORY_GAMEPLAN_VIABILITY'));
console.log(`  Viability Defect Recorded: ${viabilityDefect?.message || viabilityDefect || 'NONE'}`);

assert.ok(viabilityDefect, 'Judge must record UNSATISFACTORY_GAMEPLAN_VIABILITY defect');
assert.notEqual(judicialReview.verdict, 'APPROVE', 'Deck with unsatisfactory viability must NOT be approved');
console.log('  ✅ PASS: Optimum ≠ Good Enough principle verified. Mathematical local optimum blocked by strategic acceptability threshold.');

// ─── TEST 2: TRAJECTORY_CURVE_CEILING_TEST ────────────────────────────────────
console.log('\n[TEST 2] TRAJECTORY_CURVE_CEILING_TEST (No Profile Mixing)...');

const huntmasterCMC6 = {
  name: "Tovolar's Huntmaster // Toxic Pursuer",
  cmc: 6,
  type_line: 'Creature — Human Werewolf',
  oracle_text: 'When this enters, create two 2/2 green Wolf creature tokens.\nDaybound',
  colors: ['G']
};

const werewolfTempoGameplan = new GameplanContract({
  format: 'PIONEER',
  derivedKillTurn: 4,
  thesis: 'Werewolf Tempo Beatdown',
  requiredEngines: [{ engineId: 'STATE_TRANSITION_ENGINE' }]
  // Note: NO ramp engine required
});

const integrityResultNoRamp = GameplanIntegrityGate.evaluateCardAdmissibility(huntmasterCMC6, werewolfTempoGameplan, {
  tempo: 'Tempo',
  archetype: 'AGGRO'
});

console.log(`  Non-Ramp Evaluation - Admissible: ${integrityResultNoRamp.admissible}, Reason: ${integrityResultNoRamp.rejectionReason}`);
assert.equal(integrityResultNoRamp.admissible, false, 'CMC 6 card must be barred in T4 tempo gameplan without ramp');
assert.ok(integrityResultNoRamp.rejectionReason.includes('TRAJECTORY_CURVE_CEILING_EXCEEDED'), 'Rejection must cite TRAJECTORY_CURVE_CEILING_EXCEEDED');

// Now test with Ramp engine in Gameplan
const werewolfMidrangeWithRamp = new GameplanContract({
  format: 'PIONEER',
  derivedKillTurn: 6,
  identityConstraints: { primaryIdentity: 'werewolf' },
  requiredEngines: [{ engineId: 'RAMP' }]
});

const integrityResultWithRamp = GameplanIntegrityGate.evaluateCardAdmissibility(huntmasterCMC6, werewolfMidrangeWithRamp, {
  primaryTribe: 'Werewolf',
  tempo: 'Midrange'
});

console.log(`  Ramp-Enabled Evaluation - Admissible: ${integrityResultWithRamp.admissible}`);
assert.equal(integrityResultWithRamp.admissible, true, 'CMC 6 card is permitted when ramp trajectory is present');
console.log('  ✅ PASS: Trajectory Curve Ceiling strictly enforces temporal profile coherence.');

// ─── TEST 3: TRIBAL_CAUSAL_AUTHENTICITY_TEST ──────────────────────────────────
console.log('\n[TEST 3] TRIBAL_CAUSAL_AUTHENTICITY_TEST (Intrinsic Tribal Capabilities)...');

const mockPoolWithBurnAndWerewolves = [
  { name: 'Kessig Prowler', cmc: 1, type_line: 'Creature — Werewolf', oracle_text: 'Daybound', colors: ['G'] },
  { name: 'Outland Liberator', cmc: 2, type_line: 'Creature — Werewolf', oracle_text: 'Daybound', colors: ['G'] },
  { name: 'Tovolar, Dire Overlord', cmc: 3, type_line: 'Legendary Creature — Werewolf', oracle_text: 'Whenever a Wolf or Werewolf deals combat damage, draw a card.', colors: ['R', 'G'] },
  { name: 'Play with Fire', cmc: 1, type_line: 'Instant', oracle_text: 'Play with Fire deals 2 damage to any target.', colors: ['R'] },
  { name: 'Light Up the Night', cmc: 1, type_line: 'Sorcery', oracle_text: 'Light Up the Night deals X damage to any target.', colors: ['R'] }
];

const synthesizedGameplan = GameplanSynthesizer.synthesizeGameplan({
  intentPackage: {
    format: 'PIONEER',
    primaryTribe: 'Werewolf',
    strategicTempo: 'TEMPO',
    tempo: 'Tempo',
    colors: ['R', 'G']
  },
  deckIdentity: {
    primaryTribe: 'Werewolf',
    archetypeKey: 'TEMPO',
    colors: ['R', 'G']
  },
  candidatePool: mockPoolWithBurnAndWerewolves
});

console.log(`  Synthesized Thesis: "${synthesizedGameplan.thesis}"`);
const winCondStr = JSON.stringify(synthesizedGameplan.winCondition || {});
console.log(`  Win Condition: ${winCondStr}`);
const requiredEngineIds = (synthesizedGameplan.requiredEngines || []).map(e => e.engineId);
console.log(`  Required Engines: ${requiredEngineIds.join(', ')}`);

// Assert that the gameplan was NOT hijacked into BURN_LETHAL
assert.notEqual(synthesizedGameplan.winCondition?.condition, 'BURN_LETHAL', 'Tribal Werewolf Tempo must NOT be hijacked into BURN_LETHAL');
assert.ok(
  winCondStr.includes('COMBAT') || 
  winCondStr.includes('TEMPO') || 
  synthesizedGameplan.thesis.toLowerCase().includes('werewolf') ||
  synthesizedGameplan.thesis.toLowerCase().includes('tempo'),
  'Win condition must reflect combat tempo and werewolf identity'
);

const graphProfile = StrategicLineGraph._buildDesiredCapabilityProfile({
  primaryTribe: 'Werewolf',
  strategicTempo: 'TEMPO',
  primaryIdentity: 'werewolf'
});
const graphCapabilities = Array.from(graphProfile.desired || graphProfile);

console.log(`  Graph Inherent Capabilities: ${graphCapabilities.join(', ')}`);
assert.ok(graphCapabilities.includes('DAYBOUND_NIGHTBOUND'), 'Werewolf profile must include DAYBOUND_NIGHTBOUND');
assert.ok(graphCapabilities.includes('STATE_TRANSITION_ENGINE'), 'Werewolf profile must include STATE_TRANSITION_ENGINE');
assert.ok(graphCapabilities.includes('COMBAT_DAMAGE'), 'Werewolf profile must include COMBAT_DAMAGE');
console.log('  ✅ PASS: Tribal causal line authentic and protected from incidental burn hijacking.');

// ─── TEST 4: STRATEGIC_SUPERIORITY_CERTIFICATE_TEST ───────────────────────────
console.log('\n[TEST 4] STRATEGIC_SUPERIORITY_CERTIFICATE_TEST (5-Context Counterfactual Proofs)...');

const cardA = {
  name: 'Werewolf Pack Leader',
  cmc: 2,
  type_line: 'Creature — Human Werewolf',
  oracle_text: 'Pack tactics — Whenever Werewolf Pack Leader attacks, draw a card.',
  colors: ['G']
};

const cardB = {
  name: 'Grizzly Bears',
  cmc: 2,
  type_line: 'Creature — Bear',
  oracle_text: '',
  colors: ['G']
};

const testState = new DeckState([
  { name: 'Forest', type_line: 'Basic Land — Forest', isLand: true, quantity: 10 },
  { name: 'Mountain', type_line: 'Basic Land — Mountain', isLand: true, quantity: 10 }
]);

const comparisonResult = StateContextEvaluator.compareCounterfactuals(
  testState,
  cardA,
  cardB,
  werewolfTempoGameplan,
  { sampleSize: 20, seed: 998877 }
);

console.log(`  Comparison Winner: ${comparisonResult.winner.name}`);
console.log(`  Observed Advantage Margin: ${comparisonResult.audit.observedAdvantage.margin}`);
console.log(`  Context Deltas:`, comparisonResult.audit.contextDeltas);

const cert = StrategicSuperiorityCertificate.fromComparison({
  decisionSlot: 'T2_PROACTIVE_THREAT',
  winnerCandidate: comparisonResult.winner,
  loserCandidate: comparisonResult.loser,
  comparisonAudit: {
    netScore: comparisonResult.audit.observedAdvantage.margin,
    confidence: comparisonResult.audit.confidence,
    deltas: comparisonResult.audit.contextDeltas
  }
});

console.log(`  Certificate Hash: ${cert.certificateHash}`);
console.log(`  Proof Summary: ${cert.proofSummary}`);

assert.equal(cert.selectedCard.name, 'Werewolf Pack Leader');
assert.ok(cert.rejectedAlternatives.some(r => r.name === 'Grizzly Bears'));
assert.ok(cert.certificateHash && cert.certificateHash.length >= 8);
assert.ok(cert.contextComparison.deltas !== undefined);

// Test integration with ProgressiveDeckStateBuilder & CertifiedDeckState
const candidatePool = [
  cardA,
  cardB,
  { name: 'Kessig Prowler', cmc: 1, type_line: 'Creature — Werewolf', oracle_text: '', colors: ['G'] },
  { name: 'Karplusan Forest', type_line: 'Land', colors: [] },
  { name: 'Forest', type_line: 'Basic Land — Forest', colors: [] },
  { name: 'Mountain', type_line: 'Basic Land — Mountain', colors: [] }
];

const { deckState: builtDeckState } = ProgressiveDeckStateBuilder.buildDeckState({
  intentPackage: { format: 'PIONEER', primaryTribe: 'Werewolf', tempo: 'Tempo' },
  deckIdentity: { archetypeKey: 'TEMPO', primaryTribe: 'Werewolf' },
  gameplanContract: werewolfTempoGameplan,
  candidatePool
});

assert.ok(Array.isArray(builtDeckState.superiorityCertificates), 'builtDeckState must carry superiorityCertificates array');
console.log(`  Built Deck Superiority Certificates Count: ${builtDeckState.superiorityCertificates.length}`);

// Test freezing into CertifiedDeckState
const frozenState = CertifiedDeckState.freeze(builtDeckState, {
  intentPackage: { format: 'PIONEER' },
  supremeJudicialReview: { verdict: 'APPROVE' }
});

assert.ok(Array.isArray(frozenState.superiorityCertificates), 'CertifiedDeckState must preserve superiorityCertificates');
assert.equal(Object.isFrozen(frozenState.superiorityCertificates), true, 'Certificates must be deeply frozen');
console.log('  ✅ PASS: Strategic Superiority Certificates generate and seal into immutable IR.');

console.log('\n--- ALL V29.9 TESTS PASSED DETERMINISTICALLY ---');
