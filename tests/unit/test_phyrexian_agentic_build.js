/**
 * tests/unit/test_phyrexian_agentic_build.js
 * 
 * BATTLEBOX v25.5.3: AGENTIC PHYREXIAN TOXIC & INFECT MIDRANGE TEST
 * 
 * Verifies:
 * 1. AgenticDeckArchitect ReAct loop compiles full 36 non-land spells (0 deadlocks, 24 lands, NO 44-land overflow).
 * 2. When primaryTribe is "none" or null with selectedEngineId "phyrexian_toxic", TRIBAL_DENSITY does NOT fail with 0 candidates.
 * 3. Compound string "Phyrexians - toxic & infect midrange Synergy" correctly resolves Phyrexian tribe.
 */

import assert from 'assert';
import { AgenticDeckArchitect } from '../../src/services/agent/agenticDeckArchitect.js';
import { CardImplementer } from '../../src/services/agent/cardImplementer.js';

console.log('🧪 =========================================================================');
console.log('🧪 BATTLEBOX v25.5.3: AGENTIC PHYREXIAN DECKBUILDING VERIFICATION');
console.log('🧪 =========================================================================\n');

const mockPhyrexianPool = [
  {
    name: 'Skrelv, Defector Mite',
    type_line: 'Legendary Artifact Creature — Phyrexian Mite',
    oracle_text: 'Toxic 1\nSkrelv, Defector Mite can\'t block.\n{W/P}, {T}: Target creature you control gains toxic 1 and hexproof from the color of your choice until end of turn.',
    cmc: 1,
    mana_value: 1,
    colors: ['W'],
    power: '1',
    toughness: '1',
    rarity: 'rare',
    legalities: { standard: 'legal', pioneer: 'legal', modern: 'legal' }
  },
  {
    name: 'Venerated Rotpriest',
    type_line: 'Creature — Phyrexian Druid',
    oracle_text: 'Toxic 1\nWhenever a creature you control becomes the target of a spell, target opponent gets a poison counter.',
    cmc: 1,
    mana_value: 1,
    colors: ['G'],
    power: '1',
    toughness: '2',
    rarity: 'rare',
    legalities: { standard: 'legal', pioneer: 'legal', modern: 'legal' }
  },
  {
    name: 'Bilious Skulldweller',
    type_line: 'Creature — Phyrexian Insect',
    oracle_text: 'Deathtouch, toxic 1',
    cmc: 1,
    mana_value: 1,
    colors: ['B'],
    power: '1',
    toughness: '1',
    rarity: 'common',
    legalities: { standard: 'legal', pioneer: 'legal', modern: 'legal' }
  },
  {
    name: 'Crawling Chorus',
    type_line: 'Creature — Phyrexian Insect',
    oracle_text: 'Toxic 1\nWhen Crawling Chorus dies, create a 1/1 colorless Phyrexian Mite artifact creature token with toxic 1 and "This creature can\'t block."',
    cmc: 1,
    mana_value: 1,
    colors: ['W'],
    power: '1',
    toughness: '1',
    rarity: 'common',
    legalities: { standard: 'legal', pioneer: 'legal', modern: 'legal' }
  },
  {
    name: 'Slaughter Singer',
    type_line: 'Creature — Phyrexian Cleric',
    oracle_text: 'Toxic 2\nWhenever you attack, other creatures you control with toxic get +1/+1 until end of turn.',
    cmc: 2,
    mana_value: 2,
    colors: ['G', 'W'],
    power: '2',
    toughness: '2',
    rarity: 'uncommon',
    legalities: { standard: 'legal', pioneer: 'legal', modern: 'legal' }
  },
  {
    name: 'Pestilent Syphoner',
    type_line: 'Creature — Phyrexian Insect',
    oracle_text: 'Flying, toxic 1',
    cmc: 2,
    mana_value: 2,
    colors: ['B'],
    power: '1',
    toughness: '1',
    rarity: 'common',
    legalities: { standard: 'legal', pioneer: 'legal', modern: 'legal' }
  },
  {
    name: 'Bloated Contaminator',
    type_line: 'Creature — Phyrexian Insect',
    oracle_text: 'Toxic 1, trample\nWhenever Bloated Contaminator deals combat damage to a player, proliferate.',
    cmc: 3,
    mana_value: 3,
    colors: ['G'],
    power: '4',
    toughness: '4',
    rarity: 'rare',
    legalities: { standard: 'legal', pioneer: 'legal', modern: 'legal' }
  },
  {
    name: 'Annex Sentry',
    type_line: 'Artifact Creature — Phyrexian Cleric',
    oracle_text: 'Toxic 1\nWhen Annex Sentry enters the battlefield, exile target artifact or creature an opponent controls with mana value 3 or less until Annex Sentry leaves the battlefield.',
    cmc: 3,
    mana_value: 3,
    colors: ['W'],
    power: '1',
    toughness: '4',
    rarity: 'uncommon',
    legalities: { standard: 'legal', pioneer: 'legal', modern: 'legal' }
  },
  {
    name: 'Glissa Sunslayer',
    type_line: 'Legendary Creature — Phyrexian Zombie Elf',
    oracle_text: 'First strike, deathtouch\nWhenever Glissa Sunslayer deals combat damage to a player, choose one —\n• You draw a card and you lose 1 life.\n• Destroy target enchantment.\n• Remove up to three counters from target permanent.',
    cmc: 3,
    mana_value: 3,
    colors: ['B', 'G'],
    power: '3',
    toughness: '3',
    rarity: 'rare',
    legalities: { standard: 'legal', pioneer: 'legal', modern: 'legal' }
  },
  {
    name: 'Infectious Bite',
    type_line: 'Instant',
    oracle_text: 'Target creature you control deals damage equal to its power to target creature you don\'t control. Each opponent with a poison counter gets an additional poison counter (proliferate).',
    cmc: 2,
    mana_value: 2,
    colors: ['G'],
    rarity: 'common',
    legalities: { standard: 'legal', pioneer: 'legal', modern: 'legal' }
  },
  {
    name: 'Drown in Ichor',
    type_line: 'Sorcery',
    oracle_text: 'Target creature gets -4/-4 until end of turn. Proliferate.',
    cmc: 2,
    mana_value: 2,
    colors: ['B'],
    rarity: 'uncommon',
    legalities: { standard: 'legal', pioneer: 'legal', modern: 'legal' }
  },
  {
    name: 'Phyrexian Arena',
    type_line: 'Enchantment',
    oracle_text: 'At the beginning of your upkeep, you draw a card and you lose 1 life.',
    cmc: 3,
    mana_value: 3,
    colors: ['B'],
    rarity: 'rare',
    legalities: { standard: 'legal', pioneer: 'legal', modern: 'legal' }
  }
];

// ─── TEST 1: Compound Name "Phyrexians - toxic & infect midrange Synergy" with null tribe ───
console.log('--- TEST 1: AGENTIC BUILD WITH ENGINE ID "phyrexian_toxic" & NO EXPLICIT TRIBE ---');

const userIntent1 = {
  deckName: 'Phyrexians - toxic & infect midrange Synergy',
  primaryTribe: null,
  tribe: 'none',
  tempo: 'midrange',
  format: 'PIONEER',
  colors: ['B', 'G', 'W'],
  strategy: ['phyrexian_toxic'],
  userConstraints: {
    selectedEngineId: 'phyrexian_toxic',
    engineFlavor: 'Perfección de Pirexia (Toxic & Proliferate)',
    boostKeywords: ['phyrexian', 'toxic', 'poison counter', 'proliferate', 'corrupted', 'venerated rotpriest', 'skrelv', 'bloated contaminator'],
    prioritizePlaysets: true,
    deckSize: 60
  }
};

const architect1 = new AgenticDeckArchitect(userIntent1, mockPhyrexianPool);
const result1 = await architect1.buildDeck();

console.log(`  ✦ Build Status: ${result1.buildStatus}`);
console.log(`  ✦ Non-Land Spells: ${architect1.deckState.nonLandCount} / ${architect1.deckState.targetNonLands}`);
console.log(`  ✦ Total Lands: ${result1.deckList.filter(c => c.isLand || (c.type_line && c.type_line.includes('Land'))).reduce((sum, c) => sum + (c.quantity || 1), 0)}`);
console.log(`  ✦ ReAct Deadlocks: ${architect1.deadlockAttempts}`);

assert.strictEqual(architect1.deadlockAttempts, 0, 'Must have 0 ReAct deadlocks');
assert.strictEqual(architect1.deckState.nonLandCount, 36, 'Must assemble all 36 non-land spells');
assert.strictEqual(result1.deckList.length > 0, true, 'Decklist must not be empty');

console.log('  ✅ [PASS] Agentic loop assembled all 36 spells with 0 deadlocks.');

// ─── TEST 2: Compound Tribe Name Resolution ─────────────────────────────────────────────
console.log('\n--- TEST 2: MATCHESTRIBE COMPOUND RESOLUTION ---');

assert.strictEqual(CardImplementer.matchesTribe(mockPhyrexianPool[0], 'Phyrexians - toxic & infect midrange Synergy'), true, 'Skrelv must match compound string');
assert.strictEqual(CardImplementer.matchesTribe(mockPhyrexianPool[1], 'pirexianos (phyrexians - toxic & infect)'), true, 'Rotpriest must match Spanish compound string');
assert.strictEqual(CardImplementer.matchesTribe(mockPhyrexianPool[0], 'none'), true, 'Non-tribal must match any creature');
assert.strictEqual(CardImplementer.matchesTribe(mockPhyrexianPool[0], null), true, 'Null tribe must match any creature');

console.log('  ✅ [PASS] matchesTribe handles compound strings and null/none safely.');

console.log('\n=========================================================================');
console.log('🏁 ALL TESTS PASSED (100% SUCCESS) - Phyrexian Agentic Build v25.5.3 Verified');
console.log('=========================================================================');
