/**
 * TEST SUITE: REMINDER TEXT INVARIANCE & MULTI-CAPABILITY PRESERVATION AUDIT
 * 
 * Verifies 2 core invariants of semantic card classification:
 * 1. Reminder Text Isolation: Words inside parenthetical reminder text `(...)` MUST NEVER trigger false positive capability matches (e.g. Break of Day for CHEAP_REMOVAL).
 * 2. Multi-Capability Preservation: Modal cards possessing removal alongside secondary modes (e.g. Dromoka's Command, Kolaghan's Command) MUST remain fully available for removal roles.
 */

import { CardImplementer } from '../../src/services/agent/cardImplementer.js';

function runReminderTextInvarianceTest() {
  console.log('🧪 Running Reminder Text Invariance & Multi-Capability Audit...\n');
  let passed = 0;
  let total = 0;

  // Case 1: Pure Protection / Mass Buff with Reminder Text ("Break of Day", "Heroic Intervention")
  total++;
  const fakeRemovalCard1 = {
    name: 'Break of Day',
    type_line: 'Instant',
    oracle_text: 'Creatures you control get +1/+1 until end of turn.\nFateful hour — If you have 5 or less life, those creatures gain indestructible until end of turn. (Damage and effects that say "destroy" don\'t destroy them.)',
    cmc: 2,
    colors: ['W']
  };

  const fakeRemovalCard2 = {
    name: 'Heroic Intervention',
    type_line: 'Instant',
    oracle_text: 'Permanents you control gain hexproof and indestructible until end of turn. (Damage and effects that say "destroy" don\'t destroy them.)',
    cmc: 2,
    colors: ['G']
  };

  const realRemovalCard = {
    name: 'Fatal Push',
    type_line: 'Instant',
    oracle_text: 'Destroy target creature if it has mana value 2 or less.',
    cmc: 1,
    colors: ['B']
  };

  const modalRemovalCard = {
    name: "Dromoka's Command",
    type_line: 'Instant',
    oracle_text: "Choose two —\n• Prevent all damage target instant or sorcery spell would deal this turn.\n• Target player sacrifices an enchantment.\n• Put a +1/+1 counter on target creature.\n• Target creature you control fights target creature you don't control.",
    cmc: 2,
    colors: ['G', 'W']
  };

  const pool = [fakeRemovalCard1, fakeRemovalCard2, realRemovalCard, modalRemovalCard];

  const searchRes = CardImplementer.findCandidates(
    { need: 'CHEAP_REMOVAL' },
    pool,
    { colors: ['W', 'B', 'G'] }
  );

  const matchedNames = searchRes.candidates.map(c => c.name);

  console.log('  Matched Candidates for CHEAP_REMOVAL:', matchedNames);

  const hasFake1 = matchedNames.includes('Break of Day');
  const hasFake2 = matchedNames.includes('Heroic Intervention');
  const hasReal = matchedNames.includes('Fatal Push');
  const hasModal = matchedNames.includes("Dromoka's Command");

  if (!hasFake1 && !hasFake2) {
    console.log('  ✅ [TEST 1 PASSED] Reminder Text Invariance verified: Reminder text in (...) did NOT trigger false positive removal classification.');
    passed++;
  } else {
    console.error('  ❌ [TEST 1 FAILED] Reminder text triggered false positive removal classification!');
  }

  total++;
  if (hasReal && hasModal) {
    console.log("  ✅ [TEST 2 PASSED] Multi-Capability Preservation verified: Modal command with fight mode (Dromoka's Command) preserved for CHEAP_REMOVAL.");
    passed++;
  } else {
    console.error("  ❌ [TEST 2 FAILED] Modal command with removal mode was wrongly excluded!");
  }

  console.log(`\n================================================`);
  console.log(`🏆 REMINDER TEXT INVARIANCE RESULT: ${passed}/${total} Tests Passed`);
  console.log(`================================================\n`);

  if (passed === total) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runReminderTextInvarianceTest();
