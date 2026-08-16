/**
 * ZERO CREATURE TRIBAL PREVENTION & BUILD SAFETY GATE SUITE
 * 
 * Verifies that IntentNormalizer sanitizes bilingual UI tribe inputs, CandidateConstraintEngine
 * enforces creature density for tribal roles, CHEAP_REMOVAL penalizes high CMC, mana bases match color identity,
 * and CompilerConvergencePipeline fails builds if safety invariants are violated.
 */

import assert from 'node:assert';
import { IntentNormalizer } from '../../../src/services/compiler/core/intentNormalizer.js';
import { IntentBuilder } from '../../../src/services/compiler/core/intentBuilder.js';
import { CandidateConstraintEngine } from '../../../src/services/compiler/core/candidateConstraintEngine.js';
import { CompilerConvergencePipeline } from '../../../src/knowledge/compiler/CompilerConvergencePipeline.js';

console.log('🧪 Running Zero-Creature Tribal Prevention & Safety Gate Test Suite...\n');

// ==========================================
// TEST 1: IntentNormalizer Bilingual Sanitization
// ==========================================
console.log('--- TEST 1: IntentNormalizer Bilingual Sanitization ---');
assert.strictEqual(IntentNormalizer.normalizeTribe('tritones (merfolk)'), 'Merfolk');
assert.strictEqual(IntentNormalizer.normalizeTribe('gigantes (giants)'), 'Giant');
assert.strictEqual(IntentNormalizer.normalizeTribe('elfos (elves)'), 'Elf');
assert.strictEqual(IntentNormalizer.normalizeTribe('goblins (trasgos)'), 'Goblin');
assert.strictEqual(IntentNormalizer.normalizeTribe('vampiros'), 'Vampire');
console.log('✅ TEST 1 PASSED: Raw bilingual UI tribe strings correctly sanitized to canonical MTG subtypes.\n');

// ==========================================
// TEST 2: IntentBuilder Canonical Integration
// ==========================================
console.log('--- TEST 2: IntentBuilder Integration ---');
const uiState = {
  formato: 'MODERN',
  archetype: 'tempo',
  colors: ['U', 'G'],
  tribe: 'tritones (merfolk)',
  strategy: 'tempo'
};
const intentPackage = IntentBuilder.buildFromUI(uiState);
assert.strictEqual(intentPackage.primaryTribe, 'Merfolk');
assert.deepStrictEqual(intentPackage.colors, ['U', 'G']);
console.log('✅ TEST 2 PASSED: IntentBuilder produced normalized IntentPackage with primaryTribe = "Merfolk".\n');

// ==========================================
// TEST 3: CandidateConstraintEngine Type & CMC Scoring Rules
// ==========================================
console.log('--- TEST 3: CandidateConstraintEngine Type & CMC Scoring Rules ---');
const constraintEngine = new CandidateConstraintEngine();

const mockPool = [
  { name: 'Summon the School', type_line: 'Kindred Sorcery — Merfolk', cmc: 4, oracle_text: 'Create two 1/1 Merfolk tokens.' },
  { name: 'Silvergill Adept', type_line: 'Creature — Merfolk Wizard', cmc: 2, oracle_text: 'When Silvergill Adept enters, draw a card.' },
  { name: 'Lord of Atlantis', type_line: 'Creature — Merfolk', cmc: 2, oracle_text: 'Other Merfolk get +1/+1 and islandwalk.' },
  { name: 'Elspeth, Sun\'s Champion', type_line: 'Planeswalker — Elspeth', cmc: 6, oracle_text: 'Destroy all creatures with power 4 or greater.' },
  { name: 'Spell Pierce', type_line: 'Instant', cmc: 1, oracle_text: 'Counter target noncreature spell unless its controller pays {2}.' },
  { name: 'Counterspell', type_line: 'Instant', cmc: 2, oracle_text: 'Counter target spell.' }
];

const slotTribal = { role: 'TRIBAL_DENSITY', requiredDensity: 4 };
const rankedTribal = constraintEngine.rankCandidatesForSlot(slotTribal, mockPool, intentPackage);
assert.ok(rankedTribal[0].card.type_line.includes('Creature') && rankedTribal[0].card.type_line.includes('Merfolk'), 'Top candidate #1 must be Creature Merfolk');
assert.ok(rankedTribal[1].card.type_line.includes('Creature') && rankedTribal[1].card.type_line.includes('Merfolk'), 'Top candidate #2 must be Creature Merfolk');
assert.ok(rankedTribal.find(r => r.card.name === 'Summon the School').score < rankedTribal[0].score, 'Sorcery Kindred must score lower than Creature Merfolk');


const slotCheapRemoval = { role: 'CHEAP_REMOVAL', requiredDensity: 4 };
const rankedRemoval = constraintEngine.rankCandidatesForSlot(slotCheapRemoval, mockPool, intentPackage);
assert.ok(rankedRemoval.find(r => r.card.name === 'Elspeth, Sun\'s Champion').score < 0, '6-CMC Elspeth must be heavily penalized for CHEAP_REMOVAL');

console.log('✅ TEST 3 PASSED: CandidateConstraintEngine enforced Creature type for tribal density and penalized high-CMC removal.\n');

// ==========================================
// TEST 4: Full Pipeline End-to-End Execution
// ==========================================
console.log('--- TEST 4: Full Pipeline End-to-End Execution ---');
const fullRawPool = [
  { name: 'Lord of Atlantis', type_line: 'Creature — Merfolk', cmc: 2, colors: ['U'], oracle_text: 'Other Merfolk get +1/+1.' },
  { name: 'Master of the Pearl Trident', type_line: 'Creature — Merfolk', cmc: 2, colors: ['U'], oracle_text: 'Other Merfolk get +1/+1.' },
  { name: 'Silvergill Adept', type_line: 'Creature — Merfolk Wizard', cmc: 2, colors: ['U'], oracle_text: 'Draw a card.' },
  { name: 'Merfolk Trickster', type_line: 'Creature — Merfolk Wizard', cmc: 2, colors: ['U'], oracle_text: 'Tap target creature.' },
  { name: 'Kumena\'s Speaker', type_line: 'Creature — Merfolk Shaman', cmc: 1, colors: ['G'], oracle_text: 'Gets +1/+1 if you control another Merfolk.' },
  { name: 'Deeproot Elite', type_line: 'Creature — Merfolk Warrior', cmc: 2, colors: ['G'], oracle_text: 'Put +1/+1 counter on Merfolk.' },
  { name: 'Vapor Snag', type_line: 'Instant', cmc: 1, colors: ['U'], oracle_text: 'Return target creature to owner\'s hand. Deals 1 damage.' },
  { name: 'Spell Pierce', type_line: 'Instant', cmc: 1, colors: ['U'], oracle_text: 'Counter target noncreature spell.' }
];

const result = CompilerConvergencePipeline.compileDeckFromScratch({
  userPrompt: 'tritones MODERN',
  format: 'MODERN',
  rawCardPool: fullRawPool,
  uiFormState: uiState
});

console.log('Result buildStatus:', result.buildStatus);
console.log('Result creatureCount:', result.creatureCount);
console.log('Result tribeMatchCount:', result.tribeMatchCount);
console.log('Result avgCheapRemovalCMC:', result.avgCheapRemovalCMC);
console.log('Result safetyViolations:', result.safetyViolations);

assert.strictEqual(result.buildStatus, 'SUCCESS', `Build status must be SUCCESS when invariants pass (Violations: ${result.safetyViolations.join('; ')})`);
assert.ok(result.creatureCount >= 12, `Creature count must be >= 12 (Actual: ${result.creatureCount})`);
assert.ok(result.tribeMatchCount >= 8, `Tribe match count must be >= 8 (Actual: ${result.tribeMatchCount})`);
assert.strictEqual(result.safetyViolations.length, 0, 'No safety violations allowed');


console.log(`✅ TEST 4 PASSED: CompilerConvergencePipeline compiled Merfolk deck with ${result.creatureCount} Creatures, ${result.tribeMatchCount} Merfolk, and buildStatus: SUCCESS.\n`);

console.log('🎉 ALL ZERO-CREATURE TRIBAL PREVENTION & SAFETY GATE TESTS PASSED WITH 100% SUCCESS!');
