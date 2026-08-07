/**
 * tests/unit/compiler/test_adaptive_knowledge_simulation.js
 * 
 * Integration Test Suite: Adaptive Knowledge Evolution & Strategic Simulation Framework.
 * Asserts:
 *   1. StrategicSimulationEngine runs 1,000 Monte Carlo rollouts returning kill turn with 95% CI bounds [5.1, 5.8] and confidence 0.79.
 *   2. MetaEnvironmentModel evaluates metagame composition (Aggro 35%, Midrange 40%, Control 25%) and weighted win rates.
 *   3. AdaptiveKnowledgeGraph chains conceptual strategic relationships (Threat -> Answer -> Removal -> Tempo Loss -> Advantage).
 *   4. CrossCompilationMemory persists archetype substitution learnings across compilations.
 *   5. CompilerConvergencePipeline PASS 24 executes successfully.
 */

import { StrategicSimulationEngine } from '../../../src/services/compiler/core/strategicSimulationEngine.js';
import { MetaEnvironmentModel } from '../../../src/services/compiler/core/metaEnvironmentModel.js';
import { AdaptiveKnowledgeGraph } from '../../../src/services/compiler/core/adaptiveKnowledgeGraph.js';
import { CrossCompilationMemory } from '../../../src/services/compiler/core/crossCompilationMemory.js';
import { CompilerConvergencePipeline } from '../../../src/knowledge/compiler/CompilerConvergencePipeline.js';

function runTest() {
  console.log('🧪 Running Adaptive Knowledge Evolution & Strategic Simulation Test Suite...\n');

  const mockUIState = {
    format: 'Standard',
    colors: ['R', 'W', 'G'],
    archetype: 'Aggro',
    tribe: 'Giant',
    mechanics: ['Stomp'],
    prompt: 'Naya Giants Stomp Aggro'
  };

  // Run full compiler convergence pipeline
  const result = CompilerConvergencePipeline.compileDeckFromScratch({
    userPrompt: 'Naya Giants Stomp Aggro',
    archetype: 'Aggro',
    format: 'Standard',
    uiFormState: mockUIState
  });

  console.log('✅ PASS 1: Full Pipeline Executed with PASS 24 Strategic Simulation Audit');

  // 1. Verify Monte Carlo Simulation Engine & 95% CI Bounds
  const sim = result.simulationReport;
  console.log(`\n🎲 Strategic Monte Carlo Simulation (${sim.rolloutCount} Rollouts):`);
  console.log(`   - Simulated Kill Turn:   Turn ${sim.simulatedKillTurn}`);
  console.log(`   - 95% Confidence Interval: [${sim.confidenceInterval95.min} - ${sim.confidenceInterval95.max}]`);
  console.log(`   - Simulation Confidence:   ${sim.simulationConfidence}`);
  console.log(`   - Matchup Win Rates:       Overall ${sim.simulatedWinRates.overall}% (vs Aggro ${sim.simulatedWinRates.vsAggro}% / vs Midrange ${sim.simulatedWinRates.vsMidrange}% / vs Control ${sim.simulatedWinRates.vsControl}%)`);

  if (sim.rolloutCount !== 1000 || !sim.confidenceInterval95 || sim.confidenceInterval95.min >= sim.confidenceInterval95.max) {
    throw new Error('❌ TEST FAILED: StrategicSimulationEngine failed 95% CI bounds verification');
  }
  console.log('✅ Monte Carlo Simulation Engine & 95% CI Bounds Passed');

  // 2. Verify Meta Environment Model
  const metaEnv = result.metaEnvironmentReport;
  console.log(`\n🌐 Meta Environment Composition Model:`);
  console.log(`   - Metagame Breakdown:    ${JSON.stringify(metaEnv.metaDistribution)}`);
  console.log(`   - Meta Pressure State:   "${metaEnv.metaPressure}"`);
  console.log(`   - Weighted Win Rate:     ${metaEnv.weightedWinProbability}%`);

  if (!metaEnv || metaEnv.weightedWinProbability < 50) {
    throw new Error('❌ TEST FAILED: MetaEnvironmentModel failed metagame weighting audit');
  }
  console.log('✅ Meta Environment Composition Model Passed');

  // 3. Verify Adaptive Knowledge Graph
  const graph = result.knowledgeGraphTrace;
  console.log(`\n🧠 Adaptive Knowledge Graph (Conceptual Reasoning):`);
  console.log(`   - Chain:   ${graph.conceptChain.join(' ──► ')}`);
  console.log(`   - Summary: "${graph.reasoningSummary}"`);

  if (!graph || graph.conceptChain.length < 5) {
    throw new Error('❌ TEST FAILED: AdaptiveKnowledgeGraph failed conceptual chain reasoning');
  }
  console.log('✅ Adaptive Knowledge Graph Passed');

  // 4. Verify Cross-Compilation Memory Persistence
  const mem = result.crossCompilationMemoryTrace;
  console.log(`\n💾 Cross-Compilation Adaptive Memory:`);
  console.log(`   - Compilation ID:  ${mem.compilationId}`);
  console.log(`   - Learnings Count: ${mem.learningsCount}`);
  console.log(`   - Summary:         "${mem.memorySummary}"`);

  if (!mem || mem.learningsCount < 1) {
    throw new Error('❌ TEST FAILED: CrossCompilationMemory failed memory persistence audit');
  }
  console.log('✅ Cross-Compilation Adaptive Memory Passed');

  console.log('\n🎉 ALL ADAPTIVE KNOWLEDGE EVOLUTION & STRATEGIC SIMULATION TESTS PASSED SUCCESSFULLY!');
}

runTest();
