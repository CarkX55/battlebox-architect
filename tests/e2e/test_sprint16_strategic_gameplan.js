/**
 * tests/e2e/test_sprint16_strategic_gameplan.js
 * 
 * Test de Integración E2E para Sprint 16 (Strategic Game Plan Engine & Engine Dependency Graph).
 * Valida:
 * 1. ArchetypeDSL: Sintaxis fluida tipada con constantes de capacidades y motores.
 * 2. EngineDependencyGraph: Proyección automática desde el WeightedCapabilityGraph y validación de Dependency Density.
 * 3. StrategicGamePlanEngine: Modelo probabilístico condicional de fases secuenciales de turno (Markov Chain).
 * 4. StrategicConfidence: Métrica de confianza derivada matemáticamente de métricas observadas.
 */

import { ArchetypeDSL, ENGINE_IDS } from '../../src/services/compiler/core/archetypeDSL.js';
import { CAPABILITY_IDS } from '../../src/services/compiler/core/capabilityCatalog.js';
import { EngineDependencyGraph } from '../../src/services/compiler/core/engineDependencyGraph.js';
import { StrategicGamePlanEngine } from '../../src/services/compiler/core/strategicGamePlanEngine.js';
import { StrategicConfidence } from '../../src/services/compiler/core/strategicConfidence.js';

async function runSprint16Test() {
  console.log('🧪 === INICIANDO TEST DE INTEGRACIÓN E2E (SPRINT 16 STRATEGIC GAME PLAN ENGINE) ===');

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

  // 1. Testing ArchetypeDSL Fluent Builder & Typed Constants
  console.log('\n--- 1. Testing ArchetypeDSL Fluent Builder ---');
  const merfolkDSL = ArchetypeDSL.getMerfolkDSL();
  assert(merfolkDSL.archetype === 'Merfolk Tempo', 'ArchetypeDSL compiló arquetipo Merfolk Tempo');
  assert(merfolkDSL.requirements.some(r => r.capabilityId === CAPABILITY_IDS.VALUE_THREAT), 'Arquetipo registra requisito tipado VALUE_THREAT');
  assert(merfolkDSL.supports.includes(ENGINE_IDS.AETHER_VIAL), 'Arquetipo registra motor soportado AETHER_VIAL');
  assert(merfolkDSL.gamePlanPhases.length === 4, 'Arquetipo registra 4 fases secuenciales del plan de partida');

  // 2. Testing Automatic EngineDependencyGraph Projection & Density Validation
  console.log('\n--- 2. Testing EngineDependencyGraph Projection & Density ---');
  const projectedDAG = EngineDependencyGraph.projectFromDSL(merfolkDSL);
  assert(projectedDAG.projectedNodes.length === 2, 'DAG proyectó automáticamente 2 nodos de dependencias desde el DSL');

  const mockCandidatePool = [
    { name: 'Card 1', capability: CAPABILITY_IDS.MANA_ACCELERATION_T1, quantity: 4 },
    { name: 'Card 2', capability: CAPABILITY_IDS.VALUE_THREAT, quantity: 12 }
  ];
  const densityResult = EngineDependencyGraph.validateDependencyDensity(projectedDAG, mockCandidatePool);
  assert(densityResult.isDensitySatisfied === true, 'Density Validation confirmó suficientes unidades para todos los nodos');

  // 3. Testing StrategicGamePlanEngine Sequential Conditional Probabilities (Markov Chain)
  console.log('\n--- 3. Testing StrategicGamePlanEngine Markov Chain ---');
  const gamePlanResult = StrategicGamePlanEngine.evaluateSequentialGamePlan([], merfolkDSL);
  assert(gamePlanResult.phases.length === 4, 'Evaluador procesó las 4 fases secuenciales del plan Merfolk');
  assert(gamePlanResult.finalLethalProbability > 0.50, 'Probabilidad acumulada letal final calculada (> 50%)');

  // 4. Testing StrategicConfidence Derived Metric
  console.log('\n--- 4. Testing StrategicConfidence Derived Metric ---');
  const confidence = StrategicConfidence.calculateDerivedConfidence({ finalUtilityScore: 95 }, gamePlanResult, densityResult);
  assert(confidence.confidenceScore >= 70, 'Métrica de confianza estocástica derivada calculada');
  assert(confidence.confidenceRating === 'HIGH_CONFIDENCE', 'Clasificación de confianza = HIGH_CONFIDENCE');


  console.log(`\n==================================================`);
  console.log(`RESULTADOS SPRINT 16 STRATEGIC GAME PLAN E2E: ${passed} PASARON, ${failed} FALLARON`);
  console.log(`==================================================`);

  if (failed > 0) process.exit(1);
}

runSprint16Test();
