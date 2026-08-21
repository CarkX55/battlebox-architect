/**
 * tests/unit/compiler/test_agentic_midrange_quota.js
 * 
 * Verifies that AgenticDeckArchitect correctly compiles Midrange / Control / None-tribe
 * decks to exactly 36 non-lands + 24 lands (never stopping prematurely with all-land decks).
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { AgenticDeckArchitect } from '../../../src/services/agent/agenticDeckArchitect.js';
import { IntentBuilder } from '../../../src/services/compiler/core/intentBuilder.js';

const mockCardPool = [
  // Black Removals & Spells
  { name: 'Fatal Push', cmc: 1, type_line: 'Instant', colors: ['B'], oracle_text: 'Destroy target creature if it has mana value 2 or less.', rarity: 'uncommon' },
  { name: 'Thoughtseize', cmc: 1, type_line: 'Sorcery', colors: ['B'], oracle_text: 'Target opponent reveals their hand and discards a nonland card.', rarity: 'rare' },
  { name: 'Drown in the Loch', cmc: 2, type_line: 'Instant', colors: ['U', 'B'], oracle_text: 'Choose one: Counter target spell or destroy target creature.', rarity: 'uncommon' },
  { name: 'Cling to Dust', cmc: 1, type_line: 'Instant', colors: ['B'], oracle_text: 'Exile target card from a graveyard. If it was a creature, you gain 3 life. Otherwise draw a card.', rarity: 'uncommon' },
  { name: 'Night\'s Whisper', cmc: 2, type_line: 'Sorcery', colors: ['B'], oracle_text: 'You draw two cards and you lose 2 life.', rarity: 'common' },
  { name: 'Damnation', cmc: 4, type_line: 'Sorcery', colors: ['B'], oracle_text: 'Destroy all creatures. They can\'t be regenerated.', rarity: 'rare' },
  // Blue/Black Creatures & Threats
  { name: 'Sheoldred, the Apocalypse', cmc: 4, type_line: 'Legendary Creature — Phyrexian Praetor', power: '4', toughness: '5', colors: ['B'], oracle_text: 'Whenever you draw a card, you gain 2 life. Whenever an opponent draws a card, they lose 2 life.', rarity: 'mythic' },
  { name: 'Subtlety', cmc: 4, type_line: 'Creature — Incarnation', power: '3', toughness: '3', colors: ['U'], oracle_text: 'Flash, Flying. When Subtlety enters, put target creature or planeswalker on top or bottom.', rarity: 'mythic' },
  { name: 'Preordain', cmc: 1, type_line: 'Sorcery', colors: ['U'], oracle_text: 'Scry 2, then draw a card.', rarity: 'common' },
  { name: 'Murktide Regent', cmc: 7, type_line: 'Creature — Dragon', power: '3', toughness: '3', colors: ['U'], oracle_text: 'Flying. Delve.', rarity: 'mythic' },
  { name: 'Baleful Strix', cmc: 2, type_line: 'Artifact Creature — Bird', power: '1', toughness: '1', colors: ['U', 'B'], oracle_text: 'Flying, deathtouch. When Baleful Strix enters, draw a card.', rarity: 'rare' },
  { name: 'Inquisition of Kozilek', cmc: 1, type_line: 'Sorcery', colors: ['B'], oracle_text: 'Target player reveals hand, discard nonland with mana value 3 or less.', rarity: 'uncommon' },
  { name: 'Snapcaster Mage', cmc: 2, type_line: 'Creature — Human Wizard', power: '2', toughness: '1', colors: ['U'], oracle_text: 'Flash. Target instant or sorcery gains flashback.', rarity: 'rare' },
  { name: 'Orcish Bowmasters', cmc: 2, type_line: 'Creature — Orc Archer', power: '1', toughness: '1', colors: ['B'], oracle_text: 'Flash. Whenever opponent draws, deal 1 damage and amass.', rarity: 'rare' },
  { name: 'Tishana\'s Tidebinder', cmc: 3, type_line: 'Creature — Merfolk Wizard', power: '3', toughness: '2', colors: ['U'], oracle_text: 'Flash. Counter target activated or triggered ability.', rarity: 'rare' },
  { name: 'Brazen Borrower', cmc: 3, type_line: 'Creature — Faerie Rogue', power: '3', toughness: '1', colors: ['U'], oracle_text: 'Flash, Flying.', rarity: 'mythic' }
];

test('AgenticDeckArchitect compiles Midrange Dimir (None tribe) to full 36 non-lands + 24 lands', async () => {
  const rawForm = {
    formato: 'MODERN',
    colores: ['U', 'B'],
    archetype: 'Midrange',
    tribu: 'None',
    deckSize: 60
  };

  const intentPackage = IntentBuilder.buildFromUI(rawForm);
  const architect = new AgenticDeckArchitect(intentPackage, mockCardPool);
  const result = await architect.buildDeck();

  const deckList = result.deckList || [];
  const nonLandCards = deckList.filter(c => !c.type_line?.toLowerCase().includes('land'));
  const landCards = deckList.filter(c => c.type_line?.toLowerCase().includes('land'));
  const nonLandTotal = nonLandCards.reduce((sum, c) => sum + (c.quantity || 1), 0);
  const landTotal = landCards.reduce((sum, c) => sum + (c.quantity || 1), 0);

  console.log(`📊 Midrange Agentic Build Result:`);
  console.log(`   - Build Status: ${result.buildStatus}`);
  console.log(`   - Non-Lands: ${nonLandTotal}/36`);
  console.log(`   - Lands: ${landTotal}/24`);
  console.log(`   - Total Cards: ${nonLandTotal + landTotal}/60`);
  console.log(`   - ReAct Logs:`, JSON.stringify(result.reActLogs, null, 2));

  assert.equal(nonLandTotal, 36, `Expected exactly 36 non-land cards, got ${nonLandTotal}`);
  assert.equal(landTotal, 24, `Expected exactly 24 lands, got ${landTotal}`);
  assert.equal(nonLandTotal + landTotal, 60, `Expected exactly 60 total cards, got ${nonLandTotal + landTotal}`);
  assert.equal(result.buildStatus, 'SUCCESS');
});
