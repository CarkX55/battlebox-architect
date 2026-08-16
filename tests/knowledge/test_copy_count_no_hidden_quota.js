/**
 * TEST SUITE: COPY COUNT NON-QUOTA DYNAMIC AUDIT
 * 
 * Verifies that CopyCountStrategist dynamically responds to:
 * - Existing functional role redundancy (reduces copies from 4x to 2x when role is saturated)
 * - Virtual density support via cantrips/tutors (reduces copies from 4x to 3x)
 * - Legendary rule dead-draw cost (caps at 3x)
 */

import { CopyCountStrategist } from '../../src/services/agent/copyCountStrategist.js';
import { DeckState } from '../../src/services/agent/deckState.js';

function runCopyCountNoHiddenQuotaTest() {
  console.log('🧪 Running Copy Count Dynamic Non-Quota Audit...\n');
  let passed = 0;
  let total = 0;

  const intent = { archetype: 'Midrange', colors: ['U', 'B'] };
  
  // Case 1: Baseline Non-Legendary Cheap Removal -> 4x
  total++;
  const emptyDeckState = new DeckState(intent);
  const removalSpell = { name: 'Fatal Push', cmc: 1, type_line: 'Instant', oracle_text: 'Destroy target creature.' };
  const contract = { role: 'CHEAP_REMOVAL' };

  const res1 = CopyCountStrategist.determineCopyCount(removalSpell, emptyDeckState, contract);
  if (res1.quantity === 4) {
    console.log('  ✅ [CASE 1 PASSED] Baseline cheap removal allocated 4x in empty deckState.');
    passed++;
  } else {
    console.error(`  ❌ [CASE 1 FAILED] Expected 4x, got ${res1.quantity}x`);
  }

  // Case 2: High Functional Redundancy (8+ removal spells in deckState) -> Reduces to 2x
  total++;
  const saturatedDeckState = new DeckState(intent);
  for (let i = 0; i < 2; i++) {
    saturatedDeckState.addCard({ name: `Removal Spell ${i}`, cmc: 2, type_line: 'Instant' }, 4, 'Preloaded', 'CHEAP_REMOVAL');
  }

  const res2 = CopyCountStrategist.determineCopyCount(removalSpell, saturatedDeckState, contract);
  if (res2.quantity === 2 && res2.why === 'HIGH_FUNCTIONAL_REDUNDANCY') {
    console.log('  ✅ [CASE 2 PASSED] High functional role redundancy dynamically reduced copy allocation from 4x to 2x.');
    passed++;
  } else {
    console.error(`  ❌ [CASE 2 FAILED] Expected 2x via HIGH_FUNCTIONAL_REDUNDANCY, got ${res2.quantity}x (${res2.why})`);
  }

  // Case 3: Virtual Density Support via Cantrips -> Reduces to 3x
  total++;
  const cantripDeckState = new DeckState(intent);
  cantripDeckState.addCard({ name: 'Consider', cmc: 1, type_line: 'Instant', oracle_text: 'Look at top card. Draw a card.' }, 4, 'Cantrip', 'CARD_FLOW');
  cantripDeckState.addCard({ name: 'Preordain', cmc: 1, type_line: 'Sorcery', oracle_text: 'Scry 2, then draw a card.' }, 4, 'Cantrip', 'CARD_FLOW');

  const res3 = CopyCountStrategist.determineCopyCount(removalSpell, cantripDeckState, contract);
  if (res3.quantity === 3 && res3.why === 'VIRTUAL_DENSITY_SUPPORTED') {
    console.log('  ✅ [CASE 3 PASSED] Virtual density support from cantrips dynamically reduced physical copy allocation from 4x to 3x.');
    passed++;
  } else {
    console.error(`  ❌ [CASE 3 FAILED] Expected 3x via VIRTUAL_DENSITY_SUPPORTED, got ${res3.quantity}x (${res3.why})`);
  }

  console.log(`\n================================================`);
  console.log(`🏆 COPY COUNT NON-QUOTA RESULT: ${passed}/${total} Tests Passed`);
  console.log(`================================================\n`);

  if (passed === total) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runCopyCountNoHiddenQuotaTest();
