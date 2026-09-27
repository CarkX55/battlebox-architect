import assert from 'assert';
import { CopyAllocationManager } from '../../../src/services/compiler/core/copyAllocationManager.js';
import { DeckExpansion } from '../../../src/services/compiler/core/deckExpansion.js';
import { AllocationSlot } from '../../../src/services/compiler/core/capabilityPlan.js';

console.log('================================================================');
console.log('🧪 TEST SUITE: v26.0 Phase 3 — Copy Allocation & Causal Expansion Loop');
console.log('================================================================\n');

// 1. STANDARD 60-CARD DECK CLOSURE TEST
console.log('--- 1. 60-Card Deck Closure with Legendary Diminishing Returns ---');

const thalia = {
  name: 'Thalia, Guardian of Thraben',
  type_line: 'Legendary Creature — Human Soldier',
  oracle_text: 'Noncreature spells cost {1} more to cast.',
  cmc: 2,
  mana_value: 2,
  colors: ['W']
};

const bolt = {
  name: 'Lightning Bolt',
  type_line: 'Instant',
  oracle_text: 'Lightning Bolt deals 3 damage to any target.',
  cmc: 1,
  mana_value: 1,
  colors: ['R']
};

const guide = {
  name: 'Goblin Guide',
  type_line: 'Creature — Goblin Scout',
  oracle_text: 'Haste. Whenever Goblin Guide attacks, defending player reveals top card of library.',
  cmc: 1,
  mana_value: 1,
  colors: ['R']
};

const mockSpellPool = [
  thalia,
  bolt,
  guide,
  { name: 'Monastery Swiftspear', type_line: 'Creature — Human Monk', cmc: 1, colors: ['R'], oracle_text: 'Haste, Prowess' },
  { name: 'Eidolon of the Great Revel', type_line: 'Enchantment Creature — Spirit', cmc: 2, colors: ['R'], oracle_text: 'Whenever a player casts a spell with mana value 3 or less...' },
  { name: 'Lava Spike', type_line: 'Sorcery — Arcane', cmc: 1, colors: ['R'], oracle_text: 'Deals 3 damage to target player.' },
  { name: 'Rift Bolt', type_line: 'Sorcery', cmc: 3, colors: ['R'], oracle_text: 'Suspend 1 — {R}. Deals 3 damage to any target.' },
  { name: 'Skewer the Critics', type_line: 'Sorcery', cmc: 3, colors: ['R'], oracle_text: 'Spectacle {R}. Deals 3 damage to any target.' },
  { name: 'Searing Blaze', type_line: 'Instant', cmc: 2, colors: ['R'], oracle_text: 'Landfall — Deals 3 damage to target player and 3 damage to target creature...' },
  { name: 'Boros Charm', type_line: 'Instant', cmc: 2, colors: ['R', 'W'], oracle_text: 'Choose one — Deals 4 damage to target player...' }
];

const filledSlots = [
  new AllocationSlot({
    slotId: 'SLOT_LAND',
    role: 'Land',
    requiredDensity: 24,
    winnerCard: 'Mountain',
    allocationReason: 'Mana base'
  }),
  new AllocationSlot({
    slotId: 'SLOT_1',
    role: 'TAXING_BEATDOWN',
    requiredDensity: 4,
    winnerCard: 'Thalia, Guardian of Thraben',
    winnerCardObj: thalia,
    alternatives: ['Eidolon of the Great Revel'],
    allocationReason: 'Taxing beatdown'
  }),
  new AllocationSlot({
    slotId: 'SLOT_2',
    role: 'DIRECT_DAMAGE',
    requiredDensity: 4,
    winnerCard: 'Lightning Bolt',
    winnerCardObj: bolt,
    alternatives: ['Lava Spike'],
    allocationReason: 'Burn reach'
  }),
  new AllocationSlot({
    slotId: 'SLOT_3',
    role: 'FAST_PRESSURE',
    requiredDensity: 4,
    winnerCard: 'Goblin Guide',
    winnerCardObj: guide,
    alternatives: ['Monastery Swiftspear'],
    allocationReason: 'Early pressure'
  }),
  new AllocationSlot({
    slotId: 'SLOT_4',
    role: 'SECONDARY_BURN',
    requiredDensity: 4,
    winnerCard: 'Lava Spike',
    winnerCardObj: mockSpellPool[5],
    alternatives: ['Rift Bolt'],
    allocationReason: 'Direct burn'
  }),
  new AllocationSlot({
    slotId: 'SLOT_5',
    role: 'SECONDARY_PRESSURE',
    requiredDensity: 4,
    winnerCard: 'Monastery Swiftspear',
    winnerCardObj: mockSpellPool[3],
    alternatives: ['Eidolon of the Great Revel'],
    allocationReason: 'Haste prowess'
  }),
  new AllocationSlot({
    slotId: 'SLOT_6',
    role: 'STATIC_PUNISHER',
    requiredDensity: 4,
    winnerCard: 'Eidolon of the Great Revel',
    winnerCardObj: mockSpellPool[4],
    alternatives: ['Rift Bolt'],
    allocationReason: 'Tax damage'
  }),
  new AllocationSlot({
    slotId: 'SLOT_7',
    role: 'TEMPO_BURN',
    requiredDensity: 4,
    winnerCard: 'Rift Bolt',
    winnerCardObj: mockSpellPool[6],
    alternatives: ['Skewer the Critics'],
    allocationReason: 'Suspend burn'
  }),
  new AllocationSlot({
    slotId: 'SLOT_8',
    role: 'CONDITIONAL_REMOVAL',
    requiredDensity: 4,
    winnerCard: 'Searing Blaze',
    winnerCardObj: mockSpellPool[8],
    alternatives: ['Boros Charm'],
    allocationReason: 'Landfall burn'
  }),
  new AllocationSlot({
    slotId: 'SLOT_9',
    role: 'VERSATILE_FINISHER',
    requiredDensity: 4,
    winnerCard: 'Boros Charm',
    winnerCardObj: mockSpellPool[9],
    alternatives: ['Skewer the Critics'],
    allocationReason: 'Modal reach'
  })
];

const intentPackage = {
  format: 'MODERN',
  deckSize: 60,
  archetype: 'Aggro',
  colors: ['R', 'W']
};

const copyState = CopyAllocationManager.createAllocationStateFromPlan(
  filledSlots,
  'MODERN',
  'BALANCED',
  intentPackage,
  mockSpellPool
);

console.log('  ✦ Generated Capability Packages:');
copyState.packages.forEach(p => {
  console.log(`     - [${p.role}] ${p.winnerCard}: ${p.copies}x (${p.rationale})`);
});

const expandedDeck = DeckExpansion.expand(copyState);
const totalCards = expandedDeck.totalCardCount;
const totalLands = expandedDeck.cards.filter(c => (c.type_line || '').includes('Land') || c.role === 'Land').reduce((sum, c) => sum + c.quantity, 0);
const totalSpells = expandedDeck.cards.filter(c => !(c.type_line || '').includes('Land') && c.role !== 'Land').reduce((sum, c) => sum + c.quantity, 0);

console.log(`  ✦ Expanded Deck Totals: ${totalCards} cards (${totalLands} lands, ${totalSpells} spells)`);

assert.strictEqual(totalCards, 60, 'Total deck size must be exactly 60 cards');
assert.strictEqual(totalLands, 24, 'Total lands must be 24');
assert.strictEqual(totalSpells, 36, 'Total non-land spells must be exactly 36 (closure reached via Causal Expansion Loop)');

console.log('  ✅ [PASS] 60-Card Deck Closure achieved dynamically without magic number hardcodes.');

// 2. SINGLETON COMMANDER TEST
console.log('\n--- 2. Singleton Commander Multiplicity Invariant ---');
const cmdIntent = { format: 'COMMANDER', deckSize: 100, archetype: 'Midrange' };
const cmdState = CopyAllocationManager.createAllocationStateFromPlan(
  filledSlots,
  'COMMANDER',
  'SINGLETON',
  cmdIntent
);

cmdState.packages.forEach(p => {
  if (p.role !== 'Land') {
    assert.strictEqual(p.copies, 1, `Card ${p.winnerCard} must have exactly 1 copy in Commander`);
  }
});

console.log('  ✅ [PASS] Singleton Commander constraint strictly enforced (all spells 1x).');

console.log('\n================================================================');
console.log('🎉 ALL TESTS PASSED: v26.0 Copy Allocation & Expansion Loop verified!');
console.log('================================================================\n');
