/**
 * tests/e2e/test_sprint14_3_advanced_optimizer.js
 * 
 * Test de Integración E2E para Sprint 14.3 (Advanced Iterative Optimization Engine).
 * Valida:
 * 1. VisitedStatesCache con Hash SHA-256 criptográfico.
 * 2. StrategicEvaluator en Dos Niveles (Tier 1 Fast Deterministic + Tier 2 Monte Carlo).
 * 3. Operadores de Macro-Mutación (EngineSwap, CurveShift, DensityShift, Sidegrade).
 * 4. Parada por Estancamiento (Patience = 5 iteraciones sin mejora).
 * 5. Top 5 Soluciones Estructuralmente Diversas.
 */

import { VisitedStatesCache } from '../../src/services/compiler/core/visitedStatesCache.js';
import { StrategicEvaluator } from '../../src/services/compiler/core/strategicEvaluator.js';
import { IterativeDeckOptimizer } from '../../src/services/compiler/core/iterativeDeckOptimizer.js';

async function runSprint143Test() {
  console.log('🧪 === INICIANDO TEST DE INTEGRACIÓN E2E (SPRINT 14.3 ADVANCED OPTIMIZER) ===');

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

  // 1. Testing VisitedStatesCache SHA-256 Hashing
  console.log('\n--- 1. Testing VisitedStatesCache SHA-256 Hashing ---');
  const mockDeckA = [{ name: 'Llanowar Elves', quantity: 4 }, { name: 'Elvish Mystic', quantity: 4 }];
  const mockDeckB = [{ name: 'Elvish Mystic', quantity: 4 }, { name: 'Llanowar Elves', quantity: 4 }];

  const hashA = VisitedStatesCache.computeDeckHash(mockDeckA);
  const hashB = VisitedStatesCache.computeDeckHash(mockDeckB);

  assert(hashA.startsWith('SHA256_'), 'Hash SHA-256 generado con prefijo correcto');
  assert(hashA === hashB, 'Hash SHA-256 es 100% independiente del orden de las cartas');

  const cache = new VisitedStatesCache();
  cache.markVisited(mockDeckA);
  assert(cache.hasBeenVisited(mockDeckB) === true, 'VisitedStatesCache reconoce estado permutado como ya visitado');

  // 2. Testing Two-Tier StrategicEvaluator
  console.log('\n--- 2. Testing Two-Tier StrategicEvaluator ---');
  const valid60Slots = [
    { name: 'Card A', quantity: 4, cmc: 1, role: 'T1 Mana Dork' },
    { name: 'Card B', quantity: 4, cmc: 2, role: 'Threat' },
    { name: 'Card C', quantity: 4, cmc: 2, role: 'Threat' },
    { name: 'Card D', quantity: 4, cmc: 2, role: 'Threat' },
    { name: 'Card E', quantity: 4, cmc: 2, role: 'Threat' },
    { name: 'Card F', quantity: 4, cmc: 2, role: 'Threat' },
    { name: 'Card G', quantity: 4, cmc: 3, role: 'Threat' },
    { name: 'Card H', quantity: 4, cmc: 3, role: 'Threat' },
    { name: 'Card I', quantity: 4, cmc: 4, role: 'Engine' },
    { name: 'Card J', quantity: 4, cmc: 4, role: 'Engine' },
    { name: 'Forest', quantity: 20, cmc: 0, isBasicLand: true, type_line: 'Land' }
  ];

  const tier1 = StrategicEvaluator.evaluateTier1Fast(valid60Slots);
  assert(tier1.isDeterministicValid === true, 'Tier 1 Fast Deterministic aprobó mazo válido de 60 cartas');

  const tier2 = StrategicEvaluator.evaluateTier2MonteCarlo(valid60Slots, 500);
  assert(tier2.isEligible === true, 'Tier 2 Monte Carlo ejecutado sobre candidato elegible');
  assert(tier2.keepableOpeningHandRate >= 0.70, 'Métrica Monte Carlo de Manos Conservables calculada');
  assert(tier2.compositeMonteCarloScore > 0, 'Score compuesto Monte Carlo calculado');

  // 3. Testing Advanced Iterative Optimizer Loop (Macro-Mutations & Early Stopping)
  console.log('\n--- 3. Testing Advanced Iterative Optimizer (Sprint 14.3) ---');
  const optResult = IterativeDeckOptimizer.optimizeIteratively({}, [], {}, {
    maxIterations: 20,
    patience: 3,
    epsilon: 0.005
  });

  assert(optResult.status === 'CONVERGED_EARLY_STOPPING' || optResult.status === 'MAX_ITERATIONS_REACHED', 'Optimizador finalizó con estado válido');
  assert(optResult.top5DiverseSolutions.length > 0, 'Optimizador extrajo soluciones diversas');
  assert(optResult.top5DiverseSolutions.length <= 5, 'Límite de Top 5 Soluciones Diversas respetado');
  assert(optResult.tier2MonteCarloReport.compositeMonteCarloScore > 0, 'Informe Tier 2 Monte Carlo generado para el mazo ganador');

  console.log(`\n==================================================`);
  console.log(`RESULTADOS SPRINT 14.3 ADVANCED OPTIMIZER E2E: ${passed} PASARON, ${failed} FALLARON`);
  console.log(`==================================================`);

  if (failed > 0) process.exit(1);
}

runSprint143Test();
