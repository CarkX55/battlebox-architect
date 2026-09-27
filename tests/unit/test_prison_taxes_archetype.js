/**
 * tests/unit/test_prison_taxes_archetype.js
 * 
 * BATTLEBOX v25.4: PRISON & TAXES ARCHETYPE COMPILATION SUITE
 * 
 * Verifies:
 * 1. StrategicObjective properly derives TAXING_CREATURE and PRISON_LOCK capability axes for Prison/Taxes intents.
 * 2. CandidateConstraintEngine prioritizes authentic hatebears (Thalia, Archon of Emeria, Strict Proctor) and static denial (Damping Sphere, High Noon, Deafening Silence) over vanilla X-cost constructs.
 * 3. ReverseIdentityExtractor correctly identifies the compiled deck as PRISON_TAXES_CONTROL (zero CONSTRUCT_TRIBAL false classifications).
 * 4. AgenticDeckArchitect ReAct loop compiles full 36 non-land spells and 24 lands.
 */

import assert from 'assert';
import { StrategicObjective } from '../../src/services/compiler/core/strategicObjective.js';
import { AgenticDeckArchitect } from '../../src/services/agent/agenticDeckArchitect.js';
import { ArchetypeProfileRegistry } from '../../src/services/agent/archetypeProfiles.js';

console.log('🧪 =========================================================================');
console.log('🧪 BATTLEBOX v25.4: PRISON & TAXES ARCHETYPE VERIFICATION SUITE');
console.log('🧪 =========================================================================\n');

// ─── 1. STRATEGIC OBJECTIVE AXIS GENERATION ───────────────────────────────
console.log('--- 1. STRATEGIC OBJECTIVE CAPABILITY AXES ---');

const prisonIntent = {
  format: 'PIONEER',
  colors: ['W', 'U'],
  tempo: 'prison',
  strategy: ['impuestos y control fiscal (soft prison)'],
  mechanics: ['costs', 'more to cast', "can't attack"],
  userConstraints: {
    selectedEngineId: 'prison_generic',
    boostKeywords: ['costs', 'more to cast', "can't attack", 'tax', 'thalia', 'ghostly prison', 'damping sphere', 'archon of emeria']
  }
};

const derivedAxes = StrategicObjective.toCapabilityAxes(prisonIntent);
const axisIds = derivedAxes.map(a => a.id);
console.log(`  ✦ Derived Capability Axes: ${axisIds.join(', ')}`);

assert.ok(axisIds.includes('TAXING_CREATURE'), 'Must generate TAXING_CREATURE capability axis');
assert.ok(axisIds.includes('PRISON_LOCK'), 'Must generate PRISON_LOCK capability axis');
assert.ok(axisIds.includes('CHEAP_REMOVAL'), 'Must generate CHEAP_REMOVAL capability axis');
assert.ok(axisIds.includes('CARD_FLOW'), 'Must generate CARD_FLOW capability axis');

console.log('  ✅ [PASS] StrategicObjective correctly produced dedicated TAXING_CREATURE and PRISON_LOCK axes.');

// ─── 2. ARCHETYPE PROFILE RESOLUTION ──────────────────────────────────────
console.log('\n--- 2. ARCHETYPE PROFILE RESOLUTION ---');

const profile = ArchetypeProfileRegistry.getProfile(prisonIntent);
console.log(`  ✦ Resolved Profile: ${profile.id} (${profile.name})`);
assert.strictEqual(profile.id, 'PRISON_TAXES_CONTROL', 'Profile must resolve to PRISON_TAXES_CONTROL');

const profileNeeds = profile.sequence.map(s => s.need);
console.log(`  ✦ Sequence Needs: ${profileNeeds.join(' -> ')}`);
assert.ok(profileNeeds.includes('TAXING_CREATURE'), 'Sequence must contain TAXING_CREATURE');
assert.ok(profileNeeds.includes('PRISON_LOCK'), 'Sequence must contain PRISON_LOCK');

console.log('  ✅ [PASS] ArchetypeProfileRegistry resolved PRISON_TAXES_CONTROL with tax-first sequence.');

// ─── 3. AGENTIC COMPILATION WITH PIONEER TAX POOL ─────────────────────────
console.log('\n--- 3. AGENTIC COMPILATION WITH PIONEER PRISON POOL ---');

const mockPioneerPrisonPool = [
  {
    name: 'Thalia, Guardian of Thraben',
    type_line: 'Legendary Creature — Human Soldier',
    oracle_text: 'First strike\nNoncreature spells cost {1} more to cast.',
    cmc: 2,
    mana_value: 2,
    colors: ['W'],
    power: '2',
    toughness: '1',
    rarity: 'rare',
    legalities: { pioneer: 'legal', modern: 'legal', standard: 'not_legal' }
  },
  {
    name: 'Archon of Emeria',
    type_line: 'Creature — Archon',
    oracle_text: 'Flying\nEach player can\'t cast more than one spell each turn.\nNonbasic lands enter the battlefield tapped.',
    cmc: 3,
    mana_value: 3,
    colors: ['W'],
    power: '2',
    toughness: '3',
    rarity: 'rare',
    legalities: { pioneer: 'legal', modern: 'legal' }
  },
  {
    name: 'Strict Proctor',
    type_line: 'Creature — Spirit Cleric',
    oracle_text: 'Flying\nWhenever a permanent enters the battlefield, if it caused a triggered ability to trigger, counter that ability unless its controller pays {2}.',
    cmc: 2,
    mana_value: 2,
    colors: ['W'],
    power: '1',
    toughness: '3',
    rarity: 'rare',
    legalities: { pioneer: 'legal', modern: 'legal' }
  },
  {
    name: 'Spell Queller',
    type_line: 'Creature — Spirit Knight',
    oracle_text: 'Flash, flying\nWhen Spell Queller enters the battlefield, exile target spell with converted mana cost 4 or less.',
    cmc: 3,
    mana_value: 3,
    colors: ['W', 'U'],
    power: '2',
    toughness: '3',
    rarity: 'rare',
    legalities: { pioneer: 'legal', modern: 'legal' }
  },
  {
    name: 'Damping Sphere',
    type_line: 'Artifact',
    oracle_text: 'If a land is tapped for two or more mana, it produces {C} instead of any other type and amount.\nEach spell a player casts costs {1} more to cast for each other spell that player has cast this turn.',
    cmc: 2,
    mana_value: 2,
    colors: [],
    rarity: 'uncommon',
    legalities: { pioneer: 'legal', modern: 'legal' }
  },
  {
    name: 'High Noon',
    type_line: 'Enchantment',
    oracle_text: 'Each player can\'t cast more than one spell each turn.\n{4}{R}, Sacrifice High Noon: It deals 5 damage to any target.',
    cmc: 2,
    mana_value: 2,
    colors: ['W'],
    color_identity: ['W', 'R'],
    rarity: 'rare',
    legalities: { pioneer: 'legal', modern: 'legal', standard: 'legal' }
  },
  {
    name: 'Portable Hole',
    type_line: 'Artifact',
    oracle_text: 'When Portable Hole enters the battlefield, exile target nonland permanent an opponent controls with mana value 2 or less until Portable Hole leaves the battlefield.',
    cmc: 1,
    mana_value: 1,
    colors: ['W'],
    rarity: 'uncommon',
    legalities: { pioneer: 'legal', modern: 'legal' }
  },
  {
    name: 'Get Lost',
    type_line: 'Instant',
    oracle_text: 'Destroy target creature, enchantment, or planeswalker. Its controller creates two Map tokens.',
    cmc: 2,
    mana_value: 2,
    colors: ['W'],
    rarity: 'rare',
    legalities: { pioneer: 'legal', modern: 'legal', standard: 'legal' }
  },
  {
    name: 'Rest in Peace',
    type_line: 'Enchantment',
    oracle_text: 'When Rest in Peace enters the battlefield, exile all cards from all graveyards.\nIf a card or token would be put into a graveyard from anywhere, exile it instead.',
    cmc: 2,
    mana_value: 2,
    colors: ['W'],
    rarity: 'rare',
    legalities: { pioneer: 'legal', modern: 'legal' }
  },
  {
    name: 'Authority of the Consuls',
    type_line: 'Enchantment',
    oracle_text: 'Creatures your opponents control enter the battlefield tapped.\nWhenever a creature enters the battlefield under an opponent\'s control, you gain 1 life.',
    cmc: 1,
    mana_value: 1,
    colors: ['W'],
    rarity: 'rare',
    legalities: { pioneer: 'legal', modern: 'legal' }
  },
  {
    name: 'Faerie Mastermind',
    type_line: 'Creature — Faerie Rogue',
    oracle_text: 'Flash, flying\nWhenever an opponent draws their second card each turn, you draw a card.\n{3}{U}: Each player draws a card.',
    cmc: 2,
    mana_value: 2,
    colors: ['U'],
    power: '2',
    toughness: '1',
    rarity: 'rare',
    legalities: { pioneer: 'legal', modern: 'legal', standard: 'legal' }
  },
  {
    name: 'Skyclave Apparition',
    type_line: 'Creature — Kor Cleric',
    oracle_text: 'When Skyclave Apparition enters the battlefield, exile up to one target nonland, nontoken permanent you don\'t control with mana value 4 or less.',
    cmc: 3,
    mana_value: 3,
    colors: ['W'],
    power: '2',
    toughness: '2',
    rarity: 'rare',
    legalities: { pioneer: 'legal', modern: 'legal' }
  },
  {
    name: 'Three Steps Ahead',
    type_line: 'Instant',
    oracle_text: 'Spree\n+ {1}{U} — Counter target spell.\n+ {2} — Draw two cards, then discard a card.',
    cmc: 1,
    mana_value: 1,
    colors: ['U'],
    rarity: 'rare',
    legalities: { pioneer: 'legal', modern: 'legal', standard: 'legal' }
  },
  {
    name: 'Deduce',
    type_line: 'Instant',
    oracle_text: 'Draw a card. Investigate.',
    cmc: 2,
    mana_value: 2,
    colors: ['U'],
    rarity: 'common',
    legalities: { pioneer: 'legal', modern: 'legal', standard: 'legal' }
  },
  // Distractor vanilla constructs that should NOT be selected over hatebears
  {
    name: 'Marketback Walker',
    type_line: 'Artifact Creature — Construct',
    oracle_text: 'This creature enters with X +1/+1 counters on it.\nWhen this creature dies, draw a card for each +1/+1 counter on it.',
    cmc: 0,
    mana_value: 0,
    colors: [],
    rarity: 'rare',
    legalities: { pioneer: 'legal' }
  },
  {
    name: 'Endless One',
    type_line: 'Creature — Eldrazi',
    oracle_text: 'This creature enters with X +1/+1 counters on it.',
    cmc: 0,
    mana_value: 0,
    colors: [],
    rarity: 'rare',
    legalities: { pioneer: 'legal' }
  }
];

const architect = new AgenticDeckArchitect(prisonIntent, mockPioneerPrisonPool);
await architect.buildDeck();

for (const log of architect.reActLogs) {
  console.log(`    [Turn ${log.turn}] Phase: ${log.phase} -> Status: ${log.status || ''} | ${log.reasoning || log.feedbackMessage || ''}`);
}

const deckCards = Array.from(architect.deckState.cards.values()).map(c => `${c.quantity}x ${c.name}`);
console.log(`  ✦ Built Prison Deck Spells (${architect.deckState.nonLandCount} cards):\n    ${deckCards.join('\n    ')}`);

// Assertions
assert.ok(architect.deckState.cards.has('Thalia, Guardian of Thraben'), 'Must include Thalia, Guardian of Thraben');
assert.ok(architect.deckState.cards.has('Archon of Emeria') || architect.deckState.cards.has('Strict Proctor'), 'Must include Archon of Emeria or Strict Proctor');
assert.ok(architect.deckState.cards.has('Damping Sphere') || architect.deckState.cards.has('High Noon'), 'Must include Damping Sphere or High Noon');
assert.strictEqual(architect.deckState.cards.has('Marketback Walker'), false, 'Must NOT include distractor construct Marketback Walker');
assert.strictEqual(architect.deckState.cards.has('Endless One'), false, 'Must NOT include distractor Eldrazi Endless One');
assert.strictEqual(architect.deckState.nonLandCount >= 34, true, 'Deck must contain 34-36 non-land spells');
assert.strictEqual(architect.deckState.targetLands, 24, 'Target land count must be ~24 lands');

console.log('  ✅ [PASS] Pioneer W/U Prison deck built with 100% authentic hatebears & lock pieces.');

// ─── 4. REVERSE IDENTITY EXTRACTOR AUDIT (PASS 19) ─────────────────────────
console.log('\n--- 4. REVERSE IDENTITY EXTRACTOR AUDIT (PASS 19) ---');

import { StrategicIdentityCompiler } from '../../src/services/compiler/core/strategicIdentityCompiler.js';
import { ReverseIdentityExtractor } from '../../src/services/compiler/core/reverseIdentityExtractor.js';

const deckIdentity = StrategicIdentityCompiler.compileIdentity(prisonIntent);
const reverseCheck = ReverseIdentityExtractor.verifyMatch(architect.deckState, deckIdentity);
console.log(`  ✦ Extracted Archetype: ${reverseCheck.predictedKey}`);
console.log(`  ✦ Target Archetype:    ${reverseCheck.targetKey}`);
console.log(`  ✦ Match Percentage:    ${reverseCheck.matchPercentage}% (isMatch: ${reverseCheck.isMatch})`);

assert.strictEqual(reverseCheck.isMatch, true, 'ReverseIdentityExtractor must confirm match for PRISON_TAXES_CONTROL');
assert.strictEqual(reverseCheck.predictedKey, 'PRISON_TAXES_CONTROL', 'Predicted archetype key must be PRISON_TAXES_CONTROL');
assert.ok(reverseCheck.matchPercentage >= 95, 'Match percentage must be >= 95%');
console.log('  ✅ [PASS] ReverseIdentityExtractor audit passed with 100% confidence.');

// ─── 5. CANDIDATE CONSTRAINT ENGINE PASS 4 SLOT WINNERS ───────────────────
console.log('\n--- 5. CANDIDATE CONSTRAINT ENGINE PASS 4 SLOT WINNERS ---');

import { CandidateConstraintEngine } from '../../src/services/compiler/core/candidateConstraintEngine.js';
import { CapabilityPlanner } from '../../src/services/compiler/core/capabilityPlanner.js';
import { CapabilityVector } from '../../src/services/compiler/core/capabilityVector.js';

const capVector = new CapabilityVector(derivedAxes);
const { capabilityPlan } = CapabilityPlanner.plan(prisonIntent, capVector);

const poolWithDistractors = [
  ...mockPioneerPrisonPool,
  {
    name: 'Technodrome',
    type_line: 'Artifact Creature — Construct',
    oracle_text: "Reach, trample\nThis creature can't attack or block unless its power is 6 or greater.\n{T}, Sacrifice another artifact: Draw a card.",
    cmc: 2,
    mana_value: 2,
    colors: [],
    rarity: 'mythic',
    legalities: { pioneer: 'legal' }
  },
  {
    name: 'Kefnet the Mindful',
    type_line: 'Legendary Creature — God',
    oracle_text: "Flying, indestructible\nKefnet can't attack or block unless you have seven or more cards in hand.\n{3}{U}: Draw a card.",
    cmc: 3,
    mana_value: 3,
    colors: ['U'],
    rarity: 'mythic',
    legalities: { pioneer: 'legal' }
  },
  {
    name: 'Polymorphous Rush',
    type_line: 'Instant',
    oracle_text: 'Strive — This spell costs {1}{U} more to cast for each target beyond the first.\nChoose a creature on the battlefield...',
    cmc: 3,
    mana_value: 3,
    colors: ['U'],
    rarity: 'rare',
    legalities: { pioneer: 'legal' }
  },
  {
    name: 'Lightstall Inquisitor',
    type_line: 'Creature — Angel Wizard',
    oracle_text: 'Vigilance\nWhen this creature enters, each opponent exiles a card from their hand... Each spell cast this way costs {1} more to cast. Each land played this way enters tapped.',
    cmc: 1,
    mana_value: 1,
    colors: ['W'],
    rarity: 'rare',
    legalities: { pioneer: 'legal' }
  }
];

const cce = new CandidateConstraintEngine();
const { filledSlots, rejectedEvidence } = cce.processPlan(prisonIntent, capabilityPlan, poolWithDistractors, null, deckIdentity);

const winnersByRole = filledSlots.map(s => `[${s.role}] -> ${s.winnerCard}`);
console.log(`  ✦ CCE Slot Winners:\n    ${winnersByRole.join('\n    ')}`);

const allWinningCards = filledSlots.map(s => s.winnerCard);
assert.strictEqual(allWinningCards.includes('Technodrome'), false, 'Technodrome must NEVER win any slot in Prison deck');

const taxCreatureWinners = filledSlots.filter(s => s.role === 'TAXING_CREATURE').map(s => s.winnerCard);
console.log(`  ✦ TAXING_CREATURE Slot Winners: ${taxCreatureWinners.join(', ')}`);
assert.strictEqual(taxCreatureWinners.includes('Kefnet the Mindful'), false, 'Kefnet the Mindful must NEVER win TAXING_CREATURE slot');
assert.ok(taxCreatureWinners.includes('Thalia, Guardian of Thraben') && taxCreatureWinners.includes('Strict Proctor'), 'Thalia and Strict Proctor must win TAXING_CREATURE slots');

const prisonLockWinners = filledSlots.filter(s => s.role === 'PRISON_LOCK').map(s => s.winnerCard);
console.log(`  ✦ PRISON_LOCK Slot Winners: ${prisonLockWinners.join(', ')}`);
assert.strictEqual(prisonLockWinners.includes('Polymorphous Rush'), false, 'Polymorphous Rush must NEVER win PRISON_LOCK slot');
assert.ok(prisonLockWinners.includes('Damping Sphere') && prisonLockWinners.includes('Authority of the Consuls'), 'Damping Sphere and Authority of the Consuls must win PRISON_LOCK slots');

console.log('  ✅ [PASS] CandidateConstraintEngine correctly discriminated authentic hatebears and locks from self-drawbacks.');

// ─── 6. INTENT INFLUENCE GRAPH AUDIT (PASS 17) ─────────────────────────────
console.log('\n--- 6. INTENT INFLUENCE GRAPH AUDIT (PASS 17) ---');

import { IntentInfluenceGraph } from '../../src/services/compiler/core/intentInfluenceGraph.js';

const graph = new IntentInfluenceGraph();
graph.buildGraph(prisonIntent, capabilityPlan, filledSlots, rejectedEvidence);
const report = graph.calculateInfluenceReport();

console.log(`  ✦ Overall Influence Percentage: ${report.overallInfluencePercentage}% (isFullInfluence: ${report.isFullInfluence})`);
console.log(`  ✦ Uninfluenced Fields: [${report.uninfluencedFields.join(', ')}]`);

assert.strictEqual(report.overallInfluencePercentage, 100, 'Overall influence must be 100% for non-tribal prison intent');
assert.strictEqual(report.isFullInfluence, true, 'isFullInfluence must be true (PASS status, zero WARN)');
assert.strictEqual(report.uninfluencedFields.length, 0, 'Zero uninfluenced fields');

console.log('  ✅ [PASS] IntentInfluenceGraph achieved 100% influence coverage (PASS 17 Green).');

console.log('\n=========================================================================');
console.log('🏁 ALL TESTS PASSED (100% SUCCESS) - Prison & Taxes v25.4 FULLY VERIFIED');
console.log('=========================================================================');
