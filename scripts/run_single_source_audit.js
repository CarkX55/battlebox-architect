/**
 * scripts/run_single_source_audit.js
 * 
 * Script CLI de Inspección y Auditoría Sincronizada SOT (Single Source of Truth).
 * Lee ÚNICAMENTE el objeto final CompiledDeck y demuestra:
 * 1. Cero cartas fantasma (Birds of Paradise NO aparece en las evidencias si no está en el mazo).
 * 2. Inconsistencias del DAG detectadas como FAIL (e.g. Protection = 0/4 -> FAIL).
 * 3. Justificación de ganancia marginal de 4x Chord of Calling (41% -> 68% -> 83% -> 91%).
 * 4. Justificación de Karsten Mana Screw Trade-off para 18 tierras (23% -> 17%).
 */

import { COMPILER_VERSION } from '../src/services/compiler/core/compilerVersion.js';
import { CompiledDeckAuditor } from '../src/services/compiler/core/compiledDeckAuditor.js';
import { CAPABILITY_IDS } from '../src/services/compiler/core/capabilityCatalog.js';

async function runSynchronizedAudit() {
  console.log('================================================================');
  console.log(`🔍 AUDITORÍA DE SINCRONIZACIÓN SSOT (SINGLE SOURCE OF TRUTH) v14`);
  console.log(`   Arquetipo: Golgari Elves | Compilador v${COMPILER_VERSION.compiler}`);
  console.log('================================================================\n');

  // Objeto de mazo compilado único (Single Source of Truth)
  const compiledDeck = {
    deckName: 'Golgari Elves Modern v14',
    format: 'Modern',
    slots: [
      { name: 'Llanowar Elves', quantity: 4, cmc: 1, role: 'T1 Mana Dork', capability: CAPABILITY_IDS.MANA_ACCELERATION_T1 },
      { name: 'Elvish Mystic', quantity: 4, cmc: 1, role: 'T1 Mana Dork', capability: CAPABILITY_IDS.MANA_ACCELERATION_T1 },
      { name: 'Heritage Druid', quantity: 4, cmc: 1, role: 'Mana Multiplier Engine', capability: CAPABILITY_IDS.MANA_MULTIPLIER },
      { name: 'Nettle Sentinel', quantity: 4, cmc: 1, role: 'Combo Mana Untapper', capability: CAPABILITY_IDS.MANA_MULTIPLIER },
      { name: 'Elvish Archdruid', quantity: 4, cmc: 3, role: 'Lord & Mana Generator', capability: CAPABILITY_IDS.VALUE_THREAT },
      { name: 'Dwynen\'s Elite', quantity: 4, cmc: 2, role: 'Token Generator Body', capability: CAPABILITY_IDS.VALUE_THREAT },
      { name: 'Realmwalker', quantity: 4, cmc: 3, role: 'Topdeck Cast Engine', capability: CAPABILITY_IDS.CARD_DRAW },
      { name: 'Shaman of the Pack', quantity: 4, cmc: 3, role: 'Direct Life Drain Finisher', capability: CAPABILITY_IDS.FINISHER_LETHAL },
      { name: 'Ezuri, Renegade Leader', quantity: 2, cmc: 3, role: 'Overrun Lethal & Regeneration', capability: CAPABILITY_IDS.FINISHER_LETHAL },
      { name: 'Collected Company', quantity: 4, cmc: 4, role: 'Explosive Value Engine', capability: CAPABILITY_IDS.COCO_ENGINE },
      { name: 'Chord of Calling', quantity: 4, cmc: 3, role: 'Instant Speed Tutor', capability: CAPABILITY_IDS.CHORD_ENGINE },
      { name: 'Cavern of Souls', quantity: 4, cmc: 0, type_line: 'Land', role: 'Uncounterable Mana Land' },
      { name: 'Overgrown Tomb', quantity: 4, cmc: 0, type_line: 'Land', role: 'Dual Black/Green Land' },
      { name: 'Verdant Catacombs', quantity: 4, cmc: 0, type_line: 'Land', role: 'Fetch Land' },
      { name: 'Forest', quantity: 5, cmc: 0, type_line: 'Basic Land — Forest', role: 'Basic Land' },
      { name: 'Boseiju, Who Endures', quantity: 1, cmc: 0, type_line: 'Legendary Land', role: 'Utility Land' }
    ]
  };

  // Ejecutar auditoría sobre el objeto SSOT
  const audit = CompiledDeckAuditor.auditCompiledDeck(compiledDeck);

  console.log(`🎴 TOTAL DE CARTAS EN EL MAZO REAL: ${audit.totalCardsInDeck} cartas (Válido 60: ${audit.is60CardsValid ? 'YES' : 'NO'})\n`);

  console.log('================================================================');
  console.log('📋 TABLA DE AUDITORÍA AUTOMÁTICA DEL DECK (SINCRONIZACIÓN DAG vs MAZO)');
  console.log('================================================================');
  audit.nodeAudits.forEach(node => {
    const statusIcon = node.status === 'PASS' ? '✅ PASS' : '❌ FAIL';
    console.log(`   ${statusIcon} | Node: ${node.label.padEnd(24, ' ')} | Req: ${node.required} | Found: ${node.found}`);
    if (node.providers.length > 0) {
      console.log(`          Proveedores Reales: ${node.providers.join(', ')}`);
    } else {
      console.error(`          ⚠️ ALERTA: Ninguna carta en el mazo satisface este nodo (Inconsistencia detectada y marcada como FAIL).`);
    }
  });

  console.log('\n================================================================');
  console.log('📐 GANANCIA MARGINAL HIPERGEOMÉTRICA (¿POR QUÉ EXACTAMENTE 4 CHORD OF CALLING?)');
  console.log('================================================================');
  console.log(`   Carta: ${audit.chordJustification.cardName} (${audit.chordJustification.selectedCopies} copias seleccionadas)`);
  audit.chordJustification.marginalGains.forEach(g => {
    console.log(`   • ${g.copies} copias: Cobertura ${g.coverage} (Ganancia marginal: ${g.marginalGain})`);
  });
  console.log(`   👉 RAZONAMIENTO: ${audit.chordJustification.reasoning}`);

  console.log('\n================================================================');
  console.log('🌍 TRADE-OFF CUANTITATIVO DE MANA SCREW (¿POR QUÉ EXACTAMENTE 18 TIERRAS?)');
  console.log('================================================================');
  console.log(`   Tierras Seleccionadas: ${audit.landScrewTradeoff.selectedLands} tierras`);
  audit.landScrewTradeoff.tradeoffTable.forEach(t => {
    console.log(`   • ${t.lands} tierras: Mana Screw Prob = ${t.manaScrewProb} | ${t.verdict}`);
  });
  console.log(`   👉 RAZONAMIENTO: ${audit.landScrewTradeoff.reasoning}\n`);
}

runSynchronizedAudit();
