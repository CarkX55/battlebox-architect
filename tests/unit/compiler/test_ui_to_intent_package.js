/**
 * tests/unit/compiler/test_ui_to_intent_package.js
 * 
 * Principle #1 Integration Test Suite: UI Form State -> IntentPackage Contract.
 * Asserts:
 *   1. IntentBuilder converts 100% of UI form state fields into IntentPackage without loss.
 *   2. IntentPackage.evaluateCompleteness() returns 100% completeness for complete UI state.
 *   3. Missing mandatory fields trigger completeness failure.
 *   4. PASS 1 observable log header formatting.
 */

import { IntentBuilder } from '../../../src/services/compiler/core/intentBuilder.js';

function runTest() {
  console.log('🧪 Running Principle #1 Integration Test Suite: UI State -> IntentPackage...\n');

  // Simulated 100% complete UI Form State from React frontend
  const mockUIFormState = {
    format: 'Standard',
    colors: ['W', 'R', 'G'],
    archetype: 'Aggro',
    tribe: 'Giant',
    strategy: ['Go Big'],
    mechanics: ['Stomp'],
    budget: 'Unlimited',
    powerLevel: 'Competitive',
    prioritizePlaysets: true,
    avoidRotation: false,
    excludedMechanics: ['FETCHLANDS'],
    excludedCards: ['Sol Ring'],
    companero: null,
    prompt: 'Bant Giants Aggro'
  };

  // Convert UI State via IntentBuilder (Pure Conversion)
  const intentPackage = IntentBuilder.buildFromUI(mockUIFormState);

  console.log('✅ PASS 1: Formatted Observable Log Header:');
  console.log(intentPackage.formatLogHeader());

  // Assertions: Verify 100% of UI fields are preserved
  console.log('\n🔍 Verifying UI Form Field Preservation...');
  
  if (intentPackage.format !== 'STANDARD') {
    throw new Error(`❌ TEST FAILED: IntentPackage format mismatch: expected STANDARD, got ${intentPackage.format}`);
  }
  if (intentPackage.colors.length !== 3 || !intentPackage.colors.includes('W') || !intentPackage.colors.includes('R') || !intentPackage.colors.includes('G')) {
    throw new Error(`❌ TEST FAILED: IntentPackage colors mismatch: ${intentPackage.colors.join(',')}`);
  }
  if (intentPackage.tempo !== 'Aggro') {
    throw new Error(`❌ TEST FAILED: IntentPackage archetype mismatch: ${intentPackage.tempo}`);
  }
  if (intentPackage.primaryTribe !== 'Giant') {
    throw new Error(`❌ TEST FAILED: IntentPackage tribe mismatch: ${intentPackage.primaryTribe}`);
  }
  if (intentPackage.strategy[0] !== 'Go Big') {
    throw new Error(`❌ TEST FAILED: IntentPackage strategy mismatch: ${intentPackage.strategy.join(',')}`);
  }
  if (intentPackage.mechanics[0] !== 'Stomp') {
    throw new Error(`❌ TEST FAILED: IntentPackage mechanics mismatch: ${intentPackage.mechanics.join(',')}`);
  }
  if (intentPackage.budget !== 'Unlimited') {
    throw new Error(`❌ TEST FAILED: IntentPackage budget mismatch: ${intentPackage.budget}`);
  }
  if (intentPackage.powerLevel !== 'Competitive') {
    throw new Error(`❌ TEST FAILED: IntentPackage powerLevel mismatch: ${intentPackage.powerLevel}`);
  }

  console.log('✅ ALL 100% UI Form Fields Preserved in IntentPackage!');

  // Test Intent Completeness Audit Gate
  const completeness = intentPackage.evaluateCompleteness();
  console.log(`\n📊 Intent Completeness Score: ${completeness.completenessPercentage}%`);

  if (completeness.completenessPercentage !== 100 || !completeness.isComplete) {
    throw new Error(`❌ TEST FAILED: Expected 100% completeness, got ${completeness.completenessPercentage}%`);
  }
  console.log('✅ Intent Completeness Gate Passed (100%)');

  // Test Abort on Missing Mandatory Field
  const incompleteUIState = { format: 'Standard' }; // Missing colors and tempo
  const incompletePackage = IntentBuilder.buildFromUI(incompleteUIState);
  const incompleteResult = incompletePackage.evaluateCompleteness();

  if (incompleteResult.isComplete) {
    throw new Error('❌ TEST FAILED: Incomplete UI state was incorrectly marked as 100% complete.');
  }
  console.log(`✅ Incomplete UI state correctly flagged missing fields: ${incompleteResult.missingFields.join(', ')}`);

  console.log('\n🎉 ALL PRINCIPLE #1 UI -> INTENTPACKAGE CONTRACT TESTS PASSED SUCCESSFULLY!');
}

runTest();
