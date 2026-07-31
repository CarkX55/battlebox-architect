import { DeckConstructionState } from '../../src/knowledge/compiler/DeckConstructionState.js';
import { SlotCandidateRanker } from '../../src/knowledge/compiler/SlotCandidateRanker.js';
import { CompetitiveDeckComparator } from '../../src/knowledge/meta/CompetitiveDeckComparator.js';

console.log('=== TEST: CompetitiveDeckComparator Top Meta Benchmark ===');

let state = new DeckConstructionState({ totalSlots: 60 });
state = state.reserveSlots('pkg_ramp', 'Ramp', 10, 'cap.mana.acceleration', 'ir_1');
state = state.reserveSlots('pkg_lands', 'Land', 24, 'cap.mana.source', 'ir_2');
state = state.reserveSlots('pkg_removal', 'Removal', 6, 'cap.removal', 'ir_3');
state = state.reserveSlots('pkg_threats', 'Threat', 20, 'cap.threat', 'ir_4');

const mockPool = [
  { name: 'Llanowar Elves', cmc: 1, type_line: 'Creature', oracle_text: '{T}: Add {G}.' },
  { name: 'Forest', cmc: 0, type_line: 'Basic Land', oracle_text: '{T}: Add {G}.' },
  { name: 'Beast Within', cmc: 3, type_line: 'Instant', oracle_text: 'Destroy target permanent.' }
];

state = SlotCandidateRanker.rankAndBindDeck(state, mockPool);

const comparison = CompetitiveDeckComparator.compareAgainstMeta(state, 'SELESNYA_RAMP');

console.log(`[PASS] Target Archetype: ${comparison.targetArchetype}`);
console.log(`[PASS] Structural Similarity: ${comparison.structuralSimilarityPercentage}%`);
console.log('[DEBUG] Deltas:', comparison.deltas);

if (comparison.structuralSimilarityPercentage < 80) {
  console.error('FAILED: Structural similarity expected >= 80%');
  process.exit(1);
}

console.log('=== TEST SUCCESSFUL ===');
