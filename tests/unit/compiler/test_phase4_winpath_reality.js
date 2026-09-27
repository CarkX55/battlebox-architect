/**
 * Test Suite: FASE 4 — WinPath Reality Simulator (v28.1)
 */

import { WinPathExecutionSimulator } from '../../../src/services/compiler/core/winPathExecutionSimulator.js';

let passed = 0;
let total = 0;

function assert(condition, message) {
  total++;
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    throw new Error(message);
  } else {
    console.log(`✅ PASS: ${message}`);
    passed++;
  }
}

console.log('=== Running Test Suite: FASE 4 WinPath Reality Simulator ===\n');

try {
  // Test 1: Real Goblin Aggro Deck (High WinPath Success)
  const goblinDeck = [
    { name: 'Mountain', count: 20, type_line: 'Basic Land — Mountain', cmc: 0 },
    { name: 'Goblin Guide', count: 4, type_line: 'Creature — Goblin Scout', cmc: 1, mana_cost: '{R}', power: 2, toughness: 2, oracle_text: 'Haste' },
    { name: 'Monastery Swiftspear', count: 4, type_line: 'Creature — Human Monk', cmc: 1, mana_cost: '{R}', power: 1, toughness: 2, oracle_text: 'Haste' },
    { name: 'Rundvelt Hordemaster', count: 4, type_line: 'Creature — Goblin Warrior', cmc: 2, mana_cost: '{1}{R}', power: 1, toughness: 1, oracle_text: 'Other Goblins you control get +1/+1' },
    { name: 'Play with Fire', count: 4, type_line: 'Instant', cmc: 1, mana_cost: '{R}', oracle_text: 'deals 2 damage to any target' },
    { name: 'Lightning Bolt', count: 4, type_line: 'Instant', cmc: 1, mana_cost: '{R}', oracle_text: 'deals 3 damage to any target' }
  ];

  const report = WinPathExecutionSimulator.simulateWinPath(goblinDeck, {
    winPathNodes: ['TURN1_PRESSURE', 'TURN2_DEVELOPMENT', 'AMPLIFY_BOARD_PRESSURE', 'LETHAL_REACH'],
    seed: 472918,
    simulationCount: 1000,
    maxTurns: 5
  });

  assert(report.isFalsePositive === false, 'Real goblin aggro is NOT flagged as a false positive');
  assert(report.nodeCompletionRates.TURN1_PRESSURE >= 0.70, 'TURN1_PRESSURE completion rate >= 70%');
  assert(report.nodeCompletionRates.LETHAL_REACH >= 0.60, 'LETHAL_REACH completion rate >= 60%');
  assert(report.damageByTurn.T1 > 0, 'Damage dealt on Turn 1');
  assert(report.damageByTurn.T4 > report.damageByTurn.T1, 'Cumulative damage scales upward toward Turn 4');

  // Test 2: Fake Tagged Deck (False Positive WinPath)
  // Has expensive 5-CMC cards claiming to be 'Aggro' but unable to execute
  const fakeDeck = [
    { name: 'Mountain', count: 20, type_line: 'Basic Land — Mountain', cmc: 0 },
    { name: 'Ancient Dragon', count: 4, type_line: 'Creature — Dragon', cmc: 6, mana_cost: '{4}{R}{R}', power: 6, toughness: 6, oracle_text: 'Flying' },
    { name: 'Shivan Dragon', count: 4, type_line: 'Creature — Dragon', cmc: 6, mana_cost: '{4}{R}{R}', power: 5, toughness: 5, oracle_text: 'Flying' },
    { name: 'Fire Elemental', count: 8, type_line: 'Creature — Elemental', cmc: 5, mana_cost: '{3}{R}{R}', power: 5, toughness: 4, oracle_text: '' }
  ];

  const fakeReport = WinPathExecutionSimulator.simulateWinPath(fakeDeck, {
    winPathNodes: ['TURN1_PRESSURE', 'TURN2_DEVELOPMENT', 'AMPLIFY_BOARD_PRESSURE', 'LETHAL_REACH'],
    seed: 472918,
    simulationCount: 500,
    maxTurns: 5
  });

  assert(fakeReport.nodeCompletionRates.TURN1_PRESSURE === 0, 'Fake deck scores 0% on TURN1_PRESSURE');
  assert(fakeReport.nodeCompletionRates.LETHAL_REACH === 0, 'Fake deck scores 0% on LETHAL_REACH in 5 turns');
  assert(fakeReport.failedStep === 'TURN1_PRESSURE', 'Identified TURN1_PRESSURE as first critical failed step');

  console.log(`\n🎉 FASE 4 TESTS COMPLETED: ${passed}/${total} PASSED`);
} catch (e) {
  console.error('\n❌ FASE 4 TEST SUITE ERROR:', e);
  process.exit(1);
}
