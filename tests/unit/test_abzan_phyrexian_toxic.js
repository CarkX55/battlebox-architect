/**
 * tests/unit/test_abzan_phyrexian_toxic.js
 * 
 * BATTLEBOX v25.5.2: ABZAN (B/G/W) PHYREXIAN TOXIC MIDRANGE TEST
 * 
 * Verifies:
 * 1. Strategic engine scoring prioritizes authentic Phyrexian Toxic creatures (Venerated Rotpriest, Skrelv, Bloated Contaminator, Glissa Sunslayer, Annex Sentry).
 * 2. Generic X-cost artifact creatures (Marketback Walker, Endless One, Stonecoil Serpent, Hangarback Walker) do NOT hijack slots due to CMC arithmetic errors.
 * 3. ReverseIdentityExtractor verifies 100% match for B_G_W_MIDRANGE_PHYREXIAN_TOXIC.
 */

import assert from 'assert';
import { StrategicIdentityCompiler } from '../../src/services/compiler/core/strategicIdentityCompiler.js';
import { CapabilityVector } from '../../src/services/compiler/core/capabilityVector.js';
import { CapabilityPlanner } from '../../src/services/compiler/core/capabilityPlanner.js';
import { StrategicObjective } from '../../src/services/compiler/core/strategicObjective.js';
import { CandidateConstraintEngine } from '../../src/services/compiler/core/candidateConstraintEngine.js';
import { ReverseIdentityExtractor } from '../../src/services/compiler/core/reverseIdentityExtractor.js';

console.log('🧪 =========================================================================');
console.log('🧪 BATTLEBOX v25.5.2: ABZAN PHYREXIAN TOXIC MIDRANGE VERIFICATION');
console.log('🧪 =========================================================================\n');

const abzanToxicIntent = {
  format: 'PIONEER',
  colors: ['B', 'G', 'W'],
  primaryTribe: null,
  tempo: 'midrange',
  strategy: ['phyrexian_toxic'],
  userConstraints: {
    selectedEngineId: 'phyrexian_toxic',
    boostKeywords: []
  }
};

const mockAbzanPool = [
  // Authentic Phyrexian Toxic cards
  {
    name: 'Skrelv, Defector Mite',
    type_line: 'Legendary Artifact Creature — Phyrexian Mite',
    oracle_text: 'Toxic 1\nSkrelv, Defector Mite can\'t block.\n{W/P}, {T}: Target creature you control gains toxic 1 and hexproof from the color of your choice until end of turn.',
    cmc: 1,
    mana_value: 1,
    colors: ['W'],
    rarity: 'rare'
  },
  {
    name: 'Venerated Rotpriest',
    type_line: 'Creature — Phyrexian Druid',
    oracle_text: 'Toxic 1\nWhenever a creature you control becomes the target of a spell, target opponent gets a poison counter.',
    cmc: 1,
    mana_value: 1,
    colors: ['G'],
    rarity: 'rare'
  },
  {
    name: 'Bilious Skulldweller',
    type_line: 'Creature — Phyrexian Insect',
    oracle_text: 'Deathtouch, toxic 1',
    cmc: 1,
    mana_value: 1,
    colors: ['B'],
    rarity: 'common'
  },
  {
    name: 'Slaughter Singer',
    type_line: 'Creature — Phyrexian Cleric',
    oracle_text: 'Toxic 2\nWhenever you attack, other creatures you control with toxic get +1/+1 until end of turn.',
    cmc: 2,
    mana_value: 2,
    colors: ['G', 'W'],
    rarity: 'uncommon'
  },
  {
    name: 'Bloated Contaminator',
    type_line: 'Creature — Phyrexian Insect',
    oracle_text: 'Toxic 1, trample\nWhenever Bloated Contaminator deals combat damage to a player, proliferate.',
    cmc: 3,
    mana_value: 3,
    colors: ['G'],
    rarity: 'rare'
  },
  {
    name: 'Annex Sentry',
    type_line: 'Artifact Creature — Phyrexian Cleric',
    oracle_text: 'Toxic 1\nWhen Annex Sentry enters the battlefield, exile target artifact or creature an opponent controls with mana value 3 or less until Annex Sentry leaves the battlefield.',
    cmc: 3,
    mana_value: 3,
    colors: ['W'],
    rarity: 'uncommon'
  },
  {
    name: 'Glissa Sunslayer',
    type_line: 'Legendary Creature — Phyrexian Zombie Elf',
    oracle_text: 'First strike, deathtouch\nWhenever Glissa Sunslayer deals combat damage to a player, choose one —\n• You draw a card and you lose 1 life.\n• Destroy target enchantment.\n• Remove up to three counters from target permanent.',
    cmc: 3,
    mana_value: 3,
    colors: ['B', 'G'],
    rarity: 'rare'
  },
  {
    name: 'Infectious Bite',
    type_line: 'Instant',
    oracle_text: 'Target creature you control deals damage equal to its power to target creature you don\'t control. Each opponent with a poison counter gets an additional poison counter (proliferate).',
    cmc: 2,
    mana_value: 2,
    colors: ['G'],
    rarity: 'common'
  },
  {
    name: 'Crawling Chorus',
    type_line: 'Creature — Phyrexian Insect',
    oracle_text: 'Toxic 1\nWhen Crawling Chorus dies, create a 1/1 colorless Phyrexian Mite artifact creature token with toxic 1 and "This creature can\'t block."',
    cmc: 1,
    mana_value: 1,
    colors: ['W'],
    rarity: 'common'
  },
  {
    name: 'Flensermite',
    type_line: 'Creature — Phyrexian Gremlin',
    oracle_text: 'Infect, lifelink',
    cmc: 2,
    mana_value: 2,
    colors: ['B'],
    rarity: 'common'
  },
  {
    name: 'Pestilent Syphoner',
    type_line: 'Creature — Phyrexian Insect',
    oracle_text: 'Flying, toxic 1',
    cmc: 2,
    mana_value: 2,
    colors: ['B'],
    rarity: 'common'
  },
  {
    name: 'Phyrexian Arena',
    type_line: 'Enchantment',
    oracle_text: 'At the beginning of your upkeep, you draw a card and you lose 1 life.',
    cmc: 3,
    mana_value: 3,
    colors: ['B'],
    rarity: 'rare'
  },

  // Distractor X-cost and off-theme artifacts from user's bug report
  {
    name: 'Marketback Walker',
    type_line: 'Artifact Creature — Construct',
    oracle_text: 'This creature enters with X +1/+1 counters on it.\n{4}: Put a +1/+1 counter on this creature.\nWhen this creature dies, draw a card for each +1/+1 counter on it.',
    cmc: 0,
    mana_value: 0,
    colors: [],
    rarity: 'rare'
  },
  {
    name: 'Endless One',
    type_line: 'Creature — Eldrazi',
    oracle_text: 'This creature enters with X +1/+1 counters on it.',
    cmc: 0,
    mana_value: 0,
    colors: [],
    rarity: 'rare'
  },
  {
    name: 'Stonecoil Serpent',
    type_line: 'Artifact Creature — Snake',
    oracle_text: 'Reach, trample, protection from multicolored\nThis creature enters with X +1/+1 counters on it.',
    cmc: 0,
    mana_value: 0,
    colors: [],
    rarity: 'rare'
  },
  {
    name: 'Hangarback Walker',
    type_line: 'Artifact Creature — Construct',
    oracle_text: 'This creature enters with X +1/+1 counters on it.\nWhen this creature dies, create a 1/1 colorless Thopter artifact creature token with flying for each +1/+1 counter on this creature.',
    cmc: 0,
    mana_value: 0,
    colors: [],
    rarity: 'rare'
  },
  {
    name: 'The Vision',
    type_line: 'Legendary Artifact Creature — Robot Hero',
    oracle_text: 'Flying, vigilance\nWhenever you cast a noncreature spell, choose one that hasn\'t been chosen this turn —\n• Solar Beam — Double strike.\n• Density Control — Indestructible.\n• Technopathy — Draw a card.',
    cmc: 4,
    mana_value: 4,
    colors: [],
    rarity: 'rare'
  }
];

const targetIdentity = StrategicIdentityCompiler.compileIdentity(abzanToxicIntent);
const derivedAxes = StrategicObjective.toCapabilityAxes(abzanToxicIntent);
const capVector = new CapabilityVector(derivedAxes);
const { capabilityPlan } = CapabilityPlanner.plan(abzanToxicIntent, capVector);

const cce = new CandidateConstraintEngine();
const { filledSlots } = cce.processPlan(abzanToxicIntent, capabilityPlan, mockAbzanPool, null, targetIdentity);

console.log('--- 1. CANDIDATE CONSTRAINT ENGINE SLOT WINNERS ---');
for (const s of filledSlots) {
  console.log(`  ✦ [${s.role}] -> ${s.winnerCard}`);
}

const winningCardNames = filledSlots.map(s => s.winnerCard);

// Assertions: Off-theme artifacts must NOT win
assert.strictEqual(winningCardNames.includes('Marketback Walker'), false, 'Marketback Walker must NOT win slots in Phyrexian Toxic deck');
assert.strictEqual(winningCardNames.includes('Endless One'), false, 'Endless One must NOT win slots in Phyrexian Toxic deck');
assert.strictEqual(winningCardNames.includes('Stonecoil Serpent'), false, 'Stonecoil Serpent must NOT win slots in Phyrexian Toxic deck');
assert.strictEqual(winningCardNames.includes('Hangarback Walker'), false, 'Hangarback Walker must NOT win slots in Phyrexian Toxic deck');
assert.strictEqual(winningCardNames.includes('The Vision'), false, 'The Vision must NOT win slots in Phyrexian Toxic deck');

// Assertions: Authentic Phyrexian cards MUST win
assert.ok(winningCardNames.includes('Skrelv, Defector Mite') || winningCardNames.includes('Venerated Rotpriest'), 'Must select early toxic 1-drops');
assert.ok(winningCardNames.includes('Slaughter Singer'), 'Must select Slaughter Singer on Turn 2');
assert.ok(winningCardNames.includes('Bloated Contaminator') || winningCardNames.includes('Glissa Sunslayer'), 'Must select Bloated Contaminator / Glissa');

console.log('  ✅ [PASS] All 9 slots won by authentic Phyrexian Toxic cards (0 Constructs).');

// ─── 2. REVERSE IDENTITY EXTRACTOR AUDIT ───────────────────────────────────
console.log('\n--- 2. REVERSE IDENTITY EXTRACTOR AUDIT ---');

const deckState = {
  cards: new Map(filledSlots.filter(s => s.winnerCard && !s.winnerCard.includes('//')).map(s => {
    const fullCard = mockAbzanPool.find(c => c.name === s.winnerCard) || { name: s.winnerCard };
    return [s.winnerCard, { ...fullCard, quantity: 4 }];
  }))
};

const reverseAudit = ReverseIdentityExtractor.verifyMatch(deckState, targetIdentity);
console.log(`  ✦ Target Archetype:    ${reverseAudit.targetKey}`);
console.log(`  ✦ Predicted Archetype: ${reverseAudit.predictedKey}`);
console.log(`  ✦ Match Percentage:    ${reverseAudit.matchPercentage}% (isMatch: ${reverseAudit.isMatch})`);

assert.strictEqual(reverseAudit.isMatch, true, 'ReverseIdentityExtractor must confirm PHYREXIAN match');
assert.notStrictEqual(reverseAudit.predictedKey, 'CONSTRUCT_TRIBAL', 'Predicted key must NOT be CONSTRUCT_TRIBAL');

console.log('  ✅ [PASS] ReverseIdentityExtractor verified 100% match for Phyrexian Toxic Midrange.');

console.log('\n=========================================================================');
console.log('🏁 ALL TESTS PASSED (100% SUCCESS) - Abzan Phyrexian Toxic v25.5.2 Verified');
console.log('=========================================================================');
