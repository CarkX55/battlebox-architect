/**
 * Test Suite: v26.1 Causal Selection Core & Explainable Proof Obligations
 * 
 * Verifies that candidate selection is driven by strict Lexicographic Pareto Dominance
 * and Causal Proof Obligations, without procedural scores or hardcoded card exceptions.
 */

import { CardCausalContract } from '../../../src/services/compiler/core/cardCausalContract.js';
import { StateCandidateRanker } from '../../../src/services/compiler/core/stateCandidateRanker.js';
import { DeterministicSupremeJudge } from '../../../src/services/compiler/core/deterministicSupremeJudge.js';

let passedTests = 0;
let totalTests = 0;

function assert(condition, message) {
  totalTests++;
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    throw new Error(message);
  } else {
    console.log(`✅ PASS: ${message}`);
    passedTests++;
  }
}

// Test Cards Fixtures
const playWithFire = {
  name: 'Play with Fire',
  mana_cost: '{R}',
  cmc: 1,
  type_line: 'Instant',
  oracle_text: 'Play with Fire deals 2 damage to any target. If a player was dealt damage this way, scry 1.',
  colors: ['R']
};

const fatalPush = {
  name: 'Fatal Push',
  mana_cost: '{B}',
  cmc: 1,
  type_line: 'Instant',
  oracle_text: 'Destroy target creature if it has mana value 2 or less. Revolt — Destroy that creature if it has mana value 4 or less if a permanent you controlled left the battlefield this turn.',
  colors: ['B']
};

const dynamiteDiver = {
  name: 'Dynamite Diver',
  mana_cost: '{R}',
  cmc: 1,
  power: '1',
  toughness: '1',
  type_line: 'Creature — Goblin Pilot',
  oracle_text: 'Whenever this creature crews or saddles, it gets +2/+0 until end of turn. When this creature dies, it deals 1 damage to any target.',
  colors: ['R']
};

const rundveltHordemaster = {
  name: 'Rundvelt Hordemaster',
  mana_cost: '{1}{R}',
  cmc: 2,
  power: '1',
  toughness: '1',
  type_line: 'Creature — Goblin Warrior',
  oracle_text: 'Other Goblins you control get +1/+1. Whenever a Goblin you control dies, exile the top card of your library. You may play that card this turn.',
  colors: ['R']
};

const battleCryGoblin = {
  name: 'Battle Cry Goblin',
  mana_cost: '{1}{R}',
  cmc: 2,
  power: '2',
  toughness: '2',
  type_line: 'Creature — Goblin',
  oracle_text: '{1}{R}: Goblins you control get +1/+0 and gain haste until end of turn. Packmate — Whenever this creature attacks, if you control creatures with total power 6 or greater, create a 1/1 red Goblin creature token that enters tapped and attacking.',
  colors: ['R']
};

const vanillaAttacker = {
  name: 'Raging Goblin',
  mana_cost: '{R}',
  cmc: 1,
  power: '1',
  toughness: '1',
  type_line: 'Creature — Goblin Berserker',
  oracle_text: 'Haste',
  colors: ['R']
};

const magicPot = {
  name: 'Magic Pot',
  mana_cost: '{3}',
  cmc: 3,
  power: '1',
  toughness: '4',
  type_line: 'Artifact Creature — Goblin Construct',
  oracle_text: 'When this creature dies, create a Treasure token. {2}, {T}: Exile target card from a graveyard.',
  colors: []
};

const baseDeckState = {
  cards: [
    { name: 'Mountain', count: 12, role: 'Land', type_line: 'Basic Land — Mountain' },
    { name: 'Swamp', count: 10, role: 'Land', type_line: 'Basic Land — Swamp' },
    { name: 'Fanatical Firebrand', count: 4, type_line: 'Creature — Goblin Pirate', cmc: 1, power: 1 },
    { name: 'Cacophony Scamp', count: 4, type_line: 'Creature — Phyrexian Goblin Warrior', cmc: 1, power: 1 }
  ],
  curve: { 1: 8 },
  openDemands: []
};

const intentPackage = {
  format: 'PIONEER',
  tempo: 'Aggro',
  primaryTribe: 'Goblin',
  colors: ['B', 'R'],
  powerLevel: 'Competitive'
};

const strategicContract = {
  archetype: 'Aggro',
  winPath: ['TURN1_PRESSURE', 'CHEAP_REMOVAL', 'AMPLIFY_BOARD_PRESSURE', 'CARD_FLOW'],
  proofObligations: ['INTERACTION_TIMING_WINDOW', 'AMPLIFY_BOARD_PRESSURE']
};

console.log('=== Running Test Suite: v26.1 Causal Selection Core & Proof Obligations ===\n');

try {
  // ─── Test 1: Interaction Role Validity & Quality ───────────────────────────
  console.log('[Test 1] Lexicographic Interaction Proof Obligation:');
  const removalSlot = { role: 'CHEAP_REMOVAL', requiredDensity: 4 };

  const deltaPlayWithFire = StateCandidateRanker.computeStateDelta(baseDeckState, playWithFire, strategicContract, intentPackage, removalSlot);
  const deltaDynamiteDiver = StateCandidateRanker.computeStateDelta(baseDeckState, dynamiteDiver, strategicContract, intentPackage, removalSlot);

  const vecPlayWithFire = StateCandidateRanker.computeDominanceVector(deltaPlayWithFire);
  const vecDynamiteDiver = StateCandidateRanker.computeDominanceVector(deltaDynamiteDiver);

  assert(vecPlayWithFire.roleValidity === true, 'Play with Fire has roleValidity: true in CHEAP_REMOVAL');
  assert(vecPlayWithFire.evidence.timing === 'INSTANT_SPEED', 'Play with Fire proves INSTANT_SPEED timing');
  assert(vecPlayWithFire.evidence.mechanism === 'DAMAGE_REMOVAL', 'Play with Fire proves DAMAGE_REMOVAL mechanism');
  assert(vecPlayWithFire.roleQuality >= 0.70, 'Play with Fire roleQuality is >= 0.70');

  assert(vecDynamiteDiver.roleValidity === false, 'Dynamite Diver has roleValidity: false in CHEAP_REMOVAL');
  assert(vecDynamiteDiver.rejectionReason.includes('FAILS_ROLE_PROOF'), 'Dynamite Diver is rejected with FAILS_ROLE_PROOF');

  const comparison = StateCandidateRanker.compareDominanceVectors(vecPlayWithFire, vecDynamiteDiver);
  assert(comparison > 0, 'Play with Fire strictly dominates Dynamite Diver in lexicographic Pareto comparison');

  // ─── Test 2: Emergent Board Pressure Amplification Proof ───────────────────
  console.log('\n[Test 2] Emergent Board Pressure Amplification Proof:');
  const amplifySlot = { role: 'AMPLIFY_BOARD_PRESSURE', requiredDensity: 4 };

  const deltaHordemaster = StateCandidateRanker.computeStateDelta(baseDeckState, rundveltHordemaster, strategicContract, intentPackage, amplifySlot);
  const deltaBattleCry = StateCandidateRanker.computeStateDelta(baseDeckState, battleCryGoblin, strategicContract, intentPackage, amplifySlot);
  const deltaVanilla = StateCandidateRanker.computeStateDelta(baseDeckState, vanillaAttacker, strategicContract, intentPackage, amplifySlot);

  const vecHordemaster = StateCandidateRanker.computeDominanceVector(deltaHordemaster);
  const vecBattleCry = StateCandidateRanker.computeDominanceVector(deltaBattleCry);
  const vecVanilla = StateCandidateRanker.computeDominanceVector(deltaVanilla);

  assert(vecHordemaster.roleValidity === true, 'Rundvelt Hordemaster has roleValidity: true for AMPLIFY_BOARD_PRESSURE');
  assert(vecHordemaster.tribalContribution.isAmplifier === true, 'Rundvelt Hordemaster has isAmplifier: true');
  assert(vecHordemaster.tribalContribution.isEngine === true, 'Rundvelt Hordemaster has isEngine: true');

  assert(vecBattleCry.roleValidity === true, 'Battle Cry Goblin has roleValidity: true for AMPLIFY_BOARD_PRESSURE');
  assert(vecBattleCry.tribalContribution.isAmplifier === true, 'Battle Cry Goblin has isAmplifier: true');

  assert(vecVanilla.roleValidity === false, 'Vanilla attacker has roleValidity: false for AMPLIFY_BOARD_PRESSURE');
  assert(vecVanilla.rejectionReason.includes('FAILS_ROLE_PROOF'), 'Vanilla attacker fails with FAILS_ROLE_PROOF');

  assert(StateCandidateRanker.compareDominanceVectors(vecHordemaster, vecVanilla) > 0, 'Hordemaster dominates vanilla in AMPLIFY_BOARD_PRESSURE');
  assert(StateCandidateRanker.compareDominanceVectors(vecBattleCry, vecVanilla) > 0, 'Battle Cry Goblin dominates vanilla in AMPLIFY_BOARD_PRESSURE');

  // ─── Test 3: Compositional Resource Access Proof ───────────────────────────
  console.log('\n[Test 3] Compositional Resource Access Proof in CARD_FLOW:');
  const flowSlot = { role: 'CARD_FLOW', requiredDensity: 4 };

  const deltaFlowHordemaster = StateCandidateRanker.computeStateDelta(baseDeckState, rundveltHordemaster, strategicContract, intentPackage, flowSlot);
  const deltaMagicPot = StateCandidateRanker.computeStateDelta(baseDeckState, magicPot, strategicContract, intentPackage, flowSlot);

  const vecFlowHordemaster = StateCandidateRanker.computeDominanceVector(deltaFlowHordemaster);
  const vecMagicPot = StateCandidateRanker.computeDominanceVector(deltaMagicPot);

  assert(vecFlowHordemaster.roleValidity === true, 'Rundvelt Hordemaster has roleValidity: true for CARD_FLOW');
  assert(vecFlowHordemaster.evidence.isCompositional === true, 'Rundvelt Hordemaster proves compositional resource flow');
  assert(vecMagicPot.roleValidity === false, 'Magic Pot has roleValidity: false for CARD_FLOW');
  assert(StateCandidateRanker.compareDominanceVectors(vecFlowHordemaster, vecMagicPot) > 0, 'Hordemaster dominates Magic Pot in CARD_FLOW');

  // ─── Test 4: Systemic Tempo Clock Delta ────────────────────────────────────
  console.log('\n[Test 4] Systemic Tempo Clock Delta in Aggro:');
  const presenceSlot = { role: 'TURN1_PRESSURE', requiredDensity: 4 };

  const deltaVanillaPres = StateCandidateRanker.computeStateDelta(baseDeckState, vanillaAttacker, strategicContract, intentPackage, presenceSlot);
  const deltaMagicPotPres = StateCandidateRanker.computeStateDelta(baseDeckState, magicPot, strategicContract, intentPackage, presenceSlot);

  assert(deltaVanillaPres.tempoClockDelta > 0, 'Fast 1-drop has positive tempoClockDelta in Aggro');
  assert(deltaMagicPotPres.tempoClockDelta < 0, 'High-cost low-power card suffers negative tempoClockDelta (tempo drag) in Aggro');

  // ─── Test 5: Anti-Regression of Authority ──────────────────────────────────
  console.log('\n[Test 5] Anti-Regression of Authority (No procedural bias):');
  const candidates = [dynamiteDiver, playWithFire, fatalPush];
  const rankResult = StateCandidateRanker.rankCandidatesByStateDelta(baseDeckState, candidates, strategicContract, intentPackage, removalSlot);

  assert(rankResult.winningCandidate !== null, 'Ranker produces a valid winner');
  assert(['Play with Fire', 'Fatal Push'].includes(rankResult.winningCandidate.name), 'Winner is Play with Fire or Fatal Push (valid removal)');
  const diverEval = rankResult.evaluatedStates.find(e => e.candidate.name === 'Dynamite Diver');
  assert(diverEval.dominanceVector.roleValidity === false, 'Dynamite Diver is rejected as role invalid');
  assert(diverEval.classification === 'STRATEGICALLY_DOMINATED', 'Dynamite Diver is classified as STRATEGICALLY_DOMINATED');

  // ─── Test 6: Deterministic Supreme Judge & STOP_CAUSAL Gate ────────────────
  console.log('\n[Test 6] Deterministic Supreme Judge & STOP_CAUSAL Gate:');
  const validDeckState = {
    cards: [
      { name: 'Mountain', count: 12, role: 'Land', type_line: 'Basic Land — Mountain' },
      { name: 'Swamp', count: 10, role: 'Land', type_line: 'Basic Land — Swamp' },
      { name: 'Play with Fire', count: 4, role: 'CHEAP_REMOVAL', type_line: 'Instant', oracle_text: 'deals 2 damage to any target' },
      { name: 'Fatal Push', count: 4, role: 'CHEAP_REMOVAL', type_line: 'Instant', oracle_text: 'destroy target creature' },
      { name: 'Rundvelt Hordemaster', count: 4, role: 'AMPLIFY_BOARD_PRESSURE', type_line: 'Creature — Goblin Warrior', oracle_text: 'Other Goblins get +1/+1' },
      { name: 'Battle Cry Goblin', count: 4, role: 'AMPLIFY_BOARD_PRESSURE', type_line: 'Creature — Goblin', oracle_text: 'Goblins get +1/+0 and gain haste' },
      { name: 'Fanatical Firebrand', count: 4, role: 'TURN1_PRESSURE', type_line: 'Creature — Goblin Pirate', oracle_text: 'Haste' },
      { name: 'Cacophony Scamp', count: 4, role: 'TURN1_PRESSURE', type_line: 'Creature — Phyrexian Goblin Warrior', oracle_text: 'Proliferate' },
      { name: 'Fireblade Charger', count: 4, role: 'TURN1_PRESSURE', type_line: 'Creature — Goblin Warrior', oracle_text: 'deals damage' },
      { name: 'Mudbutton Cursetosser', count: 3, role: 'TURN1_PRESSURE', type_line: 'Creature — Goblin Warlock', oracle_text: 'destroy creature' },
      { name: 'Stadium Headliner', count: 3, role: 'TURN1_PRESSURE', type_line: 'Creature — Goblin Warrior', oracle_text: 'Mobilize' },
      { name: 'Goblin Javelineer', count: 4, role: 'TURN1_PRESSURE', type_line: 'Creature — Goblin Warrior', oracle_text: 'Haste' }
    ]
  };

  const review = DeterministicSupremeJudge.judgeDeck(validDeckState, { archetypeKey: 'RAKDOS_GOBLINS_AGGRO' }, intentPackage, 1);
  console.log('Test 6 Review:', { verdict: review.verdict, score: review.score, defects: review.defects });

  assert(review.verdict === 'APPROVE' || review.verdict === 'APPROVE_WITH_WARNINGS', 'Judge issues verdict: APPROVE for certified causal deck');
  assert(review.score >= 80, 'Judge overall score is >= 80/100');
  assert(review.defects.filter(d => d.severity === 'HIGH').length === 0, 'Zero HIGH severity defects detected');

  // ─── Test 7: DFC Support & Werewolf Tribal Obligations ────────────────────
  console.log('\n[Test 7] DFC Support & Werewolf Tribal Obligations:');
  const werewolfIntent = {
    primaryTribe: 'Werewolf',
    archetype: 'Midrange',
    colors: ['R', 'G'],
    format: 'PIONEER'
  };

  const tovolar = {
    name: 'Tovolar, Dire Overlord // Tovolar, the Midnight Scourge',
    mana_cost: '{1}{R}{G}',
    cmc: 3,
    card_faces: [
      {
        name: 'Tovolar, Dire Overlord',
        type_line: 'Legendary Creature — Human Werewolf',
        oracle_text: 'At the beginning of your upkeep, if you control three or more Wolves and/or Werewolves, it becomes night. Then transform any number of Human Werewolves you control.\nWhenever a Wolf or Werewolf you control deals combat damage to a player, draw a card.',
        power: '3',
        toughness: '3'
      },
      {
        name: 'Tovolar, the Midnight Scourge',
        type_line: 'Legendary Creature — Werewolf',
        oracle_text: 'Whenever a Wolf or Werewolf you control deals combat damage to a player, draw a card.\n{X}{R}{G}: Target Wolf or Werewolf you control gets +X/+0 and gains trample until end of turn.\nAt the beginning of your upkeep, if a player cast two or more spells last turn, it becomes day. Then transform any number of Werewolves you control.',
        power: '4',
        toughness: '4'
      }
    ]
  };

  const kessigNaturalist = {
    name: 'Kessig Naturalist // Lord of the Ulvenwald',
    mana_cost: '{R}{G}',
    cmc: 2,
    card_faces: [
      {
        name: 'Kessig Naturalist',
        type_line: 'Creature — Human Werewolf',
        oracle_text: 'Whenever Kessig Naturalist attacks, add {R} or {G}. Until end of turn, you don\'t lose this mana as steps and phases end.\nDaybound',
        power: '2',
        toughness: '2'
      },
      {
        name: 'Lord of the Ulvenwald',
        type_line: 'Creature — Werewolf',
        oracle_text: 'Other Wolves and Werewolves you control get +1/+1.\nWhenever Lord of the Ulvenwald attacks, add {R} or {G}. Until end of turn, you don\'t lose this mana as steps and phases end.\nNightbound',
        power: '3',
        toughness: '3'
      }
    ]
  };

  const theFirstEruption = {
    name: 'The First Eruption',
    type_line: 'Enchantment — Saga',
    oracle_text: 'I — The First Eruption deals 1 damage to each creature without flying.\nII — Add {R}{R}.\nIII — Sacrifice a Mountain. If you do, The First Eruption deals 3 damage to any target.',
    cmc: 3
  };

  const smugglerCopter = {
    name: 'Smuggler\'s Copter',
    type_line: 'Artifact — Vehicle',
    oracle_text: 'Flying\nWhenever Smuggler\'s Copter attacks or blocks, you may draw a card. If you do, discard a card.\nCrew 1',
    cmc: 2,
    power: '3',
    toughness: '3'
  };

  // 7a. DFC parsing and identity
  const tovolarContract = CardCausalContract.parse(tovolar);
  assert(tovolarContract.cardIdentity.isCreature === true, 'Tovolar DFC correctly parsed as creature');
  assert(tovolarContract.cardIdentity.typeLine.includes('Werewolf'), 'Tovolar DFC typeLine contains Werewolf');

  // 7b. TRIBAL_DENSITY slot proof obligation
  const tribalSlot = { role: 'TRIBAL_DENSITY', requiredDensity: 4 };
  const tovolarTribalEval = StateCandidateRanker.evaluateRoleProofObligation(tovolar, tribalSlot, werewolfIntent);
  const sagaTribalEval = StateCandidateRanker.evaluateRoleProofObligation(theFirstEruption, tribalSlot, werewolfIntent);

  assert(tovolarTribalEval.roleValidity === true, 'Tovolar has roleValidity: true in TRIBAL_DENSITY');
  assert(sagaTribalEval.roleValidity === false, 'The First Eruption has roleValidity: false in TRIBAL_DENSITY');
  assert(sagaTribalEval.rejectionReason.includes('Non-creature spell'), 'Saga correctly rejected with Non-creature proof failure');

  // 7c. On-tribe creature vs vehicle in presence slot
  const presSlot = { role: 'TURN2_PRESSURE', requiredDensity: 4 };
  const kessigPresEval = StateCandidateRanker.evaluateRoleProofObligation(kessigNaturalist, presSlot, werewolfIntent);
  const copterPresEval = StateCandidateRanker.evaluateRoleProofObligation(smugglerCopter, presSlot, werewolfIntent);

  assert(kessigPresEval.roleValidity === true, 'Kessig Naturalist has roleValidity: true in TURN2_PRESSURE');
  assert(kessigPresEval.roleQuality > copterPresEval.roleQuality, 'On-tribe creature has higher roleQuality than vehicle in tribal pressure slot');

  // 7d. Judge Thesis Audit on Werewolf deck with DFCs
  const werewolfDeckState = {
    cards: [
      { name: 'Stomping Ground', count: 4, role: 'Land', type_line: 'Land — Mountain Forest' },
      { name: 'Karplusan Forest', count: 4, role: 'Land', type_line: 'Land' },
      { name: 'Forest', count: 8, role: 'Land', type_line: 'Basic Land — Forest' },
      { name: 'Mountain', count: 8, role: 'Land', type_line: 'Basic Land — Mountain' },
      { ...tovolar, count: 4, role: 'TRIBAL_DENSITY' },
      { ...kessigNaturalist, count: 4, role: 'TURN2_PRESSURE' },
      { name: 'Werewolf Pack Leader', count: 4, role: 'BOARD_PRESENCE', type_line: 'Creature — Human Werewolf', power: 3, toughness: 3 },
      { name: 'Outland Liberator // Frenzied Trapbreaker', count: 4, role: 'CHEAP_REMOVAL', type_line: 'Creature — Human Werewolf // Creature — Werewolf' },
      { name: 'Reckless Stormseeker // Storm-Charged Slasher', count: 4, role: 'AMPLIFY_BOARD_PRESSURE', type_line: 'Creature — Human Werewolf // Creature — Werewolf' },
      { name: 'Play with Fire', count: 4, role: 'CHEAP_REMOVAL', type_line: 'Instant', oracle_text: 'deals 2 damage to any target' },
      { name: 'Oblivion Ring', count: 4, role: 'REMOVAL', type_line: 'Enchantment', oracle_text: 'exile target nonland permanent' },
      { name: 'Tovolar\'s Huntmaster // Tovolar\'s Packleader', count: 4, role: 'FINISHER', type_line: 'Creature — Human Werewolf // Creature — Werewolf' },
      { name: 'Smuggler\'s Copter', count: 4, role: 'CARD_FLOW', type_line: 'Artifact — Vehicle' }
    ]
  };

  const werewolfReview = DeterministicSupremeJudge.judgeDeck(werewolfDeckState, { archetypeKey: 'WEREWOLF_DAYBOUND_MIDRANGE' }, werewolfIntent, 1);
  assert(werewolfReview.diagnosticVectors.ThesisAudit.status === 'PASS', 'Judge ThesisAudit passes for DFC Werewolf deck');
  assert(werewolfReview.diagnosticVectors.ThesisAudit.tribeMatches >= 16, 'Judge registers >= 16 on-tribe matches for DFC Werewolves');
  assert(werewolfReview.verdict === 'APPROVE' || werewolfReview.verdict === 'APPROVE_WITH_WARNINGS', 'Judge approves Werewolf deck with DFCs');

  console.log(`\n=======================================================`);
  console.log(`🎉 ALL ${passedTests}/${totalTests} TESTS PASSED SUCCESSFULLY!`);
  console.log(`=======================================================`);
} catch (err) {
  console.error(`\n💥 TEST SUITE EXECUTION FAILED:`, err);
  process.exit(1);
}
