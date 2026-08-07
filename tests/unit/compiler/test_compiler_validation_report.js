/**
 * tests/unit/compiler/test_compiler_validation_report.js
 * 
 * Test Suite: Compiler Validation Report, Confidence Card & Capability Card.
 * Asserts:
 *   1. ConfidenceCard generation with ECE = 0.012 & Tier 2 Evidence.
 *   2. CapabilityCard classification across archetypes.
 *   3. CompilerValidationReport generation.
 */

import { CompilerConvergencePipeline } from '../../../src/knowledge/compiler/CompilerConvergencePipeline.js';
import { CompilerValidationReport } from '../../../src/services/compiler/core/compilerValidationReport.js';

function runTest() {
  console.log('🧪 Running Compiler Validation Report & Confidence Card Test Suite...\n');

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

  const confidence = result.confidenceCard;
  const capability = result.capabilityCard;
  const valReport = result.compilerValidationReport;

  // 1. Confidence Card
  console.log('🪪 1. Per-Compilation Confidence Card:');
  console.log(`   👉 Overall Confidence:     ${confidence.overallConfidence}%`);
  console.log(`   👉 Calibration:             ${confidence.confidenceCalibration}`);
  console.log(`   - Evidence Tier:           ${confidence.evidenceTier}`);
  console.log(`   - Known Weakness:          ${confidence.knownWeakness}`);
  if (confidence.overallConfidence !== 94 || !confidence.confidenceCalibration.includes('ECE 0.012')) {
    throw new Error('❌ TEST FAILED: Confidence card values invalid.');
  }
  console.log('✅ Confidence Card Verified');

  // 2. Capability Card
  console.log('\n📊 2. Domain Capability Card:');
  console.log(`   - Excellent Archetypes:     ${capability.excellent.join(', ')}`);
  console.log(`   - Good Archetypes:          ${capability.good.join(', ')}`);
  console.log(`   - Fair Archetypes:          ${capability.fair.join(', ')}`);
  console.log(`   - Weak Areas:               ${capability.weak.join(', ')}`);
  if (!capability.excellent.includes('Aggro') || !capability.weak.includes('Brand-New Set Releases (<48h)')) {
    throw new Error('❌ TEST FAILED: Capability card classification invalid.');
  }
  console.log('✅ Domain Capability Card Verified');

  // 3. System Validation Report
  console.log('\n📜 3. System Validation Report:');
  console.log(`   - Compiler Version:        ${valReport.compilerVersion}`);
  console.log(`   - Timestamp:               ${valReport.timestamp}`);
  if (!valReport.compilerVersion.includes('BattleBox Strategic Compiler v1.0')) {
    throw new Error('❌ TEST FAILED: System validation report version invalid.');
  }
  console.log('✅ System Validation Report Verified');

  console.log('\n🎉 ALL COMPILER VALIDATION REPORT & CONFIDENCE CARD TESTS PASSED SUCCESSFULLY!');
}

runTest();
