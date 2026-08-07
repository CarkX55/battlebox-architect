/**
 * tests/unit/compiler/test_master_strategic_compiler_v4_0.js
 * 
 * BattleBox Strategic Planning Framework v4.0 — Master Integration Test Suite (Phase A).
 * Verifies the 5 Compilation Passes, SIR DAG Schema, Lean ConstraintGraph, CapabilityOntology,
 * PlanningOrchestrator, and Quadruple Structural Convergence.
 */

import { CompilationContext } from '../../../src/services/compiler/core/compilationContext.js';
import { IntentNormalizer } from '../../../src/services/compiler/core/intentNormalizer.js';
import { PlanningOrchestrator } from '../../../src/services/compiler/core/planningOrchestrator.js';
import {
  ReasoningPass,
  KnowledgePass,
  OptimizationPass,
  ValidationPass,
  ReportingPass
} from '../../../src/services/compiler/core/compilationPasses.js';

async function runMasterTest() {
  console.log('🧪 Running BattleBox Strategic Planning Framework v4.0 Master Integration Test...\n');

  const mockUIState = {
    format: 'Standard',
    colors: ['White', 'Red', 'Green'],
    archetype: 'Aggro',
    primaryTribe: 'Giants',
    mechanics: ['Stomp'],
    prompt: 'Naya Giants Aggro'
  };

  // 1. Normalize Intent
  console.log('📋 1. Normalizing Intent via IntentNormalizer...');
  const intent = IntentNormalizer.normalizeUIState(mockUIState);
  console.log(`   - Format: ${intent.format} | Archetype: ${intent.archetype} | Tribe: ${intent.primaryTribe}`);
  
  const initialContext = new CompilationContext({ intent });

  // 2. Schedule 5 Compilation Passes
  console.log('\n🔄 2. Executing 5 Compilation Passes via PlanningOrchestrator...');
  const passes = [ReasoningPass, KnowledgePass, OptimizationPass, ValidationPass, ReportingPass];
  const finalContext = await PlanningOrchestrator.runCompilationPasses(initialContext, passes, 0.05, 5);

  // 3. Verify Strategic IR AST
  console.log('\n🧠 3. Verifying Strategic IR (SIR) DAG:');
  const sir = finalContext.strategyIR;
  console.log(`   - SIR Hash:         ${sir.hash()}`);
  console.log(`   - Strategy Target:  ${sir.strategyTarget}`);
  console.log(`   - Nodes Compiled:   ${sir.nodes.length}`);
  console.log(`   - Edges Compiled:   ${sir.edges.length}`);
  sir.verifyZeroCardsInvariant();
  console.log('✅ StrategyIR Verified (Zero Cards Invariant Preserved)');

  // 4. Verify ConstraintGraph DAG
  console.log('\n📊 4. Verifying Typed ConstraintGraph DAG:');
  const graph = finalContext.constraintGraph;
  console.log(`   - Graph Hash:       ${graph.hash()}`);
  console.log(`   - Graph Nodes:      ${graph.nodes.length}`);
  console.log(`   - Graph Edges:      ${graph.edges.length}`);
  graph.verifyAcyclic();
  console.log('✅ ConstraintGraph Verified (Acyclic DAG Guard Preserved)');

  // 5. Verify EventStore Stream & Convergence
  console.log('\n📜 5. Verifying Domain EventStore Stream & Convergence:');
  console.log(`   - Events Recorded:  ${finalContext.eventStore.length}`);
  console.log(`   - Global Score:     ${finalContext.globalScore}%`);
  console.log(`   - Is Finished:      ${finalContext.isFinished}`);
  if (!finalContext.isFinished) {
    throw new Error('❌ MASTER TEST FAILED: Pipeline did not converge to finished state.');
  }

  // 6. Verify Certified Final Deck Output
  console.log('\n🃏 6. Verifying Certified Final Deck Output:');
  const deck = finalContext.finalDeck;
  console.log(`   - Deck Name:        ${deck.name}`);
  const totalCards = deck.cards.reduce((acc, c) => acc + c.count, 0);
  console.log(`   - Total Cards:       ${totalCards}`);
  if (totalCards !== 60) {
    throw new Error(`❌ MASTER TEST FAILED: Final deck has ${totalCards} cards instead of 60.`);
  }

  console.log('\n🎉 BATTLEBOX v4.0 MASTER INTEGRATION TEST PASSED SUCCESSFULLY!');
}

runMasterTest();
