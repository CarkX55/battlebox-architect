/**
 * tests/unit/compiler/test_agentic_sea_monsters_ramp.js
 * 
 * Verifies that AgenticDeckArchitect compiles Sea Monsters Ramp (U/G)
 * with Merfolk mana dorks, ramp spells, and colossal oceanic apex payoffs
 * (Krakens, Leviathans, Serpents, Octopuses).
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { AgenticDeckArchitect } from '../../../src/services/agent/agenticDeckArchitect.js';
import { IntentBuilder } from '../../../src/services/compiler/core/intentBuilder.js';

const mockSeaMonstersPool = [
  // Early Ramp & Merfolk Enablers
  { name: 'Kiora\'s Follower', cmc: 2, type_line: 'Creature — Merfolk Druid', power: '2', toughness: '2', colors: ['G', 'U'], oracle_text: '{T}: Untap another target permanent.', rarity: 'uncommon' },
  { name: 'Coiling Oracle', cmc: 2, type_line: 'Creature — Snake Elf Druid', power: '1', toughness: '1', colors: ['G', 'U'], oracle_text: 'When Coiling Oracle enters the battlefield, reveal the top card of your library. If it\'s a land card, put it onto the battlefield. Otherwise, put that card into your hand.', rarity: 'common' },
  { name: 'Growth Spiral', cmc: 2, type_line: 'Instant', colors: ['G', 'U'], oracle_text: 'Draw a card. You may put a land card from your hand onto the battlefield.', rarity: 'common' },
  { name: 'Explore', cmc: 2, type_line: 'Sorcery', colors: ['G'], oracle_text: 'You may play an additional land this turn. Draw a card.', rarity: 'common' },
  { name: 'Cultivate', cmc: 3, type_line: 'Sorcery', colors: ['G'], oracle_text: 'Search your library for up to two basic land cards, reveal them. Put one onto the battlefield tapped and the other into your hand.', rarity: 'common' },
  // Tribal Support / Interaction
  { name: 'Whelming Wave', cmc: 4, type_line: 'Sorcery', colors: ['U'], oracle_text: 'Return all creatures to their owners\' hands except for Krakens, Leviathans, Octopuses, and Serpents.', rarity: 'rare' },
  { name: 'Counterspell', cmc: 2, type_line: 'Instant', colors: ['U'], oracle_text: 'Counter target spell.', rarity: 'uncommon' },
  { name: 'Beast Within', cmc: 3, type_line: 'Instant', colors: ['G'], oracle_text: 'Destroy target permanent. Its controller creates a 3/3 green Beast creature token.', rarity: 'uncommon' },
  // Oceanic Apex Finishers (Krakens, Leviathans, Serpents, Octopuses)
  { name: 'Aesi, Tyrant of Gyre Strait', cmc: 6, type_line: 'Legendary Creature — Serpent Beast', power: '5', toughness: '5', colors: ['G', 'U'], oracle_text: 'You may play an additional land on each of your turns. Whenever a land enters the battlefield under your control, draw a card.', rarity: 'mythic' },
  { name: 'Koma, Cosmos Serpent', cmc: 7, type_line: 'Legendary Creature — Serpent', power: '6', toughness: '6', colors: ['G', 'U'], oracle_text: 'This spell can\'t be countered. At the beginning of each upkeep, create a 3/3 blue Serpent creature token named Koma\'s Coil.', rarity: 'mythic' },
  { name: 'Hullbreaker Horror', cmc: 7, type_line: 'Creature — Kraken Horror', power: '7', toughness: '8', colors: ['U'], oracle_text: 'Flash. This spell can\'t be countered. Whenever you cast a spell, choose one — Return target spell you don\'t control to its owner\'s hand; or Return target nonland permanent to its owner\'s hand.', rarity: 'rare' },
  { name: 'Scourge of Fleets', cmc: 7, type_line: 'Creature — Kraken', power: '6', toughness: '6', colors: ['U'], oracle_text: 'When Scourge of Fleets enters the battlefield, return each creature your opponents control with toughness X or less to its owner\'s hand, where X is the number of Islands you control.', rarity: 'rare' },
  { name: 'Serpent of Yawning Depths', cmc: 6, type_line: 'Enchantment Creature — Serpent', power: '6', toughness: '6', colors: ['U'], oracle_text: 'Krakens, Leviathans, Octopuses, and Serpents you control can\'t be blocked except by Krakens, Leviathans, Octopuses, and Serpents.', rarity: 'rare' }
];

test('AgenticDeckArchitect compiles Sea Monsters Ramp (U/G) with mana acceleration & oceanic apex payoffs', async () => {
  const rawForm = {
    formato: 'MODERN',
    colores: ['U', 'G'],
    archetype: 'Ramp',
    tribu: 'sea_monsters',
    strategy: 'sea_monsters',
    deckSize: 60
  };

  const intentPackage = IntentBuilder.buildFromUI(rawForm);
  const architect = new AgenticDeckArchitect(intentPackage, mockSeaMonstersPool);
  const result = await architect.buildDeck();

  const deckList = result.deckList || [];
  const nonLandCards = deckList.filter(c => !c.type_line?.toLowerCase().includes('land'));
  const landCards = deckList.filter(c => c.type_line?.toLowerCase().includes('land'));
  const cardNames = nonLandCards.map(c => c.name);
  const nonLandTotal = nonLandCards.reduce((sum, c) => sum + (c.quantity || 1), 0);
  const landTotal = landCards.reduce((sum, c) => sum + (c.quantity || 1), 0);

  console.log(`📊 Sea Monsters Ramp Build Result:`);
  console.log(`   - Status: ${result.buildStatus}`);
  console.log(`   - Non-Lands Total: ${nonLandTotal}/34`);
  console.log(`   - Lands Total: ${landTotal}/26`);
  console.log(`   - Total Cards: ${nonLandTotal + landTotal}/60`);
  console.log(`   - Cards Chosen:`, cardNames);
  console.log(`   - DeckList:`, deckList.map(c => `${c.quantity}x ${c.name}`));

  assert.equal(nonLandTotal + landTotal, 60);
  assert.equal(result.buildStatus, 'SUCCESS');
  
  // Verify Ramp enablers are present
  assert.ok(cardNames.some(n => n.includes('Growth Spiral') || n.includes('Explore') || n.includes('Cultivate') || n.includes('Kiora\'s Follower')), 'Should include early ramp/merfolk enablers');
  
  // Verify Oceanic Apex threats are present
  assert.ok(cardNames.some(n => n.includes('Aesi') || n.includes('Koma') || n.includes('Hullbreaker Horror') || n.includes('Scourge of Fleets') || n.includes('Serpent of Yawning Depths')), 'Should include Oceanic apex payoffs');
});
