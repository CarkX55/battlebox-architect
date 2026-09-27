/**
 * Test Suite: FASE 2 — Declarative Execution Policy Engine (v28.1)
 */

import { ExecutionPolicy } from '../../../src/services/compiler/core/executionPolicy.js';

let passed = 0;
let total = 0;

function assert(condition, message) {
  total++;
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    throw new Error(message);
  } else {
    console.log(`✅ PASS: ${message}`);
    passed++;
  }
}

console.log('=== Running Test Suite: FASE 2 Declarative Execution Policy ===\n');

try {
  // Test 1: Dynamic Derivation for Aggro / Burn
  const aggroPolicy = ExecutionPolicy.deriveFromIntent({ tempo: 'Aggro' }, { archetypeKey: 'BURN' }, {});
  assert(aggroPolicy.policyVersion.includes('aggro'), 'Aggro intent derives aggro policy version');
  assert(aggroPolicy.turnObjectives.T1.includes('DEPLOY_1DROP_MAX_PRESSURE'), 'Aggro T1 prioritizes maximum pressure');
  assert(aggroPolicy.riskTolerance >= 0.8, 'Aggro risk tolerance is high (>= 0.8)');
  assert(Object.isFrozen(aggroPolicy), 'ExecutionPolicy instance is frozen');

  // Test 2: Dynamic Derivation for Control
  const controlPolicy = ExecutionPolicy.deriveFromIntent({ tempo: 'Control' }, { archetypeKey: 'AZORIUS_CONTROL' }, {});
  assert(controlPolicy.policyVersion.includes('control'), 'Control intent derives control policy version');
  assert(controlPolicy.turnObjectives.T4.includes('DEPLOY_SWEEPER_OR_ENGINE'), 'Control T4 prioritizes sweeper or engine stabilization');
  assert(controlPolicy.interactionPolicy.holdOpenManaForInteraction === true, 'Control holds open mana for interaction');

  // Test 3: Dynamic Derivation for Ramp
  const rampPolicy = ExecutionPolicy.deriveFromIntent({ tempo: 'Midrange' }, { archetypeKey: 'DRAGON_RAMP' }, {});
  assert(rampPolicy.policyVersion.includes('ramp'), 'Dragon Ramp derives ramp policy version');
  assert(rampPolicy.turnObjectives.T1.includes('DEVELOP_T1_DORK_OR_EXPLORE'), 'Ramp T1 prioritizes mana acceleration');

  // Test 4: Structured Immutability
  assert(Object.isFrozen(aggroPolicy.turnObjectives), 'turnObjectives is deeply frozen');
  assert(Object.isFrozen(controlPolicy.interactionPolicy), 'interactionPolicy is deeply frozen');

  console.log(`\n🎉 FASE 2 TESTS COMPLETED: ${passed}/${total} PASSED`);
} catch (e) {
  console.error('\n❌ FASE 2 TEST SUITE ERROR:', e);
  process.exit(1);
}
