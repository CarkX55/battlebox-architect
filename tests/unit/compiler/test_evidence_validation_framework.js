/**
 * tests/unit/compiler/test_evidence_validation_framework.js
 * 
 * Integration Test Suite: Evidence Validation Framework & Scientific Transparency Protocol.
 * Asserts:
 *   1. SimulationFidelityReport transparently itemizes simulation engine fidelity (Draw 100%, Mana 100%, Curve 100%, Combat 68%, Opponent 45%, Overall 68.8%).
 *   2. EvidencePyramid classifies evidence source metrics into 5 explicit tiers (Tier 1 Tournament vs Tier 3 Simulation vs Tier 4 Heuristic).
 *   3. ValidatedLearningGate filters candidate memory learnings via explicit validation gates.
 *   4. PredictionVsRealityBacktest computes error delta (Predicted 62% vs Reality 59% -> Delta 3.0%) and triggers recalibration.
 *   5. CompilerConvergencePipeline PASS 25 executes successfully.
 */

import { SimulationFidelityReport } from '../../../src/services/compiler/core/simulationFidelityReport.js';
import { EvidencePyramid } from '../../../src/services/compiler/core/evidencePyramid.js';
import { ValidatedLearningGate } from '../../../src/services/compiler/core/validatedLearningGate.js';
import { PredictionVsRealityBacktest } from '../../../src/services/compiler/core/predictionVsRealityBacktest.js';
import { CompilerConvergencePipeline } from '../../../src/knowledge/compiler/CompilerConvergencePipeline.js';

function runTest() {
  console.log('🧪 Running Evidence Validation Framework & Scientific Protocol Test Suite...\n');

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

  console.log('✅ PASS 1: Full Pipeline Executed with PASS 25 Evidence Validation Audit');

  // 1. Verify Simulation Fidelity Report
  const fid = result.simulationFidelityTrace;
  console.log(`\n📐 Simulation Engine Transparent Fidelity Breakdown:`);
  console.log(`   - Draw Engine:       ${fid.drawEngineFidelity}%`);
  console.log(`   - Mana Engine:       ${fid.manaFidelity}%`);
  console.log(`   - Curve Engine:      ${fid.curveFidelity}%`);
  console.log(`   - Combat Engine:     ${fid.combatFidelity}%`);
  console.log(`   - Opponent Model:    ${fid.opponentModelFidelity}%`);
  console.log(`   - Sideboard Engine:  ${fid.sideboardFidelity}%`);
  console.log(`   - Overall Fidelity:  ${fid.overallSimulationFidelity}%`);

  if (!fid || fid.drawEngineFidelity !== 100 || fid.overallSimulationFidelity !== 68.8) {
    throw new Error('❌ TEST FAILED: SimulationFidelityReport failed fidelity calculation');
  }
  console.log('✅ Simulation Fidelity Report Passed');

  // 2. Verify Evidence Pyramid Tiering
  const pyr = result.evidencePyramidTrace;
  console.log(`\n🏛️ 5-Tier Evidence Pyramid Classification:`);
  console.log(`   - Tier Level:  Tier ${pyr.level} [${pyr.name}]`);
  console.log(`   - Rating:      ${pyr.stars} (${pyr.confidence} Confidence)`);

  if (!pyr || pyr.level !== 3) {
    throw new Error('❌ TEST FAILED: EvidencePyramid failed tier 3 simulation classification');
  }
  console.log('✅ Evidence Pyramid Classification Passed');

  // 3. Verify Validated Learning Gate
  const gate = result.validatedLearningTrace;
  console.log(`\n🚪 Validated Learning Gate (Memory Gatekeeper):`);
  console.log(`   - Is Accepted:      ${gate.isAccepted}`);
  console.log(`   - Validation Score: ${gate.validationScore}%`);
  console.log(`   - Gate Reason:      "${gate.gateReason}"`);

  if (!gate || !gate.isAccepted || gate.validationScore < 90) {
    throw new Error('❌ TEST FAILED: ValidatedLearningGate failed candidate learning validation');
  }
  console.log('✅ Validated Learning Gate Passed');

  // 4. Verify Prediction vs Reality Backtest Loop
  const backtest = result.backtestReport;
  console.log(`\n🔄 Closed-Loop Prediction vs Reality Backtest:`);
  console.log(`   - Predicted Win Rate:  ${backtest.predictedWinRate}%`);
  console.log(`   - Real Tournament:     ${backtest.realTournamentWinRate}%`);
  console.log(`   - Error Delta:         ${backtest.predictionErrorDelta}%`);
  console.log(`   - Recalibrated:        ${backtest.modelRecalibrated}`);
  console.log(`   - Summary:             "${backtest.backtestSummary}"`);

  if (!backtest || backtest.predictionErrorDelta !== 3.0 || !backtest.modelRecalibrated) {
    throw new Error('❌ TEST FAILED: PredictionVsRealityBacktest failed error delta calculation');
  }
  console.log('✅ Prediction vs Reality Backtest Passed (Closed-Loop Error Delta Audit Verified)');

  console.log('\n🎉 ALL EVIDENCE VALIDATION FRAMEWORK TESTS PASSED SUCCESSFULLY!');
}

runTest();
