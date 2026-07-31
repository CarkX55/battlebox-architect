import { StrategicPlanner } from '../../src/knowledge/planner/StrategicPlanner.js';
import { StrategyIRBuilder } from '../../src/knowledge/compiler/StrategyIRBuilder.js';

console.log('=== TEST: StrategicPlanner & StrategyIRBuilder ===');

const plan = StrategicPlanner.createPlanFromIntent('COMPETITIVE_RAMP');
console.log(`[PASS] Strategic Plan Created: ${plan.intent}`);
console.log(`[PASS] Turn 4 Threat Target: ${plan.targets.Turn4Threat}`);

const strategyIR = StrategyIRBuilder.buildFromPlan(plan);
console.log(`[PASS] Strategy IR Nodes Count: ${strategyIR.nodes.length}`);

const goalNode = strategyIR.getNodesByKind('GoalNode')[0];
console.log(`[PASS] Goal Node ID: ${goalNode.id}`);

if (strategyIR.nodes.length < 3) {
  console.error('FAILED: Strategy IR nodes count is less than 3');
  process.exit(1);
}

console.log('=== TEST SUCCESSFUL ===');
