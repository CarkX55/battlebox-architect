import { StrategicPlanner } from '../../src/knowledge/planner/StrategicPlanner.js';
import { StrategyIRBuilder } from '../../src/knowledge/compiler/StrategyIRBuilder.js';
import { ConstraintSolver } from '../../src/knowledge/reasoning/ConstraintSolver.js';

console.log('=== TEST: Minimal Repair ConstraintSolver ===');

const plan = StrategicPlanner.createPlanFromIntent('RAMP');
const strategyIR = StrategyIRBuilder.buildFromPlan(plan);

const mockDeckWithViolations = [
  { name: 'Guildgate 1', typeLine: 'Land', oracleText: 'Guildgate enters the battlefield tapped.' },
  { name: 'Guildgate 2', typeLine: 'Land', oracleText: 'Guildgate enters the battlefield tapped.' },
  { name: 'Guildgate 3', typeLine: 'Land', oracleText: 'Guildgate enters the battlefield tapped.' },
  { name: 'Guildgate 4', typeLine: 'Land', oracleText: 'Guildgate enters the battlefield tapped.' },
  { name: 'Guildgate 5', typeLine: 'Land', oracleText: 'Guildgate enters the battlefield tapped.' },
  { name: 'Guildgate 6', typeLine: 'Land', oracleText: 'Guildgate enters the battlefield tapped.' }
];

const result = ConstraintSolver.solve(strategyIR, mockDeckWithViolations);

console.log(`[PASS] Violations Detected: ${result.violations.length}`);
console.log(`[PASS] Repair Actions Proposed: ${result.repairs.length}`);

if (result.violations.length === 0) {
  console.error('FAILED: No violations detected when 6 taplands were present (cap: 4)');
  process.exit(1);
}

if (result.repairs[0].targetCount !== 2) {
  console.error('FAILED: Target count repair expected 2');
  process.exit(1);
}

console.log('=== TEST SUCCESSFUL ===');
