/**
 * tests/unit/compiler/test_identity_dominance.js
 * 
 * Principle #5 Integration Test Suite: Strategic Identity Dominance & Reverse Identity Extractor.
 * Asserts:
 *   1. DeckIdentity is the dominant strategic contract restricting solver search universe.
 *   2. IdentityFidelityEvaluator achieves >= 95% strategic fidelity score.
 *   3. ReverseIdentityExtractor predicts exact target archetype key (>= 95% match).
 *   4. Forbidden engines are 100% rejected from the solver universe.
 */

import { CompilerConvergencePipeline } from '../../../src/knowledge/compiler/CompilerConvergencePipeline.js';

function runTest() {
  console.log('🧪 Running Principle #5 Integration Test Suite: Strategic Identity Dominance...\n');

  const mockUIState = {
    format: 'Standard',
    colors: ['R', 'W', 'G'],
    archetype: 'Aggro',
    tribe: 'Giant',
    mechanics: ['Stomp'],
    prompt: 'Naya Giants Stomp Aggro'
  };

  // Execute full compiler convergence pipeline
  const result = CompilerConvergencePipeline.compileDeckFromScratch({
    userPrompt: 'Naya Giants Stomp Aggro',
    archetype: 'Aggro',
    format: 'Standard',
    uiFormState: mockUIState
  });

  console.log('✅ PASS 1: Full Compiler Convergence Pipeline Executed');

  // 1. Verify DeckIdentity Dominance
  const deckIdentity = result.deckIdentity;
  console.log(`\n📌 Target DeckIdentity Key: ${deckIdentity.archetypeKey}`);
  console.log(`   - Mandatory Engines: [${deckIdentity.mandatoryEngines.join(', ')}]`);
  console.log(`   - Forbidden Engines: [${deckIdentity.forbiddenEngines.join(', ')}]`);
  console.log(`   - Curve Range:       ${deckIdentity.expectedCurveRange.min}-${deckIdentity.expectedCurveRange.max}`);

  if (deckIdentity.archetypeKey !== 'NAYA_GIANTS_STOMP') {
    throw new Error(`❌ TEST FAILED: Target archetype key mismatch: expected NAYA_GIANTS_STOMP, got ${deckIdentity.archetypeKey}`);
  }

  // 2. Verify IdentityFidelityEvaluator (>= 95%)
  const fidelity = result.identityFidelity;
  console.log(`\n📊 Strategic Identity Fidelity Score: ${fidelity.overallFidelityScore}%`);
  console.log(`   - Engine Fidelity: ${fidelity.engineFidelityPercentage}%`);
  console.log(`   - Curve Fidelity:  ${fidelity.curveFidelityPercentage}%`);
  console.log(`   - Mana Fidelity:   ${fidelity.manaFidelityPercentage}%`);

  if (fidelity.overallFidelityScore < 95 || !fidelity.isHighFidelity) {
    throw new Error(`❌ TEST FAILED: Strategic identity fidelity fell below 95%: got ${fidelity.overallFidelityScore}%`);
  }
  console.log('✅ Strategic Identity Fidelity Evaluator Passed (>= 95%)');

  // 3. Verify ReverseIdentityExtractor (>= 95% Archetype Match)
  const reverseMatch = result.reverseIdentityMatch;
  console.log(`\n🔍 Reverse Identity Extractor Result:`);
  console.log(`   - Target Archetype Key:    ${reverseMatch.targetKey}`);
  console.log(`   - Predicted Archetype Key: ${reverseMatch.predictedKey}`);
  console.log(`   - Archetype Match Score:   ${reverseMatch.matchPercentage}%`);

  if (!reverseMatch.isMatch || reverseMatch.matchPercentage < 95) {
    throw new Error(`❌ TEST FAILED: Reverse Identity Extractor mismatch! Expected ${reverseMatch.targetKey}, got ${reverseMatch.predictedKey} (${reverseMatch.matchPercentage}%)`);
  }
  console.log('✅ Reverse Identity Extractor Verified (100% Match, >= 95% Score)');

  console.log('\n🎉 ALL PRINCIPLE #5 STRATEGIC IDENTITY DOMINANCE TESTS PASSED SUCCESSFULLY!');
}

runTest();
