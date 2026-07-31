import { StrategicSimulator } from '../../src/knowledge/simulation/StrategicSimulator.js';

console.log('=== TEST: Advanced Plan Execution Metrics ===');

const deckCards = [
  { name: 'Delighted Halfling', cmc: 1, type_line: 'Creature', oracle_text: '{T}: Add {C}.' },
  { name: 'Forest', cmc: 0, type_line: 'Basic Land', oracle_text: '{T}: Add {G}.' },
  { name: 'Plains', cmc: 0, type_line: 'Basic Land', oracle_text: '{T}: Add {W}.' },
  { name: 'Harmonize', cmc: 4, type_line: 'Sorcery', oracle_text: 'Draw three cards.' },
  { name: 'Archon of Sun\'s Grace', cmc: 4, type_line: 'Creature', oracle_text: 'Flying, Lifelink.' }
];

const metrics = StrategicSimulator.simulateDeck(deckCards, 1000);

console.log(`[PASS] Plan Execution Score: ${(metrics.planExecutionScore * 100).toFixed(1)}%`);
console.log(`[PASS] Engine Assembly Rate: ${(metrics.engineAssemblyRate * 100).toFixed(1)}%`);
console.log(`[PASS] Recovery Index: ${(metrics.recoveryIndex * 100).toFixed(1)}%`);
console.log(`[PASS] Interaction Timing Score: ${(metrics.interactionTimingScore * 100).toFixed(1)}%`);
console.log(`[PASS] Win Condition Realization Rate: ${(metrics.winConditionRealizationRate * 100).toFixed(1)}%`);

if (metrics.planExecutionScore === 0) {
  console.error('FAILED: Plan execution score expected > 0');
  process.exit(1);
}

if (metrics.engineAssemblyRate === 0) {
  console.error('FAILED: Engine assembly rate expected > 0');
  process.exit(1);
}

console.log('=== TEST SUCCESSFUL ===');
