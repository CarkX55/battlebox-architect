/**
 * tests/unit/compiler/test_domain_contracts.js
 * 
 * Test de Verificación Unitaria para Clases de Dominio Tipadas (Domain Contracts).
 */

import { CapabilityContract, CritiqueResult, SimulationReport, RepairProposal } from '../../../src/services/compiler/core/domainContracts.js';

async function runDomainContractsTests() {
  console.log('🧪 === INICIANDO PRUEBAS UNITARIAS: Domain Contracts ===');

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

  // 1. Testing CapabilityContract
  const cap = new CapabilityContract({
    capabilityId: 'cap.mana.acceleration.t1.v1',
    targetUnits: 8,
    targetProbability: 0.90
  });

  assert(Object.isFrozen(cap), 'CapabilityContract es inmutable');
  assert(cap.targetUnits === 8, 'Unidades target verificadas');

  const jsonPOJO = cap.toJSON();
  assert(typeof jsonPOJO === 'object' && !Array.isArray(jsonPOJO), 'toJSON devuelve POJO puro (no string JSON manual)');
  assert(jsonPOJO.capabilityId === 'cap.mana.acceleration.t1.v1', 'POJO contiene datos correctos');

  const restoredCap = CapabilityContract.fromJSON(JSON.stringify(jsonPOJO));
  assert(restoredCap instanceof CapabilityContract, 'fromJSON restaura instancia de CapabilityContract');

  // 2. Testing CritiqueResult
  const critique = new CritiqueResult({
    criticId: 'WrathCritic',
    passed: false,
    severity: 'HIGH',
    issue: 'Vulnerabilidad a limpias de mesa'
  });
  assert(critique.passed === false, 'CritiqueResult conserva booleano passed');
  assert(Object.isFrozen(critique), 'CritiqueResult es inmutable');

  console.log(`\n==================================================`);
  console.log(`RESULTADOS Domain Contracts: ${passed} PASARON, ${failed} FALLARON`);
  console.log(`==================================================`);

  if (failed > 0) process.exit(1);
}

runDomainContractsTests();
