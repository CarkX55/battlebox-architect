/**
 * tests/unit/compiler/test_agentic_tron_ramp.js
 * 
 * Verifies that AgenticDeckArchitect compiles Ramp / Tron Big Mana decks
 * with actual ramp acceleration, tutors, and apex finishers (not counterspell control piles).
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { AgenticDeckArchitect } from '../../../src/services/agent/agenticDeckArchitect.js';
import { IntentBuilder } from '../../../src/services/compiler/core/intentBuilder.js';

const mockTronPool = [
  // Tron / Ramp Acceleration & Tutors
  { name: 'Expedition Map', cmc: 1, type_line: 'Artifact', colors: [], oracle_text: '{2}, {T}, Sacrifice Expedition Map: Search your library for a land card, reveal it, put it into your hand, then shuffle.', rarity: 'uncommon' },
  { name: 'Ancient Stirrings', cmc: 1, type_line: 'Sorcery', colors: ['G'], oracle_text: 'Look at the top five cards of your library. You may reveal a colorless card from among them and put it into your hand.', rarity: 'common' },
  { name: 'Sylvan Scrying', cmc: 2, type_line: 'Sorcery', colors: ['G'], oracle_text: 'Search your library for a land card, reveal it, put it into your hand, then shuffle.', rarity: 'uncommon' },
  { name: 'Chromatic Star', cmc: 1, type_line: 'Artifact', colors: [], oracle_text: '{1}, {T}, Sacrifice Chromatic Star: Add one mana of any color. When Chromatic Star is put into a graveyard from the battlefield, draw a card.', rarity: 'common' },
  { name: 'Chromatic Sphere', cmc: 1, type_line: 'Artifact', colors: [], oracle_text: '{1}, {T}, Sacrifice Chromatic Sphere: Add one mana of any color. Draw a card.', rarity: 'common' },
  // Interaction
  { name: 'Dismember', cmc: 3, type_line: 'Instant', colors: ['B'], oracle_text: 'Target creature gets -5/-5 until end of turn.', rarity: 'uncommon' },
  { name: 'Oblivion Stone', cmc: 3, type_line: 'Artifact', colors: [], oracle_text: '{4}, {T}, Sacrifice Oblivion Stone: Destroy each nonland permanent without a fate counter on it.', rarity: 'rare' },
  // Big Mana Apex Payoffs
  { name: 'Karn Liberated', cmc: 7, type_line: 'Legendary Planeswalker — Karn', colors: [], oracle_text: '+4: Target player exiles a card from their hand. -3: Exile target permanent.', rarity: 'mythic' },
  { name: 'Wurmcoil Engine', cmc: 6, type_line: 'Artifact Creature — Phyrexian Wurm', power: '6', toughness: '6', colors: [], oracle_text: 'Deathtouch, lifelink. When Wurmcoil Engine dies, create a 3/3 token.', rarity: 'mythic' },
  { name: 'Ulamog, the Ceaseless Hunger', cmc: 10, type_line: 'Legendary Creature — Eldrazi', power: '10', toughness: '10', colors: [], oracle_text: 'When you cast this spell, exile two target permanents. Indestructible.', rarity: 'mythic' },
  { name: 'Ugin, the Spirit Dragon', cmc: 8, type_line: 'Legendary Planeswalker — Ugin', colors: [], oracle_text: '+2: Ugin deals 3 damage to any target. -X: Exile each colored permanent with mana value X or less.', rarity: 'mythic' }
];

test('AgenticDeckArchitect compiles Tron / Ramp Big Mana into ramp tutors + apex finishers', async () => {
  const rawForm = {
    formato: 'MODERN',
    colores: ['G', 'C'],
    archetype: 'Ramp',
    selectedEngineId: 'tron_generic',
    engineFlavor: 'Tron Big Mana',
    boostKeywords: ['add ', 'mana', 'expedition map', 'ancient stirrings', 'wurmcoil', 'karn'],
    deckSize: 60
  };

  const intentPackage = IntentBuilder.buildFromUI(rawForm);
  const architect = new AgenticDeckArchitect(intentPackage, mockTronPool);
  const result = await architect.buildDeck();

  const deckList = result.deckList || [];
  const nonLandCards = deckList.filter(c => !c.type_line?.toLowerCase().includes('land'));
  const cardNames = nonLandCards.map(c => c.name);
  const nonLandTotal = nonLandCards.reduce((sum, c) => sum + (c.quantity || 1), 0);

  const landCards = deckList.filter(c => c.type_line?.toLowerCase().includes('land'));
  const landTotal = landCards.reduce((sum, c) => sum + (c.quantity || 1), 0);

  console.log(`📊 Tron / Ramp Build Result:`);
  console.log(`   - Status: ${result.buildStatus}`);
  console.log(`   - Non-Lands Total: ${nonLandTotal}/34`);
  console.log(`   - Lands Total: ${landTotal}/26`);
  console.log(`   - Total Deck Size: ${nonLandTotal + landTotal}/60`);
  console.log(`   - Cards Chosen:`, cardNames);

  assert.equal(nonLandTotal + landTotal, 60);
  assert.equal(result.buildStatus, 'SUCCESS');
  assert.ok(cardNames.some(n => n.includes('Expedition Map') || n.includes('Ancient Stirrings') || n.includes('Sylvan Scrying')), 'Should include Tron/Ramp searchers');
  assert.ok(cardNames.some(n => n.includes('Karn') || n.includes('Wurmcoil') || n.includes('Ulamog') || n.includes('Ugin')), 'Should include Big Mana apex payoffs');
});
