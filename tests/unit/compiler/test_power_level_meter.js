/**
 * tests/unit/compiler/test_power_level_meter.js
 * 
 * Verifies that calculateDeckPowerLevel accurately measures constructed power levels,
 * understanding Ramp acceleration, playset density, Karsten mana, and constructed staples.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { calculateDeckPowerLevel } from '../../../src/services/powerLevelCalculator.js';

test('calculateDeckPowerLevel: G/W Beast Ramp with Craterhoof and Collector Cage scores Competitive/Optimized (8-9/10)', () => {
  const gwBeastRampDeck = [
    { name: 'Razorverge Thicket', quantity: 4, type_line: 'Land', rarity: 'rare' },
    { name: 'Brushland', quantity: 4, type_line: 'Land', rarity: 'rare' },
    { name: 'Lush Portico', quantity: 4, type_line: 'Land', rarity: 'rare' },
    { name: 'Forest', quantity: 8, type_line: 'Basic Land — Forest', rarity: 'common' },
    { name: 'Plains', quantity: 4, type_line: 'Basic Land — Plains', rarity: 'common' },
    { name: 'Goobbue Gardener', quantity: 4, type_line: 'Creature — Plant Beast', mana_value: 2, rarity: 'common', oracle_text: '{T}: Add {G}.' },
    { name: "Collector's Cage", quantity: 4, type_line: 'Artifact', mana_value: 2, rarity: 'mythic', oracle_text: 'Hideaway 5. Play exiled card without paying its mana cost.' },
    { name: 'Hauntwoods Shrieker', quantity: 4, type_line: 'Creature — Beast Mutant', mana_value: 3, rarity: 'mythic', oracle_text: 'Manifest dread. Turn face up for {1}{G}.' },
    { name: 'Pawpatch Formation', quantity: 4, type_line: 'Instant', mana_value: 2, rarity: 'uncommon', oracle_text: 'Destroy target creature with flying or enchantment.' },
    { name: "Archdruid's Charm", quantity: 4, type_line: 'Instant', mana_value: 3, rarity: 'rare', oracle_text: 'Search your library for a creature or land card.' },
    { name: 'Loot, Exuberant Explorer', quantity: 4, type_line: 'Legendary Creature — Beast Noble', mana_value: 3, rarity: 'rare', oracle_text: 'You may play an additional land on each of your turns.' },
    { name: 'Coliseum Behemoth', quantity: 4, type_line: 'Creature — Beast', mana_value: 7, power: '7', rarity: 'uncommon', oracle_text: 'Trample. Destroy artifact or enchantment.' },
    { name: 'Altanak, the Thrice-Called', quantity: 4, type_line: 'Legendary Creature — Insect Beast', mana_value: 7, power: '9', rarity: 'uncommon', oracle_text: 'Trample. Discard: return target land from graveyard.' },
    { name: 'Craterhoof Behemoth', quantity: 3, type_line: 'Creature — Beast', mana_value: 8, power: '5', rarity: 'mythic', oracle_text: 'Haste. Creatures get +X/+X and trample.' },
    { name: 'Fortune, Loyal Steed', quantity: 1, type_line: 'Legendary Creature — Beast Mount', mana_value: 3, rarity: 'rare', oracle_text: 'When Fortune enters, scry 2.' }
  ];

  const result = calculateDeckPowerLevel(gwBeastRampDeck, 'STANDARD', 'ramp');
  console.log(`📊 G/W Beast Ramp Power Evaluation:`);
  console.log(`   - Score: ${result.score}/10 (${result.text})`);
  console.log(`   - Tier: ${result.tierLabel}`);
  console.log(`   - Rares: ${result.rareCount}, Mythics: ${result.mythicCount}, Playsets: ${result.playsetCount}`);
  console.log(`   - Ramp Acceleration: ${result.rampCount}, Finishers: ${result.finisherCount}`);

  assert.ok(result.score >= 8, `Expected score >= 8 for tournament-grade ramp, got ${result.score}`);
  assert.notEqual(result.text, 'Casual');
});

test('calculateDeckPowerLevel: Basic casual draft chaff deck scores 3-4/10 (Casual)', () => {
  const casualDeck = [
    { name: 'Forest', quantity: 24, type_line: 'Basic Land — Forest', rarity: 'common' },
    { name: 'Grizzly Bears', quantity: 4, type_line: 'Creature — Bear', mana_value: 2, rarity: 'common', oracle_text: '' },
    { name: 'Colossal Dreadmaw', quantity: 4, type_line: 'Creature — Dinosaur', mana_value: 6, rarity: 'common', oracle_text: 'Trample' },
    { name: 'Centaur Courser', quantity: 4, type_line: 'Creature — Centaur Warrior', mana_value: 3, rarity: 'common', oracle_text: '' },
    { name: 'Giant Growth', quantity: 4, type_line: 'Instant', mana_value: 1, rarity: 'common', oracle_text: 'Target creature gets +3/+3' },
    { name: 'Plummet', quantity: 4, type_line: 'Instant', mana_value: 2, rarity: 'common', oracle_text: 'Destroy target creature with flying' },
    { name: 'Elvish Mystic', quantity: 4, type_line: 'Creature — Elf Druid', mana_value: 1, rarity: 'common', oracle_text: '{T}: Add {G}.' },
    { name: 'Spidery Grasp', quantity: 4, type_line: 'Instant', mana_value: 3, rarity: 'common', oracle_text: 'Untap target creature' },
    { name: 'Brambleweft Behemoth', quantity: 4, type_line: 'Creature — Beast', mana_value: 6, rarity: 'common', oracle_text: 'Trample' }
  ];

  const result = calculateDeckPowerLevel(casualDeck, 'STANDARD', 'midrange');
  console.log(`📊 Casual Draft Deck Power Evaluation:`);
  console.log(`   - Score: ${result.score}/10 (${result.text})`);

  assert.ok(result.score <= 5, `Expected score <= 5 for all-commons deck, got ${result.score}`);
});
