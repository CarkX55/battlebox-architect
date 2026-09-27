/**
 * tests/unit/compiler/test_v29_7_consequence_hierarchy.js
 * 
 * Test Suite: Universal Consequence Hierarchy (CRITICAL vs IMPORTANT vs OPTIONAL).
 * Verifies that:
 *   1. IMPORTANT turn deficits are recorded in importantDeficits (not ignored).
 *   2. Unsatisfied IMPORTANT deficits cap coverage score and prevent false 94.4 APPROVE.
 *   3. Candidate frontier locks to deficit closers for IMPORTANT demands when pool capacity exists.
 *   4. An unclosed IMPORTANT deficit produces SUBOPTIMAL_REPLAN_REQUIRED (or REPLAN) rather than APPROVE.
 */

import { strict as assert } from 'assert';
import { DeckPlanCoverage } from '../../../src/services/compiler/core/deckPlanCoverage.js';
import { DeterministicSupremeJudge } from '../../../src/services/compiler/core/deterministicSupremeJudge.js';
import { DeckState } from '../../../src/services/compiler/core/deckState.js';
import { GameplanContract, TurnRequirement, TurnFunctionalDemand } from '../../../src/services/compiler/core/gameplanSynthesizer.js';
import { ProgressiveDeckStateBuilder } from '../../../src/services/compiler/core/progressiveDeckStateBuilder.js';

console.log('══════════════════════════════════════════════════════════════════');
console.log('  TEST SUITE: V29.7 UNIVERSAL CONSEQUENCE HIERARCHY');
console.log('══════════════════════════════════════════════════════════════════\n');

// 1. Setup a GameplanContract with an IMPORTANT T1 creature demand
const gameplanWithImportantT1 = new GameplanContract({
  thesis: 'Tempo + Day/Night Werewolves',
  derivedKillTurn: 5,
  turnRequirements: [
    new TurnRequirement({
      turn: 1,
      criticality: 'IMPORTANT',
      functionalDemands: [
        new TurnFunctionalDemand({
          functionName: 'DEPLOY_ON_IDENTITY_1CMC_BODY',
          constraints: { cmc: { max: 1 }, type: 'creature', requiresOnIdentity: true },
          criticality: 'IMPORTANT',
          targetProbability: 0.70,
          minimumInDeck: 8
        })
      ]
    }),
    new TurnRequirement({
      turn: 2,
      criticality: 'IMPORTANT',
      functionalDemands: [
        new TurnFunctionalDemand({
          functionName: 'DEVELOP_THREAT_2CMC',
          constraints: { cmc: { max: 2 } },
          criticality: 'IMPORTANT',
          targetProbability: 0.80,
          minimumInDeck: 10
        })
      ]
    })
  ]
});

// [Test 1] DeckPlanCoverage recording importantDeficits
console.log('[Test 1] Testing DeckPlanCoverage tracking of IMPORTANT deficits...');
// Deck has only 4 copies of Village Messenger (4 copies gives ~39.9% probability < target 70%)
const deficientDeckCards = [
  { name: 'Village Messenger', cmc: 1, type_line: 'Creature — Human Werewolf', oracle_text: 'Haste. Daybound', quantity: 4, isLand: false },
  { name: 'Play with Fire', cmc: 1, type_line: 'Instant', oracle_text: 'Deals 2 damage', quantity: 4, isLand: false },
  { name: 'Light Up the Night', cmc: 1, type_line: 'Sorcery', oracle_text: 'Deals X damage', quantity: 4, isLand: false },
  { name: 'Kessig Forgemaster', cmc: 2, type_line: 'Creature — Human Werewolf', oracle_text: 'Daybound', quantity: 4, isLand: false },
  { name: 'Werewolf Pack Leader', cmc: 2, type_line: 'Creature — Human Werewolf', oracle_text: 'Pack tactics', quantity: 4, isLand: false },
  { name: 'Gladewalker Ritualist', cmc: 3, type_line: 'Creature — Human Werewolf', oracle_text: 'Daybound', quantity: 4, isLand: false },
  { name: 'The Celestus', cmc: 3, type_line: 'Legendary Artifact', oracle_text: 'Daybound. Nightbound', quantity: 4, isLand: false },
  { name: 'Tovolar, Dire Overlord', cmc: 3, type_line: 'Legendary Creature — Human Werewolf', oracle_text: 'Daybound. Transform', quantity: 4, isLand: false },
  { name: 'Lambholt Raconteur', cmc: 4, type_line: 'Creature — Human Werewolf', oracle_text: 'Daybound', quantity: 4, isLand: false },
  { name: 'Mountain', cmc: 0, type_line: 'Basic Land — Mountain', quantity: 12, isLand: true },
  { name: 'Forest', cmc: 0, type_line: 'Basic Land — Forest', quantity: 12, isLand: true }
];
const deficientDeckState = new DeckState(deficientDeckCards);

const coverage = DeckPlanCoverage.computeCoverage({
  deckState: deficientDeckState,
  gameplanContract: gameplanWithImportantT1,
  deckSize: 60
});

assert.equal(coverage.criticalFailures.length, 0, 'Expected 0 critical failures');
assert.ok(coverage.importantDeficits.length >= 1, 'Expected at least 1 IMPORTANT deficit');
assert.equal(coverage.importantDeficits[0].phaseName, 'DEPLOY_ON_IDENTITY_1CMC_BODY');
assert.ok(coverage.compositeScore < 60, `Expected compositeScore to be capped < 60, got ${coverage.compositeScore}`);
assert.equal(coverage.isFullyCovered, false, 'Deck must not be fully covered with an open important deficit');
console.log(`  ✅ PASS: IMPORTANT deficit accurately captured (phase: ${coverage.importantDeficits[0].phaseName}, actualP: ${coverage.importantDeficits[0].actualProbability}, score: ${coverage.compositeScore}).`);

// [Test 2] DeterministicSupremeJudge enforcing SUBOPTIMAL_REPLAN_REQUIRED
console.log('\n[Test 2] Testing Supreme Judge refusal to approve 94.4 with unclosed IMPORTANT deficit...');
const intentPackage = {
  format: 'STANDARD',
  strategy: 'Werewolf Tempo',
  primaryTribe: 'Werewolf',
  tempo: 'Tempo',
  planCoverage: coverage
};

const judicialReview = DeterministicSupremeJudge.judgeDeck(
  deficientDeckState,
  { primaryTribe: 'Werewolf' },
  intentPackage,
  3 // Final iteration 3
);

assert.notEqual(judicialReview.verdict, 'APPROVE', 'Supreme Judge must NOT emit clean APPROVE when an IMPORTANT deficit is unclosed');
assert.equal(judicialReview.verdict, 'SUBOPTIMAL_REPLAN_REQUIRED', `Expected verdict SUBOPTIMAL_REPLAN_REQUIRED, got ${judicialReview.verdict}`);
assert.equal(judicialReview.certification, 'SUBOPTIMAL_UNRESOLVED_IMPORTANT_DEFICIT');
assert.ok(judicialReview.diagnosticVectors.GameplanCoverageAudit.status !== 'PASS', 'GameplanCoverageAudit status must not be PASS');
console.log(`  ✅ PASS: Supreme Judge correctly issued ${judicialReview.verdict} (${judicialReview.certification}).`);

// [Test 3] ProgressiveDeckStateBuilder locking frontier to IMPORTANT deficit closers
console.log('\n[Test 3] Testing ProgressiveDeckStateBuilder deficit locking for IMPORTANT demands...');
const candidatePool = [
  // 1CMC on-identity Werewolf creatures
  { name: 'Village Messenger', cmc: 1, type_line: 'Creature — Human Werewolf', oracle_text: 'Haste. Daybound' },
  { name: 'Wolfbitten Captive', cmc: 1, type_line: 'Creature — Werewolf', oracle_text: 'Daybound' },
  // 1CMC burn distractor spells
  { name: 'Play with Fire', cmc: 1, type_line: 'Instant', oracle_text: 'Deals 2 damage to any target' },
  { name: 'Light Up the Night', cmc: 1, type_line: 'Sorcery', oracle_text: 'Deals X damage' },
  // 2CMC Werewolf
  { name: 'Kessig Forgemaster', cmc: 2, type_line: 'Creature — Human Werewolf', oracle_text: 'Daybound' },
  // Lands
  { name: 'Mountain', cmc: 0, type_line: 'Basic Land — Mountain', isLand: true },
  { name: 'Forest', cmc: 0, type_line: 'Basic Land — Forest', isLand: true }
];

const buildResult = ProgressiveDeckStateBuilder.buildDeckState({
  intentPackage: { format: 'STANDARD', primaryTribe: 'Werewolf', colors: ['R', 'G'] },
  deckIdentity: { primaryTribe: 'Werewolf', archetypeKey: 'Tempo' },
  gameplanContract: gameplanWithImportantT1,
  candidatePool
});

const builtCards = buildResult.deckState.cards.filter(c => !c.isLand);
const oneCmcCreatures = builtCards.filter(c => c.cmc === 1 && c.type_line.toLowerCase().includes('creature'));
const oneCmcCreatureCount = oneCmcCreatures.reduce((s, c) => s + (c.quantity || 1), 0);

assert.ok(oneCmcCreatureCount >= 7, `Expected at least 7-8 1CMC Werewolf creatures, found ${oneCmcCreatureCount}`);
console.log(`  ✅ PASS: Builder prioritized 1CMC Werewolf creatures (${oneCmcCreatureCount} copies) over burn distractors.`);

console.log('\n══════════════════════════════════════════════════════════════════');
console.log('  V29.7 CONSEQUENCE HIERARCHY TEST SUMMARY: ALL 3 PASSED');
console.log('══════════════════════════════════════════════════════════════════\n');
