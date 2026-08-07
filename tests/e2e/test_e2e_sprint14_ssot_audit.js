/**
 * tests/e2e/test_e2e_sprint14_ssot_audit.js
 * 
 * Test de Integración E2E para Auditoría Sincronizada Single Source of Truth (v14).
 * Valida:
 * 1. Cero cartas fantasma (Birds of Paradise NO aparece si no está en el mazo).
 * 2. Detección de inconsistencias del DAG (Protection marcado como FAIL al tener 0 copias).
 * 3. Ganancia marginal de 4x Chord of Calling e informe de trade-off de 18 tierras.
 */

import { CompiledDeckAuditor } from '../../src/services/compiler/core/compiledDeckAuditor.js';

async function runSSOTAuditTest() {
  console.log('🧪 === INICIANDO TEST DE INTEGRACIÓN E2E (SPRINT 14 SSOT AUDIT) ===');

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

  const mockDeck = {
    slots: [
      { name: 'Llanowar Elves', quantity: 4, capability: 'cap.mana.acceleration.t1.v1' },
      { name: 'Elvish Mystic', quantity: 4, capability: 'cap.mana.acceleration.t1.v1' },
      { name: 'Collected Company', quantity: 4, capability: 'cap.engine.coco.v1' },
      { name: 'Chord of Calling', quantity: 4, capability: 'cap.engine.chord.v1' },
      { name: 'Forest', quantity: 18, cmc: 0, type_line: 'Land' }
    ]
  };

  const audit = CompiledDeckAuditor.auditCompiledDeck(mockDeck);

  // 1. Verificar cero cartas fantasma
  const manaNode = audit.nodeAudits.find(n => n.nodeId === 'MANA_ENGINE');
  assert(manaNode.found === 8, 'Mana Engine encontró exactamente 8 dorks reales del mazo');
  assert(!manaNode.providers.some(p => p.includes('Birds')), 'Confirmado CERO cartas fantasma (Birds of Paradise NO aparece)');

  // 2. Verificar inconsistencia de DAG (Protection = 0 -> FAIL)
  const protNode = audit.nodeAudits.find(n => n.nodeId === 'PROTECTION');
  assert(protNode.status === 'FAIL', 'Nodo de Protección sin cartas en el mazo fue detectado y marcado como FAIL');
  assert(protNode.found === 0, 'Protection count = 0');

  // 3. Verificar Ganancias Marginales y Trade-off de Tierras
  assert(audit.chordJustification.marginalGains.length === 4, 'Ganancia marginal de 4 copias calculada');
  assert(audit.landScrewTradeoff.selectedLands === 18, 'Trade-off de 18 tierras validado');

  console.log(`\n==================================================`);
  console.log(`RESULTADOS SPRINT 14 SSOT AUDIT E2E: ${passed} PASARON, ${failed} FALLARON`);
  console.log(`==================================================`);

  if (failed > 0) process.exit(1);
}

runSSOTAuditTest();
