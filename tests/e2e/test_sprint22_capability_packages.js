/**
 * tests/e2e/test_sprint22_capability_packages.js
 * 
 * Test de Integración E2E para Sprint 22 (Capability Package Architecture v22.0).
 * Valida las 5 Propiedades Arquitectónicas:
 * 1. Obediencia a Modos (Priorizar 4x, Balanceado, Singleton).
 * 2. Inmutabilidad de la Expansión (DeckExpansion jamás modifica desiredCopies).
 * 3. Conservación (Suma de copias en paquetes === total cartas expandidas).
 * 4. Idempotencia (Expandir 2 veces el mismo paquete produce exactamente el mismo resultado).
 * 5. Reparación Gobernada (CopyAllocationManager procesa propuestas de reparación).
 */

import { CapabilityPackage, LockLevel, PackagePriority } from '../../src/services/compiler/core/capabilityPackage.js';
import { CopyAllocationManager } from '../../src/services/compiler/core/copyAllocationManager.js';
import { DeckExpansion } from '../../src/services/compiler/core/deckExpansion.js';

async function runSprint22Test() {
  console.log('🧪 === INICIANDO TEST DE INTEGRACIÓN E2E (SPRINT 22 CAPABILITY PACKAGE ARCHITECTURE) ===');

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

  const requirements = [
    { role: 'TURN_1_MANA_DORK', requiredDensity: 8, winner: 'Llanowar Elves', priority: PackagePriority.PRIORITY_1_CORE },
    { role: 'TRIBAL_LORD', requiredDensity: 4, winner: 'Elvish Archdruid', priority: PackagePriority.PRIORITY_1_CORE },
    { role: 'SILVER_BULLET_REMOVAL', requiredDensity: 1, winner: 'Scavenging Ooze', priority: PackagePriority.PRIORITY_3_SILVER_BULLET }
  ];

  // 1. Testing CopyAllocationManager Modes
  console.log('\n--- 1. Testing CopyAllocationManager Modes ---');
  const packages4x = CopyAllocationManager.allocatePackages(requirements, 'PRIORITIZE_4X');
  assert(packages4x[0].copies === 4, 'Modo PRIORITIZE_4X asignó 4 copias al Core Engine');
  assert(packages4x[2].copies === 1, 'Modo PRIORITIZE_4X respetó 1 copia para Silver Bullet');

  const packagesSingleton = CopyAllocationManager.allocatePackages(requirements, 'SINGLETON');
  assert(packagesSingleton[0].copies === 1, 'Modo SINGLETON asignó 1 copia');

  // 2. Testing DeckExpansion Conservation & Invariance
  console.log('\n--- 2. Testing DeckExpansion Conservation & Invariance ---');
  const expandedDeck = DeckExpansion.expandPackagesToDeck(packages4x);
  const totalPackageCopies = packages4x.reduce((sum, p) => sum + p.copies, 0);
  assert(expandedDeck.length === totalPackageCopies, 'Conservación: Total de cartas expandidas (' + expandedDeck.length + ') coincide exactamente con las copias del paquete (' + totalPackageCopies + ')');
  assert(packages4x[0].copies === 4, 'Invarianza: DeckExpansion NO alteró las copias originales del CapabilityPackage');

  // 3. Testing Idempotency
  console.log('\n--- 3. Testing Idempotency ---');
  const expansion1 = DeckExpansion.expandPackagesToDeck(packages4x);
  const expansion2 = DeckExpansion.expandPackagesToDeck(packages4x);
  assert(JSON.stringify(expansion1) === JSON.stringify(expansion2), 'Idempotencia: Expandir los mismos paquetes 2 veces produjo un mazo 100% idéntico');

  // 4. Testing Governed Repair
  console.log('\n--- 4. Testing Governed Repair ---');
  const repairedPackages = CopyAllocationManager.processRepairProposal(packages4x, { action: 'ADD_LAND_DENSITY', amount: 2 });
  assert(repairedPackages.length === packages4x.length + 1, 'CopyAllocationManager procesó y autorizó la propuesta de reparación de tierras');

  console.log(`\n==================================================`);
  console.log(`RESULTADOS SPRINT 22 CAPABILITY PACKAGES E2E: ${passed} PASARON, ${failed} FALLARON`);
  console.log(`==================================================`);

  if (failed > 0) process.exit(1);
}

runSprint22Test();
