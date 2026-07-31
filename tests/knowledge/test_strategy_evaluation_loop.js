import { StrategicPlanner } from '../../src/knowledge/planner/StrategicPlanner.js';
import { StrategyIRBuilder } from '../../src/knowledge/compiler/StrategyIRBuilder.js';
import { StrategyEvaluationLoop } from '../../src/knowledge/compiler/StrategyEvaluationLoop.js';

console.log('=== TEST: StrategyEvaluationLoop & IR Repair ===');

const plan = StrategicPlanner.createPlanFromIntent('RAMP');
const strategyIR = StrategyIRBuilder.buildFromPlan(plan);

// Mock compiled deck lacking early interaction (0 early removal spells)
const mockDeckDeficient = [
  { name: 'Llanowar Elves', cmc: 1, oracleText: '{T}: Add {G}.' },
  { name: 'Cultivate', cmc: 3, oracleText: 'Search your library for up to 2 land cards.' }
];

const result = StrategyEvaluationLoop.evaluateAndRepair(strategyIR, mockDeckDeficient);

console.log(`[PASS] Loop Status: ${result.status}`);
console.log(`[PASS] Passes Count: ${result.passesCount}`);
console.log(`[PASS] Repair Applied: ${result.repairsApplied[0]}`);

if (result.status !== 'REPAIRED') {
  console.error('FAILED: Strategy evaluation status expected REPAIRED');
  process.exit(1);
}

if (result.passesCount !== 2) {
  console.error('FAILED: Strategy evaluation passes count expected 2');
  process.exit(1);
}

console.log('=== TEST SUCCESSFUL ===');
