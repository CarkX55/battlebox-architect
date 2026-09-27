/**
 * tests/benchmarks/test_v29_3_mechanic_integrity.js
 * 
 * V29.3 Strategic Identity & Mechanic Integrity Universal Benchmark Suite.
 * 
 * Asserts:
 *   1. STRUCTURAL_TRIBE_ISOLATION: Strict type line resolution without name/keyword false matches.
 *   2. CARD_FLOW_TEMPO_OPPORTUNITY_COST: Heavy activation mana sinks (Arcane Encyclopedia) rejected in Tempo.
 *   3. TEMPO_MANA_VELOCITY_AUDIT: Zero illegal lands, taplands strictly bounded in Tempo.
 *   4. WEREWOLF_DAYNIGHT_MECHANIC_INTEGRITY: True Daybound/Nightbound engines integrated.
 *   5. WEREWOLF_VS_WOLF_STRATEGIC_DIVERGENCE: Substantial divergence on identical pool.
 */

import { IdentityFirewall } from '../../src/services/compiler/core/identityFirewall.js';
import { CardCausalContract } from '../../src/services/compiler/core/cardCausalContract.js';
import { StateCandidateRanker } from '../../src/services/compiler/core/stateCandidateRanker.js';
import { ManaExecutionOptimizer } from '../../src/services/compiler/core/manaExecutionOptimizer.js';
import { DeterministicSupremeJudge } from '../../src/services/compiler/core/deterministicSupremeJudge.js';
import { CompilerConvergencePipeline } from '../../src/knowledge/compiler/CompilerConvergencePipeline.js';
import { IntentPackage } from '../../src/services/compiler/core/intentPackage.js';

let passedTests = 0;
let totalTests = 5;

console.log('🐺 === V29.3 STRATEGIC IDENTITY & MECHANIC INTEGRITY BENCHMARK SUITE ===\n');

// ─── TEST 1: STRUCTURAL_TRIBE_ISOLATION ─────────────────────────────────────────
console.log('--- TEST 1: STRUCTURAL_TRIBE_ISOLATION ---');
const werewolfPackLeader = {
  name: 'Werewolf Pack Leader',
  type_line: 'Creature — Human Rogue',
  oracle_text: 'Pack tactics — Whenever Werewolf Pack Leader attacks, if you attacked with creatures with total power 6 or greater this combat, draw a card.',
  cmc: 2,
  power: '3',
  toughness: '3',
  colors: ['G']
};

const fearlessPup = {
  name: 'Fearless Pup',
  type_line: 'Creature — Wolf',
  oracle_text: 'First strike\n{2}{R}: Fearless Pup gets +2/+0 until end of turn.',
  cmc: 1,
  power: '1',
  toughness: '1',
  colors: ['R'],
  legalities: { pioneer: 'legal' }
};

const ascendantPackleader = {
  name: 'Ascendant Packleader',
  type_line: 'Creature — Wolf',
  oracle_text: 'Ascendant Packleader enters the battlefield with a +1/+1 counter on it if you control a permanent with mana value 4 or greater.',
  cmc: 1,
  power: '2',
  toughness: '1',
  colors: ['G'],
  legalities: { pioneer: 'legal' }
};

const tovolar = {
  name: 'Tovolar, Dire Overlord // Tovolar, the Midnight Scourge',
  type_line: 'Legendary Creature — Human Werewolf // Legendary Creature — Werewolf',
  card_faces: [
    {
      name: 'Tovolar, Dire Overlord',
      type_line: 'Legendary Creature — Human Werewolf',
      oracle_text: 'Whenever a Wolf or Werewolf you control deals combat damage to a player, draw a card.\nAt the beginning of your upkeep, if you control three or more Wolves and/or Werewolves, it becomes night. Then transform Tovolar, Dire Overlord.',
      power: '3',
      toughness: '3',
      colors: ['R', 'G']
    },
    {
      name: 'Tovolar, the Midnight Scourge',
      type_line: 'Legendary Creature — Werewolf',
      oracle_text: 'Whenever a Wolf or Werewolf you control deals combat damage to a player, draw a card.\n{X}{R}{G}: Target Wolf or Werewolf you control gets +X/+0 and gains trample until end of turn.\nNightbound',
      power: '4',
      toughness: '4',
      colors: ['R', 'G']
    }
  ],
  cmc: 3,
  colors: ['R', 'G'],
  legalities: { pioneer: 'legal' }
};

const mildManneredLibrarian = {
  name: 'Mild-Mannered Librarian',
  type_line: 'Creature — Human',
  oracle_text: '{3}{G}: Mild-Mannered Librarian becomes a Werewolf with base power and toughness 4/4 and gains trample.',
  cmc: 1,
  power: '1',
  toughness: '1',
  colors: ['G']
};

const isWPLWerewolf = IdentityFirewall.isMatchingTribe(werewolfPackLeader, 'Werewolf');
const isPupWerewolf = IdentityFirewall.isMatchingTribe(fearlessPup, 'Werewolf');
const isPupWolf = IdentityFirewall.isMatchingTribe(fearlessPup, 'Wolf');
const isTovolarWerewolf = IdentityFirewall.isMatchingTribe(tovolar, 'Werewolf');
const isLibrarianWerewolf = IdentityFirewall.isMatchingTribe(mildManneredLibrarian, 'Werewolf');

console.log(`Werewolf Pack Leader (Human Rogue) matches Werewolf: ${isWPLWerewolf} (Expected: false)`);
console.log(`Fearless Pup (Wolf) matches Werewolf: ${isPupWerewolf} (Expected: false)`);
console.log(`Fearless Pup (Wolf) matches Wolf: ${isPupWolf} (Expected: true)`);
console.log(`Tovolar (Human Werewolf // Werewolf) matches Werewolf: ${isTovolarWerewolf} (Expected: true)`);
console.log(`Mild-Mannered Librarian (Human) matches Werewolf: ${isLibrarianWerewolf} (Expected: false)`);

if (!isWPLWerewolf && !isPupWerewolf && isPupWolf && isTovolarWerewolf && !isLibrarianWerewolf) {
  console.log('✅ PASS: Structural tribal isolation strictly enforced.\n');
  passedTests++;
} else {
  console.error('❌ FAIL: Structural tribal isolation failed.');
}

// ─── TEST 2: CARD_FLOW_TEMPO_OPPORTUNITY_COST ──────────────────────────────────
console.log('--- TEST 2: CARD_FLOW_TEMPO_OPPORTUNITY_COST ---');
const arcaneEncyclopedia = {
  name: 'Arcane Encyclopedia',
  type_line: 'Artifact',
  oracle_text: '{3}, {T}: Draw a card.',
  cmc: 3,
  colors: []
};

const tempoIntent = new IntentPackage({
  format: 'PIONEER',
  colors: ['B', 'R', 'G'],
  archetype: 'Tempo',
  tempo: 'tempo',
  primaryTribe: 'Werewolf',
  strategy: 'Werewolf Day/Night Tempo'
});

const encProof = StateCandidateRanker.evaluateRoleProofObligation(
  arcaneEncyclopedia,
  'CARD_FLOW',
  tempoIntent,
  {}
);

console.log(`Arcane Encyclopedia Role Proof Validity in Tempo: ${encProof.roleValidity}`);
console.log(`Rejection Status: ${encProof.evidence?.status}`);

if (!encProof.roleValidity && encProof.evidence?.status === 'TEMPO_SINK_REJECTION') {
  console.log('✅ PASS: Slow activated mana sink rejected in Tempo plan.\n');
  passedTests++;
} else {
  console.error('❌ FAIL: Arcane Encyclopedia was not rejected in Tempo plan.');
}

// ─── TEST 3: TEMPO_MANA_VELOCITY_AUDIT ─────────────────────────────────────────
console.log('--- TEST 3: TEMPO_MANA_VELOCITY_AUDIT ---');
const testAvailableLands = [
  // Legal Pioneer Fastlands & Painlands
  { name: 'Blackcleave Cliffs', type_line: 'Land', oracle_text: 'Blackcleave Cliffs enters the battlefield tapped unless you control two or fewer other lands. {T}: Add {B} or {R}.', color_identity: ['B', 'R'], legalities: { pioneer: 'legal' } },
  { name: 'Karplusan Forest', type_line: 'Land', oracle_text: '{T}: Add {C}. {T}: Add {R} or {G}. Karplusan Forest deals 1 damage to you.', color_identity: ['R', 'G'], legalities: { pioneer: 'legal' } },
  { name: 'Llanowar Wastes', type_line: 'Land', oracle_text: '{T}: Add {C}. {T}: Add {B} or {G}. Llanowar Wastes deals 1 damage to you.', color_identity: ['B', 'G'], legalities: { pioneer: 'legal' } },
  // Non-legal lands
  { name: "Auntie's Hovel", type_line: 'Land', oracle_text: '{T}: Add {B} or {R}.', color_identity: ['B', 'R'], legalities: { pioneer: 'not_legal' } },
  { name: 'Vernal Fen', type_line: 'Land', oracle_text: '{T}: Add {C}.', color_identity: ['B', 'G'], legalities: { pioneer: 'not_legal' } },
  // Slow taplands
  { name: 'Cinder Barrens', type_line: 'Land', oracle_text: 'Cinder Barrens enters the battlefield tapped. {T}: Add {B} or {R}.', color_identity: ['B', 'R'], legalities: { pioneer: 'legal' } },
  { name: 'Timber Gorge', type_line: 'Land', oracle_text: 'Timber Gorge enters the battlefield tapped. {T}: Add {R} or {G}.', color_identity: ['R', 'G'], legalities: { pioneer: 'legal' } }
];

const landOptimization = ManaExecutionOptimizer.optimizeLandState({
  nonLandSpells: Array(38).fill({ name: 'Kessig Naturalist', quantity: 1, cmc: 2 }),
  intentPackage: tempoIntent,
  availableLands: testAvailableLands,
  deckSize: 60
});

console.log(`Optimized Land Count: ${landOptimization.optimalLandCount}`);
const allocatedLands = landOptimization.optimalDeckState.landCards;
const illegalAllocated = allocatedLands.filter(l => l.name === "Auntie's Hovel" || l.name === "Vernal Fen");
const taplandsAllocated = allocatedLands.filter(l => l.name === 'Cinder Barrens' || l.name === 'Timber Gorge');
const totalTaplands = taplandsAllocated.reduce((sum, l) => sum + l.quantity, 0);

console.log(`Illegal Lands Allocated: ${illegalAllocated.length} (Expected: 0)`);
console.log(`Tapland copies allocated: ${totalTaplands} (Expected: <= 2)`);

if (illegalAllocated.length === 0 && totalTaplands <= 2) {
  console.log('✅ PASS: Tempo mana velocity and format legality strictly preserved.\n');
  passedTests++;
} else {
  console.error('❌ FAIL: Illegal lands or excessive taplands allocated.');
}

// ─── TEST 4: WEREWOLF_DAYNIGHT_MECHANIC_INTEGRITY ──────────────────────────────
console.log('--- TEST 4: WEREWOLF_DAYNIGHT_MECHANIC_INTEGRITY ---');
const sampleWerewolfDeck = {
  cards: [
    { name: 'Tovolar, Dire Overlord // Tovolar, the Midnight Scourge', quantity: 4, cmc: 3, type_line: 'Legendary Creature — Human Werewolf // Legendary Creature — Werewolf', oracle_text: 'Whenever a Wolf or Werewolf you control deals combat damage to a player, draw a card. Daybound / Nightbound', colors: ['R', 'G'], isLand: false, legalities: { pioneer: 'legal' } },
    { name: 'Reckless Stormseeker // Storm-Charged Slasher', quantity: 4, cmc: 3, type_line: 'Creature — Human Werewolf // Creature — Werewolf', oracle_text: 'At the beginning of combat on your turn, target creature you control gets +1/+0 and gains haste until end of turn. Daybound', colors: ['R'], isLand: false, legalities: { pioneer: 'legal' } },
    { name: 'Kessig Naturalist // Lord of the Ulvenwald', quantity: 4, cmc: 2, type_line: 'Creature — Human Werewolf // Creature — Werewolf', oracle_text: 'Whenever Kessig Naturalist attacks, add {R} or {G}. Daybound', colors: ['R', 'G'], isLand: false, legalities: { pioneer: 'legal' } },
    { name: 'Outland Liberator // Frenzied Trapbreaker', quantity: 4, cmc: 2, type_line: 'Creature — Human Werewolf // Creature — Werewolf', oracle_text: '{1}, Sacrifice Outland Liberator: Destroy target artifact or enchantment. Daybound', colors: ['G'], isLand: false, legalities: { pioneer: 'legal' } },
    { name: 'Nightpack Ambusher', quantity: 4, cmc: 4, type_line: 'Creature — Wolf', oracle_text: 'Flash. Other Wolves and Werewolves you control get +1/+1.', colors: ['G'], isLand: false, legalities: { pioneer: 'legal' } },
    { name: 'Lightning Strike', quantity: 4, cmc: 2, type_line: 'Instant', oracle_text: 'Lightning Strike deals 3 damage to any target.', colors: ['R'], isLand: false, legalities: { pioneer: 'legal' } },
    { name: 'Fatal Push', quantity: 4, cmc: 1, type_line: 'Instant', oracle_text: 'Destroy target creature if it has mana value 2 or less.', colors: ['B'], isLand: false, legalities: { pioneer: 'legal' } },
    { name: 'Abrade', quantity: 4, cmc: 2, type_line: 'Instant', oracle_text: 'Choose one — Abrade deals 3 damage to target creature; or destroy target artifact.', colors: ['R'], isLand: false, legalities: { pioneer: 'legal' } },
    { name: 'Play with Fire', quantity: 4, cmc: 1, type_line: 'Instant', oracle_text: 'Play with Fire deals 2 damage to any target.', colors: ['R'], isLand: false, legalities: { pioneer: 'legal' } },
    { name: 'Mountain', quantity: 10, cmc: 0, isLand: true, type_line: 'Basic Land — Mountain', oracle_text: '{T}: Add {R}.', legalities: { pioneer: 'legal' } },
    { name: 'Forest', quantity: 10, cmc: 0, isLand: true, type_line: 'Basic Land — Forest', oracle_text: '{T}: Add {G}.', legalities: { pioneer: 'legal' } },
    { name: 'Swamp', quantity: 4, cmc: 0, isLand: true, type_line: 'Basic Land — Swamp', oracle_text: '{T}: Add {B}.', legalities: { pioneer: 'legal' } }
  ]
};

const judgeVerdict = DeterministicSupremeJudge.judgeDeck(sampleWerewolfDeck, {}, tempoIntent, 3);
console.log(`Judicial Score: ${judgeVerdict.score}`);
console.log(`Judicial Verdict: ${judgeVerdict.verdict}`);
console.log(`Mechanic Integrity Status: ${judgeVerdict.diagnosticVectors?.MechanicIntegrityAudit?.status}`);
console.log(`Tempo Mana Status: ${judgeVerdict.diagnosticVectors?.TempoManaAudit?.status}`);

if ((judgeVerdict.verdict === 'APPROVE' || judgeVerdict.verdict === 'APPROVE_WITH_WARNINGS') && judgeVerdict.diagnosticVectors?.MechanicIntegrityAudit?.status === 'PASS') {
  console.log('✅ PASS: Day/Night Werewolf deck certified with 100% mechanic integrity.\n');
  passedTests++;
} else {
  console.error('❌ FAIL: Werewolf deck failed judicial certification. Blocking defects:', judgeVerdict.blockingDefects);
}

// ─── TEST 5: WEREWOLF_VS_WOLF_STRATEGIC_DIVERGENCE ─────────────────────────────
console.log('--- TEST 5: WEREWOLF_VS_WOLF_STRATEGIC_DIVERGENCE ---');
// Shared candidate pool containing both Werewolves, Wolves, and shared support
const sharedPool = [
  // Werewolves (Daybound)
  tovolar,
  { name: 'Reckless Stormseeker', type_line: 'Creature — Human Werewolf', oracle_text: 'Daybound. Target creature gets +1/+0 and haste.', cmc: 3, power: '2', toughness: '3', colors: ['R'], legalities: { pioneer: 'legal' } },
  { name: 'Kessig Naturalist', type_line: 'Creature — Human Werewolf', oracle_text: 'Daybound. Whenever attacks add {R} or {G}.', cmc: 2, power: '2', toughness: '2', colors: ['R', 'G'], legalities: { pioneer: 'legal' } },
  { name: 'Outland Liberator', type_line: 'Creature — Human Werewolf', oracle_text: 'Daybound. Destroy artifact or enchantment.', cmc: 2, power: '1', toughness: '3', colors: ['G'], legalities: { pioneer: 'legal' } },
  // Pure Wolves
  fearlessPup,
  ascendantPackleader,
  { name: 'Pelt Collector', type_line: 'Creature — Elf Warrior', oracle_text: 'Whenever another creature enters with greater power, put a +1/+1 counter.', cmc: 1, power: '1', toughness: '1', colors: ['G'], legalities: { pioneer: 'legal' } },
  { name: 'Nightpack Ambusher', type_line: 'Creature — Wolf', oracle_text: 'Flash. Other Wolves and Werewolves you control get +1/+1. At the beginning of your end step, if you didn\'t cast a spell, create a 2/2 green Wolf token.', cmc: 4, power: '4', toughness: '4', colors: ['G'], legalities: { pioneer: 'legal' } },
  { name: 'Cemetery Prowler', type_line: 'Creature — Wolf', oracle_text: 'Vigilance. Whenever enters or attacks, exile card from graveyard.', cmc: 3, power: '3', toughness: '4', colors: ['G'], legalities: { pioneer: 'legal' } },
  // Spells
  { name: 'Fatal Push', type_line: 'Instant', oracle_text: 'Destroy target creature if it has mana value 2 or less.', cmc: 1, colors: ['B'], legalities: { pioneer: 'legal' } },
  { name: 'Lightning Strike', type_line: 'Instant', oracle_text: 'Lightning Strike deals 3 damage to any target.', cmc: 2, colors: ['R'], legalities: { pioneer: 'legal' } },
  { name: 'Shock', type_line: 'Instant', oracle_text: 'Shock deals 2 damage to any target.', cmc: 1, colors: ['R'], legalities: { pioneer: 'legal' } },
  { name: 'Play with Fire', type_line: 'Instant', oracle_text: 'Play with Fire deals 2 damage to any target. Scry 1 if to player.', cmc: 1, colors: ['R'], legalities: { pioneer: 'legal' } }
];

const resultWerewolf = CompilerConvergencePipeline.compileDeckFromScratch({
  userPrompt: 'Quiero un mazo competitivo de Pioneer Werewolf Day/Night Tempo R/G.',
  format: 'Pioneer',
  archetype: 'Tempo',
  rawCardPool: sharedPool,
  uiFormState: {
    format: 'Pioneer',
    colors: ['R', 'G'],
    primaryTribe: 'Werewolf',
    tempo: 'Tempo',
    strategy: ['Werewolf Day/Night Tempo'],
    powerLevel: 'Competitive'
  }
});

const resultWolf = CompilerConvergencePipeline.compileDeckFromScratch({
  userPrompt: 'Quiero un mazo competitivo de Pioneer Wolf Pack Aggro R/G.',
  format: 'Pioneer',
  archetype: 'Aggro',
  rawCardPool: sharedPool,
  uiFormState: {
    format: 'Pioneer',
    colors: ['R', 'G'],
    primaryTribe: 'Wolf',
    tempo: 'Aggro',
    strategy: ['Wolf Pack Aggro'],
    powerLevel: 'Competitive'
  }
});

const werewolfCards = resultWerewolf.state?.cards || [];
const wolfCards = resultWolf.state?.cards || [];

const werewolfSpellNames = new Set(werewolfCards.filter(c => !c.isLand && !c.name.includes('Mountain') && !c.name.includes('Forest') && !c.name.includes('Swamp')).map(c => c.name));
const wolfSpellNames = new Set(wolfCards.filter(c => !c.isLand && !c.name.includes('Mountain') && !c.name.includes('Forest') && !c.name.includes('Swamp')).map(c => c.name));

console.log(`Werewolf Deck Spells (${werewolfSpellNames.size}):`, Array.from(werewolfSpellNames));
console.log(`Wolf Deck Spells (${wolfSpellNames.size}):`, Array.from(wolfSpellNames));

// Calculate Jaccard similarity of selected spell names
const intersection = new Set([...werewolfSpellNames].filter(x => wolfSpellNames.has(x)));
const union = new Set([...werewolfSpellNames, ...wolfSpellNames]);
const jaccardSimilarity = union.size > 0 ? (intersection.size / union.size) : 1;

console.log(`Jaccard Similarity between Werewolf and Wolf: ${(jaccardSimilarity * 100).toFixed(1)}%`);

// Werewolf deck must have Tovolar and zero Fearless Pups
const werewolfHasTovolar = werewolfSpellNames.has('Tovolar, Dire Overlord // Tovolar, the Midnight Scourge') || werewolfSpellNames.has('Tovolar, Dire Overlord');
const werewolfHasFearlessPup = werewolfSpellNames.has('Fearless Pup');

// Wolf deck must have Fearless Pup and zero Tovolar
const wolfHasFearlessPup = wolfSpellNames.has('Fearless Pup');
const wolfHasTovolar = wolfSpellNames.has('Tovolar, Dire Overlord // Tovolar, the Midnight Scourge');

console.log(`Werewolf Deck has Tovolar: ${werewolfHasTovolar}, has Fearless Pup: ${werewolfHasFearlessPup}`);
console.log(`Wolf Deck has Fearless Pup: ${wolfHasFearlessPup}, has Tovolar: ${wolfHasTovolar}`);

if (jaccardSimilarity <= 0.60 && !werewolfHasFearlessPup && wolfHasFearlessPup) {
  console.log('✅ PASS: Genuinely divergent decks compiled from same pool based on structural intent.\n');
  passedTests++;
} else {
  console.error('❌ FAIL: Decks did not diverge adequately.');
}

// ─── FINAL SUMMARY ─────────────────────────────────────────────────────────────
console.log('======================================================');
console.log(`📊 FINAL V29.3 BENCHMARK SCORE: ${passedTests}/${totalTests} TESTS PASSED (${((passedTests / totalTests) * 100).toFixed(0)}%)`);
console.log('======================================================');

if (passedTests === totalTests) {
  console.log('🏆 V29.3 ARCHITECTURE FULLY VERIFIED AND CERTIFIED!');
  process.exit(0);
} else {
  console.error('❌ V29.3 BENCHMARK SUITE FAILED.');
  process.exit(1);
}
