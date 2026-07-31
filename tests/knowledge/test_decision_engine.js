import { DecisionEngine } from '../../src/knowledge/compiler/DecisionEngine.js';

console.log('=== TEST: DecisionEngine Contextual Card Pairwise Ranking ===');

const halfling = { name: 'Delighted Halfling', cmc: 1, type_line: 'Creature', oracle_text: '{T}: Add {C}. Spend this mana only to cast legendary spells.' };
const scrapgorger = { name: 'Armored Scrapgorger', cmc: 2, type_line: 'Creature', oracle_text: '{T}: Exile target card from a graveyard. Add one mana of any color.' };
const stomper = { name: 'Topiary Stomper', cmc: 3, type_line: 'Creature', oracle_text: 'Search your library for a basic land card.' };

const ranked = DecisionEngine.rankCandidates([halfling, scrapgorger, stomper]);

console.log(`[PASS] #1 Ranked Card: ${ranked[0].cardName} (Score: ${ranked[0].totalScore})`);
console.log(`[PASS] #2 Ranked Card: ${ranked[1].cardName} (Score: ${ranked[1].totalScore})`);
console.log(`[PASS] #3 Ranked Card: ${ranked[2].cardName} (Score: ${ranked[2].totalScore})`);

if (ranked[0].cardName !== 'Delighted Halfling') {
  console.error('FAILED: Delighted Halfling expected ranked #1 in ramp context');
  process.exit(1);
}

console.log('=== TEST SUCCESSFUL ===');
