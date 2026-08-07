/**
 * tests/e2e/test_sprint21_2_state_coordinator.js
 * 
 * Test de Integración E2E para Sprint 21.2 (Strategic State Coordinator v21.2).
 * Valida:
 * 1. StrategicStateCoordinator: Patron Coordinador Único, propuesta de mutación y validación de invariantes.
 * 2. CausalEdge: Aristas con pesos estocásticos (0.0 -> 1.0) y activación condicional (OPPONENT_HAS_BLUE).
 * 3. USS Timeline & Rollback: Registro cronológico inmutable (Iteration 0 -> N) y rollback instantáneo.
 */

import { StrategicStateCoordinator, CausalEdge } from '../../src/services/compiler/core/strategicStateCoordinator.js';
import { UnifiedStrategicState } from '../../src/services/compiler/core/unifiedStrategicState.js';

async function runSprint21_2Test() {
  console.log('🧪 === INICIANDO TEST DE INTEGRACIÓN E2E (SPRINT 21.2 STRATEGIC STATE COORDINATOR) ===');

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

  // 1. Testing CausalEdge Weights and Conditions
  console.log('\n--- 1. Testing CausalEdge Weights and Conditions ---');
  const edge = new CausalEdge('Counterspell', 0.94, 'OPPONENT_HAS_BLUE');
  assert(edge.weight === 0.94, 'CausalEdge asignó peso estocástico de 0.94');
  assert(edge.condition === 'OPPONENT_HAS_BLUE', 'CausalEdge registró regla de activación condicional OPPONENT_HAS_BLUE');

  // 2. Testing StrategicStateCoordinator Mutation Proposal & Timeline
  console.log('\n--- 2. Testing StrategicStateCoordinator Mutation Proposal & Timeline ---');
  const coordinator = new StrategicStateCoordinator();
  assert(coordinator.getTimeline().length === 1, 'StrategicStateCoordinator inició con la Iteración 0 en el Timeline');

  const mutationResult = coordinator.applyMutationProposal(
    { executionStatistics: { idealTurnT1T4Percentage: 65 } },
    'Inyección contrafáctica de dorks aceptada'
  );
  assert(mutationResult.success === true, 'StrategicStateCoordinator aceptó y aplicó la propuesta de mutación');
  assert(coordinator.getTimeline().length === 2, 'Timeline incrementó a 2 iteraciones (Iteración 0 -> 1)');
  assert(coordinator.getState().executionStatistics.idealTurnT1T4Percentage === 65, 'Estado actual del USS actualizado');

  // 3. Testing Instant Rollback
  console.log('\n--- 3. Testing Instant Rollback ---');
  const rollbackResult = coordinator.rollbackToPass(0);
  assert(rollbackResult.success === true, 'StrategicStateCoordinator ejecutó el rollback a la Iteración 0');
  assert(coordinator.getState().executionStatistics.idealTurnT1T4Percentage === undefined, 'Estado revertido exitosamente al estado inicial');

  console.log(`\n==================================================`);
  console.log(`RESULTADOS SPRINT 21.2 STATE COORDINATOR E2E: ${passed} PASARON, ${failed} FALLARON`);
  console.log(`==================================================`);

  if (failed > 0) process.exit(1);
}

runSprint21_2Test();
