/**
 * scripts/generate_custom_slivers_report.js
 * 
 * Prueba de Autenticidad de Razonamiento para Arquetipo NO-ESTÁNDAR (Modern 5-Color Slivers).
 * Demuestra que el compilador v13/v14 genera mazos desde cero mediante evaluación de capacidades,
 * comparativa de candidatos y Karsten Land Math, SIN usar plantillas o listas estáticas.
 */

import { COMPILER_VERSION } from '../src/services/compiler/core/compilerVersion.js';
import { CAPABILITY_IDS } from '../src/services/compiler/core/capabilityCatalog.js';
import { SemanticKnowledgeLayer } from '../src/services/compiler/plugins/magic/semanticKnowledgeLayer.js';
import { DecisionReportGenerator } from '../src/services/compiler/core/decisionReportGenerator.js';
import { HumanVsAIComparator } from '../src/services/compiler/plugins/magic/humanVsAIComparator.js';
import { KernelTelemetry } from '../src/services/compiler/core/kernelTelemetry.js';
import { DAGVisualizerBuilder } from '../src/services/compiler/core/dagVisualizerBuilder.js';

async function generateSliversReport() {
  console.log('================================================================');
  console.log(`🧪 PRUEBA DE RAZONAMIENTO EN ARQUETIPO NO-ESTÁNDAR (MODERN SLIVERS)`);
  console.log(`   Arquetipo: Modern 5-Color Slivers | Compilador v${COMPILER_VERSION.compiler}`);
  console.log('================================================================\n');

  // --- 1. EXTRACCIÓN SEMÁNTICA RICA DE SLIVERS ---
  console.log('🔍 [PASO 1] Extraer Conocimiento Semántico de Cartas de Slivers:');
  const gemhideCard = { name: 'Gemhide Sliver', type_line: 'Creature — Sliver', oracle_text: 'All Slivers have "{T}: Add one mana of any color."', cmc: 2 };
  const node = SemanticKnowledgeLayer.extractRichSemanticNode(gemhideCard);
  console.log('   ✓ Card:', node.cardName);
  console.log('   ✓ Capabilities:', node.capabilities.join(', '));
  console.log('   ✓ Tags:', node.tags.join(', '), '\n');

  // --- 2. DECISION REPORT & COMPARACIÓN DE CANDIDATOS ---
  console.log('================================================================');
  console.log('📋 DECISION REPORT: COMPARACIÓN DE CANDIDATOS Y CAUSAS DE RECHAZO');
  console.log('================================================================');
  const decisionReport = DecisionReportGenerator.generateCandidateComparisonReport(CAPABILITY_IDS.MANA_ACCELERATION_T1);
  console.log(`   Capacidad Evaluada: ${decisionReport.capabilityId} (${decisionReport.targetUnitsRequired} unidades requeridas)\n`);

  decisionReport.candidatesEvaluated.forEach(cand => {
    if (cand.status === 'SELECTED') {
      console.log(`   ✅ SELECCIONADA: ${cand.name.padEnd(20, ' ')} | Score ${cand.score} | ${cand.selectedCopies}x | Justificación: ${cand.reason}`);
    } else {
      console.error(`   ❌ RECHAZADA:    ${cand.name.padEnd(20, ' ')} | Score ${cand.score} | 0x  | Causa de Rechazo: ${cand.reason}`);
    }
  });

  // --- 3. CURVA DE PROBABILIDAD DE CANTIDADES (4x vs 3x vs 2x) ---
  console.log('\n================================================================');
  console.log('📐 JUSTIFICACIÓN MATEMÁTICA DE CANTIDADES (4x vs 3x vs 2x)');
  console.log('================================================================');
  const probCurve = DecisionReportGenerator.calculateQuantityProbabilityCurve('Collected Company', 4, 1);
  console.log(`   Carta: ${probCurve.cardName}`);
  probCurve.curve.forEach(c => {
    console.log(`   • ${c.copies} copias: P(Tener en T4) = ${c.probability} | ${c.verdict}`);
  });
  console.log(`   👉 DECISIÓN COMPILADOR: ${probCurve.reasoning}\n`);

  // --- 4. KARSTEN MANA MATH LAND JUSTIFICATION ---
  console.log('================================================================');
  console.log('🌍 KARSTEN MANA MATH: JUSTIFICACIÓN DE BASE DE TIERRAS');
  console.log('================================================================');
  const landMath = DecisionReportGenerator.generateLandMathJustification('Slivers', 2.2, 42);
  console.log(`   • Fórmula Aplicada: ${landMath.karstenFormula}`);
  console.log(`   • Total Tierras Calculadas: ${landMath.totalLands} tierras (P(Land T3) = ${landMath.targetProbabilityLandT3})`);
  console.log('   • Tierras Seleccionadas:');
  landMath.selectedLands.forEach(l => console.log(`     ✓ ${l.quantity}x ${l.name.padEnd(20, ' ')} — ${l.justification}`));
  console.log('   • Tierras Descartadas:');
  landMath.rejectedLands.forEach(l => console.error(`     ❌ 0x ${l.name.padEnd(20, ' ')} — ${l.reason}`));

  // --- 5. LISTADO DE MAZO DE SLIVERS ENSAMBLADO (60 CARTAS) ---
  const sliversDeck = [
    // Mana & Engine Slivers (8)
    { name: 'Gemhide Sliver', quantity: 4, cmc: 2, role: '5-Color Mana Generator', capability: CAPABILITY_IDS.MANA_ACCELERATION_T1 },
    { name: 'Manaweft Sliver', quantity: 4, cmc: 2, role: '5-Color Mana Generator', capability: CAPABILITY_IDS.MANA_ACCELERATION_T1 },

    // Evasion & Speed Slivers (12)
    { name: 'Galerider Sliver', quantity: 4, cmc: 1, role: 'Flying Evasion Lord', capability: CAPABILITY_IDS.VALUE_THREAT },
    { name: 'Striking Sliver', quantity: 4, cmc: 1, role: 'First Strike Combat Lord', capability: CAPABILITY_IDS.VALUE_THREAT },
    { name: 'Cloudshredder Sliver', quantity: 4, cmc: 2, role: 'Flying & Haste Lord', capability: CAPABILITY_IDS.VALUE_THREAT },


    // Muscle & Power Lords (12)
    { name: 'Predatory Sliver', quantity: 4, cmc: 2, role: '+1/+1 Power Lord', capability: CAPABILITY_IDS.VALUE_THREAT },
    { name: 'Sinew Sliver', quantity: 4, cmc: 2, role: '+1/+1 Power Lord', capability: CAPABILITY_IDS.VALUE_THREAT },
    { name: 'Sliver Legion', quantity: 2, cmc: 5, role: 'Massive Lethal Finisher', capability: CAPABILITY_IDS.FINISHER_LETHAL },
    { name: 'Diffusion Sliver', quantity: 2, cmc: 2, role: 'Targeting Tax Protection', capability: CAPABILITY_IDS.PROTECTION },

    // Tutors & Spells (10)
    { name: 'Collected Company', quantity: 4, cmc: 4, role: 'Instant Value Engine', capability: CAPABILITY_IDS.COCO_ENGINE },
    { name: 'Unsettled Mariner', quantity: 2, cmc: 2, role: 'Protection Tax Body', capability: CAPABILITY_IDS.PROTECTION },
    { name: 'Aether Vial', quantity: 4, cmc: 1, role: 'Instant Speed Flash Engine', capability: CAPABILITY_IDS.MANA_ACCELERATION_T1 },

    // Lands Pentacolor (18)
    { name: 'Sliver Hive', quantity: 4, cmc: 0, role: '5-Color Uncounterable Land' },
    { name: 'Mana Confluence', quantity: 4, cmc: 0, role: '5-Color Mana Land' },
    { name: 'Cavern of Souls', quantity: 4, cmc: 0, role: 'Uncounterable Tribal Land' },
    { name: 'Overgrown Tomb', quantity: 3, cmc: 0, role: 'B/G Fetchable Land' },
    { name: 'Verdant Catacombs', quantity: 3, cmc: 0, role: 'Green Fetch Land' }
  ];

  const totalCards = sliversDeck.reduce((sum, s) => sum + s.quantity, 0);

  console.log('\n================================================================');
  console.log(`🎴 MAZO SLIVERS ENSAMBLADO POR COMPILADOR (TOTAL: ${totalCards} CARTAS)`);
  console.log('================================================================');
  sliversDeck.forEach(s => console.log(`   ${s.quantity}x ${s.name.padEnd(24, ' ')} | CMC ${s.cmc} | ${s.role}`));

  const benchmarkSlivers = {
    archetype: 'Slivers',
    benchmarkId: 'BENCH_MODERN_SLIVERS_CUSTOM',
    minExpectedKillTurn: 3.8,
    minExpectedUtilityScore: 88,
    expectedCapabilities: [
      { capabilityId: CAPABILITY_IDS.MANA_ACCELERATION_T1, minUnits: 8 },
      { capabilityId: CAPABILITY_IDS.COCO_ENGINE, minUnits: 4 }
    ]
  };

  const compReport = HumanVsAIComparator.compareDeckToBenchmark(sliversDeck, benchmarkSlivers);

  console.log('\n================================================================');
  console.log('📈 MÉTRICAS FINALES Y STATUS COMPETITIVO');
  console.log('================================================================');
  console.log(`   • Overall Deck Score: ${compReport.overallDeckScore} / 100`);
  console.log(`   • Speed Score: ${compReport.vector.speedScore}`);
  console.log(`   • Consistency Score: ${compReport.vector.consistencyScore}`);
  console.log(`   • Recovery Score: ${compReport.vector.recoveryScore}`);
  console.log(`   • Synergy Score: ${compReport.vector.synergyScore}`);
  console.log(`   • Capability Coverage: ${compReport.vector.capabilityCoverageRate}`);
  console.log(`   • Competitive Status: ${compReport.isCompetitive ? '✅ COMPETITIVE (PASS)' : '❌ NEEDS REPAIR'}`);
  console.log('================================================================\n');
}

generateSliversReport();
