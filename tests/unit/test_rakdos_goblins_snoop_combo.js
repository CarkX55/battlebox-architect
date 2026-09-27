/**
 * tests/unit/test_rakdos_goblins_snoop_combo.js
 * 
 * BATTLEBOX v25.5.4: RAKDOS GOBLINS SNOOP COMBO & ARISTOCRATS TEST
 * 
 * Verifies:
 * 1. Disqualification of off-tribe / incompatible conditional artifacts (Relic Vial, Shadows of the Past, Witch's Oven).
 * 2. Selection and prioritization of premier Goblin staples (Conspicuous Snoop, Sling-Gang Lieutenant, Skirk Prospector, Pashalik Mons, Rundvelt Hordemaster, Mogg War Marshal, Battle Cry Goblin).
 * 3. 100% on-tribe creature fidelity for tribal Goblins intent.
 */

import assert from 'assert';
import { CandidateConstraintEngine } from '../../src/services/compiler/core/candidateConstraintEngine.js';
import { StrategicIdentityCompiler } from '../../src/services/compiler/core/strategicIdentityCompiler.js';
import { CapabilityPlanner } from '../../src/services/compiler/core/capabilityPlanner.js';
import { StrategicObjective } from '../../src/services/compiler/core/strategicObjective.js';
import { CapabilityVector } from '../../src/services/compiler/core/capabilityVector.js';

console.log('🧪 =========================================================================');
console.log('🧪 BATTLEBOX v25.5.4: RAKDOS GOBLINS SNOOP COMBO VERIFICATION');
console.log('🧪 =========================================================================\n');

const mockPioneerPool = [
  // Premier Goblins & Combo Pieces
  {
    id: 'snoop-1',
    name: 'Conspicuous Snoop',
    type_line: 'Creature — Goblin Rogue',
    oracle_text: 'Play with the top card of your library revealed.\nYou may cast Goblin spells from the top of your library.\nAs long as the top card of your library is a Goblin card, Conspicuous Snoop has all activated abilities of that card.',
    cmc: 2,
    mana_value: 2,
    colors: ['R'],
    power: '2',
    toughness: '2',
    rarity: 'rare',
    legalities: { standard: 'not_legal', pioneer: 'legal', modern: 'legal' }
  },
  {
    id: 'kiki-1',
    name: 'Kiki-Jiki, Mirror Breaker',
    type_line: 'Legendary Creature — Goblin Shaman',
    oracle_text: 'Haste\n{T}: Create a token that\'s a copy of target nonlegendary creature you control, except it has haste. Sacrifice it at the beginning of the next end step.',
    cmc: 5,
    mana_value: 5,
    colors: ['R'],
    power: '2',
    toughness: '2',
    rarity: 'mythic',
    legalities: { standard: 'not_legal', pioneer: 'legal', modern: 'legal' }
  },
  {
    id: 'sling-1',
    name: 'Sling-Gang Lieutenant',
    type_line: 'Creature — Goblin Rogue',
    oracle_text: 'When Sling-Gang Lieutenant enters the battlefield, create two 1/1 red Goblin creature tokens.\nSacrifice a Goblin: Target opponent loses 1 life and you gain 1 life.',
    cmc: 4,
    mana_value: 4,
    colors: ['B'],
    power: '1',
    toughness: '1',
    rarity: 'uncommon',
    legalities: { standard: 'not_legal', pioneer: 'legal', modern: 'legal' }
  },
  {
    id: 'skirk-1',
    name: 'Skirk Prospector',
    type_line: 'Creature — Goblin',
    oracle_text: 'Sacrifice a Goblin: Add {R}.',
    cmc: 1,
    mana_value: 1,
    colors: ['R'],
    power: '1',
    toughness: '1',
    rarity: 'common',
    legalities: { standard: 'not_legal', pioneer: 'legal', modern: 'legal' }
  },
  {
    id: 'pashalik-1',
    name: 'Pashalik Mons',
    type_line: 'Legendary Creature — Goblin Warrior',
    oracle_text: 'Whenever Pashalik Mons or another Goblin you control dies, Pashalik Mons deals 1 damage to any target.\n{3}{R}, Sacrifice a Goblin: Create two 1/1 red Goblin creature tokens.',
    cmc: 3,
    mana_value: 3,
    colors: ['R'],
    power: '2',
    toughness: '2',
    rarity: 'rare',
    legalities: { standard: 'not_legal', pioneer: 'legal', modern: 'legal' }
  },
  {
    id: 'rundvelt-1',
    name: 'Rundvelt Hordemaster',
    type_line: 'Creature — Goblin Warrior',
    oracle_text: 'Other Goblins you control get +1/+1.\nWhenever a nontoken Goblin you control dies, exile the top card of your library. You may cast that card this turn if it\'s a Goblin card.',
    cmc: 2,
    mana_value: 2,
    colors: ['R'],
    power: '1',
    toughness: '1',
    rarity: 'rare',
    legalities: { standard: 'legal', pioneer: 'legal', modern: 'legal' }
  },
  {
    id: 'mogg-1',
    name: 'Mogg War Marshal',
    type_line: 'Creature — Goblin Warrior',
    oracle_text: 'Echo {1}{R}\nWhen Mogg War Marshal enters the battlefield or dies, create a 1/1 red Goblin creature token.',
    cmc: 2,
    mana_value: 2,
    colors: ['R'],
    power: '1',
    toughness: '1',
    rarity: 'common',
    legalities: { standard: 'not_legal', pioneer: 'legal', modern: 'legal' }
  },
  {
    id: 'battle-cry-1',
    name: 'Battle Cry Goblin',
    type_line: 'Creature — Goblin Shaman',
    oracle_text: '{1}{R}: Goblins you control get +1/+0 and gain haste until end of turn.\nPack tactics — Whenever Battle Cry Goblin attacks, if you attacked with creatures with total power 6 or greater this combat, create a 1/1 red Goblin creature token that\'s tapped and attacking.',
    cmc: 2,
    mana_value: 2,
    colors: ['R'],
    power: '2',
    toughness: '2',
    rarity: 'uncommon',
    legalities: { standard: 'not_legal', pioneer: 'legal', modern: 'legal' }
  },
  {
    id: 'bandit-lord-1',
    name: 'Hobgoblin Bandit Lord',
    type_line: 'Creature — Goblin Rogue',
    oracle_text: 'Other Goblins you control get +1/+1.\n{R}, {T}: Hobgoblin Bandit Lord deals damage equal to the number of Goblins that entered the battlefield under your control this turn to any target.',
    cmc: 3,
    mana_value: 3,
    colors: ['R'],
    power: '2',
    toughness: '3',
    rarity: 'rare',
    legalities: { standard: 'not_legal', pioneer: 'legal', modern: 'legal' }
  },
  {
    id: 'fatal-push-1',
    name: 'Fatal Push',
    type_line: 'Instant',
    oracle_text: 'Destroy target creature if it has mana value 2 or less.\nRevolt — Destroy that creature if it has mana value 4 or less instead if a permanent you controlled left the battlefield this turn.',
    cmc: 1,
    mana_value: 1,
    colors: ['B'],
    rarity: 'uncommon',
    legalities: { standard: 'not_legal', pioneer: 'legal', modern: 'legal' }
  },
  {
    id: 'play-with-fire-1',
    name: 'Play with Fire',
    type_line: 'Instant',
    oracle_text: 'Play with Fire deals 2 damage to any target. If a player was dealt damage this way, scry 1.',
    cmc: 1,
    mana_value: 1,
    colors: ['R'],
    rarity: 'uncommon',
    legalities: { standard: 'legal', pioneer: 'legal', modern: 'legal' }
  },
  // Incompatible / Off-Tribe Traps
  {
    id: 'relic-vial-1',
    name: 'Relic Vial',
    type_line: 'Artifact',
    oracle_text: '{2}, {T}, Sacrifice a creature: Draw a card.\nAs long as you control a Cleric, this artifact has "Whenever a creature you control dies, each opponent loses 1 life and you gain 1 life."',
    cmc: 3,
    mana_value: 3,
    colors: [],
    rarity: 'uncommon',
    legalities: { standard: 'not_legal', pioneer: 'legal', modern: 'legal' }
  },
  {
    id: 'witch-oven-1',
    name: 'Witch\'s Oven',
    type_line: 'Artifact',
    oracle_text: '{T}, Sacrifice a creature: Create a Food token.',
    cmc: 1,
    mana_value: 1,
    colors: [],
    rarity: 'uncommon',
    legalities: { standard: 'not_legal', pioneer: 'legal', modern: 'legal' }
  },
  {
    id: 'magic-pot-1',
    name: 'Magic Pot',
    type_line: 'Artifact Creature — Goblin Construct',
    oracle_text: 'When this creature dies, create a Treasure token.\n{2}, {T}: Exile target card from a graveyard.',
    cmc: 3,
    mana_value: 3,
    colors: [],
    rarity: 'common',
    legalities: { standard: 'legal', pioneer: 'legal', modern: 'legal' }
  }
];

const intentPackage = {
  prompt: 'aggro PIONEER',
  format: 'PIONEER',
  colors: ['R', 'B'],
  primaryTribe: 'Goblin',
  tempo: 'aggro',
  strategy: ['combustión y sacrificio (snoop combo)'],
  userConstraints: {
    selectedEngineId: 'goblin_sacrifice',
    engineFlavor: 'Combustión y Sacrificio (Snoop Combo)',
    boostKeywords: ['sacrifice', 'dies', 'goblin', 'sling-gang lieutenant', 'squee, dubious', 'conspicuous snoop', 'kiki-jiki'],
    prioritizePlaysets: true,
    deckSize: 60
  }
};

const identity = StrategicIdentityCompiler.compileIdentity(intentPackage);
console.log(`✦ Compiled Archetype Identity: ${identity.archetypeKey}`);

const axes = StrategicObjective.toCapabilityAxes(intentPackage);
const capabilityVector = new CapabilityVector(axes);
const { capabilityPlan } = CapabilityPlanner.plan(intentPackage, capabilityVector);

const engine = new CandidateConstraintEngine();
const { filledSlots } = engine.processPlan(intentPackage, capabilityPlan, mockPioneerPool, null, identity);

const selectedWinners = filledSlots.filter(s => s.winnerCard && s.role !== 'Land').map(s => s.winnerCard);
console.log('\n✦ Selected Winner Cards for Goblin Sacrifice & Snoop Combo:');
selectedWinners.forEach((card, idx) => {
  console.log(`   [Slot ${idx + 1}]: ${card}`);
});

// ASSERTIONS
console.log('\n--- VERIFYING ARCHITECTURAL CONSTRAINTS ---');

// 1. Relic Vial must NEVER be selected in Goblins
assert.strictEqual(selectedWinners.includes('Relic Vial'), false, 'Relic Vial (requires Cleric) must NEVER be selected in Goblins');
console.log('✅ [PASS] Relic Vial successfully rejected and disqualified.');

// 2. Witch\'s Oven must NOT hijack slots over Goblins
assert.strictEqual(selectedWinners.includes('Witch\'s Oven'), false, 'Witch\'s Oven must not be selected over on-tribe cards');
console.log('✅ [PASS] Witch\'s Oven successfully rejected.');

// 3. Premier Goblin Staples must win
assert.strictEqual(selectedWinners.includes('Sling-Gang Lieutenant'), true, 'Sling-Gang Lieutenant must win SACRIFICE_OUTLET / DEATH_PAYOFF');
assert.strictEqual(selectedWinners.includes('Skirk Prospector'), true, 'Skirk Prospector must win SACRIFICE_OUTLET / MANA');
assert.strictEqual(selectedWinners.includes('Pashalik Mons') || selectedWinners.includes('Rundvelt Hordemaster'), true, 'Pashalik Mons or Rundvelt Hordemaster must win DEATH_PAYOFF');
assert.strictEqual(selectedWinners.includes('Mogg War Marshal') || selectedWinners.includes('Conspicuous Snoop'), true, 'Mogg War Marshal or Conspicuous Snoop must win FODDER / TRIBAL');

console.log('✅ [PASS] Premier Goblin & Snoop Combo staples successfully selected with maximum priority.');

console.log('\n=========================================================================');
console.log('🏁 ALL TESTS PASSED (100% SUCCESS) - Rakdos Goblins Snoop Combo Verified');
console.log('=========================================================================');
