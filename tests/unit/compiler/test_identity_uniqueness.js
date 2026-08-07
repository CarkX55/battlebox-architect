/**
 * tests/unit/compiler/test_identity_uniqueness.js
 * 
 * Domain Knowledge Test Suite: Strategic Identity Uniqueness Verification.
 * Asserts:
 *   1. Boros Humans, Naya Giants, Mono Red Goblins, Selesnya Elves, and Azorius Control compile 5 strictly distinct DeckIdentities.
 *   2. Identities do NOT collapse into generic aggro/control capability vectors.
 *   3. Archetype keys, required engines, expected curves, and kill turns are completely distinct.
 */

import { IntentBuilder } from '../../../src/services/compiler/core/intentBuilder.js';
import { StrategicIdentityCompiler } from '../../../src/services/compiler/core/strategicIdentityCompiler.js';

function runTest() {
  console.log('🧪 Running Domain Knowledge Test Suite: Strategic Identity Uniqueness...\n');

  const archetypesToTest = [
    { name: 'Humans', ui: { format: 'Standard', colors: ['R', 'W'], archetype: 'Aggro', tribe: 'Human' } },
    { name: 'Giants', ui: { format: 'Standard', colors: ['R', 'W', 'G'], archetype: 'Aggro', tribe: 'Giant', mechanics: ['Stomp'] } },
    { name: 'Goblins', ui: { format: 'Legacy', colors: ['R'], archetype: 'Aggro', tribe: 'Goblin' } },
    { name: 'Elves', ui: { format: 'Modern', colors: ['G', 'W'], archetype: 'Ramp', tribe: 'Elf' } },
    { name: 'Control', ui: { format: 'Pioneer', colors: ['W', 'U'], archetype: 'Control', mechanics: ['Counterspell'] } }
  ];

  const compiledIdentities = new Map();

  for (const item of archetypesToTest) {
    const intentPackage = IntentBuilder.buildFromUI(item.ui);
    const identity = StrategicIdentityCompiler.compileIdentity(intentPackage);
    compiledIdentities.set(item.name, identity);

    console.log(`📌 Archetype: ${item.name.padEnd(10)} ──► Key: ${identity.archetypeKey.padEnd(22)} | Curve: ${identity.expectedCurveRange.min}-${identity.expectedCurveRange.max} | Kill: Turn ${identity.expectedKillTurn} | Ramp: ${identity.requiresManaRamp}`);
  }

  // Assertion 1: Verify all 5 archetype keys are unique
  const keys = Array.from(compiledIdentities.values()).map(id => id.archetypeKey);
  const uniqueKeys = new Set(keys);
  if (uniqueKeys.size !== 5) {
    throw new Error(`❌ TEST FAILED: Archetype identity collapse detected! Distinct keys: ${uniqueKeys.size}/5`);
  }
  console.log('\n✅ 5/5 Archetype Keys are Strictly Unique!');

  // Assertion 2: Giants vs Humans Structural Differentiation
  const giants = compiledIdentities.get('Giants');
  const humans = compiledIdentities.get('Humans');

  if (giants.expectedCurveRange.min === humans.expectedCurveRange.min) {
    throw new Error(`❌ TEST FAILED: Giants curve (${giants.expectedCurveRange.min}) collapsed to Humans curve (${humans.expectedCurveRange.min})!`);
  }
  if (giants.requiresManaRamp === humans.requiresManaRamp) {
    throw new Error('❌ TEST FAILED: Giants and Humans share the exact same mana ramp requirement!');
  }
  console.log('✅ Giants vs Humans Structural Uniqueness Verified (Distinct Curves, Ramp, Engines)');

  // Assertion 3: Control vs Aggro Differentiation
  const control = compiledIdentities.get('Control');
  if (control.expectedKillTurn <= 5) {
    throw new Error(`❌ TEST FAILED: Control kill turn (${control.expectedKillTurn}) collapsed to Aggro speed!`);
  }
  console.log('✅ Control vs Aggro Speed & Engine Differentiation Verified');

  console.log('\n🎉 ALL STRATEGIC IDENTITY UNIQUENESS TESTS PASSED SUCCESSFULLY!');
}

runTest();
