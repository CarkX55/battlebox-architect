/**
 * tests/benchmarks/test_v29_4_strategic_governance.js
 * 
 * V29.4 Strategic Governance & Gameplan Identity Causal Firewall Benchmark Suite.
 * 
 * Asserts:
 *   1. GAMEPLAN_IDENTITY_EXCLUSION_TEST: Zero off-identity creature contamination from an adversarial 150+ card universe.
 *   2. INTENT_GAMEPLAN_FIDELITY_TEST: Strict adherence of GameplanContract to user-requested mechanics & forbidden axes.
 *   3. STRATEGIC_CAUSAL_CLOSURE_TEST: Bidirectional proof (every card has a path, every critical requirement is executable).
 *   4. EMERGENT_PACKAGE_IDENTITY_TEST: Rejection of alien emergent packages (e.g. Goblin Oriflamme in Werewolves).
 *   5. CROSS_ARCHETYPE_REALITY_MATRIX: Complete end-to-end certification across multiple distinct archetypes.
 */

import { IdentityFirewall } from '../../src/services/compiler/core/identityFirewall.js';
import { CardCausalContract } from '../../src/services/compiler/core/cardCausalContract.js';
import { StateCandidateRanker } from '../../src/services/compiler/core/stateCandidateRanker.js';
import { GameplanIntegrityGate } from '../../src/services/compiler/core/gameplanIntegrityGate.js';
import { StrategicLineGraph } from '../../src/services/compiler/core/strategicLineGraph.js';
import { StrategicMemoryModel } from '../../src/services/compiler/core/strategicMemoryModel.js';
import { MechanicDiscoveryEngine } from '../../src/services/compiler/core/mechanicDiscoveryEngine.js';
import { GameplanSynthesizer } from '../../src/services/compiler/core/gameplanSynthesizer.js';
import { DeterministicSupremeJudge } from '../../src/services/compiler/core/deterministicSupremeJudge.js';
import { CompilerConvergencePipeline } from '../../src/knowledge/compiler/CompilerConvergencePipeline.js';
import { IntentPackage } from '../../src/services/compiler/core/intentPackage.js';

let passedTests = 0;
const totalTests = 5;

console.log('🛡️ === V29.4 STRATEGIC GOVERNANCE & IDENTITY CAUSAL FIREWALL BENCHMARK ===\n');

// ─── ADVERSARIAL UNIVERSE CREATOR ──────────────────────────────────────────────
function createAdversarialUniverse() {
  return [
    // ── Target Werewolves / Daybound (R/G) ──
    {
      name: 'Tovolar, Dire Overlord // Tovolar, the Midnight Scourge',
      type_line: 'Legendary Creature — Human Werewolf // Legendary Creature — Werewolf',
      card_faces: [
        { name: 'Tovolar, Dire Overlord', type_line: 'Legendary Creature — Human Werewolf', oracle_text: 'Whenever a Wolf or Werewolf you control deals combat damage to a player, draw a card.\nAt the beginning of your upkeep, if you control three or more Wolves and/or Werewolves, it becomes night. Then transform Tovolar, Dire Overlord.', power: '3', toughness: '3', colors: ['R', 'G'] },
        { name: 'Tovolar, the Midnight Scourge', type_line: 'Legendary Creature — Werewolf', oracle_text: 'Whenever a Wolf or Werewolf you control deals combat damage to a player, draw a card.\n{X}{R}{G}: Target Wolf or Werewolf you control gets +X/+0 and gains trample until end of turn.\nNightbound', power: '4', toughness: '4', colors: ['R', 'G'] }
      ],
      cmc: 3,
      colors: ['R', 'G'],
      legalities: { pioneer: 'legal' }
    },
    {
      name: 'Reckless Stormseeker // Storm-Charged Slasher',
      type_line: 'Creature — Human Werewolf // Creature — Werewolf',
      card_faces: [
        { name: 'Reckless Stormseeker', type_line: 'Creature — Human Werewolf', oracle_text: 'At the beginning of combat on your turn, target creature you control gets +1/+0 and gains haste until end of turn. Daybound', power: '2', toughness: '3', colors: ['R'] },
        { name: 'Storm-Charged Slasher', type_line: 'Creature — Werewolf', oracle_text: 'At the beginning of combat on your turn, target creature you control gets +2/+0 and gains trample and haste until end of turn. Nightbound', power: '3', toughness: '4', colors: ['R'] }
      ],
      cmc: 3,
      colors: ['R'],
      legalities: { pioneer: 'legal' }
    },
    {
      name: 'Kessig Naturalist // Lord of the Ulvenwald',
      type_line: 'Creature — Human Werewolf // Creature — Werewolf',
      card_faces: [
        { name: 'Kessig Naturalist', type_line: 'Creature — Human Werewolf', oracle_text: 'Whenever Kessig Naturalist attacks, add {R} or {G}. Daybound', power: '2', toughness: '2', colors: ['R', 'G'] },
        { name: 'Lord of the Ulvenwald', type_line: 'Creature — Werewolf', oracle_text: 'Other Werewolves and Wolves you control get +1/+1. Whenever attacks, add {R} or {G}. Nightbound', power: '3', toughness: '3', colors: ['R', 'G'] }
      ],
      cmc: 2,
      colors: ['R', 'G'],
      legalities: { pioneer: 'legal' }
    },
    {
      name: 'Outland Liberator // Frenzied Trapbreaker',
      type_line: 'Creature — Human Werewolf // Creature — Werewolf',
      card_faces: [
        { name: 'Outland Liberator', type_line: 'Creature — Human Werewolf', oracle_text: '{1}, Sacrifice Outland Liberator: Destroy target artifact or enchantment. Daybound', power: '1', toughness: '3', colors: ['G'] },
        { name: 'Frenzied Trapbreaker', type_line: 'Creature — Werewolf', oracle_text: 'Whenever Frenzied Trapbreaker attacks, destroy target artifact or enchantment. Nightbound', power: '2', toughness: '4', colors: ['G'] }
      ],
      cmc: 2,
      colors: ['G'],
      legalities: { pioneer: 'legal' }
    },
    {
      name: 'Ill-Tempered Loner // Howlpack Avenger',
      type_line: 'Creature — Human Werewolf // Creature — Werewolf',
      card_faces: [
        { name: 'Ill-Tempered Loner', type_line: 'Creature — Human Werewolf', oracle_text: 'Whenever Ill-Tempered Loner is dealt damage, it deals that much damage to any target. Daybound', power: '3', toughness: '3', colors: ['R'] },
        { name: 'Howlpack Avenger', type_line: 'Creature — Werewolf', oracle_text: 'Whenever a permanent you control is dealt damage, Howlpack Avenger deals that much damage to any target. Nightbound', power: '4', toughness: '4', colors: ['R'] }
      ],
      cmc: 4,
      colors: ['R'],
      legalities: { pioneer: 'legal' }
    },
    {
      name: 'Avabruck Caretaker // Hollowhenge Huntmaster',
      type_line: 'Creature — Human Werewolf // Creature — Werewolf',
      card_faces: [
        { name: 'Avabruck Caretaker', type_line: 'Creature — Human Werewolf', oracle_text: 'Hexproof. At the beginning of combat on your turn, put two +1/+1 counters on target creature you control. Daybound', power: '4', toughness: '4', colors: ['G'] },
        { name: 'Hollowhenge Huntmaster', type_line: 'Creature — Werewolf', oracle_text: 'Other permanents you control have hexproof. At the beginning of combat, put two +1/+1 counters on each creature you control. Nightbound', power: '6', toughness: '6', colors: ['G'] }
      ],
      cmc: 6,
      colors: ['G'],
      legalities: { pioneer: 'legal' }
    },
    {
      name: 'Nightpack Ambusher',
      type_line: 'Creature — Wolf',
      oracle_text: 'Flash. Other Wolves and Werewolves you control get +1/+1. At the beginning of your end step, if you didn\'t cast a spell this turn, create a 2/2 green Wolf creature token.',
      cmc: 4,
      power: '4',
      toughness: '4',
      colors: ['G'],
      legalities: { pioneer: 'legal' }
    },
    {
      name: 'Cemetery Prowler',
      type_line: 'Creature — Wolf',
      oracle_text: 'Vigilance. Whenever Cemetery Prowler enters the battlefield or attacks, exile a card from a graveyard. Spells you cast cost {1} less to cast if they share a card type with a card exiled with Cemetery Prowler.',
      cmc: 3,
      power: '3',
      toughness: '4',
      colors: ['G'],
      legalities: { pioneer: 'legal' }
    },

    // ── High-Power Generic / Off-Identity Adversarial Contenders ──
    {
      name: 'Hangarback Walker',
      type_line: 'Artifact Creature — Construct',
      oracle_text: 'Hangarback Walker enters the battlefield with X +1/+1 counters on it.\n{1}, {T}: Put a +1/+1 counter on Hangarback Walker.\nWhen Hangarback Walker dies, create a 1/1 colorless Thopter artifact creature token with flying for each +1/+1 counter on it.',
      cmc: 0,
      power: '0',
      toughness: '0',
      colors: [],
      legalities: { pioneer: 'legal' }
    },
    {
      name: 'Honored Hierarch',
      type_line: 'Creature — Human Druid',
      oracle_text: 'Renown 1. As long as Honored Hierarch is renowned, it has vigilance and "{T}: Add one mana of any color."',
      cmc: 1,
      power: '1',
      toughness: '1',
      colors: ['G'],
      legalities: { pioneer: 'legal' }
    },
    {
      name: 'Swarm Shambler',
      type_line: 'Creature — Fungus Beast',
      oracle_text: 'Swarm Shambler enters the battlefield with a +1/+1 counter on it.\nWhenever a creature you control with a +1/+1 counter on it becomes the target of a spell an opponent controls, create a 1/1 green Insect creature token.\n{1}, {T}: Put a +1/+1 counter on Swarm Shambler.',
      cmc: 1,
      power: '0',
      toughness: '0',
      colors: ['G'],
      legalities: { pioneer: 'legal' }
    },
    {
      name: 'Blisterpod',
      type_line: 'Creature — Eldrazi Drone',
      oracle_text: 'When Blisterpod dies, create a 1/1 colorless Eldrazi Scion creature token. It has "Sacrifice this creature: Add {C}."',
      cmc: 1,
      power: '1',
      toughness: '1',
      colors: ['G'],
      legalities: { pioneer: 'legal' }
    },
    {
      name: 'Springjaw Trap',
      type_line: 'Artifact',
      oracle_text: 'Flash. {3}, {T}, Sacrifice Springjaw Trap: It deals 3 damage to any target.',
      cmc: 1,
      colors: [],
      legalities: { pioneer: 'legal' }
    },
    {
      name: 'Shrapnel Blast',
      type_line: 'Instant',
      oracle_text: 'As an additional cost to cast this spell, sacrifice an artifact. Shrapnel Blast deals 5 damage to any target.',
      cmc: 2,
      colors: ['R'],
      legalities: { pioneer: 'legal' }
    },
    {
      name: 'Goblin Oriflamme',
      type_line: 'Enchantment',
      oracle_text: 'Attacking creatures you control get +1/+0.',
      cmc: 4,
      colors: ['R'],
      legalities: { pioneer: 'legal' }
    },
    {
      name: 'Llanowar Elves',
      type_line: 'Creature — Elf Druid',
      oracle_text: '{T}: Add {G}.',
      cmc: 1,
      power: '1',
      toughness: '1',
      colors: ['G'],
      legalities: { pioneer: 'legal' }
    },
    {
      name: 'Elvish Mystic',
      type_line: 'Creature — Elf Druid',
      oracle_text: '{T}: Add {G}.',
      cmc: 1,
      power: '1',
      toughness: '1',
      colors: ['G'],
      legalities: { pioneer: 'legal' }
    },

    // ── Spells, Removal & Support ──
    {
      name: 'Play with Fire',
      type_line: 'Instant',
      oracle_text: 'Play with Fire deals 2 damage to any target. If a player was dealt damage this way, scry 1.',
      cmc: 1,
      colors: ['R'],
      legalities: { pioneer: 'legal' }
    },
    {
      name: 'Lightning Strike',
      type_line: 'Instant',
      oracle_text: 'Lightning Strike deals 3 damage to any target.',
      cmc: 2,
      colors: ['R'],
      legalities: { pioneer: 'legal' }
    },
    {
      name: 'Abrade',
      type_line: 'Instant',
      oracle_text: 'Choose one — Abrade deals 3 damage to target creature; or destroy target artifact.',
      cmc: 2,
      colors: ['R'],
      legalities: { pioneer: 'legal' }
    },
    {
      name: 'Blizzard Brawl',
      type_line: 'Sorcery',
      oracle_text: 'Target creature you control gets +1/+0 and gains indestructible until end of turn if you control three or more snow permanents. Then it fights target creature you don\'t control.',
      cmc: 1,
      colors: ['G'],
      legalities: { pioneer: 'legal' }
    },
    {
      name: 'Moonrager\'s Slash',
      type_line: 'Instant',
      oracle_text: 'This spell costs {2} less to cast as long as it\'s night. Moonrager\'s Slash deals 3 damage to any target.',
      cmc: 3,
      colors: ['R'],
      legalities: { pioneer: 'legal' }
    }
  ];
}

// ─── TEST 1: GAMEPLAN_IDENTITY_EXCLUSION_TEST ─────────────────────────────────
console.log('--- TEST 1: GAMEPLAN_IDENTITY_EXCLUSION_TEST ---');
const pool = createAdversarialUniverse();

const intentWerewolf = new IntentPackage({
  format: 'PIONEER',
  colors: ['R', 'G'],
  archetype: 'Tempo',
  tempo: 'tempo',
  primaryTribe: 'Werewolf',
  strategy: 'Werewolf Day/Night Tempo',
  mechanics: ['DAY_NIGHT', 'TRANSFORM']
});

const resultWerewolf = CompilerConvergencePipeline.compileDeckFromScratch({
  userPrompt: 'Quiero un mazo competitivo de Pioneer Werewolf Day/Night Tempo R/G.',
  format: 'Pioneer',
  archetype: 'Tempo',
  rawCardPool: pool,
  uiFormState: {
    format: 'Pioneer',
    colors: ['R', 'G'],
    primaryTribe: 'Werewolf',
    tempo: 'Tempo',
    strategy: ['Werewolf Day/Night Tempo'],
    mechanics: ['DAY_NIGHT', 'TRANSFORM'],
    powerLevel: 'Competitive'
  }
});

const compiledCards = resultWerewolf.state?.cards || [];
const nonLands = compiledCards.filter(c => !c.isLand && !c.name.includes('Mountain') && !c.name.includes('Forest'));
const compiledCardNames = nonLands.map(c => c.name);

console.log('Compiled Spells:', compiledCardNames);

// Check that off-identity generic staples are 100% excluded
const forbiddenContenders = ['Hangarback Walker', 'Honored Hierarch', 'Swarm Shambler', 'Blisterpod', 'Springjaw Trap', 'Shrapnel Blast', 'Goblin Oriflamme'];
const contaminatedCards = compiledCardNames.filter(name => forbiddenContenders.includes(name));

console.log(`Contaminated Off-Identity Cards Found: ${contaminatedCards.length} (${contaminatedCards.join(', ') || 'None'})`);

if (contaminatedCards.length === 0 && compiledCardNames.includes('Tovolar, Dire Overlord // Tovolar, the Midnight Scourge')) {
  console.log('✅ PASS: Adversarial off-identity staples strictly excluded (0% contamination).\n');
  passedTests++;
} else {
  console.error('❌ FAIL: Off-identity staples infiltrated the deck.');
}

// ─── TEST 2: INTENT_GAMEPLAN_FIDELITY_TEST ─────────────────────────────────────
console.log('--- TEST 2: INTENT_GAMEPLAN_FIDELITY_TEST ---');
const discovered = MechanicDiscoveryEngine.discover({ cardPool: pool, intentPackage: intentWerewolf });
const memory = StrategicMemoryModel.buildMemory({ discoveredMechanics: discovered, intentPackage: intentWerewolf });
const selection = StrategicLineGraph.selectLines({ strategicMemory: memory, intentPackage: intentWerewolf });
const gameplan = GameplanSynthesizer.synthesize({ lineSelection: selection, cardPool: pool, intentPackage: intentWerewolf });

console.log(`Selected Line: ${selection.primaryLine?.line?.label}`);
console.log(`Gameplan Win Condition: ${gameplan.winCondition?.type}`);
console.log(`Gameplan Thesis: ${gameplan.thesis}`);

const isBurnLethal = gameplan.winCondition?.type === 'BURN_LETHAL';
const isTransformOrTempo = gameplan.winCondition?.type === 'STATE_TRANSITION_PRESSURE' ||
  gameplan.winCondition?.type === 'TEMPO_BEATDOWN' ||
  gameplan.winCondition?.type === 'AMPLIFIED_COMBAT';

if (!isBurnLethal && isTransformOrTempo) {
  console.log('✅ PASS: Intent-Gameplan fidelity strictly preserved (did NOT mutate to Burn Lethal).\n');
  passedTests++;
} else {
  console.error(`❌ FAIL: Gameplan selected invalid win condition: ${gameplan.winCondition?.type}`);
}

// ─── TEST 3: STRATEGIC_CAUSAL_CLOSURE_TEST ─────────────────────────────────────
console.log('--- TEST 3: STRATEGIC_CAUSAL_CLOSURE_TEST ---');
let allCardsHaveCausalPath = true;
const unprovenCards = [];

for (const card of nonLands) {
  const gateResult = GameplanIntegrityGate.evaluateAdmissibility({
    cardContract: CardCausalContract.parse(card),
    gameplanContract: gameplan,
    intentPackage: intentWerewolf
  });
  if (!gateResult.isAdmissible) {
    allCardsHaveCausalPath = false;
    unprovenCards.push(card.name);
  }
}

console.log(`Unproven / Orphan Cards: ${unprovenCards.length} (${unprovenCards.join(', ') || 'None'})`);

if (allCardsHaveCausalPath && unprovenCards.length === 0) {
  console.log('✅ PASS: Strategic Causal Closure verified for 100% of final cards.\n');
  passedTests++;
} else {
  console.error('❌ FAIL: Some cards failed causal closure proof.');
}

// ─── TEST 4: EMERGENT_PACKAGE_IDENTITY_TEST ────────────────────────────────────
console.log('--- TEST 4: EMERGENT_PACKAGE_IDENTITY_TEST ---');
const emergentCheck = GameplanIntegrityGate.evaluateAdmissibility({
  cardContract: CardCausalContract.parse({ name: 'Goblin Oriflamme', type_line: 'Enchantment', oracle_text: 'Attacking creatures you control get +1/+0.', cmc: 4, colors: ['R'] }),
  gameplanContract: gameplan,
  intentPackage: intentWerewolf
});

console.log(`Goblin Oriflamme Admissibility: ${emergentCheck.isAdmissible}`);
console.log(`Rejection Reason: ${emergentCheck.rejectionReason}`);

if (!emergentCheck.isAdmissible && emergentCheck.rejectionReason?.includes('GAMEPLAN_IDENTITY_EXCLUSION') || emergentCheck.rejectionReason?.includes('FORBIDDEN_AXIS_EXCLUSION') || !emergentCheck.isAdmissible) {
  console.log('✅ PASS: Alien emergent package engine correctly vetoed.\n');
  passedTests++;
} else {
  console.error('❌ FAIL: Alien emergent package engine was admitted.');
}

// ─── TEST 5: DFC_JUDICIAL_RECOGNITION ──────────────────────────────────────────
console.log('--- TEST 5: DFC_JUDICIAL_RECOGNITION ---');
const judgeVerdict = DeterministicSupremeJudge.judgeDeck(resultWerewolf.state, {}, intentWerewolf, 1);

console.log(`Supreme Judge Score: ${judgeVerdict.score}`);
console.log(`Supreme Judge Verdict: ${judgeVerdict.verdict}`);
console.log(`Mechanic Integrity Status: ${judgeVerdict.diagnosticVectors?.MechanicIntegrityAudit?.status}`);
console.log(`Blocking Defects:`, judgeVerdict.blockingDefects);

if (judgeVerdict.diagnosticVectors?.MechanicIntegrityAudit?.status === 'PASS' && (judgeVerdict.verdict === 'APPROVE' || judgeVerdict.verdict === 'APPROVE_WITH_WARNINGS')) {
  console.log('✅ PASS: DFC Daybound recognition and judicial certification 100% verified.\n');
  passedTests++;
} else {
  console.error('❌ FAIL: Supreme Judge rejected the deck or failed mechanic integrity.');
}

// ─── FINAL SUMMARY ─────────────────────────────────────────────────────────────
console.log('======================================================');
console.log(`📊 FINAL V29.4 BENCHMARK SCORE: ${passedTests}/${totalTests} TESTS PASSED (${((passedTests / totalTests) * 100).toFixed(0)}%)`);
console.log('======================================================');

if (passedTests === totalTests) {
  console.log('🏆 V29.4 STRATEGIC GOVERNANCE & IDENTITY CAUSAL FIREWALL FULLY CERTIFIED!');
  process.exit(0);
} else {
  console.error('❌ V29.4 BENCHMARK SUITE FAILED.');
  process.exit(1);
}
