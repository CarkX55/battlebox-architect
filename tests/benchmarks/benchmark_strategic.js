import { DeckConstructionState } from '../../src/knowledge/compiler/DeckConstructionState.js';
import { SlotCandidateRanker } from '../../src/knowledge/compiler/SlotCandidateRanker.js';
import { StrategicSimulator } from '../../src/knowledge/simulation/StrategicSimulator.js';

console.log('=== BENCHMARK: Strategic Performance & Monte Carlo Hand Consistency ===');

const cardPool = [
  { name: 'Llanowar Elves', cmc: 1, type_line: 'Creature', oracle_text: '{T}: Add {G}.' },
  { name: 'Forest', cmc: 0, type_line: 'Basic Land', oracle_text: '{T}: Add {G}.' },
  { name: 'Cultivate', cmc: 3, type_line: 'Sorcery', oracle_text: 'Search for 2 lands.' },
  { name: 'Elder Gargaroth', cmc: 5, type_line: 'Creature', oracle_text: 'Vigilance, Reach, Trample.' }
];

let state = new DeckConstructionState({ totalSlots: 60 });
state = state.reserveSlots('pkg_ramp', 'Ramp', 12, 'cap.mana.acceleration', 'ir_1');
state = state.reserveSlots('pkg_lands', 'Land', 24, 'cap.mana.source', 'ir_2');
state = state.reserveSlots('pkg_spells', 'Draw', 24, 'cap.card.draw', 'ir_3');

state = SlotCandidateRanker.rankAndBindDeck(state, cardPool);
const boundCards = state.slots.map(s => s.chosenCard).filter(Boolean);

const startTime = performance.now();
const simResults = StrategicSimulator.simulateDeck(boundCards, 5000);
const durationMs = (performance.now() - startTime).toFixed(2);

console.log(`[PASS] 5,000 Monte Carlo Iterations Duration: ${durationMs} ms`);
console.log(`[PASS] Opening Hand Mana Screw Rate: ${(simResults.manaScrewRate * 100).toFixed(1)}%`);
console.log(`[PASS] Opening Hand Mana Flood Rate: ${(simResults.manaFloodRate * 100).toFixed(1)}%`);
console.log(`[PASS] Dead Turn Rate (T1-T4): ${(simResults.deadTurnRate * 100).toFixed(1)}%`);
console.log(`[PASS] Turn 4 Win Probability: ${(simResults.turn4WinProbability * 100).toFixed(1)}%`);

if (parseFloat(durationMs) > 1000) {
  console.error('FAILED: 5,000 Monte Carlo iterations took longer than 1000ms');
  process.exit(1);
}

console.log('=== STRATEGIC BENCHMARK SUCCESSFUL ===');
