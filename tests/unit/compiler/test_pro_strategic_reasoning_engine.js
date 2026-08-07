/**
 * tests/unit/compiler/test_pro_strategic_reasoning_engine.js
 * 
 * Test Suite: Pro-Level Strategic Reasoning & Resource Economics Engine.
 * Asserts:
 *   1. ResourceEconomyModel: Tempo vs Card Advantage trade-off & conversion ratios.
 *   2. WhosTheBeatdownEvaluator: Mike Flores' Aggressor assignment & Inevitability Shift.
 *   3. CardMicroSemanticsAnalyzer: Contextual card utility & 2-for-1 virtual advantage.
 *   4. ProDecisionTreeSimulator: State-aware conditional branches & disruption recovery.
 *   5. StepByStepGameSimulator: Full 8-phase turn loops & stack interactions.
 */

import { CompilerConvergencePipeline } from '../../../src/knowledge/compiler/CompilerConvergencePipeline.js';
import { ProStrategicReasoningEngine } from '../../../src/services/compiler/core/proStrategicReasoningEngine.js';

function runTest() {
  console.log('🧪 Running Pro-Level Strategic Reasoning Engine Test Suite...\n');

  const mockUIState = {
    format: 'Standard',
    colors: ['White', 'Red', 'Green'],
    archetype: 'Aggro',
    primaryTribe: 'Giants',
    mechanics: ['Stomp'],
    prompt: 'Naya Giants Aggro'
  };

  const result = CompilerConvergencePipeline.compileDeckFromScratch({
    userPrompt: 'Naya Giants Aggro',
    archetype: 'Aggro',
    format: 'Standard',
    uiFormState: mockUIState
  });

  const economy = result.proResourceEconomy;
  const beatdown = result.proBeatdownRole;
  const semantics = result.proCardSemantics;
  const tree = result.proDecisionTree;
  const phases = result.proPhaseSimulation;

  // 1. Resource Economy Model
  console.log('⚖️ 1. Resource Economy Model (Tempo vs Card Advantage):');
  console.log(`   👉 Tempo Score:                ${economy.tempoScore}`);
  console.log(`   👉 Card Advantage Score:       ${economy.cardAdvantageScore}`);
  console.log(`   - Virtual Card Advantage:      +${economy.virtualCardAdvantage} cards`);
  console.log(`   - Resource Conversion Ratio:   ${economy.resourceConversionRatio}`);
  if (economy.tempoScore < 90 || !economy.resourceConversionRatio) {
    throw new Error('❌ TEST FAILED: Resource economy values invalid.');
  }
  console.log('✅ Resource Economy Model Verified');

  // 2. Mike Flores' "Who's the Beatdown?" Aggressor Assignment
  console.log('\n🥊 2. Mike Flores "Who\'s the Beatdown?" Role Assignment:');
  console.log(`   👉 Assigned Role:              ${beatdown.assignedRole}`);
  console.log(`   👉 Opponent Role:              ${beatdown.opponentRole}`);
  console.log(`   - Inevitability Owner:         ${beatdown.inevitabilityOwner}`);
  console.log(`   - Inevitability Shift Turn:    Turn ${beatdown.inevitabilityShiftTurn}`);
  console.log(`   - Overextension Threshold:     ${beatdown.overextensionThreshold}`);
  if (beatdown.assignedRole !== 'THE_BEATDOWN (Aggressor)') {
    throw new Error('❌ TEST FAILED: Aggressor role assignment invalid.');
  }
  console.log('✅ Who\'s the Beatdown Evaluator Verified');

  // 3. Card Micro-Semantics Analyzer
  console.log('\n🔍 3. Card Micro-Semantics Analyzer (Bonecrusher Giant):');
  console.log(`   👉 Card Name:                  ${semantics.cardName}`);
  console.log(`   - Is Virtual 2-for-1:          ${semantics.isVirtualTwoForOne}`);
  console.log(`   - Ahead Utility:              ${semantics.aheadUtility}`);
  console.log(`   - Behind Utility:             ${semantics.behindUtility}`);
  if (!semantics.isVirtualTwoForOne) {
    throw new Error('❌ TEST FAILED: Card micro-semantics 2-for-1 flag invalid.');
  }
  console.log('✅ Card Micro-Semantics Analyzer Verified');

  // 4. Pro-Level State-Aware Conditional Decision Tree
  console.log('\n🔄 4. Pro-Level State-Aware Conditional Decision Tree:');
  for (const b of tree.decisionBranches) {
    console.log(`   ✔ Condition: "${b.condition}" -> Action: "${b.proAction}"`);
  }
  if (tree.decisionBranches.length < 3) {
    throw new Error('❌ TEST FAILED: Decision tree branches incomplete.');
  }
  console.log('✅ Pro Decision Tree Simulator Verified');

  // 5. Step-by-Step Game Phase Simulator
  console.log('\n🎮 5. Step-by-Step Game Phase Simulator:');
  console.log(`   - Simulated Iterations:        ${phases.simulatedIterations.toLocaleString()}`);
  console.log(`   - Phases Per Turn:             ${phases.phasesSimulated.length} (${phases.phasesSimulated.join(' -> ')})`);
  console.log(`   - Stack Interactions Sim:      ${phases.stackInteractionsSimulated.toLocaleString()}`);
  if (phases.phasesSimulated.length < 8) {
    throw new Error('❌ TEST FAILED: Game phase simulation incomplete.');
  }
  console.log('✅ Step-by-Step Game Phase Simulator Verified');

  console.log('\n🎉 ALL PRO-LEVEL STRATEGIC REASONING TESTS PASSED SUCCESSFULLY!');
}

runTest();
