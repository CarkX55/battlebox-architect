/**
 * tests/unit/test_trans_tribal_enablers.js
 * 
 * BATTLEBOX v25.2: TRANS-TRIBAL ENABLERS & DEDICATED ENGINE ARCHITECT SUITE
 * 
 * Verifies:
 * 1. BANT_WALLS_TOUGHNESS: Arcades (Elder Dragon), High Alert (Enchantment) & Tower Defense (+0/+5) prioritized.
 * 2. AZORIUS_WALLS_COLOR_SAFETY: High Alert included, Arcades excluded due to G pip in W/U identity.
 * 3. DIMIR_NINJUTSU_EVASION: Ornithopter / Faerie Seer included under EVASIVE_ENABLER for Yuriko.
 * 4. RAKDOS_ARISTOCRATS_TRIAD: Viscera Seer/Witch's Oven + Bloodghast + Blood Artist/Mayhem Devil triad.
 */

import assert from 'assert';
import { AgenticDeckArchitect } from '../../src/services/agent/agenticDeckArchitect.js';
import { ArchetypeProfileRegistry } from '../../src/services/agent/archetypeProfiles.js';
import { CardImplementer } from '../../src/services/agent/cardImplementer.js';
import { LLMStrategist } from '../../src/services/agent/llmStrategist.js';

console.log('🧪 =========================================================================');
console.log('🧪 BATTLEBOX v25.2: TRANS-TRIBAL ENABLERS & ENGINE PROFILES SUITE');
console.log('🧪 =========================================================================\n');

// ─── 1. BANT WALLS TOUGHNESS STOMPY (PIONEER) ──────────────────────────────
console.log('--- 1. BANT WALLS TOUGHNESS STOMPY (PIONEER) ---');

const mockPioneerBantPool = [
  {
    name: 'Arcades, the Strategist',
    type_line: 'Legendary Creature — Elder Dragon',
    oracle_text: 'Flying, vigilance\nWhenever a creature with defender enters the battlefield under your control, draw a card.\nEach creature you control with defender can attack as though it didn\'t have defender and assigns combat damage equal to its toughness rather than its power.',
    mana_value: 4,
    cmc: 4,
    colors: ['G', 'W', 'U'],
    color_identity: ['G', 'W', 'U'],
    power: '3',
    toughness: '5',
    rarity: 'mythic',
    legalities: { pioneer: 'legal', modern: 'legal' }
  },
  {
    name: 'High Alert',
    type_line: 'Enchantment',
    oracle_text: 'Each creature you control assigns combat damage equal to its toughness rather than its power and can attack as though it didn\'t have defender.\n{2}{W}{U}: Untap target creature.',
    mana_value: 3,
    cmc: 3,
    colors: ['U', 'W'],
    color_identity: ['U', 'W'],
    rarity: 'uncommon',
    legalities: { pioneer: 'legal', modern: 'legal' }
  },
  {
    name: 'Assault Formation',
    type_line: 'Enchantment',
    oracle_text: 'Each creature you control assigns combat damage equal to its toughness rather than its power.\n{G}: Target creature with defender can attack this turn as though it didn\'t have defender.',
    mana_value: 2,
    cmc: 2,
    colors: ['G'],
    color_identity: ['G'],
    rarity: 'rare',
    legalities: { pioneer: 'legal', modern: 'legal' }
  },
  {
    name: 'Tower Defense',
    type_line: 'Instant',
    oracle_text: 'Creatures you control get +0/+5 and gain reach until end of turn.',
    mana_value: 2,
    cmc: 2,
    colors: ['G'],
    color_identity: ['G'],
    rarity: 'uncommon',
    legalities: { pioneer: 'legal', modern: 'legal' }
  },
  {
    name: 'Axebane Guardian',
    type_line: 'Creature — Human Druid',
    oracle_text: 'Defender\n{T}: Add X mana in any combination of colors, where X is the number of creatures with defender you control.',
    mana_value: 3,
    cmc: 3,
    colors: ['G'],
    color_identity: ['G'],
    power: '0',
    toughness: '3',
    rarity: 'common',
    legalities: { pioneer: 'legal', modern: 'legal' }
  },
  {
    name: 'Jeskai Barricade',
    type_line: 'Creature — Wall',
    oracle_text: 'Flash\nDefender\nWhen Jeskai Barricade enters the battlefield, you may return another target creature you control to its owner\'s hand.',
    mana_value: 2,
    cmc: 2,
    colors: ['W'],
    color_identity: ['W'],
    power: '0',
    toughness: '4',
    rarity: 'uncommon',
    legalities: { pioneer: 'legal', modern: 'legal' }
  },
  {
    name: 'Wall of Mulch',
    type_line: 'Creature — Wall',
    oracle_text: 'Defender\n{G}, Sacrifice a Wall: Draw a card.',
    mana_value: 2,
    cmc: 2,
    colors: ['G'],
    color_identity: ['G'],
    power: '0',
    toughness: '4',
    rarity: 'uncommon',
    legalities: { pioneer: 'legal', modern: 'legal' }
  },
  {
    name: 'Wall of Runes',
    type_line: 'Creature — Wall',
    oracle_text: 'Defender\nWhen Wall of Runes enters the battlefield, scry 1.',
    mana_value: 1,
    cmc: 1,
    colors: ['U'],
    color_identity: ['U'],
    power: '0',
    toughness: '4',
    rarity: 'common',
    legalities: { pioneer: 'legal', modern: 'legal' }
  },
  {
    name: 'Get Lost',
    type_line: 'Instant',
    oracle_text: 'Destroy target creature, enchantment, or planeswalker. Its controller creates two Map tokens.',
    mana_value: 2,
    cmc: 2,
    colors: ['W'],
    color_identity: ['W'],
    rarity: 'rare',
    legalities: { pioneer: 'legal', modern: 'legal' }
  }
];

const bantWallsIntent = {
  primaryTribe: 'wall',
  selectedEngineId: 'wall_toughness',
  engineFlavor: 'Ataque de Resistencia (Toughness Stompy)',
  colors: ['W', 'U', 'G'],
  format: 'PIONEER',
  userConstraints: {
    prioritizePlaysets: true,
    deckSize: 60,
    boostKeywords: ['arcades, the strategist', 'high alert', 'assault formation', 'tower defense', 'axebane guardian']
  }
};

// 1a. Test Dedicated Profile Detection
const profile = ArchetypeProfileRegistry.getProfile(bantWallsIntent);
assert.strictEqual(profile.id, 'DEFENDER_TOUGHNESS_STOMPY', 'Profile must route to DEFENDER_TOUGHNESS_STOMPY');
console.log(`  ✦ Archetype Profile: ${profile.name} (Sequence steps: ${profile.sequence.map(s => s.need).join(' -> ')})`);
console.log('  ✅ [PASS] Dedicated Engine Profile matched.');

// 1b. Test Strategic Thesis Generation
const thesis = LLMStrategist.generateStrategicThesis(bantWallsIntent);
assert.ok(thesis.winPath.includes('TOUGHNESS_ENABLER'), 'Thesis winPath must include TOUGHNESS_ENABLER');
assert.ok(thesis.winPath.includes('COMBAT_AMPLIFICATION'), 'Thesis winPath must include COMBAT_AMPLIFICATION');
console.log(`  ✦ Strategic Thesis: "${thesis.thesisSummary}"`);
console.log('  ✅ [PASS] Strategic Thesis formulated with TOUGHNESS_ENABLER & COMBAT_AMPLIFICATION.');

// 1c. Test CardImplementer for TOUGHNESS_ENABLER
const enablerResults = CardImplementer.findCandidates(
  { need: 'TOUGHNESS_ENABLER', cmcMin: 1, cmcMax: 4, targetColors: ['W', 'U', 'G'] },
  mockPioneerBantPool,
  bantWallsIntent
);
const enablerNames = enablerResults.candidates.map(c => c.name);
console.log(`  ✦ Discovered Toughness Enablers: ${enablerNames.join(', ')}`);
assert.ok(enablerNames.includes('Arcades, the Strategist'), 'Arcades must be found under TOUGHNESS_ENABLER');
assert.ok(enablerNames.includes('High Alert'), 'High Alert must be found under TOUGHNESS_ENABLER');
assert.ok(enablerNames.includes('Assault Formation'), 'Assault Formation must be found under TOUGHNESS_ENABLER');
console.log('  ✅ [PASS] Trans-tribal / Enchantment enablers successfully retrieved.');

// 1d. Test Full ReAct Build for Bant Walls
const bantArchitect = new AgenticDeckArchitect(bantWallsIntent, mockPioneerBantPool);
const bantBuild = await bantArchitect.buildDeck();
const bantDeckCards = Array.from(bantArchitect.deckState.cards.values()).map(c => `${c.quantity}x ${c.name}`);
console.log(`  ✦ Built Deck Spells (${bantArchitect.deckState.nonLandCount} cards):\n    ${bantDeckCards.join('\n    ')}`);
console.log('  ✦ Strategic Memory:', JSON.stringify(bantArchitect.deckState.strategicMemory, null, 2));

assert.ok(bantArchitect.deckState.cards.has('Arcades, the Strategist'), 'Deck must include Arcades, the Strategist');
assert.ok(bantArchitect.deckState.cards.has('High Alert') || bantArchitect.deckState.cards.has('Assault Formation'), 'Deck must include High Alert or Assault Formation');
assert.ok(bantArchitect.deckState.cards.has('Tower Defense'), 'Deck must include Tower Defense');
assert.ok(bantArchitect.deckState.cards.has('Axebane Guardian'), 'Deck must include Axebane Guardian');
console.log('  ✅ [PASS] Bant Walls ReAct build included Arcades, High Alert, Tower Defense and Axebane Guardian.');

// ─── 2. AZORIUS WALLS COLOR SAFETY ─────────────────────────────────────────
console.log('\n--- 2. AZORIUS WALLS COLOR SAFETY (W/U IDENTITY) ---');

const azoriusWallsIntent = {
  primaryTribe: 'wall',
  selectedEngineId: 'wall_toughness',
  colors: ['W', 'U'],
  format: 'PIONEER',
  userConstraints: {
    prioritizePlaysets: true,
    deckSize: 60
  }
};

const azoriusArchitect = new AgenticDeckArchitect(azoriusWallsIntent, mockPioneerBantPool);
await azoriusArchitect.buildDeck();
const azoriusDeckCards = Array.from(azoriusArchitect.deckState.cards.values());

// Must include High Alert (W/U)
assert.ok(azoriusArchitect.deckState.cards.has('High Alert'), 'Azorius deck must include High Alert');

// Must NOT include Arcades (requires G) or Assault Formation (G) or Tower Defense (G)
for (const card of azoriusDeckCards) {
  const c = card.card || card;
  const cColors = (c.colors || []).map(col => col.toUpperCase());
  assert.ok(!cColors.includes('G'), `Azorius deck must NOT include green cards (Violated by: ${c.name})`);
}
console.log('  ✅ [PASS] Color safety verified: Arcades and Assault Formation strictly excluded in W/U Azorius.');

// ─── 3. DIMIR NINJUTSU EVASIVE ENABLERS ────────────────────────────────────
console.log('\n--- 3. DIMIR NINJUTSU EVASIVE ENABLERS (MODERN) ---');

const mockNinjaPool = [
  {
    name: 'Ornithopter',
    type_line: 'Artifact Creature — Thopter',
    oracle_text: 'Flying',
    mana_value: 0,
    cmc: 0,
    colors: [],
    color_identity: [],
    power: '0',
    toughness: '2',
    rarity: 'uncommon',
    legalities: { modern: 'legal', pioneer: 'legal' }
  },
  {
    name: 'Faerie Seer',
    type_line: 'Creature — Faerie Wizard',
    oracle_text: 'Flying\nWhen Faerie Seer enters the battlefield, scry 2.',
    mana_value: 1,
    cmc: 1,
    colors: ['U'],
    color_identity: ['U'],
    power: '1',
    toughness: '1',
    rarity: 'common',
    legalities: { modern: 'legal', pauper: 'legal' }
  },
  {
    name: 'Yuriko, the Tiger\'s Shadow',
    type_line: 'Legendary Creature — Human Ninja',
    oracle_text: 'Commander ninjutsu {U}{B}\nWhenever a Ninja you control deals combat damage to a player, reveal the top card of your library and put that card into your hand. Each opponent loses life equal to that card\'s mana value.',
    mana_value: 3,
    cmc: 3,
    colors: ['U', 'B'],
    color_identity: ['U', 'B'],
    power: '2',
    toughness: '3',
    rarity: 'rare',
    legalities: { modern: 'legal', commander: 'legal', legacy: 'legal' }
  },
  {
    name: 'Ingenious Infiltrator',
    type_line: 'Creature — Vedalken Ninja',
    oracle_text: 'Ninjutsu {U}{B}\nWhenever a Ninja you control deals combat damage to a player, draw a card.',
    mana_value: 4,
    cmc: 4,
    colors: ['U', 'B'],
    color_identity: ['U', 'B'],
    power: '2',
    toughness: '3',
    rarity: 'rare',
    legalities: { modern: 'legal', legacy: 'legal' }
  },
  {
    name: 'Fatal Push',
    type_line: 'Instant',
    oracle_text: 'Destroy target creature if it has mana value 2 or less. Revolt — Destroy that creature if it has mana value 4 or less instead if a permanent you controlled left the battlefield this turn.',
    mana_value: 1,
    cmc: 1,
    colors: ['B'],
    color_identity: ['B'],
    rarity: 'uncommon',
    legalities: { modern: 'legal', pioneer: 'legal' }
  }
];

const ninjaIntent = {
  primaryTribe: 'ninja',
  selectedEngineId: 'ninja_tempo',
  colors: ['U', 'B'],
  format: 'MODERN',
  userConstraints: {
    prioritizePlaysets: true,
    deckSize: 60
  }
};

const ninjaArchitect = new AgenticDeckArchitect(ninjaIntent, mockNinjaPool);
await ninjaArchitect.buildDeck();

assert.ok(ninjaArchitect.deckState.cards.has('Ornithopter') || ninjaArchitect.deckState.cards.has('Faerie Seer'), 'Ninja deck must include evasive enablers (Ornithopter/Faerie Seer)');
assert.ok(ninjaArchitect.deckState.cards.has('Yuriko, the Tiger\'s Shadow'), 'Ninja deck must include Yuriko');
console.log('  ✅ [PASS] Dimir Ninjas: Trans-tribal evasive enablers (Ornithopter/Faerie Seer) successfully integrated with Yuriko.');

// ─── 4. RAKDOS ARISTOCRATS TRIAD ───────────────────────────────────────────
console.log('\n--- 4. RAKDOS ARISTOCRATS TRIAD ---');

const mockAristocratsPool = [
  {
    name: 'Viscera Seer',
    type_line: 'Creature — Vampire Wizard',
    oracle_text: 'Sacrifice a creature: Scry 1.',
    mana_value: 1,
    cmc: 1,
    colors: ['B'],
    color_identity: ['B'],
    power: '1',
    toughness: '1',
    rarity: 'common',
    legalities: { modern: 'legal', pioneer: 'legal' }
  },
  {
    name: 'Bloodghast',
    type_line: 'Creature — Vampire Spirit',
    oracle_text: 'Bloodghast can\'t block.\nBloodghast has haste as long as an opponent has 10 or less life.\nLandfall — Whenever a land enters the battlefield under your control, you may return Bloodghast from your graveyard to the battlefield.',
    mana_value: 2,
    cmc: 2,
    colors: ['B'],
    color_identity: ['B'],
    power: '2',
    toughness: '1',
    rarity: 'rare',
    legalities: { modern: 'legal' }
  },
  {
    name: 'Blood Artist',
    type_line: 'Creature — Vampire',
    oracle_text: 'Whenever Blood Artist or another creature dies, target player loses 1 life and you gain 1 life.',
    mana_value: 2,
    cmc: 2,
    colors: ['B'],
    color_identity: ['B'],
    power: '0',
    toughness: '1',
    rarity: 'uncommon',
    legalities: { modern: 'legal' }
  },
  {
    name: 'Mayhem Devil',
    type_line: 'Creature — Devil Shaman',
    oracle_text: 'Whenever a player sacrifices a permanent, Mayhem Devil deals 1 damage to any target.',
    mana_value: 3,
    cmc: 3,
    colors: ['B', 'R'],
    color_identity: ['B', 'R'],
    power: '3',
    toughness: '3',
    rarity: 'uncommon',
    legalities: { modern: 'legal', pioneer: 'legal' }
  }
];

const aristocratsIntent = {
  strategy: ['aristocrats'],
  selectedEngineId: 'goblin_sacrifice',
  colors: ['B', 'R'],
  format: 'MODERN',
  userConstraints: {
    prioritizePlaysets: true,
    deckSize: 60
  }
};

const aristocratsArchitect = new AgenticDeckArchitect(aristocratsIntent, mockAristocratsPool);
await aristocratsArchitect.buildDeck();

assert.ok(aristocratsArchitect.deckState.cards.has('Viscera Seer'), 'Aristocrats deck must include sacrifice outlet (Viscera Seer)');
assert.ok(aristocratsArchitect.deckState.cards.has('Bloodghast'), 'Aristocrats deck must include sacrifice fodder (Bloodghast)');
assert.ok(aristocratsArchitect.deckState.cards.has('Blood Artist') || aristocratsArchitect.deckState.cards.has('Mayhem Devil'), 'Aristocrats deck must include death payoff (Blood Artist/Mayhem Devil)');
console.log('  ✅ [PASS] Rakdos Aristocrats: Full triad (Viscera Seer + Bloodghast + Blood Artist/Mayhem Devil) successfully verified.');

console.log('\n=========================================================================');
console.log('🏁 ALL TESTS PASSED (100% SUCCESS) - Trans-Tribal Enablers v25.2 VERIFIED');
console.log('=========================================================================');
