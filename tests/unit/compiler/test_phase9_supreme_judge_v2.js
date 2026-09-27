/**
 * Test Suite: FASE 9 — Supreme Judge 2.0 & Deck Health Vector (v28.1)
 */

import { DeterministicSupremeJudge } from '../../../src/services/compiler/core/deterministicSupremeJudge.js';

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

console.log('=== Running Test Suite: FASE 9 Supreme Judge 2.0 ===\n');

try {
  // Test 1: Complete 60-Card Healthy Aggro Deck
  const healthyDeck = {
    cards: [
      { name: 'Mountain', count: 20, type_line: 'Basic Land — Mountain', isLand: true },
      { name: 'Goblin Guide', count: 4, type_line: 'Creature — Goblin Scout', cmc: 1, power: 2, toughness: 2, oracle_text: 'Haste' },
      { name: 'Monastery Swiftspear', count: 4, type_line: 'Creature — Human Monk', cmc: 1, power: 1, toughness: 2, oracle_text: 'Haste, prowess' },
      { name: 'Rundvelt Hordemaster', count: 4, type_line: 'Creature — Goblin Warrior', cmc: 2, power: 1, toughness: 1, oracle_text: 'Whenever a Goblin dies, exile top card, you may play it' },
      { name: 'Eidolon of the Great Revel', count: 4, type_line: 'Creature — Spirit', cmc: 2, power: 2, toughness: 2, oracle_text: 'deals 2 damage' },
      { name: 'Play with Fire', count: 4, type_line: 'Instant', cmc: 1, oracle_text: 'deals 2 damage to any target' },
      { name: 'Lightning Bolt', count: 4, type_line: 'Instant', cmc: 1, oracle_text: 'deals 3 damage to any target' },
      { name: 'Lava Spike', count: 4, type_line: 'Sorcery', cmc: 1, oracle_text: 'deals 3 damage to target player' },
      { name: 'Roiling Vortex', count: 4, type_line: 'Enchantment', cmc: 2, oracle_text: 'deals 1 damage' },
      { name: 'Skewer the Critics', count: 4, type_line: 'Sorcery', cmc: 3, oracle_text: 'deals 3 damage to any target' },
      { name: 'Light Up the Stage', count: 4, type_line: 'Sorcery', cmc: 3, oracle_text: 'exile the top two cards, you may play them' }
    ]
  };

  const healthyReview = DeterministicSupremeJudge.judgeDeck(
    healthyDeck,
    { archetypeKey: 'BURN', colors: ['R'] },
    { format: 'MODERN', deckSize: 60, colors: ['R'] },
    1
  );

  assert(healthyReview.verdict === 'APPROVE', 'Healthy deck is awarded APPROVE verdict');
  assert(healthyReview.hasBlockingWarnings === false, 'Healthy deck has 0 blocking warnings');
  assert(typeof healthyReview.deckHealthVector === 'object', 'Outputs structured deckHealthVector');
  assert(healthyReview.deckHealthVector.legality === 'LEGAL', 'deckHealthVector reports LEGAL status');
  assert(healthyReview.deckHealthVector.recoveryProbability > 0.3, 'deckHealthVector calculates recoveryProbability');
  assert(healthyReview.deckHealthVector.experienceVector.pactoDeAmigosScore >= 80, 'Pacto de Amigos score is healthy');

  // Test 2: Insufficient Evidence Handling (No Hard Reject)
  const unsimulatedReview = DeterministicSupremeJudge.judgeDeck(
    healthyDeck,
    { archetypeKey: 'BURN' },
    { format: 'MODERN', simulationEvidence: { confidence: { confidenceTier: 'INSUFFICIENT_EVIDENCE' } } },
    1
  );

  assert(unsimulatedReview.verdict !== 'REJECT', 'Judge never issues REJECT due to insufficient simulation evidence');
  assert(unsimulatedReview.verdict === 'APPROVE_WITH_WARNINGS', 'Issues APPROVE_WITH_WARNINGS with advisory message');

  // Test 3: Deck Size Mismatch (Hard Blocking Defect)
  const wrongSizeDeck = {
    cards: [
      { name: 'Mountain', count: 20, type_line: 'Basic Land — Mountain', isLand: true },
      { name: 'Lightning Bolt', count: 4, type_line: 'Instant', cmc: 1 }
    ]
  };

  const badSizeReview = DeterministicSupremeJudge.judgeDeck(
    wrongSizeDeck,
    { archetypeKey: 'BURN' },
    { format: 'MODERN', deckSize: 60 },
    1
  );

  assert(badSizeReview.hasBlockingWarnings === true, 'Deck size mismatch triggers blocking warnings');
  assert(badSizeReview.verdict === 'REPLAN', 'Triggers REPLAN directive on iteration 1');
  assert(badSizeReview.replanDirectives.some(d => d.action === 'ADJUST_DECK_SIZE'), 'Emits ADJUST_DECK_SIZE directive');

  console.log(`\n🎉 FASE 9 TESTS COMPLETED: ${passed}/${total} PASSED`);
} catch (e) {
  console.error('\n❌ FASE 9 TEST SUITE ERROR:', e);
  process.exit(1);
}
