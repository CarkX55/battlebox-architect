import assert from 'node:assert';
import { LLMStrategist } from '../../../src/services/agent/llmStrategist.js';
import { ArchetypeProfileRegistry } from '../../../src/services/agent/archetypeProfiles.js';
import { CardImplementer } from '../../../src/services/agent/cardImplementer.js';

console.log("🧪 Running Universal Archetype Profile Matrix Test Suite...\n");

// TEST 1: Archetype Profile Registry Resolution
console.log("--- TEST 1: ArchetypeProfileRegistry Resolution ---");

const testCases = [
  { input: { archetype: 'tempo', primaryTribe: 'Merfolk' }, expectedId: 'TRIBAL' },
  { input: { archetype: 'aggro', primaryTribe: null }, expectedId: 'AGGRO' },
  { input: { archetype: 'tempo', primaryTribe: null }, expectedId: 'TEMPO' },
  { input: { archetype: 'control', primaryTribe: null }, expectedId: 'CONTROL' },
  { input: { archetype: 'ramp', primaryTribe: null }, expectedId: 'RAMP' },
  { input: { strategy: 'aristocrats', primaryTribe: null }, expectedId: 'ARISTOCRATS' },
  { input: { strategy: 'reanimator', primaryTribe: null }, expectedId: 'REANIMATOR' },
  { input: { strategy: 'enchantress', primaryTribe: null }, expectedId: 'ENCHANTRESS' },
  { input: { archetype: 'midrange', primaryTribe: null }, expectedId: 'MIDRANGE' }
];

testCases.forEach(({ input, expectedId }) => {
  const profile = ArchetypeProfileRegistry.getProfile(input);
  assert.strictEqual(profile.id, expectedId, `Profile ID for ${JSON.stringify(input)} should be ${expectedId}`);
  console.log(`  ✅ ${profile.name} profile resolved correctly (Min creatures: ${profile.minCreatures})`);
});
console.log("✅ TEST 1 PASSED: All 9 key archetype profiles resolved deterministically.\n");

// TEST 2: LLMStrategist Sequence Profile Integration
console.log("--- TEST 2: LLMStrategist Sequence Generation ---");
const merfolkSummary = { archetype: 'tempo', primaryTribe: 'Merfolk', nonLandCards: 12, colors: ['U', 'B'] };
const merfolkNeed = LLMStrategist.generateStrategicNeed(merfolkSummary);
assert.strictEqual(merfolkNeed.need, 'TRIBAL_THREAT');
assert.strictEqual(merfolkNeed.targetTribe.toLowerCase(), 'merfolk');
assert.strictEqual(merfolkNeed.requiredType, 'Creature');
console.log(`  ✅ Merfolk Tribal request: ${merfolkNeed.need} (${merfolkNeed.requiredType} - ${merfolkNeed.targetTribe})`);

const controlSummary = { archetype: 'control', nonLandCards: 14, colors: ['U', 'W'] };
const controlNeed = LLMStrategist.generateStrategicNeed(controlSummary);
assert.strictEqual(controlNeed.need, 'CARD_FLOW');
console.log(`  ✅ Control request at 14 non-lands: ${controlNeed.need} (${controlNeed.reasoning})`);
console.log("✅ TEST 2 PASSED: LLMStrategist sequence generation integrates profiles seamlessly.\n");

// TEST 3: CardImplementer Land Exclusion & Strict Tribal Verification
console.log("--- TEST 3: CardImplementer Type & Subtype Invariance ---");

const mockCardPool = [
  { name: 'Lord of Atlantis', type_line: 'Creature — Merfolk Lord', oracle_text: 'Other Merfolk get +1/+1', cmc: 2, colors: ['U'] },
  { name: 'Map to Lorthos\'s Temple', type_line: 'Land Artifact', oracle_text: 'Create a 1/1 Merfolk token', cmc: 0, colors: [] },
  { name: 'Undead Warchief', type_line: 'Creature — Zombie Lord', oracle_text: 'Zombie spells cost 1 less', cmc: 4, colors: ['B'] },
  { name: 'Fatal Push', type_line: 'Instant', oracle_text: 'Destroy target creature', cmc: 1, colors: ['B'] }
];

const merfolkRequest = { need: 'TRIBAL_THREAT', requiredType: 'Creature', targetColors: new Set(['U', 'B']), targetTribe: 'Merfolk' };
const { candidates } = CardImplementer.findCandidates(merfolkRequest, mockCardPool, {}, new Map());

assert.strictEqual(candidates.length, 1);
assert.strictEqual(candidates[0].name, 'Lord of Atlantis');
console.log(`  ✅ CardImplementer strictly selected 100% Merfolk creature: ${candidates[0].name} (excluded Map land and Zombie)`);

console.log("✅ TEST 3 PASSED: CardImplementer enforces type and subtype invariance.\n");

console.log("🎉 ALL UNIVERSAL ARCHETYPE MATRIX TESTS PASSED WITH 100% SUCCESS!");
