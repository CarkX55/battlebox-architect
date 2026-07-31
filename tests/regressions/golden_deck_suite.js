import { DeckConstructionState } from '../../src/knowledge/compiler/DeckConstructionState.js';
import { SlotCandidateRanker } from '../../src/knowledge/compiler/SlotCandidateRanker.js';
import { StrategicSimulator } from '../../src/knowledge/simulation/StrategicSimulator.js';

console.log('=== BEHAVIORAL GOLDEN DECK REGRESSION SUITE ===');

// Golden Deck: Ramp Archetype
let rampState = new DeckConstructionState({ totalSlots: 60 });
rampState = rampState.reserveSlots('pkg_ramp', 'Ramp', 10, 'cap.mana.acceleration', 'ir_1');
rampState = rampState.reserveSlots('pkg_lands', 'Land', 24, 'cap.mana.source', 'ir_2');
rampState = rampState.reserveSlots('pkg_threats', 'Threat', 14, 'cap.threat.density', 'ir_3');
rampState = rampState.reserveSlots('pkg_removal', 'Removal', 12, 'cap.removal', 'ir_4');

const mockRampPool = [
  { name: 'Llanowar Elves', cmc: 1, type_line: 'Creature', oracle_text: '{T}: Add {G}.' },
  { name: 'Forest', cmc: 0, type_line: 'Basic Land', oracle_text: '{T}: Add {G}.' },
  { name: 'Primeval Titan', cmc: 6, type_line: 'Creature', oracle_text: 'Trample.' }
];

rampState = SlotCandidateRanker.rankAndBindDeck(rampState, mockRampPool);
const boundCards = rampState.slots.map(s => s.chosenCard).filter(Boolean);

const sim = StrategicSimulator.simulateDeck(boundCards, 1000);

console.log(`[PASS] Monte Carlo Iterations: ${sim.iterations}`);
console.log(`[PASS] Mana Screw Rate: ${(sim.manaScrewRate * 100).toFixed(1)}% (Target: < 30%)`);
console.log(`[PASS] Mana Flood Rate: ${(sim.manaFloodRate * 100).toFixed(1)}% (Target: < 25%)`);
console.log(`[PASS] Turn 4 Win Probability: ${(sim.turn4WinProbability * 100).toFixed(1)}% (Target: > 70%)`);

if (sim.manaScrewRate > 0.35) {
  console.error('FAILED: Mana screw rate regression threshold violated');
  process.exit(1);
}

if (sim.turn4WinProbability < 0.60) {
  console.error('FAILED: Turn 4 win probability regression threshold violated');
  process.exit(1);
}

console.log('=== BEHAVIORAL GOLDEN DECK REGRESSION PASSED ===');
