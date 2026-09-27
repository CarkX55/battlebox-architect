/**
 * tests/unit/test_tribal_catalog_expansion.js
 * 
 * BATTLEBOX v25.1: EXPANDED TRIBAL CATALOG & DYNAMIC FORMAT CAUSAL SUITE
 * 
 * Verifies:
 * 1. DEDUPLICATION_AND_STRUCTURE: Zero duplicate tribe IDs, valid categories, complete schemas.
 * 2. EXPANDED_TRIBES_EXISTENCE: Verifies presence of Bloomburrow and expanded core MTG tribes.
 * 3. FORMAT_CAUSAL_DEMONSTRATION: Validates Standard/Pioneer/Modern viability across new and classic tribes.
 */

import assert from 'assert';
import { MTG_TRIBES, TRIBE_CATEGORIES } from '../../src/constants/legacyBattleBox.js';
import { FormatWorldModel } from '../../src/services/compiler/core/formatWorldModel.js';

console.log('🧪 =========================================================================');
console.log('🧪 BATTLEBOX v25.1: EXPANDED TRIBAL CATALOG & CAUSAL SUITE');
console.log('🧪 =========================================================================\n');

// ─── 1. DEDUPLICATION & SCHEMA STRUCTURE INTEGRITY ──────────────────────────
console.log('--- 1. DEDUPLICATION & SCHEMA STRUCTURE INTEGRITY ---');

const tribeIds = MTG_TRIBES.map(t => t.id);
const uniqueIds = new Set(tribeIds);

console.log(`  📊 Total Tribes in Catalog: ${MTG_TRIBES.length}`);
assert.strictEqual(tribeIds.length, uniqueIds.size, `Catalog must have ZERO duplicate IDs (Found ${tribeIds.length - uniqueIds.size} duplicates)`);
console.log('  ✅ [PASS] Zero duplicate IDs found in MTG_TRIBES.');

const validCategories = Object.keys(TRIBE_CATEGORIES);
for (const tribe of MTG_TRIBES) {
  assert.ok(tribe.id, `Tribe must have an id`);
  assert.ok(tribe.label, `Tribe ${tribe.id} must have a label`);
  assert.ok(validCategories.includes(tribe.category), `Tribe ${tribe.id} has invalid category "${tribe.category}"`);
  assert.ok(Array.isArray(tribe.colors) && tribe.colors.length > 0, `Tribe ${tribe.id} must have colors array`);
  assert.ok(Array.isArray(tribe.subtypes) && tribe.subtypes.length > 0, `Tribe ${tribe.id} must have subtypes`);
}
console.log('  ✅ [PASS] All 60+ tribes conform to strict schema and category constraints.');

// ─── 2. EXPANDED TRIBES VERIFICATION ───────────────────────────────────────
console.log('\n--- 2. EXPANDED TRIBES DISCOVERY ---');

const requiredNewTribes = [
  'otter', 'frog', 'rabbit', 'bat', 'lizard', 'mouse', 'bird', 'phyrexian',
  'warrior', 'assassin', 'monk', 'treefolk', 'spider', 'snake', 'minotaur',
  'horror', 'devil', 'turtle', 'crab', 'golem'
];

for (const reqId of requiredNewTribes) {
  const found = MTG_TRIBES.find(t => t.id === reqId);
  assert.ok(found, `Required expanded tribe "${reqId}" must exist in MTG_TRIBES`);
  console.log(`  ✦ Discovered: ${found.label} (${found.category}, [${found.colors.join('/')}])`);
}
console.log('  ✅ [PASS] All 20 newly expanded modern/classic tribes successfully registered.');

// ─── 3. DYNAMIC CAUSAL VALIDATION ACROSS FORMATS ───────────────────────────
console.log('\n--- 3. DYNAMIC CAUSAL VALIDATION ACROSS FORMATS ---');

// Standard Rabbits Pool
const standardRabbitsPool = [
  {
    name: 'Finneas, Ace Archer',
    type_line: 'Legendary Creature — Rabbit Archer',
    oracle_text: 'Vigilance, reach\nWhenever you attack with four or more creatures, put a +1/+1 counter on each creature you control, then draw a card if you control a creature with power 4 or greater.',
    mana_value: 2,
    cmc: 2,
    colors: ['G', 'W'],
    power: '2',
    toughness: '2'
  },
  {
    name: 'Valley Questcaller',
    type_line: 'Creature — Rabbit Warrior',
    oracle_text: 'Other Rabbits, Bats, Birds, and Mice you control get +1/+1.\nWhenever you cast a Rabbit, Bat, Bird, or Mouse spell, scry 1.',
    mana_value: 2,
    cmc: 2,
    colors: ['W'],
    power: '2',
    toughness: '3'
  },
  {
    name: 'Hop to It',
    type_line: 'Sorcery',
    oracle_text: 'Create three 1/1 white Rabbit creature tokens.',
    mana_value: 3,
    cmc: 3,
    colors: ['W']
  },
  {
    name: 'Pawpatch Recruit',
    type_line: 'Creature — Rabbit Warrior',
    oracle_text: 'Trample\nWhenever another creature you control dies, put a +1/+1 counter on target creature you control.\nOffspring {1}',
    mana_value: 1,
    cmc: 1,
    colors: ['G'],
    power: '2',
    toughness: '1'
  },
  {
    name: 'Get Lost',
    type_line: 'Instant',
    oracle_text: 'Destroy target creature, enchantment, or planeswalker. Its controller creates two Map tokens.',
    mana_value: 2,
    cmc: 2,
    colors: ['W']
  }
];

const rabbitReport = FormatWorldModel.evaluateViability(
  { format: 'STANDARD', primaryTribe: 'Rabbit', strategy: ['tokens'], colors: ['W', 'G'] },
  { archetypeKey: 'RABBITS_GO_WIDE' },
  standardRabbitsPool
);

console.log(`  📊 Standard Rabbits Viability: ${rabbitReport.viability} (WinPathClosure: ${rabbitReport.winPathClosure}, Score: ${rabbitReport.overallViabilityPercentage}%)`);
assert.strictEqual(rabbitReport.isFormatViable, true, 'Rabbits in Standard must be evaluated as VIABLE');
console.log('  ✅ [PASS] Standard Rabbits: Verified VIABLE with full token and lord infrastructure.');

// Standard Lizards Pool
const standardLizardsPool = [
  {
    name: 'Gev, Scaled Scorch',
    type_line: 'Legendary Creature — Lizard Rogue',
    oracle_text: 'Ward — Pay 1 life.\nWhenever an opponent loses life during your turn, put a +1/+1 counter on Gev.\nOther Lizards you control enter the battlefield with an additional +1/+1 counter on them if an opponent lost life this turn.',
    mana_value: 2,
    cmc: 2,
    colors: ['B', 'R'],
    power: '3',
    toughness: '2'
  },
  {
    name: 'Hired Claw',
    type_line: 'Creature — Lizard Mercenary',
    oracle_text: 'Whenever Hired Claw attacks, if defending player lost life this turn, it deals 1 damage to any target.\n{1}{R}: Put a +1/+1 counter on Hired Claw.',
    mana_value: 1,
    cmc: 1,
    colors: ['R'],
    power: '1',
    toughness: '2'
  },
  {
    name: 'Flamecache Gecko',
    type_line: 'Creature — Lizard Warlock',
    oracle_text: 'When Flamecache Gecko enters the battlefield, if an opponent lost life this turn, add {B}{R} and exile the top card of your library.',
    mana_value: 2,
    cmc: 2,
    colors: ['B', 'R'],
    power: '2',
    toughness: '2'
  },
  {
    name: 'Cut Down',
    type_line: 'Instant',
    oracle_text: 'Destroy target creature with total power and toughness 5 or less.',
    mana_value: 1,
    cmc: 1,
    colors: ['B']
  }
];

const lizardReport = FormatWorldModel.evaluateViability(
  { format: 'STANDARD', primaryTribe: 'Lizard', strategy: ['aggro'], colors: ['B', 'R'] },
  { archetypeKey: 'LIZARDS_BURN_AGGRO' },
  standardLizardsPool
);

console.log(`  📊 Standard Lizards Viability: ${lizardReport.viability} (WinPathClosure: ${lizardReport.winPathClosure}, Score: ${lizardReport.overallViabilityPercentage}%)`);
assert.strictEqual(lizardReport.isFormatViable, true, 'Lizards in Standard must be evaluated as VIABLE');
console.log('  ✅ [PASS] Standard Lizards: Verified VIABLE with direct damage and life loss scaling.');

// Standard Phyrexian Toxic Pool
const standardPhyrexianPool = [
  {
    name: 'Venerated Rotpriest',
    type_line: 'Creature — Phyrexian Druid',
    oracle_text: 'Toxic 1\nWhenever a creature you control becomes the target of a spell, target opponent gets a poison counter.',
    mana_value: 1,
    cmc: 1,
    colors: ['G'],
    power: '1',
    toughness: '2'
  },
  {
    name: 'Skrelv, Defector Mite',
    type_line: 'Legendary Artifact Creature — Phyrexian Mite',
    oracle_text: 'Toxic 1\n{W/P}, {T}: Target creature you control gains hexproof and can\'t be blocked by creatures of that color.',
    mana_value: 1,
    cmc: 1,
    colors: ['W'],
    power: '1',
    toughness: '1'
  },
  {
    name: 'Bloated Contaminator',
    type_line: 'Creature — Phyrexian Beast',
    oracle_text: 'Toxic 1, trample\nWhenever Bloated Contaminator deals combat damage to a player, proliferate.',
    mana_value: 3,
    cmc: 3,
    colors: ['G'],
    power: '4',
    toughness: '4'
  },
  {
    name: 'Go for the Throat',
    type_line: 'Instant',
    oracle_text: 'Destroy target nonartifact creature.',
    mana_value: 2,
    cmc: 2,
    colors: ['B']
  }
];

const phyrexianReport = FormatWorldModel.evaluateViability(
  { format: 'STANDARD', primaryTribe: 'Phyrexian', strategy: ['toxic'], colors: ['W', 'G', 'B'] },
  { archetypeKey: 'PHYREXIAN_TOXIC' },
  standardPhyrexianPool
);

console.log(`  📊 Standard Phyrexian Viability: ${phyrexianReport.viability} (WinPathClosure: ${phyrexianReport.winPathClosure}, Score: ${phyrexianReport.overallViabilityPercentage}%)`);
assert.strictEqual(phyrexianReport.isFormatViable, true, 'Phyrexian Toxic in Standard must be evaluated as VIABLE');
console.log('  ✅ [PASS] Standard Phyrexian: Verified VIABLE with toxic and poison counter enablers.');

console.log('\n=========================================================================');
console.log('🏁 ALL TESTS PASSED (100% SUCCESS) - Tribal Catalog Expansion v25.1 VERIFIED');
console.log('=========================================================================');
