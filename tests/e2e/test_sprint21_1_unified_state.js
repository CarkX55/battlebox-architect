/**
 * tests/e2e/test_sprint21_1_unified_state.js
 * 
 * Test de Integración E2E para Sprint 21.1 (Unified Strategic State v21.1).
 * Valida:
 * 1. UnifiedStrategicState: Encapsulación SSOT del Grafo Causal de Capacidades, Vector 6D, Grafo de Interacción Probabilístico y Estadísticas de Ejecución.
 * 2. CausalCapabilityNode: Relaciones causales (causes, requires, counteracts).
 * 3. Probabilistic Conflict Turn Distribution: Distribución estocástica de conflicto por turnos.
 */

import { UnifiedStrategicState, CausalCapabilityNode } from '../../src/services/compiler/core/unifiedStrategicState.js';
import { CanonicalUserIntentSpectrum } from '../../src/models/userIntentSpectrum.js';

async function runSprint21_1Test() {
  console.log('🧪 === INICIANDO TEST DE INTEGRACIÓN E2E (SPRINT 21.1 UNIFIED STRATEGIC STATE) ===');

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

  const mockDeck = [
    { name: 'Llanowar Elves', type_line: 'Creature — Elf Druid', oracle_text: 'Add G', cmc: 1, quantity: 4 },
    { name: 'Hardened Scales', type_line: 'Enchantment', oracle_text: 'Put an additional +1/+1 counter', cmc: 1, quantity: 4 },
    { name: 'Forest', type_line: 'Basic Land — Forest', oracle_text: 'T: Add G', cmc: 0, quantity: 20 }
  ];

  const intent = new CanonicalUserIntentSpectrum({ primaryIdea: 'Hydras', format: 'Modern' });

  // 1. Testing UnifiedStrategicState Build
  console.log('\n--- 1. Testing UnifiedStrategicState Build ---');
  const state = UnifiedStrategicState.buildState(mockDeck, intent, {});
  assert(state.primaryIdea === 'Hydras', 'UnifiedStrategicState capturó la idea primaria "Hydras"');
  assert(state.strategyVector.resource > 0, 'UnifiedStrategicState incorporó el StrategyVector 6D');

  // 2. Testing Causal Capability Knowledge Graph
  console.log('\n--- 2. Testing Causal Capability Knowledge Graph ---');
  const node = state.capabilityKnowledgeGraph['RESOURCE_ACCELERATION'];
  assert(node instanceof CausalCapabilityNode, 'Nodo de capacidad evaluado como CausalCapabilityNode');
  assert(node.causes.includes('EARLY_MANA_EFFICIENCY'), 'Nodo causal de capacidad registró relación "causes"');
  assert(node.counteracts.includes('TAXING_STAX'), 'Nodo causal de capacidad registró relación "counteracts"');

  // 3. Testing Probabilistic Conflict Turn Distribution
  console.log('\n--- 3. Testing Probabilistic Conflict Turn Distribution ---');
  const dist = state.interactionGraph.conflictTurnDistribution;
  assert(dist.turn2Probability === 0.62, 'Grafo de interacción registró probabilidad estocástica de conflicto en Turno 2 (62%)');

  console.log(`\n==================================================`);
  console.log(`RESULTADOS SPRINT 21.1 UNIFIED STRATEGIC STATE E2E: ${passed} PASARON, ${failed} FALLARON`);
  console.log(`==================================================`);

  if (failed > 0) process.exit(1);
}

runSprint21_1Test();
