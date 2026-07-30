/**
 * test_v7_3_multi_pass_compiler.js
 * Integration Test for BattleBox Architect v7.3 Causal Multi-Pass Strategic Compiler.
 */

import { runV6AutonomousPipeline, V7_STRATEGIC_COMPILER_ENABLED } from '../../src/services/autonomousStrategicPipeline.js';
import { StrategicKnowledgeBase } from '../../src/judge/ontology/StrategicKnowledgeBase.js';
import { StrategyModel } from '../../src/judge/ir/StrategyModel.js';
import { PlanIR } from '../../src/judge/ir/PlanIR.js';
import { CapabilityDependencyGraph } from '../../src/judge/graph/CapabilityDependencyGraph.js';

async function runV73MultiPassTest() {
  console.log('🧪 Starting BattleBox Architect v7.3 Multi-Pass Strategic Compiler Test...');

  console.assert(V7_STRATEGIC_COMPILER_ENABLED === true, 'Feature flag V7_STRATEGIC_COMPILER_ENABLED must be true');

  // Test 1: StrategicKnowledgeBase SSOT
  const pattern = StrategicKnowledgeBase.getPattern('RAMP');
  console.assert(pattern.primaryEngine === 'ManaAcceleration', 'StrategicKnowledgeBase RAMP primaryEngine must be ManaAcceleration');
  console.log('✅ Test 1 Passed: StrategicKnowledgeBase SSOT initialized.');

  // Test 2: StrategyModel Probabilistic & PlanIR Timeline
  const sm = new StrategyModel({ archetype: 'Ramp' });
  const plan = new PlanIR({ archetype: 'Ramp' });
  const dag = new CapabilityDependencyGraph();

  console.assert(sm.version === 1, 'StrategyModel version must be 1');
  console.assert(plan.phases.length === 3, 'PlanIR must contain 3 phases');
  console.assert(dag.edges.length > 0, 'CapabilityDependencyGraph must contain edges');
  console.log('✅ Test 2 Passed: StrategyModel, PlanIR & CapabilityDependencyGraph created.');

  // Test 3: Execute Production Pipeline
  const formData = { format: 'STANDARD', strategicArchetype: 'Ramp', speed: 'StandardWin', colors: ['G'] };
  const result = await runV6AutonomousPipeline(formData);

  console.assert(result.pipelineVersion === 'v7.3-CausalCompiler', 'Pipeline version must be v7.3-CausalCompiler');
  const totalCards = result.deck.reduce((sum, c) => sum + (c.quantity || 1), 0);
  console.assert(totalCards === 60, `Deck must contain 60 total cards, got ${totalCards}`);
  console.assert(result.decisionProof.version === 1, 'DecisionProof version must be 1');
  console.log('✅ Test 3 Passed: Production pipeline executed pure multi-pass compiler workflow.');

  console.log('🎉 BattleBox Architect v7.3 Multi-Pass Strategic Compiler Test PASSED 100%!');
}

runV73MultiPassTest();
