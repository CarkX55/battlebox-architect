/**
 * tests/judge/test_capability_validator.js
 * Verification unit test for CapabilityValidator.
 */

import { validateCapability } from '../../src/judge/capabilities/CapabilityValidator.js';

async function testCapabilityValidator() {
  console.log('🧪 Testing CapabilityValidator against contract signatures...');

  const earlyDefenderContract = { id: 'EarlyDefender' };
  const defenderDrawContract = { id: 'DefenderCardDraw' };
  const defenderPayoffContract = { id: 'DefenderPayoff' };

  const avengersCard = {
    name: 'Avengers Assemble!',
    type_line: 'Enchantment',
    oracle_text: 'Heroes you control get +2/+2. Draw a card.',
    mana_value: 5
  };

  const endstoneCard = {
    name: 'The Endstone',
    type_line: 'Legendary Artifact',
    oracle_text: 'Whenever you play a land or cast a spell, draw a card. Life becomes half.',
    mana_value: 7
  };

  const wallCrawlCard = {
    name: 'Wall Crawl',
    type_line: 'Enchantment',
    oracle_text: 'Spiders you control get +1/+1 and can\'t be blocked by creatures with defender.',
    mana_value: 4
  };

  const wallOfOmensCard = {
    name: 'Wall of Omens',
    type_line: 'Creature — Wall',
    oracle_text: 'Defender. When Wall of Omens enters the battlefield, draw a card.',
    mana_value: 2
  };

  const highAlertCard = {
    name: 'High Alert',
    type_line: 'Enchantment',
    oracle_text: 'Each creature you control assigns combat damage equal to its toughness rather than its power.',
    mana_value: 3
  };

  // Test 1: Avengers Assemble vs DefenderCardDraw -> REJECTED
  const res1 = validateCapability(avengersCard, defenderDrawContract);
  console.log('✅ Avengers Assemble vs DefenderCardDraw:', res1.valid === false ? `REJECTED (${res1.reason})` : 'FAILED');

  // Test 2: The Endstone vs DefenderCardDraw -> REJECTED
  const res2 = validateCapability(endstoneCard, defenderDrawContract);
  console.log('✅ The Endstone vs DefenderCardDraw:', res2.valid === false ? `REJECTED (${res2.reason})` : 'FAILED');

  // Test 3: Wall Crawl vs EarlyDefender -> REJECTED
  const res3 = validateCapability(wallCrawlCard, earlyDefenderContract);
  console.log('✅ Wall Crawl vs EarlyDefender:', res3.valid === false ? `REJECTED (${res3.reason})` : 'FAILED');

  // Test 4: Wall of Omens vs EarlyDefender & DefenderCardDraw -> VALID
  const res4a = validateCapability(wallOfOmensCard, earlyDefenderContract);
  const res4b = validateCapability(wallOfOmensCard, defenderDrawContract);
  console.log('✅ Wall of Omens vs EarlyDefender:', res4a.valid);
  console.log('✅ Wall of Omens vs DefenderCardDraw:', res4b.valid);

  // Test 5: High Alert vs DefenderPayoff -> VALID
  const res5 = validateCapability(highAlertCard, defenderPayoffContract);
  console.log('✅ High Alert vs DefenderPayoff:', res5.valid);

  if (!res1.valid && !res2.valid && !res3.valid && res4a.valid && res4b.valid && res5.valid) {
    console.log('🎉 TEST SUCCESSFUL: CapabilityValidator cleanly filters keyword/oracle contamination!');
  } else {
    throw new Error('Test failed: CapabilityValidator did not filter contamination correctly.');
  }
}

testCapabilityValidator().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
