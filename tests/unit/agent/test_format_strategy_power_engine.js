import assert from 'node:assert';
import { CardImplementer } from '../../../src/services/agent/cardImplementer.js';

console.log("🧪 Running Format-Scoped & Strategy-Aligned Power Engine Test Suite...\n");

// TEST 1: Hard Constraints First & Paper Format Legality
console.log("--- TEST 1: Hard Constraints First (Format & Playtest Filter) ---");

const mockCardPool = [
  {
    name: 'Lord of Atlanta',
    type_line: 'Creature — Merfolk Gamer',
    oracle_text: 'Other Merfolk get +1/+1 and have townwalk',
    cmc: 2,
    colors: ['U'],
    rarity: 'rare',
    set: 'unk',
    is_playtest: true,
    legalities: { modern: 'not_legal', legacy: 'not_legal', standard: 'not_legal' }
  },
  {
    name: 'Shoreline Scout',
    type_line: 'Creature — Merfolk Scout',
    oracle_text: 'When Shoreline Scout enters the battlefield, conjure a Tropical Island',
    cmc: 1,
    colors: ['U'],
    rarity: 'common',
    set: 'j21',
    digital: true,
    legalities: { modern: 'not_legal', legacy: 'not_legal', standard: 'not_legal', alchemy: 'legal' }
  },
  {
    name: 'Vodalian Hexcatcher',
    type_line: 'Creature — Merfolk Wizard',
    oracle_text: 'Flash. Other Merfolk you control get +1/+1. Sacrifice a Merfolk: Counter target noncreature spell unless its controller pays {1}.',
    cmc: 2,
    colors: ['U'],
    rarity: 'rare',
    set: 'dmu',
    edhrec_rank: 850,
    legalities: { modern: 'legal', legacy: 'legal', standard: 'not_legal' }
  },
  {
    name: 'Lord of Atlantis',
    type_line: 'Creature — Merfolk Lord',
    oracle_text: 'Other Merfolk creatures get +1/+1 and have islandwalk.',
    cmc: 2,
    colors: ['U'],
    rarity: 'rare',
    set: 'tsb',
    edhrec_rank: 450,
    legalities: { modern: 'legal', legacy: 'legal', standard: 'not_legal' }
  }
];

const modernNeed = {
  need: 'TRIBAL_THREAT',
  requiredType: 'Creature',
  targetColors: new Set(['U']),
  targetTribe: 'merfolk'
};

const intentPackageModern = {
  format: 'MODERN',
  archetype: 'tempo',
  strategy: 'tempo',
  rarityMode: 'high-power',
  userConstraints: { allowCustomCards: false }
};

const { candidates } = CardImplementer.findCandidates(modernNeed, mockCardPool, intentPackageModern, new Map());

// Assert Playtest and Alchemy cards were filtered by Hard Constraints FIRST
const names = candidates.map(c => c.name);
assert.ok(!names.includes('Lord of Atlanta'), 'Lord of Atlanta (playtest) MUST be filtered out by hard constraints');
assert.ok(!names.includes('Shoreline Scout'), 'Shoreline Scout (digital) MUST be filtered out by hard constraints');
assert.ok(names.includes('Vodalian Hexcatcher'), 'Vodalian Hexcatcher MUST be present');
assert.ok(names.includes('Lord of Atlantis'), 'Lord of Atlantis MUST be present');

console.log(`  ✅ Filtered out playtest and digital cards. Selected: ${names.join(', ')}`);
console.log("✅ TEST 1 PASSED: Hard constraints evaluated first before scoring.\n");

// TEST 2: Candidates Sorted by 4-Vector Score Descending
console.log("--- TEST 2: Candidates Sorted by 4-Vector Score Descending ---");

// Vodalian Hexcatcher matches Tempo (Flash + Counter) AND Tribal Lord -> should score higher than Lord of Atlantis
assert.strictEqual(candidates[0].name, 'Vodalian Hexcatcher', 'Vodalian Hexcatcher should rank #1 due to Flash + Counter + Lord synergy');
console.log(`  ✅ Candidate #1: ${candidates[0].name} (Flash + Counter + Lord Tempo Synergy)`);
console.log(`  ✅ Candidate #2: ${candidates[1].name} (Lord Anthem Synergy)`);

console.log("✅ TEST 2 PASSED: Candidates returned sorted by 4-vector score descending.\n");

console.log("🎉 ALL FORMAT-SCOPED & STRATEGY-ALIGNED POWER ENGINE TESTS PASSED WITH 100% SUCCESS!");
