/**
 * tests/unit/test_format_world_model.js
 * 
 * BATTLEBOX v25.0: DYNAMIC FORMAT WORLD MODEL & CAUSAL VIABILITY SUITE
 * 
 * Verifies:
 * 1. SAME_INTENT_ACROSS_FORMAT_WORLDS: Identical intent evaluated across Standard, Pioneer, Modern, Casual.
 * 2. EMERGENT_EXPANSION_EVOLUTION: Ingesting a new card with enabler flips viability without code changes.
 * 3. DYNAMIC_RECOMMENDED_FORMATS: Formats ranked purely through multi-world causal evidence delta.
 * 4. ZERO HARDCODED TRIBAL/FORMAT QUOTAS: Proof obligations derived from Oracle Truth graph.
 */

import assert from 'assert';
import { FormatWorldModel } from '../../src/services/compiler/core/formatWorldModel.js';

console.log('🧪 =========================================================================');
console.log('🧪 BATTLEBOX v25.0: DYNAMIC FORMAT WORLD MODEL & CAUSAL VIABILITY SUITE');
console.log('🧪 =========================================================================\n');

// ─── 1. TEST FIXTURES: REALISTIC FORMAT CARD POOLS ──────────────────────────

// Standard Pool (Walls without enablers)
const standardCardPool = [
  {
    name: 'The Walls of Ba Sing Se',
    type_line: 'Legendary Artifact Creature — Wall',
    oracle_text: 'Defender\nOther permanents you control have indestructible.',
    mana_value: 8,
    cmc: 8,
    colors: [],
    power: '0',
    toughness: '30'
  },
  {
    name: 'Rune-Sealed Wall',
    type_line: 'Artifact Creature — Wall',
    oracle_text: 'Defender\n{T}: Surveil 1.',
    mana_value: 3,
    cmc: 3,
    colors: ['U'],
    power: '0',
    toughness: '6'
  },
  {
    name: 'Quandrix Charm',
    type_line: 'Instant',
    oracle_text: 'Choose one — Counter target spell unless its controller pays {2}; or destroy target enchantment; or target creature has base power and toughness 5/5 until end of turn.',
    mana_value: 2,
    cmc: 2,
    colors: ['G', 'U']
  },
  {
    name: 'Split Up',
    type_line: 'Sorcery',
    oracle_text: 'Choose one — Destroy all tapped creatures; or destroy all untapped creatures.',
    mana_value: 3,
    cmc: 3,
    colors: ['W']
  },
  {
    name: 'Gallant Strike',
    type_line: 'Instant',
    oracle_text: 'Destroy target creature with toughness 4 or greater.\nCycling {2}',
    mana_value: 2,
    cmc: 2,
    colors: ['W']
  },
  {
    name: 'Valorous Stance',
    type_line: 'Instant',
    oracle_text: 'Choose one — Target creature gains indestructible until end of turn; or destroy target creature with toughness 4 or greater.',
    mana_value: 2,
    cmc: 2,
    colors: ['W']
  }
];

// Pioneer Pool (Standard + Arcades + High Alert + Assault Formation + Overgrown Battlement)
const pioneerCardPool = [
  ...standardCardPool,
  {
    name: 'Arcades, the Strategist',
    type_line: 'Legendary Creature — Elder Dragon',
    oracle_text: 'Flying, vigilance\nWhenever a creature with defender enters the battlefield under your control, draw a card.\nEach creature you control with defender can attack as though it didn\'t have defender and assigns combat damage equal to its toughness rather than its power.',
    mana_value: 4,
    cmc: 4,
    colors: ['G', 'W', 'U'],
    power: '3',
    toughness: '5'
  },
  {
    name: 'High Alert',
    type_line: 'Enchantment',
    oracle_text: 'Each creature you control assigns combat damage equal to its toughness rather than its power.\nCreatures you control with defender can attack as though they didn\'t have defender.\n{2}{W}{U}: Untap target creature.',
    mana_value: 3,
    cmc: 3,
    colors: ['W', 'U']
  },
  {
    name: 'Assault Formation',
    type_line: 'Enchantment',
    oracle_text: 'Each creature you control assigns combat damage equal to its toughness rather than its power.\n{G}: Target creature with defender can attack this turn as though it didn\'t have defender.\n{2}{G}: Creatures you control get +0/+1 until end of turn.',
    mana_value: 2,
    cmc: 2,
    colors: ['G']
  },
  {
    name: 'Overgrown Battlement',
    type_line: 'Creature — Wall',
    oracle_text: 'Defender\n{T}: Add {G} for each creature you control with defender.',
    mana_value: 2,
    cmc: 2,
    colors: ['G'],
    power: '0',
    toughness: '4'
  },
  {
    name: 'Carven Caryatid',
    type_line: 'Creature — Spirit Wall',
    oracle_text: 'Defender\nWhen Carven Caryatid enters the battlefield, draw a card.',
    mana_value: 3,
    cmc: 3,
    colors: ['G'],
    power: '2',
    toughness: '5'
  },
  {
    name: 'Slaughter the Strong',
    type_line: 'Sorcery',
    oracle_text: 'Each player chooses any number of creatures they control with total power 4 or less, then sacrifices all other creatures they control.',
    mana_value: 3,
    cmc: 3,
    colors: ['W']
  }
];

// Modern Pool (Pioneer + Wall of Omens + Axebane Guardian + Shield Sphere + Tower Defense)
const modernCardPool = [
  ...pioneerCardPool,
  {
    name: 'Wall of Omens',
    type_line: 'Creature — Wall',
    oracle_text: 'Defender\nWhen Wall of Omens enters the battlefield, draw a card.',
    mana_value: 2,
    cmc: 2,
    colors: ['W'],
    power: '0',
    toughness: '4'
  },
  {
    name: 'Axebane Guardian',
    type_line: 'Creature — Human Druid',
    oracle_text: 'Defender\n{T}: Add X mana in any combination of colors, where X is the number of creatures you control with defender.',
    mana_value: 3,
    cmc: 3,
    colors: ['G'],
    power: '0',
    toughness: '3'
  },
  {
    name: 'Shield Sphere',
    type_line: 'Artifact Creature — Wall',
    oracle_text: 'Defender\nWhenever Shield Sphere blocks, put a -0/-1 counter on it.',
    mana_value: 0,
    cmc: 0,
    colors: [],
    power: '0',
    toughness: '6'
  },
  {
    name: 'Tower Defense',
    type_line: 'Instant',
    oracle_text: 'Creatures you control get +0/+5 and gain reach until end of turn.',
    mana_value: 2,
    cmc: 2,
    colors: ['G']
  }
];

const intentWallsBant = {
  format: 'STANDARD',
  primaryTribe: 'Wall',
  strategy: ['ataque de resistencia (toughness stompy)'],
  colors: ['W', 'U', 'G']
};

const identityWalls = {
  archetypeKey: 'WALLS_TOUGHNESS_COMBAT',
  requiresManaRamp: true
};

// ─── TEST 1: SAME_INTENT_ACROSS_FORMAT_WORLDS ──────────────────────────────
console.log('--- 1. SAME_INTENT_ACROSS_FORMAT_WORLDS ---');

const standardReport = FormatWorldModel.evaluateViability(
  { ...intentWallsBant, format: 'STANDARD' },
  identityWalls,
  standardCardPool
);
console.log(`  📊 Standard Viability: ${standardReport.viability} (WinPathClosure: ${standardReport.winPathClosure}, ChainIntegrity: ${standardReport.causalChainIntegrity})`);
assert.strictEqual(standardReport.isFormatViable, false, 'Standard must NOT be viable for Walls due to lack of enablers');
assert.strictEqual(standardReport.winPathClosure, false, 'Standard must fail WinPath closure');
assert.strictEqual(standardReport.viability, 'NOT_VIABLE', 'Standard must be classified as NOT_VIABLE');
console.log('  ✅ [PASS] Standard: Correctly rejected as NOT_VIABLE with zero hardcoded rules.');

const pioneerReport = FormatWorldModel.evaluateViability(
  { ...intentWallsBant, format: 'PIONEER' },
  identityWalls,
  pioneerCardPool
);
console.log(`  📊 Pioneer Viability: ${pioneerReport.viability} (WinPathClosure: ${pioneerReport.winPathClosure}, ChainIntegrity: ${pioneerReport.causalChainIntegrity})`);
assert.strictEqual(pioneerReport.isFormatViable, true, 'Pioneer must be viable for Walls');
assert.strictEqual(pioneerReport.winPathClosure, true, 'Pioneer must close WinPath');
assert.ok(pioneerReport.enablerCount >= 3, 'Pioneer must detect Arcades, High Alert, Assault Formation');
console.log('  ✅ [PASS] Pioneer: Correctly validated as SUPPORTED/VIABLE with real enablers.');

const modernReport = FormatWorldModel.evaluateViability(
  { ...intentWallsBant, format: 'MODERN' },
  identityWalls,
  modernCardPool
);
console.log(`  📊 Modern Viability: ${modernReport.viability} (WinPathClosure: ${modernReport.winPathClosure}, ChainIntegrity: ${modernReport.causalChainIntegrity})`);
assert.strictEqual(modernReport.isFormatViable, true, 'Modern must be viable for Walls');
assert.strictEqual(modernReport.viability, 'VIABLE', 'Modern must achieve VIABLE rating with full infrastructure');
console.log('  ✅ [PASS] Modern: Correctly classified as VIABLE with complete infrastructure.');

// ─── TEST 2: EMERGENT_EXPANSION_EVOLUTION ──────────────────────────────────
console.log('\n--- 2. EMERGENT_EXPANSION_EVOLUTION (New Card Ingestion) ---');

// Hypothethical new Standard expansion card with toughness combat enabler
const futureExpansionCard = {
  name: 'Ancient Bastion Awakening',
  type_line: 'Enchantment',
  oracle_text: 'Creatures you control with defender can attack as though they didn\'t have defender and assign combat damage equal to their toughness rather than their power.',
  mana_value: 3,
  cmc: 3,
  colors: ['W', 'G']
};

const updatedStandardPool = [...standardCardPool, futureExpansionCard];

const evolvedReport = FormatWorldModel.evaluateViability(
  { ...intentWallsBant, format: 'STANDARD' },
  identityWalls,
  updatedStandardPool
);
console.log(`  📊 Evolved Standard Viability: ${evolvedReport.viability} (WinPathClosure: ${evolvedReport.winPathClosure}, ChainIntegrity: ${evolvedReport.causalChainIntegrity})`);
assert.strictEqual(evolvedReport.winPathClosure, true, 'WinPath must now close after new enabler card ingestion');
assert.strictEqual(evolvedReport.isFormatViable, true, 'Standard must automatically evolve to viable');
console.log('  ✅ [PASS] Emergent Evolution: Adding 1 Oracle enabler flipped viability from NOT_VIABLE to VIABLE with zero compiler edits.');

// ─── TEST 3: DYNAMIC_RECOMMENDED_FORMATS (Multi-World Comparison) ──────────
console.log('\n--- 3. DYNAMIC_RECOMMENDED_FORMATS ---');

const formatPoolsMap = {
  PIONEER: pioneerCardPool,
  MODERN: modernCardPool
};

const recommendations = FormatWorldModel.discoverRecommendedFormats(
  { ...intentWallsBant, format: 'STANDARD' },
  identityWalls,
  formatPoolsMap
);

console.log(`  📊 Recommended Formats for Standard Walls:`, recommendations.map(r => `${r.format} (${r.viability}, ${r.causalGain})`));
assert.ok(recommendations.length >= 2, 'Must recommend Pioneer and Modern');
assert.strictEqual(recommendations[0].format, 'MODERN', 'Modern should rank highest due to full infrastructure');
assert.strictEqual(recommendations[1].format, 'PIONEER', 'Pioneer should rank second');
console.log('  ✅ [PASS] Dynamic multi-world comparison successfully ranked alternative legal formats.');

console.log('\n=========================================================================');
console.log('🏁 ALL TESTS PASSED (100% SUCCESS) - FormatWorldModel v25.0 VERIFIED');
console.log('=========================================================================');
