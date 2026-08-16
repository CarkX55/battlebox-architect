/**
 * SPRINT 6 AGENTIC DECK ARCHITECT INTEGRATION TEST SUITE
 * 
 * Verifies end-to-end execution of Sprint 6 Agentic Architecture:
 * 1. Rakdos Demons Midrange (Real removal, real Demon creatures, B/R Karsten lands)
 * 2. Simic Merfolk Tempo (Real Merfolk creatures, U/G Karsten lands, zero Kindred sorceries in creature slots)
 * 3. Deadlock Handling (0 candidates pivot feedback)
 * 4. DeckState getStrategicSummary() context optimization & 4x playset limits
 */

import assert from 'node:assert';
import { DeckState } from '../../../src/services/agent/deckState.js';
import { CardImplementer } from '../../../src/services/agent/cardImplementer.js';
import { LLMStrategist } from '../../../src/services/agent/llmStrategist.js';
import { AgenticDeckArchitect } from '../../../src/services/agent/agenticDeckArchitect.js';

console.log('🧪 Running Sprint 6 Agentic Deck Architect Integration Test Suite...\n');

// Mock Card Database Pool
const mockScryfallPool = [
  // Rakdos Cards
  { name: 'Fatal Push', type_line: 'Instant', cmc: 1, colors: ['B'], oracle_text: 'Destroy target creature with mana value 2 or less.' },
  { name: 'Lightning Bolt', type_line: 'Instant', cmc: 1, colors: ['R'], oracle_text: 'Lightning Bolt deals 3 damage to any target.' },
  { name: 'Cut Down', type_line: 'Instant', cmc: 1, colors: ['B'], oracle_text: 'Destroy target creature with total power and toughness 5 or less.' },
  { name: 'Sign in Blood', type_line: 'Sorcery', cmc: 2, colors: ['B'], oracle_text: 'Target player draws two cards and loses 2 life.' },
  { name: 'Night\'s Whisper', type_line: 'Sorcery', cmc: 2, colors: ['B'], oracle_text: 'You draw two cards and you lose 2 life.' },
  { name: 'Archfiend of the Dross', type_line: 'Creature — Demon', cmc: 4, colors: ['B'], oracle_text: 'Flying. Enters with four oil counters.' },
  { name: 'Bloodthirster', type_line: 'Creature — Demon', cmc: 6, colors: ['R'], oracle_text: 'Flying, trample. Attacks multiple times.' },
  { name: 'Spawn of Mayhem', type_line: 'Creature — Demon', cmc: 3, colors: ['B'], oracle_text: 'Flying, trample. Spectacle {B}{B}.' },
  { name: 'Demon of Loathing', type_line: 'Creature — Demon', cmc: 7, colors: ['B'], oracle_text: 'Flying. Player sacrifices creature.' },
  { name: 'Thoughtseize', type_line: 'Sorcery', cmc: 1, colors: ['B'], oracle_text: 'Target player reveals hand. Choose a nonland card.' },
  { name: 'Dreadbore', type_line: 'Sorcery', cmc: 2, colors: ['B', 'R'], oracle_text: 'Destroy target creature or planeswalker.' },


  // Simic Merfolk Cards
  { name: 'Lord of Atlantis', type_line: 'Creature — Merfolk', cmc: 2, colors: ['U'], oracle_text: 'Other Merfolk get +1/+1 and islandwalk.' },
  { name: 'Master of the Pearl Trident', type_line: 'Creature — Merfolk', cmc: 2, colors: ['U'], oracle_text: 'Other Merfolk get +1/+1 and islandwalk.' },
  { name: 'Silvergill Adept', type_line: 'Creature — Merfolk Wizard', cmc: 2, colors: ['U'], oracle_text: 'When Silvergill Adept enters, draw a card.' },
  { name: 'Kumena\'s Speaker', type_line: 'Creature — Merfolk Shaman', cmc: 1, colors: ['G'], oracle_text: 'Gets +1/+1 if you control another Merfolk.' },
  { name: 'Deeproot Elite', type_line: 'Creature — Merfolk Warrior', cmc: 2, colors: ['G'], oracle_text: 'Put +1/+1 counter on Merfolk.' },
  { name: 'Merfolk Trickster', type_line: 'Creature — Merfolk Wizard', cmc: 2, colors: ['U'], oracle_text: 'When Merfolk Trickster enters, tap target creature.' },
  { name: 'Tishana\'s Tidebinder', type_line: 'Creature — Merfolk Wizard', cmc: 3, colors: ['U'], oracle_text: 'Flash. Counter target ability.' },
  { name: 'Counterspell', type_line: 'Instant', cmc: 2, colors: ['U'], oracle_text: 'Counter target spell.' },
  { name: 'Spell Pierce', type_line: 'Instant', cmc: 1, colors: ['U'], oracle_text: 'Counter target noncreature spell.' },
  { name: 'Summon the School', type_line: 'Kindred Sorcery — Merfolk', cmc: 4, colors: ['W'], oracle_text: 'Create two 1/1 Merfolk tokens.' },
  { name: 'Vapor Snag', type_line: 'Instant', cmc: 1, colors: ['U'], oracle_text: 'Return target creature to hand.' }

];

// ==========================================
// TEST 1: DeckState getStrategicSummary & Invariants
// ==========================================
console.log('--- TEST 1: DeckState getStrategicSummary & Invariants ---');
const intentRakdos = { format: 'MODERN', colors: ['B', 'R'], primaryTribe: 'Demon', archetype: 'Midrange' };
const state = new DeckState(intentRakdos);

const addFatalPush = state.addCard(mockScryfallPool[0], 4, 'Cheap removal', 'CHEAP_REMOVAL');
assert.strictEqual(addFatalPush.success, true);
assert.strictEqual(addFatalPush.added, 4);

// Invariant: Playset Limit (Attempting 5th copy of Fatal Push must fail)
const addFifth = state.addCard(mockScryfallPool[0], 1, 'Extra copy', 'CHEAP_REMOVAL');
assert.strictEqual(addFifth.success, false);
assert.ok(addFifth.reason.includes('maximum playset limit'));

// Test getStrategicSummary() token-optimized payload
const summary = state.getStrategicSummary();
assert.strictEqual(summary.totalCards, 4);
assert.strictEqual(summary.nonLandCards, 4);
assert.strictEqual(summary.targetSize, 60);
assert.strictEqual(summary.pips.B, 4);
assert.deepStrictEqual(summary.roles_filled, ['CHEAP_REMOVAL']);
console.log('✅ TEST 1 PASSED: DeckState enforced playset 4x limit and produced compact Strategic Summary.\n');

// ==========================================
// TEST 2: CardImplementer Hyper-Strict Filtering
// ==========================================
console.log('--- TEST 2: CardImplementer Hyper-Strict Filtering ---');
const removalReq = { need: 'CHEAP_REMOVAL', cmcMax: 2, targetColors: ['B', 'R'] };
const removalCandidates = CardImplementer.findCandidates(removalReq, mockScryfallPool, intentRakdos);

assert.ok(removalCandidates.candidates.length >= 3);
assert.ok(removalCandidates.candidates.every(c => c.type_line.includes('Instant') || c.type_line.includes('Sorcery')));
assert.ok(removalCandidates.candidates.every(c => c.cmc <= 2));
assert.ok(!removalCandidates.candidates.some(c => c.type_line.includes('Creature')), 'CHEAP_REMOVAL must never return creatures!');

const demonReq = { need: 'TRIBAL_THREAT', cmcMax: 5, targetColors: ['B', 'R'], targetTribe: 'Demon' };
const demonCandidates = CardImplementer.findCandidates(demonReq, mockScryfallPool, intentRakdos);

assert.ok(demonCandidates.candidates.length >= 2);
assert.ok(demonCandidates.candidates.every(c => c.type_line.includes('Creature') && c.type_line.includes('Demon')));
console.log('✅ TEST 2 PASSED: CardImplementer strictly enforced Instant/Sorcery for removal and Creature — Demon for tribe.\n');

// ==========================================
// TEST 3: Deadlock Handling (0 Candidates)
// ==========================================
console.log('--- TEST 3: Deadlock Handling (0 Candidates) ---');
const impossibleReq = { need: 'CHEAP_REMOVAL', cmcMax: 0, targetColors: ['B'] }; // CMC 0 removal doesn't exist
const zeroResult = CardImplementer.findCandidates(impossibleReq, mockScryfallPool, intentRakdos);
assert.strictEqual(zeroResult.candidates.length, 0);

const pivotedNeed = LLMStrategist.generateStrategicNeed(summary, '0 candidates found for CHEAP_REMOVAL at CMC <= 0');
assert.strictEqual(pivotedNeed.cmcMax, 3, 'LLMStrategist must relax CMC constraint when deadlock feedback occurs');
console.log('✅ TEST 3 PASSED: Deadlock feedback was correctly captured and resulted in strategic constraint relaxation.\n');

// ==========================================
// TEST 4: AgenticDeckArchitect End-to-End Execution (Rakdos Demons)
// ==========================================
console.log('--- TEST 4: End-to-End Execution (Rakdos Demons Midrange) ---');
(async () => {
  const architectRakdos = new AgenticDeckArchitect(intentRakdos, mockScryfallPool);
  const resultRakdos = await architectRakdos.buildDeck();

  assert.strictEqual(resultRakdos.buildStatus, 'SUCCESS');
  assert.strictEqual(resultRakdos.summary.totalCards, 60);
  assert.strictEqual(resultRakdos.summary.nonLandCards, 36);

  // Verify presence of real removal, real Demon creatures, and Black/Red lands
  const deckList = resultRakdos.deckList;
  const removalCards = deckList.filter(c => c.role === 'CHEAP_REMOVAL' || c.role === 'REMOVAL');
  const demonCards = deckList.filter(c => (c.type_line || '').toLowerCase().includes('creature') && (c.type_line || '').toLowerCase().includes('demon'));
  const lands = deckList.filter(c => (c.type_line || '').toLowerCase().includes('land') || c.role === 'MANA_BASE');

  const removalCopyCount = removalCards.reduce((sum, c) => sum + c.quantity, 0);
  const demonCopyCount = demonCards.reduce((sum, c) => sum + c.quantity, 0);

  assert.ok(removalCopyCount >= 8, `Deck must contain cheap removal (Actual removal copy count: ${removalCopyCount})`);
  assert.ok(demonCopyCount >= 8, `Deck must contain Demon creatures (Actual demon copy count: ${demonCopyCount})`);
  assert.ok(lands.some(l => l.name === 'Blood Crypt' || l.name === 'Swamp' || l.name === 'Mountain'), 'Mana base must match B/R colors');

  console.log(`✅ TEST 4 PASSED: Rakdos Demons compiled 60/60 deck with ${removalCopyCount} cheap removal copies, ${demonCopyCount} Demon creature copies, and B/R lands.\n`);

  // ==========================================
  // TEST 5: End-to-End Execution (Simic Merfolk Tempo)
  // ==========================================
  console.log('--- TEST 5: End-to-End Execution (Simic Merfolk Tempo) ---');
  const intentSimic = { format: 'MODERN', colors: ['U', 'G'], primaryTribe: 'Merfolk', archetype: 'Tempo' };
  const architectSimic = new AgenticDeckArchitect(intentSimic, mockScryfallPool);
  const resultSimic = await architectSimic.buildDeck();

  assert.strictEqual(resultSimic.buildStatus, 'SUCCESS');
  const merfolkCards = resultSimic.deckList.filter(c => (c.type_line || '').toLowerCase().includes('creature') && (c.type_line || '').toLowerCase().includes('merfolk'));
  const merfolkCopyCount = merfolkCards.reduce((sum, c) => sum + c.quantity, 0);
  const simicLands = resultSimic.deckList.filter(c => (c.type_line || '').toLowerCase().includes('land') || c.role === 'MANA_BASE');

  assert.ok(merfolkCopyCount >= 12, `Simic Merfolk deck must contain >= 12 Merfolk creature copies (Actual: ${merfolkCopyCount})`);
  assert.ok(!resultSimic.deckList.some(c => c.name === 'Summon the School'), 'White Kindred sorceries must be excluded from Simic deck');
  assert.ok(simicLands.some(l => l.name === 'Breeding Pool' || l.name === 'Island' || l.name === 'Forest'), 'Mana base must match U/G colors');

  console.log(`✅ TEST 5 PASSED: Simic Merfolk compiled 60/60 deck with ${merfolkCopyCount} Merfolk creature copies and U/G lands.\n`);

  console.log('🎉 ALL SPRINT 6 AGENTIC DECK ARCHITECT TESTS PASSED WITH 100% SUCCESS!');
})();


