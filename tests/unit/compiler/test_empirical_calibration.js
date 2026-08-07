/**
 * tests/unit/compiler/test_empirical_calibration.js
 * 
 * Phase 3 Integration Test Suite: Evidence-Calibrated Benchmark & Empirical Self-Evaluation.
 * Asserts:
 *   1. GroundTruthBenchmarkEngine evaluates tournament similarity against ground truth reference datasets (>= 90%).
 *   2. EmpiricalAutoCalibrator calibrates solver weights with empirical gain.
 *   3. SelfEvaluationRefinementLoop emits ranked self-improvement proposals (Top Improvements).
 *   4. CompilerConvergencePipeline PASS 22 executes cleanly returning all empirical reports.
 */

import { GroundTruthBenchmarkEngine } from '../../../src/services/compiler/core/groundTruthBenchmarkEngine.js';
import { EmpiricalAutoCalibrator } from '../../../src/services/compiler/core/empiricalAutoCalibrator.js';
import { SelfEvaluationRefinementLoop } from '../../../src/services/compiler/core/selfEvaluationRefinementLoop.js';
import { CompilerConvergencePipeline } from '../../../src/knowledge/compiler/CompilerConvergencePipeline.js';

function runTest() {
  console.log('🧪 Running Phase 3 Integration Test Suite: Empirical Calibration & Self-Evaluation...\n');

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

  console.log('✅ PASS 1: Compiler Convergence Pipeline Executed with Empirical Calibration Auditor');

  // 1. Verify Ground Truth Benchmark Report
  const benchmarkReport = result.benchmarkReport;
  console.log(`\n📊 Ground Truth Benchmark Report:`);
  console.log(`   - Reference Tournament Decks: ${benchmarkReport.referenceDeckCount}`);
  console.log(`   - Tournament Similarity Score: ${benchmarkReport.tournamentSimilarityPercentage}%`);
  console.log(`   - Curve Delta:                 ${benchmarkReport.curveDeltaPercentage}%`);
  console.log(`   - Interaction Delta:           ${benchmarkReport.interactionDeltaPercentage}%`);
  console.log(`   - Threat Density Match:        ${benchmarkReport.threatDensitySimilarity}%`);
  console.log(`   - Mana Stability Match:        ${benchmarkReport.manaStabilitySimilarity}%`);

  if (!benchmarkReport || benchmarkReport.tournamentSimilarityPercentage < 90 || !benchmarkReport.isEmpiricallyValidated) {
    throw new Error(`❌ TEST FAILED: Ground Truth Tournament Similarity fell below 90%: got ${benchmarkReport.tournamentSimilarityPercentage}%`);
  }
  console.log('✅ Ground Truth Benchmark Engine Passed (>= 90% Tournament Similarity)');

  // 2. Verify Empirical Auto Calibrator
  const calibration = result.calibrationMetrics;
  console.log(`\n⚙️ Empirical Auto Calibrator:`);
  console.log(`   - Calibrated Weights: ${JSON.stringify(calibration.calibratedWeights)}`);
  console.log(`   - Calibration Gain:   "${calibration.calibrationGain}"`);

  if (!calibration || !calibration.isCalibrated) {
    throw new Error('❌ TEST FAILED: EmpiricalAutoCalibrator failed to calibrate weights');
  }
  console.log('✅ Empirical Auto Calibrator Passed');

  // 3. Verify Self-Evaluation Refinement Loop
  const selfEval = result.selfEvaluationReport;
  console.log(`\n🔍 Self-Evaluation Refinement Loop ("What would I change with 10 more minutes?"):`);
  console.log(`   - Summary: ${selfEval.reportSummary}`);
  console.log(`   - Potential Gain: ${selfEval.potentialExecutionGain}`);
  for (const item of selfEval.topImprovements) {
    console.log(`   ✔ Rank ${item.rank}: ${item.action} (${item.executionGain})`);
  }

  if (!selfEval || selfEval.topImprovements.length === 0) {
    throw new Error('❌ TEST FAILED: SelfEvaluationRefinementLoop failed to generate ranked top improvements');
  }
  console.log('✅ Self-Evaluation Refinement Loop Passed (Ranked Top Improvements Generated)');

  console.log('\n🎉 ALL PHASE 3 EMPIRICAL CALIBRATION & SELF-EVALUATION TESTS PASSED SUCCESSFULLY!');
}

runTest();
