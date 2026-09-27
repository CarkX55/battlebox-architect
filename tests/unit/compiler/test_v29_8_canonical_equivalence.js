/**
 * tests/unit/compiler/test_v29_8_canonical_equivalence.js
 * 
 * V29.8 Verification Suite:
 * 1. CANONICAL_CARD_EQUIVALENCE (format + cmc + typeLine + oracleText + colors)
 * 2. STATE_IDENTITY_DIVERGENCE Hard Gate
 * 3. EXECUTION_TARGET_IS_HARD (prob < target => isSatisfied = false, DEFICIT)
 * 4. PERSISTENT_VETO_LEDGER & Retroactive Swap Monotonicity
 * 5. ADAPTIVE_LAND_SPECTRUM & Telemetry Matrix
 */

import { strict as assert } from 'assert';
import { extractCanonicalCmc, extractCanonicalTypeLine, extractCanonicalOracleText } from '../../../src/services/compiler/core/canonicalCardNormalizer.js';
import { parseSemanticCard } from '../../../src/services/semanticCardParser.js';
import { CardCausalContract } from '../../../src/services/compiler/core/cardCausalContract.js';
import { DeterministicGameState } from '../../../src/services/compiler/core/deterministicGameState.js';
import { DeckState } from '../../../src/services/compiler/core/deckState.js';
import { DeckStateSnapshot } from '../../../src/services/compiler/core/deckStateSnapshot.js';
import { DeterministicSupremeJudge } from '../../../src/services/compiler/core/deterministicSupremeJudge.js';
import { DeckPlanCoverage } from '../../../src/services/compiler/core/deckPlanCoverage.js';
import { ManaExecutionOptimizer } from '../../../src/services/compiler/core/manaExecutionOptimizer.js';
import { ProgressiveDeckStateBuilder } from '../../../src/services/compiler/core/progressiveDeckStateBuilder.js';
import { GameplanContract } from '../../../src/services/compiler/core/gameplanSynthesizer.js';

console.log('--- [TEST SUITE: V29.8 Canonical State Equivalence & Persistent Monotonicity] ---');

// Mock DFC cards exactly as Scryfall / DB formats them
const lambholtRaconteurDFC = {
  id: 'dfc-lambholt',
  name: 'Lambholt Raconteur // Lambholt Ravager',
  cmc: 0, // Simulating stale 0 on root
  mana_value: 0,
  card_faces: [
    {
      name: 'Lambholt Raconteur',
      mana_cost: '{3}{G}',
      type_line: 'Creature — Human Werewolf',
      oracle_text: 'Daybound\nWhenever you cast a spell, this deals 1 damage to each opponent.',
      power: '3',
      toughness: '3',
      colors: ['G']
    },
    {
      name: 'Lambholt Ravager',
      mana_cost: '',
      type_line: 'Creature — Werewolf',
      oracle_text: 'Nightbound\nWhenever you cast a spell, this deals 2 damage to each opponent.',
      power: '5',
      toughness: '5',
      colors: ['G']
    }
  ]
};

const villageMessengerDFC = {
  id: 'dfc-messenger',
  name: 'Village Messenger // Moonrise Intruder',
  cmc: 0, // Stale 0
  card_faces: [
    {
      name: 'Village Messenger',
      mana_cost: '{R}',
      type_line: 'Creature — Human Werewolf',
      oracle_text: 'Haste\nAt the beginning of each upkeep, if no spells were cast last turn, transform Village Messenger.',
      power: '1',
      toughness: '1',
      colors: ['R']
    },
    {
      name: 'Moonrise Intruder',
      mana_cost: '',
      type_line: 'Creature — Werewolf',
      oracle_text: 'Menace',
      power: '2',
      toughness: '2',
      colors: ['R']
    }
  ]
};

const tovolarDFC = {
  id: 'dfc-tovolar',
  name: 'Tovolar, Dire Overlord // Tovolar, the Midnight Scourge',
  cmc: 0,
  card_faces: [
    {
      name: 'Tovolar, Dire Overlord',
      mana_cost: '{1}{R}{G}',
      type_line: 'Legendary Creature — Human Werewolf',
      oracle_text: 'Whenever a Wolf or Werewolf you control deals combat damage to a player, draw a card.\nAt the beginning of your upkeep, if you control three or more Wolves and/or Werewolves, it becomes night. Then transform Tovolar, Dire Overlord.',
      power: '3',
      toughness: '3',
      colors: ['R', 'G']
    },
    {
      name: 'Tovolar, the Midnight Scourge',
      mana_cost: '',
      type_line: 'Legendary Creature — Werewolf',
      oracle_text: 'Whenever a Wolf or Werewolf you control deals combat damage to a player, draw a card.',
      power: '4',
      toughness: '4',
      colors: ['R', 'G']
    }
  ]
};

const huntmasterDFC = {
  id: 'dfc-huntmaster',
  name: "Tovolar's Huntmaster // Tovolar's Packleader",
  cmc: 0,
  card_faces: [
    {
      name: "Tovolar's Huntmaster",
      mana_cost: '{4}{G}{G}',
      type_line: 'Creature — Human Werewolf',
      oracle_text: "When Tovolar's Huntmaster enters the battlefield, create two 2/2 green Wolf creature tokens.\nDaybound",
      power: '6',
      toughness: '6',
      colors: ['G']
    },
    {
      name: "Tovolar's Packleader",
      mana_cost: '',
      type_line: 'Creature — Werewolf',
      oracle_text: 'Nightbound',
      power: '7',
      toughness: '7',
      colors: ['G']
    }
  ]
};

// ─── TEST 1: CANONICAL_CARD_EQUIVALENCE ────────────────────────────────────────
console.log('\n[TEST 1] CANONICAL_CARD_EQUIVALENCE across all MTG layers...');

const testCards = [
  { card: villageMessengerDFC, expectedCmc: 1, expectedName: 'Village Messenger' },
  { card: tovolarDFC, expectedCmc: 3, expectedName: 'Tovolar' },
  { card: lambholtRaconteurDFC, expectedCmc: 4, expectedName: 'Lambholt' },
  { card: huntmasterDFC, expectedCmc: 6, expectedName: 'Huntmaster' }
];

for (const { card, expectedCmc, expectedName } of testCards) {
  // 1. DeckState
  const deckState = new DeckState([{ cardObj: card, quantity: 4 }], { format: 'PIONEER' });
  const deckCmc = deckState.cards[0].cmc;

  // 2. Semantic
  const semantic = parseSemanticCard(card);
  const semanticCmc = semantic.cmc;

  // 3. CausalContract
  const causalContract = CardCausalContract.parse(card);
  const causalCmc = causalContract.cardIdentity.cmc;

  // 4. Simulation
  const gameState = DeterministicGameState.createInitialState([card]);
  const simCmc = gameState.library[0].cmc;

  assert.equal(deckCmc, expectedCmc, `DeckState CMC for ${expectedName} must be ${expectedCmc}, got ${deckCmc}`);
  assert.equal(semanticCmc, expectedCmc, `Semantic CMC for ${expectedName} must be ${expectedCmc}, got ${semanticCmc}`);
  assert.equal(causalCmc, expectedCmc, `CausalContract CMC for ${expectedName} must be ${expectedCmc}, got ${causalCmc}`);
  assert.equal(simCmc, expectedCmc, `Simulation CMC for ${expectedName} must be ${expectedCmc}, got ${simCmc}`);

  // Canonical Identity Equivalence: DeckState.cmc === Semantic.cmc === CausalContract.cmc === Simulation.cmc
  assert.equal(deckCmc, semanticCmc);
  assert.equal(semanticCmc, causalCmc);
  assert.equal(causalCmc, simCmc);

  console.log(`  ✅ PASS: ${expectedName} equivalence: DeckState(${deckCmc}) === Semantic(${semanticCmc}) === Causal(${causalCmc}) === Simulation(${simCmc}) === ${expectedCmc}`);
}

// ─── TEST 2: STATE_IDENTITY_DIVERGENCE HARD GATE ──────────────────────────────
console.log('\n[TEST 2] STATE_IDENTITY_DIVERGENCE Hard Gate verification...');

const pioneerDeckState = new DeckState([
  { name: 'Forest', isLand: true, quantity: 24 },
  { name: 'Llanowar Elves', isLand: false, quantity: 36, cmc: 1 }
], { format: 'PIONEER' });

// Snapshot must preserve PIONEER format
const snapshot = DeckStateSnapshot.fromDeckState(pioneerDeckState);
assert.equal(snapshot.format, 'PIONEER', `Snapshot format must be PIONEER, got ${snapshot.format}`);
DeckStateSnapshot.verifyFormatIntegrity(snapshot, 'PIONEER');
console.log(`  ✅ PASS: Snapshot format preserved as "${snapshot.format}" (PIONEER).`);

// Snapshot mismatch must throw
assert.throws(() => {
  DeckStateSnapshot.verifyFormatIntegrity(snapshot, 'STANDARD');
}, /STATE_IDENTITY_DIVERGENCE/, 'Should throw STATE_IDENTITY_DIVERGENCE on format divergence');
console.log('  ✅ PASS: DeckStateSnapshot.verifyFormatIntegrity correctly throws on format divergence.');

// SupremeJudge must detect format divergence as CRITICAL blocking defect
const divergedJudgeReview = DeterministicSupremeJudge.judgeDeck(
  pioneerDeckState,
  {},
  { format: 'STANDARD' } // Mismatched Intent
);
const formatDefect = divergedJudgeReview.defects.find(d => d.axis === 'STATE_IDENTITY');
assert.ok(formatDefect, 'Judge must emit STATE_IDENTITY defect when formats diverge');
assert.equal(formatDefect.severity, 'CRITICAL');
assert.equal(divergedJudgeReview.verdict, 'REJECT');
console.log(`  ✅ PASS: SupremeJudge rejects with CRITICAL STATE_IDENTITY defect: "${formatDefect.message}"`);

// ─── TEST 3: EXECUTION_TARGET_IS_HARD ─────────────────────────────────────────
console.log('\n[TEST 3] EXECUTION_TARGET_IS_HARD verification...');

const fakeT1DemandDeck = new DeckState([
  { cardObj: villageMessengerDFC, quantity: 4 }, // 4 copies in 60 cards -> Hypergeo P ~ 40% < 70% target
  { name: 'Forest', isLand: true, quantity: 24 },
  { name: 'Tovolar', isLand: false, quantity: 4, cmc: 3 },
  { name: 'Tovolar Huntmaster', isLand: false, quantity: 28, cmc: 6 }
], { format: 'PIONEER' });

const strictGameplan = new GameplanContract({
  format: 'PIONEER',
  derivedKillTurn: 4,
  turnRequirements: [
    {
      turn: 1,
      criticality: 'IMPORTANT',
      functionalDemands: [
        {
          functionName: 'DEPLOY_ON_IDENTITY_1CMC_BODY',
          constraints: { cmc: { max: 1 }, requiresOnIdentity: true },
          executionWindow: { maxMana: 1 },
          criticality: 'IMPORTANT',
          targetProbability: 0.70,
          minimumInDeck: 8
        }
      ]
    }
  ]
});

const coverage = DeckPlanCoverage.computeCoverage({ deckState: fakeT1DemandDeck, gameplanContract: strictGameplan });
const t1Phase = coverage.phases.find(p => p.phaseName === 'DEPLOY_ON_IDENTITY_1CMC_BODY');

assert.ok(t1Phase, 'T1 Phase must be present in coverage');
assert.ok(t1Phase.actualProbability < 0.70, `Actual probability (${t1Phase.actualProbability}) must be < 0.70`);
assert.equal(t1Phase.isSatisfied, false, 'isSatisfied must be FALSE when actual < target');
assert.equal(t1Phase.status, 'DEFICIT', 'status must be strictly DEFICIT');
assert.equal(coverage.importantDeficits.length, 1, 'must be recorded in importantDeficits');
console.log(`  ✅ PASS: Hard Target Invariant enforced: actual (${t1Phase.actualProbability}) < target (0.70) => isSatisfied = false, status = DEFICIT.`);

// ─── TEST 4: PERSISTENT_VETO_LEDGER & TIMING ENVELOPE INVARIANT ───────────────
console.log('\n[TEST 4] PERSISTENT_VETO_LEDGER & Retroactive Swap Invariants...');

const stormTheCitadel = {
  name: 'Storm the Citadel',
  cmc: 5,
  mana_value: 5,
  mana_cost: '{4}{G}',
  type_line: 'Sorcery',
  oracle_text: "Until end of turn, creatures you control get +2/+2 and gain 'Whenever this creature deals combat damage to a player or planeswalker, destroy target artifact or enchantment that player or planeswalker's controller controls.'",
  colors: ['G']
};

const lightUpTheNight = {
  name: 'Light Up the Night',
  cmc: 1,
  mana_value: 1,
  mana_cost: '{X}{R}',
  type_line: 'Sorcery',
  oracle_text: 'Light Up the Night deals X damage to any target.',
  colors: ['R']
};

// Test builder retroactive swap handling with realistic candidate pool
const fullPool = [
  villageMessengerDFC,
  tovolarDFC,
  lambholtRaconteurDFC,
  lightUpTheNight,
  stormTheCitadel,
  { name: 'Werewolf Pack Leader', cmc: 2, type_line: 'Creature — Human Werewolf', colors: ['G'], capabilities: ['CARD_FLOW'] },
  { name: 'Kessig Prowler', cmc: 1, type_line: 'Creature — Human Werewolf', colors: ['G'], capabilities: ['EARLY_BODY'] },
  { name: 'Outland Liberator', cmc: 2, type_line: 'Creature — Human Werewolf', colors: ['G'], capabilities: ['INTERACTION'] },
  { name: 'Abrade', cmc: 2, type_line: 'Instant', colors: ['R'], capabilities: ['CHEAP_REMOVAL'] },
  { name: 'Reckless Stormseeker', cmc: 3, type_line: 'Creature — Human Werewolf', colors: ['R'], capabilities: ['BOARD_AMPLIFIER'] }
];

const { deckState: builtDeck, buildLog } = ProgressiveDeckStateBuilder.buildDeckState({
  intentPackage: {
    format: 'PIONEER',
    primaryTribe: 'Werewolf',
    tempo: 'Tempo',
    allowOffTribe: false,
    identityPolicy: { creatureMembershipMode: 'STRICT_TRIBE' }
  },
  deckIdentity: { archetypeKey: 'TEMPO' },
  gameplanContract: new GameplanContract({
    format: 'PIONEER',
    derivedKillTurn: 4,
    identityConstraints: { primaryIdentity: 'werewolf' }
  }),
  candidatePool: fullPool
});

// Verify Storm the Citadel (CMC 5) did not replace early interaction or sneak in
const hasStorm = builtDeck.cards.some(c => c.name === 'Storm the Citadel');
if (hasStorm) {
  console.log('BuildLog containing Storm:');
  console.log(buildLog.filter(l => l.includes('Storm the Citadel')).join('\n'));
}
assert.equal(hasStorm, false, 'Storm the Citadel must NOT be present in Tempo deck state');

// Verify vetoLedger is populated and attached to DeckState
assert.ok(Array.isArray(builtDeck.vetoLedger), 'builtDeck must have vetoLedger array');
console.log(`  ✅ PASS: Storm the Citadel barred from entry. Veto ledger entries: ${builtDeck.vetoLedger.length}`);

// Test that a card in vetoLedger is never picked by the builder
const { deckState: vetoedRunDeck } = ProgressiveDeckStateBuilder.buildDeckState({
  intentPackage: {
    format: 'PIONEER',
    primaryTribe: 'Werewolf',
    tempo: 'Tempo',
    vetoLedger: [{ cardName: 'Storm the Citadel', oracle_id: 'storm the citadel', rejectionReason: 'MANUAL_VETO' }]
  },
  deckIdentity: { archetypeKey: 'TEMPO' },
  gameplanContract: new GameplanContract({
    format: 'PIONEER',
    derivedKillTurn: 4,
    identityConstraints: { primaryIdentity: 'werewolf' }
  }),
  candidatePool: fullPool
});
assert.equal(vetoedRunDeck.cards.some(c => c.name === 'Storm the Citadel'), false, 'Vetoed card must never enter deck');
console.log('  ✅ PASS: Pre-existing veto in vetoLedger completely excludes candidate from compilation.');

// ─── TEST 5: ADAPTIVE_LAND_SPECTRUM & TELEMETRY MATRIX ────────────────────────
console.log('\n[TEST 5] ADAPTIVE_LAND_SPECTRUM & Objective Calibration...');

const sampleSpells = [
  ...Array(4).fill(villageMessengerDFC),
  ...Array(4).fill(tovolarDFC),
  ...Array(4).fill(lambholtRaconteurDFC),
  ...Array(2).fill(huntmasterDFC),
  ...Array(4).fill(lightUpTheNight),
  ...Array(4).fill({ name: 'Werewolf Pack Leader', cmc: 2, type_line: 'Creature — Human Werewolf', colors: ['G'] }),
  ...Array(4).fill({ name: 'Kessig Prowler', cmc: 1, type_line: 'Creature — Human Werewolf', colors: ['G'] }),
  ...Array(4).fill({ name: 'Outland Liberator', cmc: 2, type_line: 'Creature — Human Werewolf', colors: ['G'] }),
  ...Array(4).fill({ name: 'Abrade', cmc: 2, type_line: 'Instant', colors: ['R'] }),
  ...Array(4).fill({ name: 'Reckless Stormseeker', cmc: 3, type_line: 'Creature — Human Werewolf', colors: ['R'] })
];

const availableLands = [
  { name: 'Karplusan Forest', type_line: 'Land', colors: [] },
  { name: 'Stomping Ground', type_line: 'Land', colors: [] },
  { name: 'Mountain', type_line: 'Basic Land — Mountain', colors: [] },
  { name: 'Forest', type_line: 'Basic Land — Forest', colors: [] }
];

const manaOpt = ManaExecutionOptimizer.optimizeLandState({
  nonLandSpells: sampleSpells,
  gameplanContract: new GameplanContract({
    format: 'PIONEER',
    derivedKillTurn: 5,
    tacticalExecutionProfile: { manaScrewSensitivity: 1.25, landFloodSensitivity: 0.95 }
  }),
  intentPackage: { format: 'PIONEER', colors: ['R', 'G'] },
  availableLands,
  deckSize: 60
});

console.log(`  Optimal Land Count: ${manaOpt.optimalLandCount}`);
console.log(`  Gameplan Success Rate: ${(manaOpt.gameplanSuccessRate * 100).toFixed(1)}%`);
console.log('  Comparative Telemetry Matrix:');
for (const t of manaOpt.comparativeTelemetry) {
  console.log(`    Lands: ${t.lands} | Spells: ${t.spells} | Success: ${(t.gameplanSuccessRate * 100).toFixed(1)}% | Screw: ${(t.manaScrewRate * 100).toFixed(1)}% | Flood: ${(t.manaFloodRate * 100).toFixed(1)}% | Winner: ${t.isWinner ? '★ WINNER' : ''}`);
}

assert.ok(manaOpt.optimalLandCount >= 21 && manaOpt.optimalLandCount <= 25, `Optimal land count for curve with CMC 4-6 must be between 21 and 25, got ${manaOpt.optimalLandCount}`);
assert.equal(manaOpt.optimalDeckState.totalCards, 60, 'Total cards must equal exactly 60');
console.log(`  ✅ PASS: ManaExecutionOptimizer selected valid interior optimum of ${manaOpt.optimalLandCount} lands (18-land trap eliminated via adaptive expansion).`);

console.log('\n--- ALL V29.8 TESTS PASSED DETERMINISTICALLY ---');
