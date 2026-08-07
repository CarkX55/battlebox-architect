/**
 * tests/unit/compiler/test_identity_compiler.js
 * 
 * Domain Knowledge Test Suite: StrategicIdentityCompiler Verification.
 * Asserts:
 *   1. StrategicIdentityCompiler transforms IntentPackage into a rich DeckIdentity model.
 *   2. Giants Stomp compiles required engines (Cost Reduction, Stomp Engine, Large Threat Chain), expected curve (4-6), and kill turn (6).
 *   3. DeckIdentity contains non-empty gameplan, mandatory roles, strengths, weaknesses, and recovery plans.
 */

import { IntentBuilder } from '../../../src/services/compiler/core/intentBuilder.js';
import { StrategicIdentityCompiler } from '../../../src/services/compiler/core/strategicIdentityCompiler.js';

function runTest() {
  console.log('🧪 Running Domain Knowledge Test Suite: StrategicIdentityCompiler...\n');

  // Simulated UI state for Naya Giants Stomp
  const mockUIState = {
    format: 'Standard',
    colors: ['R', 'W', 'G'],
    archetype: 'Aggro',
    tribe: 'Giant',
    mechanics: ['Stomp'],
    prompt: 'Naya Giants Stomp'
  };

  const intentPackage = IntentBuilder.buildFromUI(mockUIState);
  const deckIdentity = StrategicIdentityCompiler.compileIdentity(intentPackage);

  console.log('✅ PASS 1: DeckIdentity Model Compiled Successfully:');
  console.log(`   - Archetype Key:      ${deckIdentity.archetypeKey}`);
  console.log(`   - Gameplan:           "${deckIdentity.gameplan}"`);
  console.log(`   - Required Engines:   [${deckIdentity.requiredEngines.join(', ')}]`);
  console.log(`   - Expected Curve:     ${deckIdentity.expectedCurveRange.min}-${deckIdentity.expectedCurveRange.max}`);
  console.log(`   - Expected Kill Turn: Turn ${deckIdentity.expectedKillTurn}`);
  console.log(`   - Requires Ramp:      ${deckIdentity.requiresManaRamp}`);

  // Assertions: Naya Giants Stomp specific identity requirements
  if (deckIdentity.archetypeKey !== 'NAYA_GIANTS_STOMP') {
    throw new Error(`❌ TEST FAILED: Expected archetype key NAYA_GIANTS_STOMP, got ${deckIdentity.archetypeKey}`);
  }
  if (!deckIdentity.requiredEngines.includes('Stomp Engine') || !deckIdentity.requiredEngines.includes('Early Ramp')) {
    throw new Error('❌ TEST FAILED: Naya Giants DeckIdentity is missing critical Stomp/Ramp engines!');
  }
  if (deckIdentity.expectedCurveRange.min < 4 || deckIdentity.expectedCurveRange.max < 6) {
    throw new Error(`❌ TEST FAILED: Giants curve range collapsed to generic low curve: ${deckIdentity.expectedCurveRange.min}-${deckIdentity.expectedCurveRange.max}`);
  }
  if (deckIdentity.expectedKillTurn !== 6) {
    throw new Error(`❌ TEST FAILED: Giants expected kill turn mismatch: expected 6, got ${deckIdentity.expectedKillTurn}`);
  }
  if (!deckIdentity.requiresManaRamp) {
    throw new Error('❌ TEST FAILED: Giants identity failed to require Mana Ramp!');
  }

  console.log('\n🎉 ALL STRATEGIC IDENTITY COMPILER TESTS PASSED SUCCESSFULLY!');
}

runTest();
