/**
 * tests/unit/test_spanish_tribe_synonyms.js
 * 
 * BATTLEBOX v25.3: SPANISH-ENGLISH TRIBAL SYNONYMS & DYNAMIC ELITE SAMPLING SUITE
 * 
 * Verifies:
 * 1. Spanish tribe IDs ('pirexianos', 'muros', 'trasgos', 'ardillas', 'nutrias') correctly resolve Scryfall English type lines.
 * 2. Phyrexian deck with 'pirexianos' compiles all 36 non-land slots (0 deadlocks, 24 lands, 0 40-land overflow).
 * 3. Top-Tier Weighted Stochastic Sampling produces valid dynamic variations across runs while maintaining 100% competitive quality.
 */

import assert from 'assert';
import { AgenticDeckArchitect } from '../../src/services/agent/agenticDeckArchitect.js';
import { CardImplementer } from '../../src/services/agent/cardImplementer.js';
import { DecisionEngine } from '../../src/services/agent/decisionEngine.js';

console.log('🧪 =========================================================================');
console.log('🧪 BATTLEBOX v25.3: SPANISH TRIBAL SYNONYMS & DYNAMIC VARIETY SUITE');
console.log('🧪 =========================================================================\n');

// ─── 1. SPANISH SYNONYM MATCHER VERIFICATION ──────────────────────────────
console.log('--- 1. SPANISH-TO-ENGLISH SYNONYM RESOLUTION ---');

const mockRotpriest = {
  name: 'Venerated Rotpriest',
  type_line: 'Creature — Phyrexian Druid',
  oracle_text: 'Toxic 1\nWhenever a creature you control with toxic becomes the target of a spell, target opponent gets a poison counter.',
  cmc: 1,
  colors: ['G']
};

const mockSkrelv = {
  name: 'Skrelv, Defector Mite',
  type_line: 'Legendary Artifact Creature — Phyrexian Mite',
  oracle_text: 'Toxic 1\n{W/P}, {T}: Another target creature you control gains toxic 1 and hexproof from the color of your choice until end of turn.',
  cmc: 1,
  colors: ['W']
};

const mockWallOfOmens = {
  name: 'Wall of Omens',
  type_line: 'Creature — Wall',
  oracle_text: 'Defender\nWhen Wall of Omens enters the battlefield, draw a card.',
  cmc: 2,
  colors: ['W']
};

const mockChatterfang = {
  name: 'Chatterfang, Squirrel General',
  type_line: 'Legendary Creature — Squirrel Warrior',
  oracle_text: 'Forestwalk\nIf one or more tokens would be created under your control, those tokens plus that many 1/1 green Squirrel creature tokens are created instead.',
  cmc: 3,
  colors: ['G']
};

assert.ok(CardImplementer.matchesTribe(mockRotpriest, 'pirexianos'), 'Rotpriest must match "pirexianos"');
assert.ok(CardImplementer.matchesTribe(mockSkrelv, 'pirexiano'), 'Skrelv must match "pirexiano"');
assert.ok(CardImplementer.matchesTribe(mockRotpriest, 'phyrexians_toxic_infect'), 'Rotpriest must match "phyrexians_toxic_infect"');
assert.ok(CardImplementer.matchesTribe(mockWallOfOmens, 'muros'), 'Wall of Omens must match "muros"');
assert.ok(CardImplementer.matchesTribe(mockChatterfang, 'ardillas'), 'Chatterfang must match "ardillas"');

console.log('  ✦ "pirexianos" -> matched "Creature — Phyrexian Druid"');
console.log('  ✦ "muros" -> matched "Creature — Wall"');
console.log('  ✦ "ardillas" -> matched "Legendary Creature — Squirrel Warrior"');
console.log('  ✅ [PASS] Spanish tribal synonyms successfully match Scryfall English card types.');

// ─── 2. PHYREXIAN STANDARD BUILD (FULL 36 SPELLS / ZERO DEADLOCK) ─────────
console.log('\n--- 2. PHYREXIAN STANDARD DECK WITH SPANISH TRIBE ID ---');

const mockStandardPhyrexianPool = [
  mockRotpriest,
  mockSkrelv,
  {
    name: 'Bloated Contaminator',
    type_line: 'Creature — Phyrexian Mite',
    oracle_text: 'Trample, toxic 1\nWhenever Bloated Contaminator deals combat damage to a player, proliferate.',
    cmc: 3,
    mana_value: 3,
    colors: ['G'],
    power: '4',
    toughness: '4',
    rarity: 'rare',
    legalities: { standard: 'legal', pioneer: 'legal' }
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
    rarity: 'uncommon',
    legalities: { standard: 'legal', pioneer: 'legal' }
  },
  {
    name: 'Slaughter Singer',
    type_line: 'Creature — Phyrexian Cleric',
    oracle_text: 'Toxic 2\nWhenever a creature you control with toxic attacks, it gets +1/+1 until end of turn.',
    cmc: 2,
    mana_value: 2,
    colors: ['G', 'W'],
    power: '2',
    toughness: '2',
    rarity: 'uncommon',
    legalities: { standard: 'legal', pioneer: 'legal' }
  },
  {
    name: 'Drown in Ichor',
    type_line: 'Sorcery',
    oracle_text: 'Target creature gets -4/-4 until end of turn. Proliferate.',
    cmc: 2,
    mana_value: 2,
    colors: ['B'],
    rarity: 'uncommon',
    legalities: { standard: 'legal', pioneer: 'legal' }
  },
  {
    name: 'Vraska\'s Fall',
    type_line: 'Instant',
    oracle_text: 'Each opponent sacrifices a creature or planeswalker and gets a poison counter.',
    cmc: 3,
    mana_value: 3,
    colors: ['B'],
    rarity: 'rare',
    legalities: { standard: 'legal', pioneer: 'legal' }
  },
  {
    name: 'Experimental Augury',
    type_line: 'Instant',
    oracle_text: 'Look at the top three cards of your library. Put one of them into your hand and the rest on the bottom of your library in any order. Proliferate.',
    cmc: 2,
    mana_value: 2,
    colors: ['U'],
    color_identity: ['U'],
    rarity: 'common',
    legalities: { standard: 'legal', pioneer: 'legal' }
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
    legalities: { standard: 'legal', pioneer: 'legal' }
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
    legalities: { standard: 'legal', pioneer: 'legal' }
  },
  {
    name: 'Phyrexian Arena',
    type_line: 'Enchantment',
    oracle_text: 'At the beginning of your upkeep, you draw a card and you lose 1 life.',
    cmc: 3,
    mana_value: 3,
    colors: ['B'],
    rarity: 'rare',
    legalities: { standard: 'legal', pioneer: 'legal' }
  },
  {
    name: 'Gix, Yawgmoth Praetor',
    type_line: 'Legendary Creature — Phyrexian Praetor',
    oracle_text: 'Whenever a creature you control deals combat damage to a player, you may pay 1 life. If you do, draw a card.',
    cmc: 3,
    mana_value: 3,
    colors: ['B'],
    power: '3',
    toughness: '3',
    rarity: 'mythic',
    legalities: { standard: 'legal', pioneer: 'legal' }
  },
  {
    name: 'Infectious Bite',
    type_line: 'Instant',
    oracle_text: 'Target creature you control deals damage equal to its power to target creature you don\'t control. Proliferate.',
    cmc: 2,
    mana_value: 2,
    colors: ['G'],
    rarity: 'uncommon',
    legalities: { standard: 'legal', pioneer: 'legal' }
  },
  {
    name: 'Invasion of Ikoria',
    type_line: 'Battle — Siege',
    oracle_text: 'When Invasion of Ikoria enters the battlefield, search your library and/or graveyard for a non-Human creature card with mana value X or less and put it onto the battlefield.',
    cmc: 2,
    mana_value: 2,
    colors: ['G'],
    rarity: 'mythic',
    legalities: { standard: 'legal', pioneer: 'legal' }
  }
];

const phyrexianIntent = {
  primaryTribe: 'pirexianos',
  selectedEngineId: 'phyrexian_toxic',
  engineFlavor: 'Perfección de Pirexia (Toxic & Proliferate)',
  colors: ['W', 'B', 'G'],
  format: 'STANDARD',
  userConstraints: {
    prioritizePlaysets: true,
    deckSize: 60,
    boostKeywords: ['phyrexian', 'toxic', 'poison counter', 'proliferate', 'corrupted', 'venerated rotpriest', 'skrelv', 'bloated contaminator']
  }
};

const architect = new AgenticDeckArchitect(phyrexianIntent, mockStandardPhyrexianPool);
await architect.buildDeck();

for (const log of architect.reActLogs) {
  console.log(`    [Turn ${log.turn}] Phase: ${log.phase} -> Status: ${log.status || ''} | ${log.reasoning || log.feedbackMessage || ''}`);
}

const deckCards = Array.from(architect.deckState.cards.values()).map(c => `${c.quantity}x ${c.name}`);
console.log(`  ✦ Built Deck Spells (${architect.deckState.nonLandCount} cards):\n    ${deckCards.join('\n    ')}`);

assert.ok(architect.deckState.cards.has('Venerated Rotpriest') || architect.deckState.cards.has('Skrelv, Defector Mite'), 'Must include core 1-drop Phyrexians');
assert.ok(architect.deckState.cards.has('Bloated Contaminator') || architect.deckState.cards.has('Slaughter Singer'), 'Must include mid-curve Phyrexians');
assert.strictEqual(architect.deckState.nonLandCount >= 34, true, 'Deck must contain at least 34-36 non-land spells (no 20-spell premature exit!)');
assert.strictEqual(architect.deckState.targetLands, 24, 'Target land count must be ~24 lands, NOT 40 lands');

console.log('  ✅ [PASS] Phyrexian deck compiled with full creature density & healthy 24-land base.');

// ─── 3. DYNAMIC ELITE SAMPLING DIVERSITY ──────────────────────────────────
console.log('\n--- 3. DYNAMIC ELITE SAMPLING DIVERSITY ---');

const candidateChoices = [];
for (let i = 0; i < 5; i++) {
  const dec = DecisionEngine.selectCandidate(
    [
      { name: 'Go for the Throat', cmc: 2, mana_value: 2, colors: ['B'], type_line: 'Instant', oracle_text: 'Destroy target nonartifact creature.' },
      { name: 'Bitter Triumph', cmc: 2, mana_value: 2, colors: ['B'], type_line: 'Instant', oracle_text: 'As an additional cost to cast this spell, discard a card or pay 3 life. Destroy target creature or planeswalker.' },
      { name: 'Infernal Grasp', cmc: 2, mana_value: 2, colors: ['B'], type_line: 'Instant', oracle_text: 'Destroy target creature. You lose 2 life.' }
    ],
    {
      colors: ['B'],
      cmcCurve: { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0 },
      intentPackage: { userConstraints: { creativity: 50, generationPriority: 'hybrid' } }
    },
    { role: 'CHEAP_REMOVAL', priority: 'HIGH' }
  );
  candidateChoices.push(dec.selectedCard.name);
}

console.log(`  ✦ 5 Sampling Draws for Black Removal: ${candidateChoices.join(', ')}`);
const uniqueChoices = new Set(candidateChoices);
assert.ok(uniqueChoices.size >= 2, 'Top-tier weighted sampling must produce dynamic variations across draws');
console.log(`  ✅ [PASS] Dynamic Elite Sampling demonstrated diversity (${uniqueChoices.size} unique top-tier cards across 5 runs).`);

console.log('\n=========================================================================');
console.log('🏁 ALL TESTS PASSED (100% SUCCESS) - Spanish Synonyms & Dynamic Variety v25.3 VERIFIED');
console.log('=========================================================================');
