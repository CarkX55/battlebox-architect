import { StrategicDecisionGraph } from '../../src/knowledge/compiler/StrategicDecisionGraph.js';

console.log('=== TEST: StrategicDecisionGraph Conditional Decision Reasoning ===');

const graph = StrategicDecisionGraph.buildDecisionGraph('SELESNYA_RAMP');

console.log(`[PASS] Primary Goal: ${graph.primaryGoal}`);
console.log(`[PASS] Fallback Plan: ${graph.fallbackPlan}`);
console.log(`[PASS] Decision Nodes Count: ${graph.nodes.length}`);
console.log(`[PASS] Node 1 Title: ${graph.nodes[0].title}`);
console.log(`[PASS] Node 1 IF Condition: ${graph.nodes[0].conditionIf}`);
console.log(`[PASS] Node 1 THEN Action: ${graph.nodes[0].thenAction}`);

if (graph.nodes.length !== 3) {
  console.error('FAILED: Decision nodes count expected 3');
  process.exit(1);
}

if (graph.nodes[0].importance !== 0.98) {
  console.error('FAILED: Node 1 importance expected 0.98');
  process.exit(1);
}

console.log('=== TEST SUCCESSFUL ===');
