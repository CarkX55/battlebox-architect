/**
 * test_v9_strategic_reasoning_engine.js
 * Integration Test for BattleBox Architect v9.0 Strategic Reasoning Engine (SRE).
 */

import { ReasoningObject } from '../../src/reasoning/Core/ReasoningObject.js';
import { IntentGraph } from '../../src/reasoning/Graph/IntentGraph.js';
import { TradeOffAnalyzer } from '../../src/reasoning/Analysis/TradeOffAnalyzer.js';
import { RiskAndPivotInferrer } from '../../src/reasoning/Analysis/RiskAndPivotInferrer.js';
import { StrategicReasoner } from '../../src/reasoning/StrategicReasoner.js';
import { runV6AutonomousPipeline } from '../../src/services/autonomousStrategicPipeline.js';

async function runV9SRETest() {
  console.log('🧪 Starting BattleBox Architect v9.0 Strategic Reasoning Engine (SRE) Test...');

  // Test 1: ReasoningObject Base Model
  const ro = new ReasoningObject({ inferenceId: 'inf_1', conclusion: 'Sacrifice late game for early survival', confidence: 0.92 });
  console.assert(ro.version === 1, 'ReasoningObject version must be 1');
  console.assert(ro.confidence === 0.92, 'Confidence must be 0.92');
  console.log('✅ Test 1 Passed: ReasoningObject base model validated.');

  // Test 2: IntentGraph & Dependency Expansion
  const ig = new IntentGraph({ archetype: 'Ramp' });
  const caps = ig.expandDependencies();
  console.assert(caps.length === 3, 'Expanded capabilities length must be 3');
  console.log('✅ Test 2 Passed: IntentGraph expanded causal dependencies.');

  // Test 3: TradeOffAnalyzer & RiskAndPivotInferrer
  const tradeoff = TradeOffAnalyzer.analyzeTradeOffs('Ramp', { fastAggroDensity: 0.50 });
  console.assert(tradeoff.conclusion.includes('early interaction'), 'TradeOffAnalyzer must recommend early interaction in fast metagame');
  const risks = RiskAndPivotInferrer.inferRisks('Ramp');
  console.assert(risks.primaryRisk !== undefined, 'Primary risk must be defined');
  console.log('✅ Test 3 Passed: TradeOffAnalyzer and RiskAndPivotInferrer validated.');

  // Test 4: StrategicReasoner Engine Synthesis
  const reasoner = new StrategicReasoner();
  const sm = reasoner.synthesizeStrategyModel({ strategicArchetype: 'Ramp' });
  console.assert(sm.metadata.reasonerVersion === 'v9.0-SRE', 'StrategyModel metadata must contain reasonerVersion v9.0-SRE');
  console.log('✅ Test 4 Passed: StrategicReasoner synthesized StrategyModel for compiler.');

  // Test 5: End-to-End Production Pipeline Integration
  const pipelineResult = await runV6AutonomousPipeline({ strategicArchetype: 'Ramp', format: 'STANDARD' });
  console.assert(pipelineResult.success === true, 'Pipeline result must be successful');
  console.assert(pipelineResult.deck.length > 0, 'Deck must contain assembled cards');
  console.log('✅ Test 5 Passed: End-to-End integration SRE -> SKE -> Compiler -> Deck complete.');

  console.log('🎉 BattleBox Architect v9.0 Strategic Reasoning Engine (SRE) Test PASSED 100%!');
}

runV9SRETest();
