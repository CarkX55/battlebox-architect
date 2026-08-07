/**
 * tests/e2e/test_sprint21_3_belief_engine.js
 * 
 * Test de Integración E2E para Sprint 21.3 (Strategic Belief Engine & Dynamic Context v21.3).
 * Valida:
 * 1. BeliefState: Razonamiento explícito sobre incertidumbre (beliefScore, confidence, evidenceCount).
 * 2. Dynamic Weight Evaluation: Evaluación f(context) para aristas causales (Mono Blue = 0.95, Burn = 0.02, Tron = 0.10).
 * 3. Empirical Belief Update: Actualización estocástica de credibilidad ante evidencia Monte Carlo.
 */

import { StrategicBeliefEngine, BeliefState } from '../../src/services/compiler/core/strategicBeliefEngine.js';

async function runSprint21_3Test() {
  console.log('🧪 === INICIANDO TEST DE INTEGRACIÓN E2E (SPRINT 21.3 STRATEGIC BELIEF ENGINE) ===');

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

  // 1. Testing BeliefState Construction
  console.log('\n--- 1. Testing BeliefState Construction ---');
  const initialBelief = new BeliefState({ beliefScore: 0.70, confidence: 0.60, evidenceCount: 3 });
  assert(initialBelief.beliefScore === 0.70, 'BeliefState registró beliefScore inicial de 0.70');
  assert(initialBelief.confidence === 0.60, 'BeliefState registró confianza inicial de 0.60');

  // 2. Testing Dynamic Weight Evaluation f(context)
  console.log('\n--- 2. Testing Dynamic Weight Evaluation f(context) ---');
  const weightBlue = StrategicBeliefEngine.evaluateDynamicWeight(1.0, { edgeType: 'COUNTERACTS_BLUE_COUNTERSPELL', opponentColor: 'U', opponentArchetype: 'Control' });
  const weightBurn = StrategicBeliefEngine.evaluateDynamicWeight(1.0, { edgeType: 'COUNTERACTS_BLUE_COUNTERSPELL', opponentColor: 'R', opponentArchetype: 'Burn' });
  const weightTron = StrategicBeliefEngine.evaluateDynamicWeight(1.0, { edgeType: 'COUNTERACTS_BLUE_COUNTERSPELL', opponentColor: 'C', opponentArchetype: 'Tron' });

  assert(weightBlue === 0.95, 'Peso dinámico contra Mono Blue evaluado en 0.95');
  assert(weightBurn === 0.02, 'Peso dinámico contra Burn evaluado en 0.02');
  assert(weightTron === 0.10, 'Peso dinámico contra Tron evaluado en 0.10');

  // 3. Testing Empirical Belief Update
  console.log('\n--- 3. Testing Empirical Belief Update ---');
  const updatedBelief = StrategicBeliefEngine.updateBelief(initialBelief, 17, 15);
  assert(updatedBelief.beliefScore > initialBelief.beliefScore, 'Grado de creencia incrementó ante evidencia empírica positiva');
  assert(updatedBelief.evidenceCount === 4, 'Contador de muestras empíricas incrementó a 4');

  console.log(`\n==================================================`);
  console.log(`RESULTADOS SPRINT 21.3 BELIEF ENGINE E2E: ${passed} PASARON, ${failed} FALLARON`);
  console.log(`==================================================`);

  if (failed > 0) process.exit(1);
}

runSprint21_3Test();
