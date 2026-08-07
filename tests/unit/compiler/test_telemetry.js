/**
 * tests/unit/compiler/test_telemetry.js
 * 
 * Test de Verificación Unitaria para KernelTelemetry (Hashes Deterministas y Versionado).
 */

import { KernelTelemetry } from '../../../src/services/compiler/core/kernelTelemetry.js';

async function runTelemetryTests() {
  console.log('🧪 === INICIANDO PRUEBAS UNITARIAS: KernelTelemetry ===');

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

  const tel1 = new KernelTelemetry({ seed: 42, format: 'Modern' });
  const tel2 = new KernelTelemetry({ seed: 42, format: 'Modern' });

  assert(tel1.header.configurationHash === tel2.header.configurationHash, 'Dos ejecuciones con parámetros idénticos generan EXACTAMENTE el mismo configurationHash determinista');
  assert(tel1.header.oracleSnapshotHash.startsWith('ORACLE_HASH_'), 'oracleSnapshotHash registrado');
  assert(tel1.header.pluginSnapshotHash.startsWith('PLUGIN_HASH_'), 'pluginSnapshotHash registrado');

  tel1.recordRollout(50);
  tel1.recordNodeExplored(10);
  const summary = tel1.finish('DECK_TEST_123');

  assert(summary.metrics.rolloutsExecuted === 50, 'Rollouts MCTS registrados');
  assert(summary.metrics.nodesExplored === 10, 'Nodos explorados registrados');
  assert(summary.metrics.deckHash === 'DECK_TEST_123', 'Deck hash asociado en la finalización');

  console.log(`\n==================================================`);
  console.log(`RESULTADOS KernelTelemetry: ${passed} PASARON, ${failed} FALLARON`);
  console.log(`==================================================`);

  if (failed > 0) process.exit(1);
}

runTelemetryTests();
