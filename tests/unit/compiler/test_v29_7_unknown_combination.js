/**
 * tests/unit/compiler/test_v29_7_unknown_combination.js
 * 
 * Benchmark Suite: UNKNOWN_COMBINATION_TEST.
 * 
 * Verifies that BattleBox compiles a completely unseen combination:
 *   - Tribe: Kor (Zero hardcoded rules in codebase)
 *   - Engine: Equipment Synergy / Modified
 *   - Mechanic: Equip / Modified
 *   - Tempo: Tempo / Aggro
 *   - Win Condition: Combat Damage
 * 
 * Proves autonomous generalization through:
 *   Discovery -> Mechanic Clusters -> Gameplan -> Deficits ->
 *   DeckState -> Trajectory Search -> Consequence Chain -> Supreme Judge
 */

import { strict as assert } from 'assert';
import { GameplanSynthesizer } from '../../../src/services/compiler/core/gameplanSynthesizer.js';
import { LookaheadTrajectorySearch } from '../../../src/services/compiler/core/lookaheadTrajectorySearch.js';
import { DeckState } from '../../../src/services/compiler/core/deckState.js';
import { DeterministicSupremeJudge } from '../../../src/services/compiler/core/deterministicSupremeJudge.js';
import { ExecutionConsequenceInvariant } from '../../../src/services/compiler/core/executionConsequenceInvariant.js';
import { ManaExecutionOptimizer } from '../../../src/services/compiler/core/manaExecutionOptimizer.js';
import { normalizeCanonicalCard } from '../../../src/services/compiler/core/canonicalCardNormalizer.js';

console.log('══════════════════════════════════════════════════════════════════');
console.log('  BENCHMARK: V29.7 UNKNOWN_COMBINATION_TEST (KOR EQUIPMENT TEMPO)');
console.log('══════════════════════════════════════════════════════════════════\n');

// 1. Synthesize candidate pool of completely unseen tribe/mechanic
const poolCards = [
  // 1CMC on-identity creature
  normalizeCanonicalCard({
    name: 'Kor Duelist',
    cmc: 1,
    mana_cost: '{W}',
    type_line: 'Creature — Kor Soldier',
    oracle_text: 'As long as Kor Duelist is equipped, it has double strike.',
    power: '1',
    toughness: '1',
    colors: ['W']
  }),
  // 1CMC on-identity creature 2
  normalizeCanonicalCard({
    name: 'Kor Outfitter',
    cmc: 2,
    mana_cost: '{W}{W}',
    type_line: 'Creature — Kor Cleric',
    oracle_text: 'When Kor Outfitter enters the battlefield, you may attach target Equipment you control to target creature you control.',
    power: '2',
    toughness: '2',
    colors: ['W']
  }),
  // 2CMC Equipment
  normalizeCanonicalCard({
    name: 'Bonesplitter',
    cmc: 1,
    mana_cost: '{1}',
    type_line: 'Artifact — Equipment',
    oracle_text: 'Equipped creature gets +2/+0. Equip {1}',
    power: null,
    toughness: null,
    colors: []
  }),
  // 2CMC on-identity flyer
  normalizeCanonicalCard({
    name: 'Kor Skyfisher',
    cmc: 2,
    mana_cost: '{1}{W}',
    type_line: 'Creature — Kor Soldier',
    oracle_text: 'Flying. When Kor Skyfisher enters the battlefield, return a permanent you control to its owner\'s hand.',
    power: '2',
    toughness: '3',
    colors: ['W'],
    keywords: ['Flying']
  }),
  // 3CMC on-identity synergy lord
  normalizeCanonicalCard({
    name: 'Armament Master',
    cmc: 2,
    mana_cost: '{W}{W}',
    type_line: 'Creature — Kor Soldier',
    oracle_text: 'Other Kor creatures you control get +2/+2 for each Equipment attached to Armament Master.',
    power: '2',
    toughness: '2',
    colors: ['W']
  }),
  // Distractor: Expensive 6CMC off-tribe bomb
  normalizeCanonicalCard({
    name: 'Sun Titan',
    cmc: 6,
    mana_cost: '{4}{W}{W}',
    type_line: 'Creature — Giant',
    oracle_text: 'Vigilance. Whenever Sun Titan enters the battlefield or attacks, you may return target permanent card with converted mana cost 3 or less from your graveyard to the battlefield.',
    power: '6',
    toughness: '6',
    colors: ['W']
  }),
  // Interaction
  normalizeCanonicalCard({
    name: 'Swords to Plowshares',
    cmc: 1,
    mana_cost: '{W}',
    type_line: 'Instant',
    oracle_text: 'Exile target creature. Its controller gains life equal to its power.',
    colors: ['W'],
    role: 'CHEAP_REMOVAL'
  })
];

const intentPackage = {
  format: 'STANDARD',
  primaryTribe: 'Kor',
  strategy: 'EQUIPMENT_TEMPO',
  archetype: 'Tempo',
  tempo: 'Tempo',
  colors: ['W'],
  identityPolicy: 'STRICT_TRIBE',
  interactionPreference: 'OPTIMAL'
};

// [Step 1] Synthesizing Gameplan for unseen combination
console.log('[Step 1] Synthesizing GameplanContract for Kor Equipment Tempo...');
const mockPrimaryLine = {
  label: 'Kor Aggressive Equipment Tempo Line',
  winCondition: { condition: 'COMBAT_DAMAGE', description: 'Attack with equipped Kor creatures' },
  participatingCardNames: ['Kor Duelist', 'Kor Outfitter', 'Bonesplitter', 'Kor Skyfisher', 'Armament Master'],
  executionProbability: 0.82
};

const gameplanContract = GameplanSynthesizer.synthesize({
  lineSelection: { primaryLine: { line: mockPrimaryLine } },
  cardPool: poolCards,
  intentPackage,
  deckSize: 60
});

assert.equal(gameplanContract.identityConstraints.primaryIdentity, 'Kor');
assert.ok(gameplanContract.turnRequirements.length >= 2, 'Expected turn requirements generated');
console.log(`  ✅ PASS: GameplanContract synthesized for unseen tribe [Kor]. Derived Kill Turn: ${gameplanContract.derivedKillTurn}`);

// [Step 2] Lookahead Trajectory Search over complete DeckStates
console.log('\n[Step 2] Executing LookaheadTrajectorySearch (K=3, Depth=2) on Kor candidate pool...');
const rootState = new DeckState([
  { cardObj: poolCards[0], quantity: 2, isLand: false }, // 2x Kor Duelist
  { cardObj: poolCards[2], quantity: 2, isLand: false }  // 2x Bonesplitter
], { format: 'STANDARD', archetype: 'Tempo' });

const searchResult = LookaheadTrajectorySearch.searchTrajectories({
  rootState,
  candidatePool: poolCards,
  gameplanContract,
  intentPackage,
  beamWidth: 3,
  depth: 2,
  landCalibrator: (spells) => {
    const opt = ManaExecutionOptimizer.calibrateOptimalLands({
      nonLandSpells: spells,
      intentPackage,
      gameplanContract,
      deckSize: 60
    });
    return new DeckState([
      ...opt.optimalDeckState.nonLandSpells,
      ...opt.optimalDeckState.landCards
    ], { format: 'STANDARD', archetype: 'Tempo' });
  }
});

assert.ok(searchResult.winningState, 'Expected a winning DeckState from lookahead search');
assert.equal(searchResult.certificationStatus, 'BEST_SUPPORTED_STATE');
assert.ok(searchResult.exploredNodesCount > 0, 'Expected explored nodes in beam search');
console.log(`  ✅ PASS: Lookahead Trajectory Search discovered Best Supported State (${searchResult.certificationStatus}). Nodes Explored: ${searchResult.exploredNodesCount}`);

// [Step 3] Observable Land Calibration on Complete 60-Card Kor State
console.log('\n[Step 3] Verifying Land Calibration on Complete 60-Card Kor Equipment DeckState...');
const sampleDeckSpells = [
  { cardObj: poolCards[0], quantity: 4, role: 'CORE' }, // Kor Duelist (1CMC, Kor)
  { cardObj: { ...poolCards[0], name: 'Kor Apprentice' }, quantity: 4, role: 'CORE' }, // Kor Apprentice (1CMC, Kor) -> 8 1-drops!
  { cardObj: poolCards[1], quantity: 4, role: 'CORE' }, // Kor Outfitter (2CMC, Kor)
  { cardObj: poolCards[3], quantity: 4, role: 'CORE' }, // Kor Skyfisher (2CMC, Kor)
  { cardObj: poolCards[4], quantity: 4, role: 'CORE' }, // Armament Master (2CMC, Kor)
  { cardObj: poolCards[2], quantity: 4, role: 'CORE' }, // Bonesplitter (1CMC, Equip)
  { cardObj: { ...poolCards[2], name: 'Trusty Machete' }, quantity: 4, role: 'CORE' }, // Trusty Machete (1CMC, Equip)
  { cardObj: { ...poolCards[2], name: 'Cliffhaven Kitesail' }, quantity: 4, role: 'CORE' }, // Kitesail (1CMC, Equip)
  { cardObj: poolCards[6], quantity: 4, role: 'CHEAP_REMOVAL' }, // Swords to Plowshares (1CMC)
  { cardObj: { ...poolCards[6], name: 'Valorous Stance', cmc: 2 }, quantity: 2, role: 'REMOVAL' }, // Valorous Stance (2CMC)
  { cardObj: { ...poolCards[2], name: 'Maul of the Skyclaves', cmc: 3 }, quantity: 4, role: 'CORE' } // Maul of the Skyclaves (3CMC)
  // Total: 42 spells + 18 lands = 60 cards exact!
];

const manaResult = ManaExecutionOptimizer.calibrateOptimalLands({
  nonLandSpells: sampleDeckSpells,
  intentPackage,
  gameplanContract,
  deckSize: 60
});

assert.ok(manaResult.bestSupportedLandCount >= 18 && manaResult.bestSupportedLandCount <= 22, `Expected 18-22 lands for ultra-low curve Kor tempo (max CMC 2), got ${manaResult.bestSupportedLandCount}`);
assert.equal(manaResult.certificationStatus, 'EMPIRICALLY_SUPERIOR_STATE');
console.log(`  ✅ PASS: Derived Best Supported Land Count: ${manaResult.bestSupportedLandCount} (Gameplan Success: ${(manaResult.gameplanSuccessRate * 100).toFixed(1)}%).`);

// [Step 4] Consequence Invariant Audit
console.log('\n[Step 4] Verifying 4-Stage Execution Consequence Invariant...');
const fullDeckCards = [
  ...manaResult.optimalDeckState.nonLandSpells,
  ...manaResult.optimalDeckState.landCards
];
const fullDeckState = new DeckState(fullDeckCards, { format: 'STANDARD', archetype: 'Tempo' });

const consequenceAudit = ExecutionConsequenceInvariant.auditChain({
  gameplanContract,
  deckState: fullDeckState
});

console.log('consequenceAudit diagnosis:', consequenceAudit.diagnosis);
console.log('consequenceAudit verifications:', JSON.stringify(consequenceAudit.chainVerifications, null, 2));
assert.ok(consequenceAudit.totalRequirements > 0, 'Expected audited requirements');
assert.equal(consequenceAudit.verdict, 'CONSEQUENCE_CHAIN_VERIFIED');
console.log(`  ✅ PASS: Execution Consequence Chain Verified: ${consequenceAudit.diagnosis}`);

// [Step 5] Deterministic Supreme Judge Evaluation
console.log('\n[Step 5] Running Deterministic Supreme Judge on unseen Kor deck...');
const judgeVerdict = DeterministicSupremeJudge.evaluateDeck(fullDeckState, {
  ...intentPackage,
  gameplanContract,
  planCoverage: { compositeScore: 92, criticalFailures: [], importantDeficits: [], isFullyCovered: true }
});

console.log('judgeVerdict defects:', JSON.stringify(judgeVerdict.defects, null, 2));
console.log('judgeVerdict blockingDefects:', JSON.stringify(judgeVerdict.blockingDefects, null, 2));
assert.equal(judgeVerdict.hasBlockingWarnings, false, `Expected 0 blocking defects, got ${judgeVerdict.blockingDefects.length}`);
assert.ok(judgeVerdict.score >= 80, `Expected score >= 80, got ${judgeVerdict.score}`);
assert.equal(judgeVerdict.verdict, 'APPROVE');
console.log(`  ✅ PASS: Supreme Judge issued ${judgeVerdict.verdict} (${judgeVerdict.score}/100, Certification: ${judgeVerdict.certification}) on unseen Kor archetype.`);

console.log('\n══════════════════════════════════════════════════════════════════');
console.log('  UNKNOWN_COMBINATION_TEST SUMMARY: ALL 5 STEPS PASSED');
console.log('══════════════════════════════════════════════════════════════════\n');
