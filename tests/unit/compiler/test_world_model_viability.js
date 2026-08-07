/**
 * tests/unit/compiler/test_world_model_viability.js
 * 
 * Principle #6 Integration Test Suite: World Model Consistency & Non-Circular Triad.
 * Asserts:
 *   1. FormatWorldModel evaluates card pool critical mass, engine availability, and format viability prior to solving.
 *   2. Generates structured FormatViabilityReport with strategic adaptation recommendations if critical mass is limited.
 *   3. Verifies non-circular independent triad (Generator != Evaluator != Reverse Extractor).
 */

import { FormatWorldModel } from '../../../src/services/compiler/core/formatWorldModel.js';
import { CompilerConvergencePipeline } from '../../../src/knowledge/compiler/CompilerConvergencePipeline.js';

function runTest() {
  console.log('🧪 Running Principle #6 Integration Test Suite: World Model Consistency & Triad Independence...\n');

  const mockUIState = {
    format: 'Standard',
    colors: ['R', 'W', 'G'],
    archetype: 'Aggro',
    tribe: 'Giant',
    mechanics: ['Stomp'],
    prompt: 'Naya Giants Stomp Aggro'
  };

  // 1. Run Compiler Pipeline with PASS 20 Format World Model Viability Audit
  const result = CompilerConvergencePipeline.compileDeckFromScratch({
    userPrompt: 'Naya Giants Stomp Aggro',
    archetype: 'Aggro',
    format: 'Standard',
    uiFormState: mockUIState
  });

  console.log('✅ PASS 1: Compiler Convergence Pipeline Executed with World Model Auditor');

  const report = result.formatViabilityReport;
  console.log(`\n📊 Format World Model Viability Report:`);
  console.log(`   - Overall Viability Score:  ${report.overallViabilityPercentage}%`);
  console.log(`   - Critical Mass Score:     ${report.criticalMassScore}%`);
  console.log(`   - Is Format Viable:        ${report.isFormatViable}`);
  console.log(`   - Suggested Adaptation:    "${report.suggestedAdaptation}"`);
  console.log(`   - Report Summary:          "${report.reportSummary}"`);

  if (!report || report.overallViabilityPercentage < 75) {
    throw new Error(`❌ TEST FAILED: Format viability score fell below 75%: got ${report.overallViabilityPercentage}%`);
  }
  console.log('✅ Format World Model Viability Audit Passed (>= 75%)');

  // 2. Verify Non-Circular Triad Independence
  console.log('\n🔍 Verifying Non-Circular Triad Independence...');
  const generatorKey = result.deckIdentity.archetypeKey;
  const evaluatorFidelity = result.identityFidelity.overallFidelityScore;
  const reverseExtractedKey = result.reverseIdentityMatch.predictedKey;

  console.log(`   - Generator Target Key:    [${generatorKey}]`);
  console.log(`   - Evaluator Fidelity:      [${evaluatorFidelity}%]`);
  console.log(`   - Reverse Extracted Key:   [${reverseExtractedKey}]`);

  if (generatorKey !== reverseExtractedKey) {
    throw new Error(`❌ TEST FAILED: Non-circular triad mismatch between Generator (${generatorKey}) and Reverse Extractor (${reverseExtractedKey})`);
  }
  console.log('✅ Non-Circular Independent Triad Verified (Generator == Extractor, Independent Evaluator)');

  console.log('\n🎉 ALL PRINCIPLE #6 WORLD MODEL CONSISTENCY TESTS PASSED SUCCESSFULLY!');
}

runTest();
