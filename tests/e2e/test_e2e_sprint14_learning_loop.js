/**
 * tests/e2e/test_e2e_sprint14_learning_loop.js
 * 
 * Test de Integración E2E para el Bucle Autónomo de Aprendizaje Continuo (v14).
 * Valida el ciclo completo:
 * Generación -> 10,000 Simulaciones -> Diagnóstico -> Reparación -> Re-simulación -> Delta Δ -> Aceptación -> Grafo Bayesiano
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import { AutonomousLearningLoop } from '../../src/services/compiler/core/autonomousLearningLoop.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const benchmarkPath = path.join(__dirname, '../benchmarks/modern_elves.json');
const benchmarkData = JSON.parse(fs.readFileSync(benchmarkPath, 'utf8'));

async function runSprint14LearningLoopTest() {
  console.log('🧪 === INICIANDO TEST DE INTEGRACIÓN E2E (SPRINT 14 AUTONOMOUS LEARNING LOOP) ===');

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

  const loopResult = await AutonomousLearningLoop.runOptimizationLoop('Golgari Elves', benchmarkData, 3);

  assert(loopResult.totalIterationsRun === 3, 'El bucle autónomo ejecutó exactamente 3 iteraciones de optimización');
  assert(loopResult.finalDeckSlots.length > 3, 'El mazo final fue expandido con cartas de reparación validadas');
  assert(loopResult.convergedScore >= 80, 'El mazo convergió a una puntuación competitiva (>= 80)');
  assert(loopResult.iterationsHistory.length === 3, 'Historial completo de 3 iteraciones registrado');
  assert(loopResult.iterationsHistory[0].status === 'ACCEPTED', 'Primera iteración de reparación fue ACEPTADA tras verificar Δ positivo');

  console.log(`\n==================================================`);
  console.log(`RESULTADOS SPRINT 14 LEARNING LOOP E2E: ${passed} PASARON, ${failed} FALLARON`);
  console.log(`==================================================`);

  if (failed > 0) process.exit(1);
}

runSprint14LearningLoopTest();
