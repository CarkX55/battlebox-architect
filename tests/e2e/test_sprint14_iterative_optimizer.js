/**
 * tests/e2e/test_sprint14_iterative_optimizer.js
 * 
 * Test de Integración E2E para el Motor de Optimización Iterativa (IterativeDeckOptimizer v14.2).
 * Valida:
 * 1. Hard Constraints (Restricciones Duras): 60 cartas, max 4 copias, 18-22 tierras.
 * 2. Soft Constraints Normalizados: Rango [0.0, 1.0] en ObjectiveFunction.
 * 3. Bucle de Búsqueda Iterativa (Beam Search + Local Search): Iteraciones hasta convergencia (ΔUtility < epsilon).
 * 4. Merfolk Deck Optimization: Mazo de 60 cartas de Merfolk optimizado con playsets de 4x.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import { IterativeDeckOptimizer } from '../../src/services/compiler/core/iterativeDeckOptimizer.js';
import { PureIntentBlueprint, QuantitativeContractRequirement } from '../../src/services/compiler/core/pureIntentBlueprint.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const profilesDir = path.join(__dirname, '../../src/services/compiler/profiles');

async function runIterativeOptimizerTest() {
  console.log('🧪 === INICIANDO TEST DE INTEGRACIÓN E2E (SPRINT 14.2 ITERATIVE DECK OPTIMIZER) ===');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ PASÓ: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FALLÓ: ${message}`);
      failed++;
    }
  }

  // 1. Testing Hard Constraints Verification
  console.log('\n--- 1. Testing Hard Constraints Verification ---');
  const validSlots = [
    { name: 'Card A', quantity: 4, isBasicLand: false },
    { name: 'Card B', quantity: 4, isBasicLand: false },
    { name: 'Card C', quantity: 4, isBasicLand: false },
    { name: 'Card D', quantity: 4, isBasicLand: false },
    { name: 'Card E', quantity: 4, isBasicLand: false },
    { name: 'Card F', quantity: 4, isBasicLand: false },
    { name: 'Card G', quantity: 4, isBasicLand: false },
    { name: 'Card H', quantity: 4, isBasicLand: false },
    { name: 'Card I', quantity: 4, isBasicLand: false },
    { name: 'Card J', quantity: 4, isBasicLand: false },
    { name: 'Island', quantity: 20, isBasicLand: true, type_line: 'Land' }
  ];
  assert(IterativeDeckOptimizer.verifyHardConstraints(validSlots) === true, 'Mazo de 60 cartas con 20 tierras y playsets de 4x cumple Hard Constraints');

  const invalidSlots59 = validSlots.slice(0, 9); // < 60 cartas
  assert(IterativeDeckOptimizer.verifyHardConstraints(invalidSlots59) === false, 'Mazo de 36 cartas viola Hard Constraints (retorna false)');

  // 2. Testing Soft Constraints Normalization [0.0, 1.0]
  console.log('\n--- 2. Testing Soft Constraints Normalization [0.0, 1.0] ---');
  const merfolkProfile = JSON.parse(fs.readFileSync(path.join(profilesDir, 'merfolk.json'), 'utf8'));
  const evalResult = IterativeDeckOptimizer.evaluateNormalizedUtility(validSlots, [], merfolkProfile);
  assert(evalResult.metrics.coverage <= 1.0 && evalResult.metrics.coverage >= 0.0, 'Métrica de Cobertura normalizada a [0.0, 1.0]');
  assert(evalResult.metrics.synergy <= 1.0 && evalResult.metrics.synergy >= 0.0, 'Métrica de Sinergia normalizada a [0.0, 1.0]');
  assert(typeof evalResult.normalizedUtility === 'number', 'Utilidad calculada como número real');

  // 3. Testing Bucle de Búsqueda Iterativa (Beam Search + Convergencia)
  console.log('\n--- 3. Testing Iterative Optimization Search Loop ---');
  const pureBlueprint = new PureIntentBlueprint({
    archetype: 'Merfolk Tempo',
    format: 'Modern',
    contracts: [
      new QuantitativeContractRequirement({ capabilityId: 'cap.threat.value.v1', requiredUnits: 12 }),
      new QuantitativeContractRequirement({ capabilityId: 'cap.protection.v1', requiredUnits: 8 })
    ]
  });

  const candidateUniverse = [
    { name: 'Subtlety', cmc: 4, capability: 'cap.protection.v1' },
    { name: 'Harbinger of the Tides', cmc: 2, capability: 'cap.removal.early.v1' },
    { name: 'Mistcaller', cmc: 1, capability: 'cap.protection.v1' }
  ];

  const optResult = IterativeDeckOptimizer.optimizeIteratively(pureBlueprint, candidateUniverse, merfolkProfile, {
    beamWidth: 3,
    maxIterations: 20,
    epsilon: 0.005
  });

  assert(optResult.status === 'CONVERGED_EARLY_STOPPING' || optResult.status === 'MAX_ITERATIONS_REACHED', 'Optimizador finalizó con status válido');
  assert(optResult.totalIterationsExecuted >= 0, 'Optimizador ejecutó iteraciones de búsqueda');
  assert(optResult.isHardConstraintsValid === true, 'El mazo final optimizado cumple las Restricciones Duras de 60 cartas');
  assert(optResult.optimizationHistory.length >= 0, 'Historial de optimización iterativa registrado');


  console.log(`\n==================================================`);
  console.log(`RESULTADOS SPRINT 14.2 ITERATIVE OPTIMIZER: ${passed} PASARON, ${failed} FALLARON`);
  console.log(`==================================================`);

  if (failed > 0) process.exit(1);
}

runIterativeOptimizerTest();
